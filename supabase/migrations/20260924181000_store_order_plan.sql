-- План исполнения заказа клиента: планы, действия reserve / produce, единая функция доступного
-- количества store_place_available, команды и чтение в store_document_context заказа клиента.
-- До запуска план не создаёт документов и проводок; запуск — одна транзакция через команды документов.

begin;

-- Таблицы -----------------------------------------------------------------------------------------

create table public.store_order_plan (
  id bigint generated always as identity primary key,
  customer_order_id bigint not null references public.store_customer_order (id),
  name text not null check (btrim(name) <> '' and char_length(name) <= 80),
  created_at timestamptz not null default now(),
  created_by bigint not null references public.app_user (id),
  updated_at timestamptz not null default now(),
  launched_at timestamptz,
  launched_by bigint references public.app_user (id),
  launched_coverage jsonb,
  archived_at timestamptz,
  check ((launched_at is null) = (launched_by is null)),
  check (launched_at is not null or launched_coverage is null)
);

create index store_order_plan_customer_order_idx on public.store_order_plan (customer_order_id);

comment on table public.store_order_plan is
  'План исполнения заказа клиента. Вне реестра документов. Черновик — launched_at пусто, запущен — задано, архив — archived_at задано. Удаления нет.';
comment on column public.store_order_plan.updated_at is
  'Последнее сохранение плана (действие, имя, запуск) — индикатор «Сохранено».';
comment on column public.store_order_plan.launched_coverage is
  'Снимок покрытия заказа на момент запуска: [{variantId, ordered, shipped, warehouse, transfer, output}] — «Было» у запущенного плана.';

create table public.store_order_plan_action (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.store_order_plan (id),
  kind text not null check (kind in ('reserve', 'produce')),
  product_variant_id bigint not null references public.store_product_variant (id),
  quantity numeric(18, 2) not null check (quantity > 0),
  location_id bigint references public.store_stock_location (id),
  owner_id bigint references public.store_stock_owner (id),
  plant_id bigint references public.store_plant (id),
  result_document_id bigint references public.store_document (id),
  check (
    (kind = 'reserve' and location_id is not null and owner_id is not null and plant_id is null)
    or (kind = 'produce' and owner_id is null and (location_id is null) <> (plant_id is null))
  ),
  constraint store_order_plan_action_key
    unique nulls not distinct (plan_id, kind, product_variant_id, location_id, owner_id, plant_id)
);

comment on table public.store_order_plan_action is
  'Действие плана. reserve — источник «место × владелец» (склад, путь, черновик выпуска, незанятый план PO со «свободно»); produce — докинуть в PO (location_id места PO) или новый PO (plant_id). result_document_id — документ, созданный запуском.';

alter table public.store_order_plan enable row level security;
alter table public.store_order_plan_action enable row level security;

create policy store_order_plan_select on public.store_order_plan
  for select to anon, authenticated using (true);
create policy store_order_plan_action_select on public.store_order_plan_action
  for select to anon, authenticated using (true);

revoke all on table public.store_order_plan, public.store_order_plan_action from anon, authenticated;
grant select on table public.store_order_plan, public.store_order_plan_action to anon, authenticated;
grant all on table public.store_order_plan, public.store_order_plan_action to service_role;

-- Помощники ---------------------------------------------------------------------------------------

create or replace function public.store_qty_label(p_qty numeric)
returns text
language sql
immutable
as $f$
  select regexp_replace(to_char(coalesce(p_qty, 0), 'FM999999990.99'), '\.$', '');
$f$;

create or replace function public.store_location_code(p_location_id bigint)
returns text
language sql
stable
set search_path = public
as $f$
  select case lr.kind
    when 'warehouse' then 'WH-' || lr.entity_id
    else public.store_doc_number(d.kind, d.sequence_number)
  end
  from public.store_location_ref lr
  left join public.store_document d on d.id = lr.entity_id and lr.kind <> 'warehouse'
  where lr.stock_location_id = p_location_id;
$f$;

-- Доступно по паре «место × владелец»: одна функция для чтения, проверки ввода и запуска.
create or replace function public.store_place_available(
  p_variant_id bigint,
  p_location_id bigint,
  p_owner_id bigint
)
returns numeric
language plpgsql
stable
set search_path = public
as $f$
declare
  v_kind text;
  v_free bigint := public.store_free_owner_id();
  v_status text;
  v_po bigint;
  v_qty numeric;
