-- Page read model for /store/logistics/calendar (output × month matrix).

begin;

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
      sum(b.quantity) as quantity
    from store_stock_balance_ref b
    where b.location_kind in ('warehouse', 'transfer')
    group by b.product_variant_id, b.stock_owner_id
    having sum(b.quantity) <> 0
  ),
  output_lines as (
    select
      o.id as "outputId",
      store_doc_number(d.kind, d.sequence_number) as "outputNumber",
      d.status,
      d.expected_end_on as "expectedEndOn",
      po.id as "productionOrderId",
      store_doc_number(pod.kind, pod.sequence_number) as "productionOrderNumber",
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
    where d.status in ('draft', 'in_progress')
    order by o.id, l.id
  ),
  open_orders as (
    select
      po.id as "productionOrderId",
      store_doc_number(d.kind, d.sequence_number) as number,
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
    'customerOrders', coalesce((select jsonb_agg((to_jsonb(o) - 'sequenceNumber') order by o."sequenceNumber", o.id) from customer_orders o), '[]'::jsonb),
    'stock', coalesce((select jsonb_agg(to_jsonb(s) order by s."productId", s."ownerId") from stock_rows s), '[]'::jsonb),
    'outputLines', coalesce((select jsonb_agg((to_jsonb(l) - 'lineId') order by l."outputId", l."lineId") from output_lines l), '[]'::jsonb),
    'openOrders', coalesce((select jsonb_agg(to_jsonb(o) order by o."productionOrderId", o."productId") from open_orders o), '[]'::jsonb)
  );
$f$;

revoke all on function public.store_output_calendar_page() from public, anon, authenticated;
grant execute on function public.store_output_calendar_page() to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
