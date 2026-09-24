-- Выпуск: статусы draft / done / cancelled. draft показывается «Запланирован».
-- in_progress выпуска переписывается в draft без новой записи истории.

begin;

alter table public.store_document disable trigger store_document_history_trg;
alter table public.store_document_history disable trigger store_document_history_no_update;

update public.store_document
set status = 'draft'
where kind = 'production_output'
  and status = 'in_progress';

update public.store_document_history h
set status = 'draft'
from public.store_document d
where h.document_id = d.id
  and d.kind = 'production_output'
  and h.status = 'in_progress';

alter table public.store_document enable trigger store_document_history_trg;
alter table public.store_document_history enable trigger store_document_history_no_update;

update public.store_document_kind
set allowed_statuses = array['draft', 'done', 'cancelled']
where code = 'production_output';

create or replace function public.store_document_header_guard()
returns trigger
language plpgsql
as $f$
declare
  v_allowed text[];
begin
  if tg_op = 'DELETE' then
    raise exception 'Документы Store нельзя удалять';
  end if;
  if old.kind is distinct from new.kind
     or old.sequence_number is distinct from new.sequence_number
     or old.created_at is distinct from new.created_at
     or old.created_by is distinct from new.created_by then
    raise exception 'Идентичность документа нельзя изменять';
  end if;
  if old.status in ('done', 'cancelled')
     and (
       new.status is distinct from old.status
       or new.description is distinct from old.description
       or new.expected_end_on is distinct from old.expected_end_on
     ) then
    raise exception 'Завершённый документ нельзя изменять';
  end if;
  if new.status is distinct from old.status then
    select allowed_statuses into v_allowed
    from public.store_document_kind
    where code = new.kind;
    if new.status is null or not (new.status = any (coalesce(v_allowed, '{}'))) then
      raise exception 'Статус % недопустим для вида %', new.status, new.kind;
    end if;
  end if;
  return new;
end;
$f$;

create or replace function public.store_po_assigned_qty(
  p_po_id bigint,
  p_variant_id bigint,
  p_owner_id bigint default null
)
returns numeric language sql stable as $f$
  -- Занятое в запланированных выпусках (draft), to_owner ≠ free.
  select coalesce(sum(l.quantity), 0)
  from public.store_document_product_line l
  join public.store_production_output o on o.id = l.document_id
  join public.store_document d on d.id = o.id
  where o.production_order_id = p_po_id
    and d.status = 'draft'
    and l.product_variant_id = p_variant_id
    and coalesce(l.to_owner_id, public.store_free_owner_id()) <> public.store_free_owner_id()
    and (
      p_owner_id is null
      or l.to_owner_id = p_owner_id
    );
$f$;