begin
  select kind into v_kind from public.store_stock_location where id = p_location_id;
  if v_kind in ('warehouse', 'transfer') then
    return public.store_qty(p_variant_id, p_location_id, p_owner_id);
  end if;
  if v_kind = 'production_output' then
    select coalesce(sum(l.quantity), 0) into v_qty
    from public.store_production_output o
    join public.store_document d on d.id = o.id and d.status = 'draft'
    join public.store_document_product_line l on l.document_id = o.id
    where o.stock_location_id = p_location_id
      and l.product_variant_id = p_variant_id
      and coalesce(l.to_owner_id, v_free) = p_owner_id;
    return v_qty;
  end if;
  if v_kind = 'production_order' then
    if p_owner_id is distinct from v_free then
      return 0;
    end if;
    select po.id, d.status into v_po, v_status
    from public.store_production_order po
    join public.store_document d on d.id = po.id
    where po.stock_location_id = p_location_id;
    if v_po is null or v_status in ('done', 'cancelled') then
      return 0;
    end if;
    return greatest(
      public.store_po_plan_qty(v_po, p_variant_id) - public.store_po_output_qty(v_po, p_variant_id),
      0
    );
  end if;
  return 0;
end;
$f$;

comment on function public.store_place_available(bigint, bigint, bigint) is
  'Доступно по паре место × владелец: склад/путь — остаток журнала; черновик выпуска — строки с этим to_owner_id; PO — незанятый план при владельце «свободно» и открытом заказе; иначе 0.';

-- Покрытие строк заказа: заказано и «уже есть» (отгружено, резерв заказа на складах и в пути,
-- строки заказа в черновиках выпусков).
create or replace function public.store_order_coverage(p_order_id bigint)
returns table (
  product_variant_id bigint,
  ordered numeric,
  shipped numeric,
  warehouse numeric,
  transfer numeric,
  output numeric
)
language sql
stable
set search_path = public
as $f$
  with lines as (
    select l.product_variant_id, sum(l.quantity) as qty
    from public.store_document_product_line l
    where l.document_id = p_order_id
    group by l.product_variant_id
  ),
  bal as (
    select
      b.product_variant_id,
      sum(b.quantity) filter (where b.location_kind = 'customer_order') as shipped,
      sum(b.quantity) filter (where b.location_kind = 'warehouse') as warehouse,
      sum(b.quantity) filter (where b.location_kind = 'transfer') as transfer
    from public.store_stock_balance_ref b
    where b.owner_kind = 'customer_order'
      and b.owner_entity_id = p_order_id
      and b.product_variant_id in (select lines.product_variant_id from lines)
    group by b.product_variant_id
  ),
  outs as (
    select l.product_variant_id, sum(l.quantity) as qty
    from public.store_document_product_line l
    join public.store_production_output o on o.id = l.document_id
    join public.store_document d on d.id = o.id and d.status = 'draft'
    join public.store_customer_order co on co.id = p_order_id and co.stock_owner_id = l.to_owner_id
    group by l.product_variant_id
  )
  select
    lines.product_variant_id,
    lines.qty,
    coalesce(bal.shipped, 0),
    coalesce(bal.warehouse, 0),
    coalesce(bal.transfer, 0),
    coalesce(outs.qty, 0)
  from lines
  left join bal on bal.product_variant_id = lines.product_variant_id
  left join outs on outs.product_variant_id = lines.product_variant_id;
$f$;

