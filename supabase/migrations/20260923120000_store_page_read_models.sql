-- Page-scoped read models for logistics lists, details, and create dialogs.
-- Replaces store_logistics_snapshot with one RPC per page/dialog.

begin;

drop function if exists public.store_logistics_snapshot();

-- ---------------------------------------------------------------------------
-- Location / owner / balance projection views
-- ---------------------------------------------------------------------------

create or replace view public.store_location_ref
with (security_invoker = true)
as
select w.stock_location_id, 'warehouse'::text as kind, w.id as entity_id
from public.store_warehouse w
union all
select c.stock_location_id, 'customer_order'::text, c.id
from public.store_customer_order c
union all
select p.stock_location_id, 'production_order'::text, p.id
from public.store_production_order p
union all
select t.stock_location_id, 'transfer'::text, t.id
from public.store_transfer t;

comment on view public.store_location_ref is
  'Maps stock_location_id → (kind, entity_id) for warehouse / customer_order / production_order / transfer.';

create or replace view public.store_owner_ref
with (security_invoker = true)
as
select o.id as stock_owner_id, 'free'::text as kind, null::bigint as entity_id
from public.store_stock_owner o
where o.kind = 'free'
union all
select c.stock_owner_id, 'customer_order'::text, c.id
from public.store_customer_order c
union all
select r.stock_owner_id, 'region'::text, r.id
from public.store_region r;

comment on view public.store_owner_ref is
  'Maps stock_owner_id → (kind, entity_id) for free / customer_order / region.';

create or replace view public.store_stock_balance_ref
with (security_invoker = true)
as
select
  b.product_variant_id,
  b.location_id as stock_location_id,
  b.owner_id as stock_owner_id,
  lr.kind as location_kind,
  lr.entity_id as location_entity_id,
  orf.kind as owner_kind,
  orf.entity_id as owner_entity_id,
  case
    when lr.kind = 'customer_order' then 'shipped'
    when orf.kind = 'free' then 'free'
    else 'reserved'
  end as stock_state,
  b.quantity
from public.store_stock_balance b
join public.store_location_ref lr on lr.stock_location_id = b.location_id
join public.store_owner_ref orf on orf.stock_owner_id = b.owner_id;

comment on view public.store_stock_balance_ref is
  'Projected stock balances with location/owner entity ids and derived stock_state (free/reserved/shipped).';

revoke all on public.store_location_ref from public, anon, authenticated;
revoke all on public.store_owner_ref from public, anon, authenticated;
revoke all on public.store_stock_balance_ref from public, anon, authenticated;
grant select on public.store_location_ref to anon, authenticated, service_role;
grant select on public.store_owner_ref to anon, authenticated, service_role;
grant select on public.store_stock_balance_ref to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helpers (internal — no anon execute). Public read RPCs below are
-- SECURITY DEFINER so they can call these; they only read tables that anon
-- can already SELECT.
-- ---------------------------------------------------------------------------

create or replace function public.store_doc_number(p_kind text, p_sequence bigint)
returns text
language sql
stable
set search_path = public
as $f$
  select coalesce(
    (select number_prefix from store_document_kind where code = p_kind),
    upper(p_kind)
  ) || '-' || p_sequence::text;
$f$;

create or replace function public.store_balance_json(p_variant_ids bigint[] default null)
returns jsonb
language sql
stable
set search_path = public
as $f$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.product_variant_id, r.stock_location_id, r.stock_owner_id), '[]'::jsonb)
  from (
    select
      product_variant_id,
      stock_location_id,
      stock_owner_id,
      location_kind,
      location_entity_id,
      owner_kind,
      owner_entity_id,
      stock_state,
      quantity
    from store_stock_balance_ref
    where p_variant_ids is null or product_variant_id = any (p_variant_ids)
  ) r;
$f$;

create or replace function public.store_product_lines_json(p_document_id bigint)
returns jsonb
language sql
stable
set search_path = public
as $f$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
  from (
    select
      l.id,
      l.product_variant_id as "productId",
      l.quantity,
      coalesce(l.variant_name, v.name) as "productName",
      coalesce(v.sku, '') as "productSku",
      coalesce(v.unit, 'шт') as "productUnit"
    from store_document_product_line l
    left join store_product_variant v on v.id = l.product_variant_id
    where l.document_id = p_document_id
  ) r;
$f$;

-- ---------------------------------------------------------------------------
-- List RPCs — ready table rows
-- ---------------------------------------------------------------------------

