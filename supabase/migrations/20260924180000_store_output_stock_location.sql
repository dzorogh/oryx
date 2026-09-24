-- Выпуск — место количества: вид production_output в store_stock_location.
-- Проводок на месте выпуска нет: количество черновика считается из его строк.
-- store_create_production_output получает p_allow_done_order (запуск плана докидывает в закрытый PO).

begin;

-- 1. Вид места
alter table public.store_stock_location drop constraint store_stock_location_kind_check;
alter table public.store_stock_location
  add constraint store_stock_location_kind_check
  check (kind = any (array['warehouse', 'production_order', 'transfer', 'customer_order', 'production_output']));

comment on table public.store_stock_location is
  'Реестр мест количества. Warehouse, production_order, transfer, customer_order и production_output получают независимый id здесь; операционные таблицы ссылаются одним location_id FK без polymorphic type/id. Проводки журнала бывают только на warehouse, transfer и customer_order.';
comment on column public.store_stock_location.kind is
  'Тип места: warehouse | production_order | transfer | customer_order | production_output. Должен соответствовать сущности, владеющей этим id (централизованный assert).';

-- 2–3. Место каждому выпуску
alter table public.store_production_output add column stock_location_id bigint;

do $$
declare
  r record;
begin
  for r in select id from public.store_production_output where stock_location_id is null order by id
  loop
    update public.store_production_output
    set stock_location_id = public.store_new_stock_location('production_output')
    where id = r.id;
  end loop;
end;
$$;

alter table public.store_production_output alter column stock_location_id set not null;
alter table public.store_production_output
  add constraint store_production_output_stock_location_id_key unique (stock_location_id);
alter table public.store_production_output
  add constraint store_production_output_stock_location_id_fkey
  foreign key (stock_location_id) references public.store_stock_location (id);

comment on column public.store_production_output.stock_location_id is
  'FK NOT NULL UNIQUE на store_stock_location kind=production_output. Количество по паре «место выпуска × владелец» — сумма строк черновика выпуска с этим to_owner_id; проводок на этом месте нет.';

-- 9. Комментарий места заказа на производство
comment on table public.store_production_order is
  'Подтип заказа на производство: план потребности, не складской WIP. Место kind=production_order — незанятый план (владелец «свободно»), без фактов журнала.';
comment on column public.store_production_order.stock_location_id is
  'FK UNIQUE на store_stock_location kind=production_order — место незанятого плана (владелец «свободно»), без проводок.';

-- 4. Выпуск создаёт своё место; p_allow_done_order — выпуск по закрытому заказу (только черновик)
drop function if exists public.store_create_production_output(bigint, jsonb, date, boolean, text, bigint, bigint, timestamptz);