-- Чтение: планы заказа, их действия, строки источников по товарам заказа, живое покрытие.
create or replace function public.store_order_plan_payload(p_order_id bigint)
returns jsonb
language sql
stable
set search_path = public
as $f$
  with
  co as (
    select c.stock_owner_id from public.store_customer_order c where c.id = p_order_id
  ),
  free as (
    select public.store_free_owner_id() as id
  ),
  variants as (
    select distinct l.product_variant_id as id
    from public.store_document_product_line l
    where l.document_id = p_order_id
  ),
  candidates as (
    select b.product_variant_id as v, b.location_id as l, b.owner_id as o
    from public.store_stock_balance b
    join public.store_stock_location sl on sl.id = b.location_id and sl.kind in ('warehouse', 'transfer')
    where b.product_variant_id in (select id from variants)
      and b.quantity > 0
    union
    select l.product_variant_id, o.stock_location_id, coalesce(l.to_owner_id, (select id from free))
    from public.store_document_product_line l
    join public.store_production_output o on o.id = l.document_id
    join public.store_document d on d.id = o.id and d.status = 'draft'
    where l.product_variant_id in (select id from variants)
    union
    select l.product_variant_id, po.stock_location_id, (select id from free)
    from public.store_document_product_line l
    join public.store_production_order po on po.id = l.document_id
    join public.store_document d on d.id = po.id and d.status not in ('done', 'cancelled')
    where l.product_variant_id in (select id from variants)
  ),
  sources as (
    select c.v, c.l, c.o, public.store_place_available(c.v, c.l, c.o) as available
    from candidates c
    where c.o is distinct from (select stock_owner_id from co)
  )
  select jsonb_build_object(
    'coverage', coalesce((
      select jsonb_agg(jsonb_build_object(
        'variantId', c.product_variant_id,
        'ordered', c.ordered,
        'shipped', c.shipped,
        'warehouse', c.warehouse,
        'transfer', c.transfer,
        'output', c.output
      ) order by c.product_variant_id)
      from public.store_order_coverage(p_order_id) c
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'variantId', s.v,
        'locationId', s.l,
        'ownerId', s.o,
        'available', s.available
      ) order by s.v, s.l, s.o)
      from sources s
      where s.available > 0
    ), '[]'::jsonb),
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at,
        'launchedAt', p.launched_at,
        'archivedAt', p.archived_at,
        'launchedCoverage', p.launched_coverage,
        'actions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id,
            'kind', a.kind,
            'variantId', a.product_variant_id,
            'quantity', a.quantity,
            'locationId', a.location_id,
            'ownerId', a.owner_id,
            'plantId', a.plant_id,
            'available', case
              when p.launched_at is null and a.kind = 'reserve'
                then public.store_place_available(a.product_variant_id, a.location_id, a.owner_id)
            end,
            'resultDocumentId', a.result_document_id,
            'resultKind', rd.kind,
            'resultNumber', case when rd.id is not null then public.store_doc_number(rd.kind, rd.sequence_number) end,
            'resultSequence', rd.sequence_number
          ) order by a.id)
          from public.store_order_plan_action a
          left join public.store_document rd on rd.id = a.result_document_id
          where a.plan_id = p.id
        ), '[]'::jsonb)
      ) order by p.created_at, p.id)
      from public.store_order_plan p
      where p.customer_order_id = p_order_id
    ), '[]'::jsonb)
  );
$f$;