create or replace function public.store_customer_order_list()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  with line_qty as (
    select
      l.document_id,
      l.product_variant_id,
      l.quantity as ordered_qty
    from store_document_product_line l
    join store_document d on d.id = l.document_id and d.kind = 'customer_order'
  ),
  bal as (
    select
      co.id as order_id,
      b.product_variant_id,
      coalesce(sum(b.quantity) filter (
        where b.stock_state = 'reserved'
          and b.owner_kind = 'customer_order'
          and b.owner_entity_id = co.id
      ), 0) as reserved_qty,
      coalesce(sum(b.quantity) filter (
        where b.stock_state = 'shipped'
          and b.owner_kind = 'customer_order'
          and b.owner_entity_id = co.id
      ), 0) as shipped_qty
    from store_customer_order co
    left join store_stock_balance_ref b
      on b.owner_kind = 'customer_order' and b.owner_entity_id = co.id
    group by co.id, b.product_variant_id
  ),
  per_line as (
    select
      lq.document_id as order_id,
      lq.ordered_qty,
      coalesce(b.reserved_qty, 0) as reserved_qty,
      coalesce(b.shipped_qty, 0) as shipped_qty,
      greatest(0, lq.ordered_qty - coalesce(b.shipped_qty, 0) - coalesce(b.reserved_qty, 0)) as open_qty
    from line_qty lq
    left join bal b
      on b.order_id = lq.document_id and b.product_variant_id = lq.product_variant_id
  ),
  totals as (
    select
      order_id,
      coalesce(sum(reserved_qty), 0) as reserved,
      coalesce(sum(shipped_qty), 0) as shipped,
      coalesce(sum(open_qty), 0) as open_to_reserve
    from per_line
    group by order_id
  )
  select coalesce(jsonb_agg(to_jsonb(r) order by r."createdAt" desc, r.id desc), '[]'::jsonb)
  from (
    select
      d.id::text as id,
      d.sequence_number::text as "sequenceNumber",
      store_doc_number(d.kind, d.sequence_number) as number,
      coalesce(d.status, 'in_progress') as status,
      d.expected_end_on as "expectedEndOn",
      d.created_at as "createdAt",
      coalesce(d.description, '') as description,
      store_product_lines_json(d.id) as products,
      coalesce(t.reserved, 0) as reserved,
      coalesce(t.shipped, 0) as shipped,
      coalesce(t.open_to_reserve, 0) as "openToReserve"
    from store_document d
    join store_customer_order co on co.id = d.id
    left join totals t on t.order_id = d.id
  ) r;
$f$;

create or replace function public.store_production_order_list()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
  from (
    select
      d.id::text as id,
      d.sequence_number::text as "sequenceNumber",
      store_doc_number(d.kind, d.sequence_number) as number,
      coalesce(d.status, 'draft') as status,
      d.expected_end_on as "expectedEndOn",
      d.created_at as "createdAt",
      po.plant_id::text as "plantId",
      store_product_lines_json(d.id) as products
    from store_document d
    join store_production_order po on po.id = d.id
  ) r;
$f$;

create or replace function public.store_transfer_list()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
  from (
    select
      d.id::text as id,
      d.sequence_number::text as "sequenceNumber",
      store_doc_number(d.kind, d.sequence_number) as number,
      coalesce(d.status, 'in_progress') as status,
      d.expected_end_on as "expectedEndOn",
      d.created_at as "createdAt",
      t.from_warehouse_id::text as "fromWarehouseId",
      t.to_warehouse_id::text as "toWarehouseId",
      store_product_lines_json(d.id) as products
    from store_document d
    join store_transfer t on t.id = d.id
  ) r;
$f$;