create function public.store_create_production_output(
  p_production_order_id bigint,
  p_lines jsonb,
  p_expected_end_on date default null,
  p_complete boolean default true,
  p_description text default '',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null,
  p_allow_done_order boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_plant bigint;
  v_wh_loc bigint;
  v_status text;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_alloc_owner bigint;
  v_alloc_qty numeric;
  v_free_qty numeric;
  v_free bigint := public.store_free_owner_id();
  v_committed numeric;
  v_plan numeric;
begin
  perform public.store_assert_subtype_kind(p_production_order_id, 'production_order');
  select status into v_status from public.store_document where id = p_production_order_id;
  if v_status = 'cancelled'
     or (v_status = 'done' and not (coalesce(p_allow_done_order, false) and not coalesce(p_complete, true))) then
    raise exception 'Нельзя выпускать по завершённому заказу на производство';
  end if;
  select po.plant_id, w.stock_location_id into v_plant, v_wh_loc
  from public.store_production_order po
  join public.store_plant p on p.id = po.plant_id
  join public.store_warehouse w on w.id = p.warehouse_id
  where po.id = p_production_order_id;

  v_id := public.store_create_document(
    'production_output', coalesce(p_description, ''), 'draft',
    p_expected_end_on, p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_production_output (id, production_order_id, stock_location_id)
  values (v_id, p_production_order_id, public.store_new_stock_location('production_output'));

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Количество выпуска должно быть больше нуля';
    end if;
    v_plan := public.store_po_plan_qty(p_production_order_id, v_variant);
    v_committed := public.store_po_output_qty(p_production_order_id, v_variant);
    if v_committed + v_qty > v_plan then
      raise exception 'Нельзя выпустить больше плана по варианту %', v_variant;
    end if;

    v_alloc_owner := coalesce((e->>'allocation_owner_id')::bigint, v_free);
    if e ? 'allocation_quantity' and e->>'allocation_quantity' is not null then
      v_alloc_qty := (e->>'allocation_quantity')::numeric;
    elsif v_alloc_owner <> v_free then
      v_alloc_qty := v_qty;
    else
      v_alloc_qty := 0;
    end if;
    if v_alloc_qty < 0 or v_alloc_qty > v_qty then
      raise exception 'Занятое количество не может превышать выпуск';
    end if;
    v_free_qty := v_qty - v_alloc_qty;

    if v_alloc_qty > 0 then
      perform public.store_insert_line(v_id, v_variant, v_alloc_qty, null, v_alloc_owner);
      if p_complete then
        perform public.store_lock_stock_keys(jsonb_build_array(
          jsonb_build_object('v', v_variant, 'l', v_wh_loc, 'o', v_alloc_owner)
        ));
        perform public.store_write_tx(v_variant, v_alloc_qty, v_wh_loc, v_alloc_owner, v_id);
      end if;
    end if;
    if v_free_qty > 0 then
      perform public.store_insert_line(v_id, v_variant, v_free_qty, null, v_free);
      if p_complete then
        perform public.store_lock_stock_keys(jsonb_build_array(
          jsonb_build_object('v', v_variant, 'l', v_wh_loc, 'o', v_free)
        ));
        perform public.store_write_tx(v_variant, v_free_qty, v_wh_loc, v_free, v_id);
      end if;
    end if;
  end loop;

  if p_complete then
    update public.store_document set status = 'done' where id = v_id;
  end if;
  return jsonb_build_object('id', v_id);
end;
$f$;

revoke all on function public.store_create_production_output(bigint, jsonb, date, boolean, text, bigint, bigint, timestamptz, boolean) from public;
grant execute on function public.store_create_production_output(bigint, jsonb, date, boolean, text, bigint, bigint, timestamptz, boolean) to anon, authenticated, service_role;

-- 5. Перевод владельца в черновике выпуска блокирует оба ключа «место выпуска × владелец»
create or replace function public.store_move_in_production_output(
  p_output_id bigint,
  p_from_owner_id bigint,
  p_to_owner_id bigint,
  p_lines jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_loc bigint;
  v_free bigint := public.store_free_owner_id();
  v_from bigint := coalesce(p_from_owner_id, public.store_free_owner_id());
  v_to bigint := coalesce(p_to_owner_id, public.store_free_owner_id());
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_src record;
  v_dst record;
begin
  perform public.store_assert_subtype_kind(p_output_id, 'production_output');
  select d.status, o.stock_location_id into v_status, v_loc
  from public.store_document d
  join public.store_production_output o on o.id = d.id
  where d.id = p_output_id
  for update of d;
  if v_status is distinct from 'draft' then
    raise exception 'Резерв в выпуске можно менять только в запланированном выпуске';
  end if;
  if v_from = v_to then
    raise exception 'Владельцы источника и назначения совпадают';
  end if;
  if not exists (select 1 from public.store_stock_owner where id = v_from)
     or not exists (select 1 from public.store_stock_owner where id = v_to) then
    raise exception 'Владелец не найден';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Нужна хотя бы одна строка';
  end if;

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Количество должно быть больше нуля';
    end if;

    perform public.store_lock_stock_keys(jsonb_build_array(
      jsonb_build_object('v', v_variant, 'l', v_loc, 'o', v_from),
      jsonb_build_object('v', v_variant, 'l', v_loc, 'o', v_to)
    ));

    select id, quantity into v_src
    from public.store_document_product_line
    where document_id = p_output_id
      and product_variant_id = v_variant
      and coalesce(to_owner_id, v_free) = v_from
    for update;
    if v_src.id is null or v_src.quantity < v_qty then
      if v_from = v_free then
        raise exception 'Недостаточно свободного количества в запланированном выпуске';
      end if;
      raise exception 'Недостаточно зарезервированного количества в запланированном выпуске';
    end if;

    if v_src.quantity = v_qty then
      delete from public.store_document_product_line where id = v_src.id;
    else
      update public.store_document_product_line set quantity = quantity - v_qty where id = v_src.id;
    end if;

    select id, quantity into v_dst
    from public.store_document_product_line
    where document_id = p_output_id
      and product_variant_id = v_variant
      and coalesce(to_owner_id, v_free) = v_to
    for update;
    if v_dst.id is null then
      perform public.store_insert_line(p_output_id, v_variant, v_qty, null, v_to);
    else
      update public.store_document_product_line set quantity = quantity + v_qty where id = v_dst.id;
    end if;
  end loop;

  return 'ok';
end;
$f$;

-- 6. Резерв документом не принимает место выпуска
create or replace function public.store_create_and_post_reservation(
  p_location_id bigint,
  p_owner_id bigint,
  p_lines jsonb,
  p_description text default '',
  p_creation_source text default 'manual',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_loc_kind text;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_from_owner bigint;
  v_free bigint := public.store_free_owner_id();
begin
  select kind into v_loc_kind from public.store_stock_location where id = p_location_id;
  if v_loc_kind is null then raise exception 'Место % не найдено', p_location_id; end if;
  if v_loc_kind in ('production_order', 'production_output') then
    raise exception 'Резервируйте в выпуске заказа на производство';
  end if;
  if v_loc_kind not in ('warehouse', 'transfer') then
    raise exception 'Резерв допускает места warehouse, transfer';
  end if;
  if not exists (select 1 from public.store_stock_owner where id = p_owner_id) then
    raise exception 'Владелец % не найден', p_owner_id;
  end if;
  if p_creation_source not in ('manual', 'customer_order_close', 'production_order_close') then
    raise exception 'Некорректный creation_source';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Нужна хотя бы одна строка резерва';
  end if;

  v_id := public.store_create_document(
    'reservation', coalesce(p_description, ''), null, null,
    p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_reservation (id, location_id, owner_id, creation_source, posted_at)
  values (v_id, p_location_id, p_owner_id, p_creation_source, coalesce(p_created_at, now()));

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    v_from_owner := coalesce((e->>'from_owner_id')::bigint, v_free);
    perform public.store_insert_line(v_id, v_variant, v_qty, v_from_owner, null);
    perform public.store_move(
      v_variant, v_qty, p_location_id, v_from_owner, p_location_id, p_owner_id, v_id
    );
  end loop;

  return jsonb_build_object('id', v_id);
end;
$f$;

-- 7. store_location_ref включает выпуски
create or replace view public.store_location_ref with (security_invoker = true) as
select w.stock_location_id, 'warehouse'::text as kind, w.id as entity_id
from public.store_warehouse w
union all
select c.stock_location_id, 'customer_order'::text as kind, c.id as entity_id
from public.store_customer_order c
union all
select p.stock_location_id, 'production_order'::text as kind, p.id as entity_id
from public.store_production_order p
union all
select t.stock_location_id, 'transfer'::text as kind, t.id as entity_id
from public.store_transfer t
union all
select o.stock_location_id, 'production_output'::text as kind, o.id as entity_id
from public.store_production_output o;

comment on view public.store_location_ref is
  'Maps stock_location_id → (kind, entity_id) for warehouse / customer_order / production_order / transfer / production_output.';

-- 8. Контекст отдаёт stock_location_id выпусков
create or replace function public.store_context_payload(
  p_variant_ids bigint[],
  p_document_ids bigint[],
  p_include_transactions boolean default true,
  p_balances_all boolean default false
)
returns jsonb
language plpgsql
stable
set search_path = public
as $f$
declare
  v_p bigint[];
  v_d0 bigint[];
  v_d bigint[];
  v_variants bigint[];
begin
  v_p := coalesce(p_variant_ids, array[]::bigint[]);
  v_d0 := coalesce(p_document_ids, array[]::bigint[]);

  -- D = D0 ∪ docs with lines on P ∪ docs appearing in transactions on P
  select coalesce(array_agg(distinct x), array[]::bigint[])
  into v_d
  from (
    select unnest(v_d0) as x
    union
    select l.document_id
    from store_document_product_line l
    where cardinality(v_p) > 0 and l.product_variant_id = any (v_p)
    union
    select t.document_id
    from store_stock_transaction t
    where cardinality(v_p) > 0 and t.product_variant_id = any (v_p)
  ) s;

  -- variants = P ∪ products from lines of D
  select coalesce(array_agg(distinct x), array[]::bigint[])
  into v_variants
  from (
    select unnest(v_p) as x
    union
    select l.product_variant_id
    from store_document_product_line l
    where cardinality(v_d) > 0 and l.document_id = any (v_d)
  ) s;

  return jsonb_build_object(
    'document_kinds', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.code), '[]'::jsonb)
      from (select code, number_prefix from store_document_kind) r
    ),
    'documents', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, kind, sequence_number, description, status, expected_end_on, created_at, created_by
        from store_document
        where id = any (v_d)
           or kind in ('customer_order', 'production_order', 'transfer')
      ) r
    ),
    'product_variants', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, product_id, name, unit, image_url, plant_id
        from store_product_variant
        where id = any (v_variants)
      ) r
    ),
    'warehouses', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, name, stock_location_id from store_warehouse) r
    ),
    'plants', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, name, warehouse_id from store_plant) r
    ),
    'regions', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, code, name, stock_owner_id from store_region) r
    ),
    'stock_locations', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, kind from store_stock_location) r
    ),
    'stock_owners', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, kind from store_stock_owner) r
    ),
    'customer_orders', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, region_id, stock_location_id, stock_owner_id from store_customer_order) r
    ),
    'production_orders', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, plant_id, stock_location_id from store_production_order) r
    ),
    'transfers', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, from_warehouse_id, to_warehouse_id, stock_location_id from store_transfer) r
    ),
    'reservations', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, location_id, owner_id, creation_source, posted_at
        from store_reservation
        where id = any (v_d)
      ) r
    ),
    'shipments', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, from_location_id, to_location_id
        from store_shipment
        where id = any (v_d)
      ) r
    ),
    'production_outputs', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, production_order_id, stock_location_id
        from store_production_output
        where id = any (v_d)
      ) r
    ),
    'adjustments', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, location_id
        from store_adjustment
        where id = any (v_d)
      ) r
    ),
    'document_product_lines', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, document_id, product_variant_id, quantity, from_owner_id, to_owner_id,
               variant_name, unit_price, currency_id
        from store_document_product_line
        where document_id = any (v_d)
      ) r
    ),
    'stock_transactions', case
      when not p_include_transactions then '[]'::jsonb
      else (
        select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at, r.id), '[]'::jsonb)
        from (
          select id, created_at, product_variant_id, quantity, location_id, owner_id, document_id
          from store_stock_transaction
          where product_variant_id = any (v_p)
        ) r
      )
    end,
    'users', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, name from app_user) r
    ),
    'document_history', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, document_id, status, expected_end_on, changed_at, changed_by
        from store_document_history
        where document_id = any (v_d)
      ) r
    ),
    'balances', case
      when p_balances_all then store_balance_json(null)
      when cardinality(v_p) > 0 then store_balance_json(v_p)
      else '[]'::jsonb
    end
  );
end;
$f$;

notify pgrst, 'reload schema';

commit;