revoke all on function public.store_qty_label(numeric) from public, anon, authenticated;
revoke all on function public.store_location_code(bigint) from public, anon, authenticated;
revoke all on function public.store_place_available(bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.store_order_coverage(bigint) from public, anon, authenticated;
revoke all on function public.store_order_plan_payload(bigint) from public, anon, authenticated;

-- Команды -----------------------------------------------------------------------------------------

create or replace function public.store_create_order_plan(
  p_customer_order_id bigint,
  p_name text default null,
  p_copy_from_plan_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_src public.store_order_plan;
  v_name text;
  v_id bigint;
begin
  select d.status into v_status
  from public.store_customer_order c
  join public.store_document d on d.id = c.id
  where c.id = p_customer_order_id;
  if not found then
    raise exception 'Заказ клиента % не найден', p_customer_order_id;
  end if;

  if p_copy_from_plan_id is not null then
    select * into v_src from public.store_order_plan where id = p_copy_from_plan_id;
    if v_src.id is null or v_src.customer_order_id <> p_customer_order_id then
      raise exception 'План для копирования не найден';
    end if;
  elsif v_status in ('done', 'cancelled') then
    raise exception 'Заказ клиента закрыт — новый план недоступен';
  end if;

  v_name := nullif(btrim(coalesce(p_name, '')), '');
  if v_name is null then
    if v_src.id is not null then
      v_name := left(v_src.name, 70) || ' (копия)';
    else
      select 'План ' || (count(*) + 1) into v_name
      from public.store_order_plan
      where customer_order_id = p_customer_order_id;
    end if;
  end if;

  insert into public.store_order_plan (customer_order_id, name, created_by)
  values (p_customer_order_id, v_name, public.store_current_user_id())
  returning id into v_id;

  if v_src.id is not null then
    insert into public.store_order_plan_action (plan_id, kind, product_variant_id, quantity, location_id, owner_id, plant_id)
    select v_id, a.kind, a.product_variant_id, a.quantity, a.location_id, a.owner_id, a.plant_id
    from public.store_order_plan_action a
    where a.plan_id = v_src.id
    order by a.id;
  end if;

  return public.store_order_plan_payload(p_customer_order_id) || jsonb_build_object('planId', v_id);
end;
$f$;

create or replace function public.store_rename_order_plan(p_plan_id bigint, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_order bigint;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_name = '' then
    raise exception 'Название плана не может быть пустым';
  end if;
  if char_length(v_name) > 80 then
    raise exception 'Название плана — не длиннее 80 символов';
  end if;
  update public.store_order_plan set name = v_name, updated_at = now() where id = p_plan_id
  returning customer_order_id into v_order;
  if v_order is null then
    raise exception 'План не найден';
  end if;
  return public.store_order_plan_payload(v_order);
end;
$f$;

create or replace function public.store_set_order_plan_archived(p_plan_id bigint, p_archived boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_order bigint;
begin
  update public.store_order_plan
  set archived_at = case when coalesce(p_archived, false) then coalesce(archived_at, now()) end
  where id = p_plan_id
  returning customer_order_id into v_order;
  if v_order is null then
    raise exception 'План не найден';
  end if;
  return public.store_order_plan_payload(v_order);
end;
$f$;

-- Задать количество строки плана: ноль убирает действие; увеличить — только в пределах доступного
-- и непокрытого остатка строки заказа; уменьшить — всегда.
create or replace function public.store_set_order_plan_action(
  p_plan_id bigint,
  p_kind text,
  p_product_variant_id bigint,
  p_location_id bigint,
  p_owner_id bigint,
  p_plant_id bigint,
  p_quantity numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_plan public.store_order_plan;
  v_order_status text;
  v_order_owner bigint;
  v_free bigint := public.store_free_owner_id();
  v_loc_kind text;
  v_qty numeric;
  v_action_id bigint;
  v_old numeric;
  v_avail numeric;
  v_remaining numeric;
  v_variant_plant bigint;
  v_po_id bigint;
  v_po_status text;
  v_po_plant bigint;
begin
  select * into v_plan from public.store_order_plan where id = p_plan_id for update;
  if v_plan.id is null then
    raise exception 'План не найден';
  end if;
  if v_plan.launched_at is not null then
    raise exception 'Запущенный план нельзя менять';
  end if;
  if v_plan.archived_at is not null then
    raise exception 'План в архиве — сначала верните его';
  end if;

  select d.status, c.stock_owner_id into v_order_status, v_order_owner
  from public.store_customer_order c
  join public.store_document d on d.id = c.id
  where c.id = v_plan.customer_order_id;
  if v_order_status in ('done', 'cancelled') then
    raise exception 'Заказ клиента закрыт — план только для просмотра';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Количество не может быть отрицательным';
  end if;
  v_qty := round(p_quantity, 2);

  if not exists (
    select 1 from public.store_document_product_line
    where document_id = v_plan.customer_order_id and product_variant_id = p_product_variant_id
  ) then
    raise exception 'Товара нет в заказе клиента';
  end if;
  select plant_id into v_variant_plant from public.store_product_variant where id = p_product_variant_id;

  if p_kind = 'reserve' then
    if p_location_id is null or p_owner_id is null or p_plant_id is not null then
      raise exception 'Резерв задаётся местом и владельцем источника';
    end if;
    select kind into v_loc_kind from public.store_stock_location where id = p_location_id;
    if v_loc_kind is null or v_loc_kind not in ('warehouse', 'transfer', 'production_output', 'production_order') then
      raise exception 'Это место не может быть источником';
    end if;
    if not exists (select 1 from public.store_stock_owner where id = p_owner_id) then
      raise exception 'Владелец не найден';
    end if;
    if p_owner_id = v_order_owner then
      raise exception 'Резерв этого заказа не источник плана';
    end if;
    if v_loc_kind = 'production_order' and p_owner_id <> v_free then
      raise exception 'Незанятый план заказа на производство — только «свободно»';
    end if;
  elsif p_kind = 'produce' then
    if p_owner_id is not null or (p_location_id is null) = (p_plant_id is null) then
      raise exception 'Производство задаётся заказом на производство или заводом';
    end if;
    if p_location_id is not null then
      select po.id, d.status, po.plant_id into v_po_id, v_po_status, v_po_plant
      from public.store_production_order po
      join public.store_document d on d.id = po.id
      where po.stock_location_id = p_location_id;
      if v_po_id is null then
        raise exception 'Заказ на производство не найден';
      end if;
    elsif not exists (select 1 from public.store_plant where id = p_plant_id and deleted_at is null) then
      raise exception 'Завод не найден';
    end if;
  else
    raise exception 'Неизвестный вид действия %', p_kind;
  end if;

  select id, quantity into v_action_id, v_old
  from public.store_order_plan_action
  where plan_id = p_plan_id
    and kind = p_kind
    and product_variant_id = p_product_variant_id
    and location_id is not distinct from p_location_id
    and owner_id is not distinct from p_owner_id
    and plant_id is not distinct from p_plant_id
  for update;
  v_old := coalesce(v_old, 0);

  if v_qty > v_old then
    if p_kind = 'produce' and v_po_id is not null then
      if v_po_status = 'cancelled' then
        raise exception 'Заказ на производство отменён';
      end if;
      if v_po_plant is distinct from v_variant_plant and not exists (
        select 1 from public.store_document_product_line
        where document_id = v_po_id and product_variant_id = p_product_variant_id
      ) then
        raise exception 'Товар не относится к заводу заказа';
      end if;
    elsif p_kind = 'produce' then
      if v_variant_plant is not null and v_variant_plant <> p_plant_id then
        raise exception 'Товар не относится к этому заводу';
      end if;
    end if;

    if p_kind = 'reserve' then
      v_avail := public.store_place_available(p_product_variant_id, p_location_id, p_owner_id);
      if v_qty > v_avail then
        raise exception 'Больше доступного: доступно %', public.store_qty_label(v_avail);
      end if;
    end if;

    select c.ordered - c.shipped - c.warehouse - c.transfer - c.output into v_remaining
    from public.store_order_coverage(v_plan.customer_order_id) c
    where c.product_variant_id = p_product_variant_id;
    v_remaining := coalesce(v_remaining, 0) - coalesce((
      select sum(quantity) from public.store_order_plan_action
      where plan_id = p_plan_id and product_variant_id = p_product_variant_id
    ), 0);
    if v_qty - v_old > v_remaining then
      raise exception 'Больше, чем осталось покрыть: осталось %', public.store_qty_label(greatest(v_remaining, 0));
    end if;
  end if;

  if v_qty = 0 then
    if v_action_id is not null then
      delete from public.store_order_plan_action where id = v_action_id;
    end if;
  elsif v_action_id is null then
    insert into public.store_order_plan_action (plan_id, kind, product_variant_id, quantity, location_id, owner_id, plant_id)
    values (p_plan_id, p_kind, p_product_variant_id, v_qty, p_location_id, p_owner_id, p_plant_id);
  else
    update public.store_order_plan_action set quantity = v_qty where id = v_action_id;
  end if;
  update public.store_order_plan set updated_at = now() where id = p_plan_id;

  return public.store_order_plan_payload(v_plan.customer_order_id);
end;
$f$;

-- Запуск: блокировки и перепроверка → резервы на складе и в пути → резервы в черновиках выпусков →
-- незанятый план PO и «докинуть» (один новый черновик выпуска на PO) → новые PO. Всё или ничего.
create or replace function public.store_launch_order_plan(p_plan_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_plan public.store_order_plan;
  v_order bigint;
  v_order_status text;
  v_order_owner bigint;
  v_bad text;
  v_keys jsonb;
  v_coverage jsonb;
  r record;
  e record;
  v_id bigint;
  v_cur numeric;
  v_lines jsonb;
begin
  select * into v_plan from public.store_order_plan where id = p_plan_id for update;
  if v_plan.id is null then
    raise exception 'План не найден';
  end if;
  if v_plan.launched_at is not null then
    raise exception 'План уже запущен';
  end if;
  if v_plan.archived_at is not null then
    raise exception 'План в архиве — сначала верните его';
  end if;
  v_order := v_plan.customer_order_id;

  select d.status, c.stock_owner_id into v_order_status, v_order_owner
  from public.store_document d
  join public.store_customer_order c on c.id = d.id
  where d.id = v_order
  for update of d;
  if v_order_status in ('done', 'cancelled') then
    raise exception 'Заказ клиента закрыт — запуск недоступен';
  end if;

  if not exists (select 1 from public.store_order_plan_action where plan_id = p_plan_id) then
    raise exception 'В плане нет действий';
  end if;

  -- 1. Блокировки и перепроверка
  select jsonb_agg(jsonb_build_object('v', a.product_variant_id, 'l', a.location_id, 'o', a.owner_id))
  into v_keys
  from public.store_order_plan_action a
  where a.plan_id = p_plan_id and a.kind = 'reserve';
  if v_keys is not null then
    perform public.store_lock_stock_keys(v_keys);
  end if;

  perform 1
  from public.store_document d
  where d.id in (
    select o.id
    from public.store_production_output o
    join public.store_order_plan_action a on a.location_id = o.stock_location_id
    where a.plan_id = p_plan_id
    union
    select po.id
    from public.store_production_order po
    join public.store_order_plan_action a on a.location_id = po.stock_location_id
    where a.plan_id = p_plan_id
  )
  order by d.id
  for update;

  if exists (
    select 1
    from public.store_order_plan_action a
    where a.plan_id = p_plan_id
      and not exists (
        select 1 from public.store_document_product_line l
        where l.document_id = v_order and l.product_variant_id = a.product_variant_id
      )
  ) then
    raise exception 'В плане товар, которого нет в заказе клиента';
  end if;

  select string_agg(
    format('%s — %s: в плане %s, доступно %s',
      public.store_location_code(x.location_id), x.variant_name,
      public.store_qty_label(x.quantity), public.store_qty_label(x.available)),
    '; ' order by x.id)
  into v_bad
  from (
    select a.id, a.location_id, a.quantity, v.name as variant_name,
           public.store_place_available(a.product_variant_id, a.location_id, a.owner_id) as available
    from public.store_order_plan_action a
    join public.store_product_variant v on v.id = a.product_variant_id
    where a.plan_id = p_plan_id and a.kind = 'reserve'
  ) x
  where x.quantity > x.available;
  if v_bad is not null then
    raise exception 'Не хватает: %', v_bad;
  end if;

  select string_agg(public.store_location_code(a.location_id), ', ' order by a.id)
  into v_bad
  from public.store_order_plan_action a
  join public.store_production_order po on po.stock_location_id = a.location_id
  join public.store_document d on d.id = po.id
  where a.plan_id = p_plan_id and a.kind = 'produce' and d.status = 'cancelled';
  if v_bad is not null then
    raise exception 'Заказ на производство отменён: %', v_bad;
  end if;

  select string_agg(format('%s: лишнее %s', v.name, public.store_qty_label(-x.remaining)), '; ' order by v.id)
  into v_bad
  from (
    select c.product_variant_id,
           c.ordered - c.shipped - c.warehouse - c.transfer - c.output
             - coalesce((
               select sum(a.quantity) from public.store_order_plan_action a
               where a.plan_id = p_plan_id and a.product_variant_id = c.product_variant_id
             ), 0) as remaining
    from public.store_order_coverage(v_order) c
  ) x
  join public.store_product_variant v on v.id = x.product_variant_id
  where x.remaining < 0;
  if v_bad is not null then
    raise exception 'Лишнее: %', v_bad;
  end if;

  select jsonb_agg(jsonb_build_object(
    'variantId', c.product_variant_id,
    'ordered', c.ordered,
    'shipped', c.shipped,
    'warehouse', c.warehouse,
    'transfer', c.transfer,
    'output', c.output
  ) order by c.product_variant_id)
  into v_coverage
  from public.store_order_coverage(v_order) c;

  -- 2. Резервы на складе и в пути: один RSV на место
  for r in
    select a.location_id,
           jsonb_agg(jsonb_build_object(
             'product_variant_id', a.product_variant_id,
             'quantity', a.quantity,
             'from_owner_id', a.owner_id
           ) order by a.id) as lines
    from public.store_order_plan_action a
    join public.store_stock_location sl on sl.id = a.location_id and sl.kind in ('warehouse', 'transfer')
    where a.plan_id = p_plan_id and a.kind = 'reserve'
    group by a.location_id
    order by a.location_id
  loop
    v_id := (public.store_create_and_post_reservation(r.location_id, v_order_owner, r.lines, '', 'manual')->>'id')::bigint;
    update public.store_order_plan_action
    set result_document_id = v_id
    where plan_id = p_plan_id and kind = 'reserve' and location_id = r.location_id;
  end loop;

  -- 3. Резервы в черновиках выпусков: перевод владельца в этом выпуске
  for r in
    select o.id as output_id, a.location_id, a.owner_id,
           jsonb_agg(jsonb_build_object(
             'product_variant_id', a.product_variant_id,
             'quantity', a.quantity
           ) order by a.id) as lines
    from public.store_order_plan_action a
    join public.store_production_output o on o.stock_location_id = a.location_id
    where a.plan_id = p_plan_id and a.kind = 'reserve'
    group by o.id, a.location_id, a.owner_id
    order by o.id, a.owner_id
  loop
    perform public.store_move_in_production_output(r.output_id, r.owner_id, v_order_owner, r.lines);
    update public.store_order_plan_action
    set result_document_id = r.output_id
    where plan_id = p_plan_id and kind = 'reserve' and location_id = r.location_id and owner_id = r.owner_id;
  end loop;

  -- 4. Незанятый план PO и «докинуть»: строки PO увеличиваются, один новый черновик выпуска на PO
  for r in
    select po.id as po_id, po.stock_location_id as location_id
    from public.store_production_order po
    where po.stock_location_id in (
      select a.location_id from public.store_order_plan_action a where a.plan_id = p_plan_id
    )
    order by po.id
  loop
    for e in
      select a.product_variant_id, a.quantity
      from public.store_order_plan_action a
      where a.plan_id = p_plan_id and a.kind = 'produce' and a.location_id = r.location_id
      order by a.id
    loop
      select coalesce(sum(l.quantity), 0) into v_cur
      from public.store_document_product_line l
      where l.document_id = r.po_id
        and l.product_variant_id = e.product_variant_id
        and l.from_owner_id is null
        and l.to_owner_id is null;
      perform public.store_set_order_line_quantity(r.po_id, e.product_variant_id, v_cur + e.quantity);
    end loop;

    select jsonb_agg(jsonb_build_object(
             'product_variant_id', x.product_variant_id,
             'quantity', x.quantity,
             'allocation_owner_id', v_order_owner
           ) order by x.product_variant_id)
    into v_lines
    from (
      select a.product_variant_id, sum(a.quantity) as quantity
      from public.store_order_plan_action a
      where a.plan_id = p_plan_id and a.location_id = r.location_id
      group by a.product_variant_id
    ) x;

    v_id := (public.store_create_production_output(
      r.po_id, v_lines, null, false, '', null, null, null, true
    )->>'id')::bigint;
    update public.store_order_plan_action
    set result_document_id = v_id
    where plan_id = p_plan_id and location_id = r.location_id;
  end loop;

  -- 5. Новые PO: один на завод, статус «Черновик», черновик выпуска на весь объём под заказ
  for r in
    select a.plant_id,
           jsonb_agg(jsonb_build_object(
             'product_variant_id', a.product_variant_id,
             'quantity', a.quantity
           ) order by a.id) as lines,
           jsonb_agg(jsonb_build_object(
             'product_variant_id', a.product_variant_id,
             'quantity', a.quantity,
             'allocation_owner_id', v_order_owner
           ) order by a.id) as output_lines
    from public.store_order_plan_action a
    where a.plan_id = p_plan_id and a.kind = 'produce' and a.plant_id is not null
    group by a.plant_id
    order by a.plant_id
  loop
    v_id := (public.store_create_production_order(r.plant_id, r.lines, '', null, 'draft')->>'id')::bigint;
    perform public.store_create_production_output(v_id, r.output_lines, null, false);
    update public.store_order_plan_action
    set result_document_id = v_id
    where plan_id = p_plan_id and kind = 'produce' and plant_id = r.plant_id;
  end loop;

  if exists (
    select 1 from public.store_order_coverage(v_order) c
    where c.shipped + c.warehouse + c.transfer + c.output > c.ordered
  ) then
    raise exception 'Запуск дал бы лишнее по заказу клиента';
  end if;

  update public.store_order_plan
  set launched_at = now(),
      updated_at = now(),
      launched_by = public.store_current_user_id(),
      launched_coverage = coalesce(v_coverage, '[]'::jsonb)
  where id = p_plan_id;

  return public.store_order_plan_payload(v_order);
end;
$f$;

revoke all on function public.store_create_order_plan(bigint, text, bigint) from public;
revoke all on function public.store_rename_order_plan(bigint, text) from public;
revoke all on function public.store_set_order_plan_archived(bigint, boolean) from public;
revoke all on function public.store_set_order_plan_action(bigint, text, bigint, bigint, bigint, bigint, numeric) from public;
revoke all on function public.store_launch_order_plan(bigint) from public;
grant execute on function public.store_create_order_plan(bigint, text, bigint) to anon, authenticated, service_role;
grant execute on function public.store_rename_order_plan(bigint, text) to anon, authenticated, service_role;
grant execute on function public.store_set_order_plan_archived(bigint, boolean) to anon, authenticated, service_role;
grant execute on function public.store_set_order_plan_action(bigint, text, bigint, bigint, bigint, bigint, numeric) to anon, authenticated, service_role;
grant execute on function public.store_launch_order_plan(bigint) to anon, authenticated, service_role;

-- Чтение карточки заказа клиента: + order_plan --------------------------------------------------

create or replace function public.store_document_context(p_kind text, p_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $f$
declare
  v_kind text := case when p_kind = 'output' then 'production_output' else p_kind end;
  v_id bigint;
  v_loc bigint;
  v_owner bigint;
  v_variants bigint[];
  v_docs bigint[];
  v_scope_docs bigint[];
  v_scope_variants bigint[];
  v_extra jsonb := '{}'::jsonb;
begin
  select d.id into v_id
  from store_document d
  where d.kind = v_kind
    and (d.id::text = p_ref or d.sequence_number::text = p_ref)
  order by case when d.sequence_number::text = p_ref then 0 else 1 end
  limit 1;

  if v_id is null then
    return jsonb_build_object('found', false, 'kind', v_kind, 'ref', p_ref);
  end if;

  select coalesce(array_agg(distinct l.product_variant_id), array[]::bigint[])
  into v_variants
  from store_document_product_line l
  where l.document_id = v_id;

  v_docs := array[v_id] || array(
    select o.id from store_production_output o where o.production_order_id = v_id
  );

  -- Orders and transfers own a stock location (and a customer order an owner):
  -- pull in documents and products that touch them, not only the line products.
  select c.stock_location_id, c.stock_owner_id into v_loc, v_owner
  from store_customer_order c where c.id = v_id;
  if v_loc is null then
    select p.stock_location_id into v_loc from store_production_order p where p.id = v_id;
  end if;
  if v_loc is null then
    select t.stock_location_id into v_loc from store_transfer t where t.id = v_id;
  end if;

  if v_loc is not null then
    select s.document_ids, s.variant_ids into v_scope_docs, v_scope_variants
    from store_place_scope(v_loc, v_owner) s;
    v_docs := v_docs || v_scope_docs;
    v_variants := v_variants || v_scope_variants;
  end if;

  if v_kind = 'customer_order' then
    v_extra := jsonb_build_object('order_plan', store_order_plan_payload(v_id));
    v_docs := v_docs || array(
      select a.result_document_id
      from store_order_plan_action a
      join store_order_plan p on p.id = a.plan_id
      where p.customer_order_id = v_id and a.result_document_id is not null
    );
  end if;

  return store_context_payload(v_variants, v_docs, true, false)
    || v_extra
    || jsonb_build_object('found', true, 'document_id', v_id, 'kind', v_kind);
end;
$f$;

notify pgrst, 'reload schema';

commit;