create or replace function public.store_shipment_list()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
  from (
    select
      d.id::text as id,
      d.sequence_number::text as "sequenceNumber",
      store_doc_number(d.kind, d.sequence_number) as number,
      d.created_at as "createdAt",
      fl.kind as "fromLocationType",
      fl.entity_id::text as "fromLocationId",
      tl.kind as "toLocationType",
      tl.entity_id::text as "toLocationId",
      case
        when fl.kind = 'customer_order' then 'return'
        else 'shipment'
      end as direction,
      coalesce(
        case when fl.kind = 'customer_order' then fl.entity_id::text end,
        case when tl.kind = 'customer_order' then tl.entity_id::text end,
        ''
      ) as "customerOrderId",
      coalesce(
        case
          when fl.kind = 'customer_order' then store_doc_number('customer_order', fd.sequence_number)
          when tl.kind = 'customer_order' then store_doc_number('customer_order', td.sequence_number)
        end,
        ''
      ) as "customerOrderNumber",
      store_product_lines_json(d.id) as products
    from store_document d
    join store_shipment s on s.id = d.id
    left join store_location_ref fl on fl.stock_location_id = s.from_location_id
    left join store_location_ref tl on tl.stock_location_id = s.to_location_id
    left join store_document fd on fd.id = fl.entity_id and fl.kind = 'customer_order'
    left join store_document td on td.id = tl.entity_id and tl.kind = 'customer_order'
  ) r;
$f$;

create or replace function public.store_output_list()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
  from (
    select
      d.id::text as id,
      d.sequence_number::text as "sequenceNumber",
      store_doc_number(d.kind, d.sequence_number) as number,
      coalesce(d.status, 'draft') as status,
      d.expected_end_on as "expectedEndOn",
      d.created_at as "createdAt",
      o.production_order_id::text as "productionOrderId",
      store_doc_number('production_order', pod.sequence_number) as "productionOrderNumber",
      pod.sequence_number::text as "productionOrderSequenceNumber",
      store_product_lines_json(d.id) as products
    from store_document d
    join store_production_output o on o.id = d.id
    left join store_document pod on pod.id = o.production_order_id
  ) r;
$f$;

create or replace function public.store_adjustment_list()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
  from (
    select
      d.id::text as id,
      d.sequence_number::text as "sequenceNumber",
      store_doc_number(d.kind, d.sequence_number) as number,
      d.created_at as "createdAt",
      coalesce(d.description, '') as description,
      a.location_id as stock_location_id,
      lr.entity_id::text as "warehouseId",
      store_product_lines_json(d.id) as products,
      (
        select coalesce(sum(l.quantity), 0)
        from store_document_product_line l
        where l.document_id = d.id
      ) as "signedQuantity",
      case
        when (
          select bool_and(l.quantity < 0)
          from store_document_product_line l where l.document_id = d.id
        ) then 'write_off'
        when (
          select bool_and(l.quantity > 0)
          from store_document_product_line l where l.document_id = d.id
        ) then 'increase'
        else 'mixed'
      end as operation
    from store_document d
    join store_adjustment a on a.id = d.id
    left join store_location_ref lr
      on lr.stock_location_id = a.location_id and lr.kind = 'warehouse'
  ) r;
$f$;

create or replace function public.store_reservation_list()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
  from (
    select
      d.id::text as id,
      d.sequence_number::text as "sequenceNumber",
      store_doc_number(d.kind, d.sequence_number) as number,
      case when r.posted_at is not null then 'posted' else 'draft' end as status,
      r.posted_at as "postedAt",
      d.created_at as "createdAt",
      coalesce(d.description, '') as description,
      r.creation_source as "creationSource",
      coalesce(lr.kind, 'warehouse') as "locationType",
      coalesce(lr.entity_id::text, r.location_id::text) as "locationId",
      case when lr.kind <> 'warehouse' then store_doc_number(ld.kind, ld.sequence_number) end as "locationNumber",
      case when lr.kind <> 'warehouse' then ld.sequence_number::text end as "locationSequence",
      exists (
        select 1 from store_plant p where lr.kind = 'warehouse' and p.warehouse_id = lr.entity_id
      ) as "locationIsPlantWarehouse",
      case
        when orf.kind = 'customer_order' then 'order'
        when orf.kind = 'region' then 'region'
        else null
      end as "toOwnerType",
      orf.entity_id::text as "toOwnerId",
      case
        when orf.kind = 'customer_order' then store_doc_number('customer_order', od.sequence_number)
        when orf.kind = 'region' then reg.code
      end as "toOwnerNumber",
      (
        select coalesce(jsonb_agg(to_jsonb(ln) order by ln.id), '[]'::jsonb)
        from (
          select
            l.id::text as id,
            l.product_variant_id::text as "productId",
            l.quantity,
            case
              when fo.kind = 'customer_order' then 'order'
              when fo.kind = 'region' then 'region'
              else null
            end as "fromOwnerType",
            -- Raw stock owner id, as the snapshot mapper exposes reservation lines.
            l.from_owner_id::text as "fromOwnerId",
            case
              when fo.kind = 'customer_order' then (
                select store_doc_number('customer_order', x.sequence_number)
                from store_document x
                where x.id = l.from_owner_id and x.kind = 'customer_order'
              )
              when fo.kind = 'region' then (
                select x.code from store_region x where x.id = l.from_owner_id
              )
            end as "fromOwnerNumber",
            coalesce(v.name, l.variant_name) as "productName",
            coalesce(v.unit, 'шт') as "productUnit"
          from store_document_product_line l
          left join store_product_variant v on v.id = l.product_variant_id
          left join store_owner_ref fo on fo.stock_owner_id = l.from_owner_id
          where l.document_id = d.id
        ) ln
      ) as lines
    from store_document d
    join store_reservation r on r.id = d.id
    left join store_location_ref lr on lr.stock_location_id = r.location_id
    left join store_document ld on ld.id = lr.entity_id and lr.kind <> 'warehouse'
    left join store_owner_ref orf on orf.stock_owner_id = r.owner_id
    left join store_document od on od.id = orf.entity_id and orf.kind = 'customer_order'
    left join store_region reg on reg.id = orf.entity_id and orf.kind = 'region'
  ) r;