create or replace function public.store_cancel_po_active_outputs(p_po_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $f$
begin
  update public.store_document d
  set status = 'cancelled'
  from public.store_production_output o
  where o.id = d.id
    and o.production_order_id = p_po_id
    and d.status = 'draft';
end;
$f$;

create or replace function public.store_output_calendar_page()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  with
  free as (
    select public.store_free_owner_id() as id
  ),
  categories as (
    select
      c.id,
      c.parent_id as "parentId",
      c.name
    from store_category c
    where c.deleted_at is null
    order by c.id
  ),
  products as (
    select
      v.id,
      coalesce(v.name, p.name) as name,
      coalesce(v.unit, 'шт') as unit,
      v.plant_id as "plantId",
      coalesce(
        (
          select jsonb_agg(pc.category_id order by pc.category_id)
          from store_product_category pc
          join store_category c on c.id = pc.category_id and c.deleted_at is null
          where pc.product_id = v.product_id
        ),
        '[]'::jsonb
      ) as "categoryIds"
    from store_product_variant v
    join store_product p on p.id = v.product_id
    where p.deleted_at is null
      and v.deleted_at is null
    order by v.id
  ),
  plants as (
    select pl.id
    from store_plant pl
    where pl.deleted_at is null
    order by pl.id
  ),
  regions as (
    select
      r.id,
      r.name,
      r.stock_owner_id as "ownerId"
    from store_region r
    where r.deleted_at is null
    order by r.id
  ),
  stock_rows as (
    select
      b.product_variant_id as "productId",
      b.stock_owner_id as "ownerId",
      b.location_kind as "locationKind",
      b.location_entity_id as "locationId",
      td.sequence_number as "locationSequence",
      sum(b.quantity) as quantity
    from store_stock_balance_ref b
    left join store_document td on td.id = b.location_entity_id and b.location_kind = 'transfer'
    where b.location_kind in ('warehouse', 'transfer')
    group by b.product_variant_id, b.stock_owner_id, b.location_kind, b.location_entity_id, td.sequence_number
    having sum(b.quantity) <> 0
  ),
  output_lines as (
    select
      o.id as "outputId",
      store_doc_number(d.kind, d.sequence_number) as "outputNumber",
      d.sequence_number as "outputSequence",
      d.status,
      d.expected_end_on as "expectedEndOn",
      po.id as "productionOrderId",
      store_doc_number(pod.kind, pod.sequence_number) as "productionOrderNumber",
      pod.sequence_number as "productionOrderSequence",
      po.plant_id as "plantId",
      l.product_variant_id as "productId",
      coalesce(l.to_owner_id, (select id from free)) as "ownerId",
      l.quantity,
      l.id as "lineId"
    from store_production_output o
    join store_document d on d.id = o.id
    join store_production_order po on po.id = o.production_order_id
    join store_document pod on pod.id = po.id
    join store_document_product_line l on l.document_id = o.id
    where d.status = 'draft'
    order by o.id, l.id
  ),
  open_orders as (
    select
      po.id as "productionOrderId",
      store_doc_number(d.kind, d.sequence_number) as number,
      d.sequence_number as "sequenceNumber",
      po.plant_id as "plantId",
      l.product_variant_id as "productId",
      (sum(l.quantity) - public.store_po_output_qty(po.id, l.product_variant_id)) as remaining
    from store_production_order po
    join store_document d on d.id = po.id
    join store_document_product_line l on l.document_id = po.id
    where d.status not in ('done', 'cancelled')
    group by po.id, d.kind, d.sequence_number, po.plant_id, l.product_variant_id
    having (sum(l.quantity) - public.store_po_output_qty(po.id, l.product_variant_id)) > 0
    order by po.id, l.product_variant_id
  ),
  owning_order_ids as (
    select distinct orf.entity_id as id
    from store_owner_ref orf
    where orf.kind = 'customer_order'
      and (
        orf.stock_owner_id in (select "ownerId" from stock_rows)
        or orf.stock_owner_id in (select "ownerId" from output_lines)
      )
  ),
  customer_orders as (
    select
      co.id,
      store_doc_number(d.kind, d.sequence_number) as number,
      co.region_id as "regionId",
      co.stock_owner_id as "ownerId",
      d.sequence_number as "sequenceNumber"
    from store_customer_order co
    join store_document d on d.id = co.id
    where d.status not in ('done', 'cancelled')
       or co.id in (select id from owning_order_ids)
    order by d.sequence_number, co.id
  )
  select jsonb_build_object(
    'freeOwnerId', (select id from free),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from categories c), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from products p), '[]'::jsonb),
    'plants', coalesce((select jsonb_agg(to_jsonb(pl) order by pl.id) from plants pl), '[]'::jsonb),
    'regions', coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from regions r), '[]'::jsonb),
    'customerOrders', coalesce((select jsonb_agg(to_jsonb(o) order by o."sequenceNumber", o.id) from customer_orders o), '[]'::jsonb),
    'stock', coalesce((select jsonb_agg(to_jsonb(s) order by s."productId", s."locationKind", s."locationId", s."ownerId") from stock_rows s), '[]'::jsonb),
    'outputLines', coalesce((select jsonb_agg((to_jsonb(l) - 'lineId') order by l."outputId", l."lineId") from output_lines l), '[]'::jsonb),
    'openOrders', coalesce((select jsonb_agg(to_jsonb(o) order by o."productionOrderId", o."productId") from open_orders o), '[]'::jsonb)
  );
$f$;

revoke all on function public.store_output_calendar_page() from public, anon, authenticated;
grant execute on function public.store_output_calendar_page() to anon, authenticated, service_role;

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
  select status into v_status from public.store_document where id = p_output_id;
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

notify pgrst, 'reload schema';

commit;