$f$;

create or replace function public.store_stock_page()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  select jsonb_build_object(
    'product_variants', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, product_id, sku, name, unit, image_url, plant_id from store_product_variant) r
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
    'document_kinds', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.code), '[]'::jsonb)
      from (select code, number_prefix from store_document_kind) r
    ),
    'balances', store_balance_json(null)
  );
$f$;

create or replace function public.store_catalog_page()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  select jsonb_build_object(
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
    'document_kinds', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.code), '[]'::jsonb)
      from (select code, number_prefix from store_document_kind) r
    )
  );
$f$;

create or replace function public.store_ledger_page()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  select jsonb_build_object(
    'document_kinds', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.code), '[]'::jsonb)
      from (select code, number_prefix from store_document_kind) r
    ),
    'documents', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, kind, sequence_number, description, status, expected_end_on, created_at, created_by
        from store_document
      ) r
    ),
    'product_variants', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, product_id, sku, name, unit, image_url, plant_id from store_product_variant) r
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
      from (select id, location_id, owner_id, creation_source, posted_at from store_reservation) r
    ),
    'shipments', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, from_location_id, to_location_id from store_shipment) r
    ),
    'production_outputs', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, production_order_id from store_production_output) r
    ),
    'adjustments', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, location_id from store_adjustment) r
    ),
    'stock_transactions', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at, r.id), '[]'::jsonb)
      from (
        select id, created_at, product_variant_id, quantity, location_id, owner_id, document_id
        from store_stock_transaction
      ) r
    ),
    'users', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, name from app_user) r
    ),
    'document_product_lines', '[]'::jsonb,
    'document_history', '[]'::jsonb
  );
$f$;

-- ---------------------------------------------------------------------------
-- Context payload (internal) + public context RPCs
-- ---------------------------------------------------------------------------

create or replace function public.store_context_payload(
  p_variant_ids bigint[],
  p_document_ids bigint[],
  p_include_transactions boolean default true,
  p_balances_all boolean default false
)
returns jsonb
language plpgsql
stable
security invoker
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
        select id, product_id, sku, name, unit, image_url, plant_id
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
        select id, production_order_id
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

-- Documents and products tied to one stock location and/or owner: reservations
-- (drafts included) and lines that point at them, shipments to/from the
-- location, and every document/product posted on them.
create or replace function public.store_place_scope(p_location_id bigint, p_owner_id bigint)
returns table (document_ids bigint[], variant_ids bigint[])
language sql
stable
set search_path = public
as $f$
  select
    (
      select coalesce(array_agg(distinct x), array[]::bigint[])
      from (
        select r.id as x from store_reservation r
        where r.location_id = p_location_id or r.owner_id = p_owner_id
        union
        select l.document_id from store_document_product_line l
        where l.from_owner_id = p_owner_id or l.to_owner_id = p_owner_id
        union
        select s.id from store_shipment s
        where s.from_location_id = p_location_id or s.to_location_id = p_location_id
        union
        select t.document_id from store_stock_transaction t
        where t.location_id = p_location_id or t.owner_id = p_owner_id
      ) d
    ),
    (
      select coalesce(array_agg(distinct t.product_variant_id), array[]::bigint[])
      from store_stock_transaction t
      where t.location_id = p_location_id or t.owner_id = p_owner_id
    );
$f$;

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

  return store_context_payload(v_variants, v_docs, true, false)
    || jsonb_build_object('found', true, 'document_id', v_id, 'kind', v_kind);
end;
$f$;

create or replace function public.store_place_context(p_kind text, p_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $f$
declare
  v_variants bigint[];
  v_docs bigint[];
  v_loc bigint;
  v_owner bigint;
begin
  if p_kind = 'warehouse' then
    select w.stock_location_id into v_loc
    from store_warehouse w where w.id::text = p_id;
    if v_loc is null then
      return jsonb_build_object('found', false);
    end if;
  elsif p_kind = 'region' then
    select r.stock_owner_id into v_owner
    from store_region r where r.id::text = p_id;
    if v_owner is null then
      return jsonb_build_object('found', false);
    end if;
  elsif p_kind = 'plant' then
    select w.stock_location_id into v_loc
    from store_plant p
    join store_warehouse w on w.id = p.warehouse_id
    where p.id::text = p_id;
    if v_loc is null then
      return jsonb_build_object('found', false);
    end if;
  else
    return jsonb_build_object('found', false, 'error', 'unknown place kind');
  end if;

  select s.document_ids, s.variant_ids into v_docs, v_variants
  from store_place_scope(v_loc, v_owner) s;

  if p_kind = 'plant' then
    v_variants := v_variants || array(
      select v.id from store_product_variant v where v.plant_id::text = p_id
    );
  end if;

  return store_context_payload(v_variants, v_docs, true, false)
    || jsonb_build_object('found', true, 'place_kind', p_kind, 'place_id', p_id);
end;
$f$;

create or replace function public.store_product_context(p_variant_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $f$
declare
  v_id bigint;
begin
  select id into v_id from store_product_variant where id::text = p_variant_id;
  if v_id is null then
    return jsonb_build_object('found', false);
  end if;
  return store_context_payload(array[v_id], array[]::bigint[], true, false)
    || jsonb_build_object('found', true, 'product_variant_id', v_id);
end;
$f$;

create or replace function public.store_form_context(p_form text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $f$
declare
  v_docs bigint[];
begin
  -- Open customer orders + active production orders + their outputs
  select coalesce(array_agg(distinct x), array[]::bigint[])
  into v_docs
  from (
    select d.id as x
    from store_document d
    where d.kind = 'customer_order'
      and coalesce(d.status, 'in_progress') not in ('done', 'cancelled', 'closed')
    union
    select d.id
    from store_document d
    where d.kind = 'production_order'
      and coalesce(d.status, 'draft') not in ('done', 'cancelled', 'closed')
    union
    select o.id
    from store_production_output o
    join store_document pod on pod.id = o.production_order_id
    where coalesce(pod.status, 'draft') not in ('done', 'cancelled', 'closed')
  ) s;

  -- No variant scope: lines stay limited to v_docs and no transactions are loaded.
  -- Product pickers need the whole variant catalog, so it replaces the scoped list.
  return store_context_payload(array[]::bigint[], v_docs, false, true)
    || jsonb_build_object(
      'product_variants', (
        select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
        from (select id, product_id, sku, name, unit, image_url, plant_id from store_product_variant) r
      ),
      'form', p_form
    );
end;
$f$;

-- ---------------------------------------------------------------------------
-- Grants: public RPCs only; revoke helpers
-- ---------------------------------------------------------------------------

revoke all on function public.store_doc_number(text, bigint) from public, anon, authenticated;
revoke all on function public.store_balance_json(bigint[]) from public, anon, authenticated;
revoke all on function public.store_product_lines_json(bigint) from public, anon, authenticated;
revoke all on function public.store_context_payload(bigint[], bigint[], boolean, boolean) from public, anon, authenticated;
revoke all on function public.store_place_scope(bigint, bigint) from public, anon, authenticated;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'store_customer_order_list()',
    'store_production_order_list()',
    'store_transfer_list()',
    'store_shipment_list()',
    'store_output_list()',
    'store_adjustment_list()',
    'store_reservation_list()',
    'store_stock_page()',
    'store_catalog_page()',
    'store_ledger_page()',
    'store_document_context(text,text)',
    'store_place_context(text,text)',
    'store_product_context(text)',
    'store_form_context(text)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
    execute format('grant execute on function public.%s to anon, authenticated, service_role', fn);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
