-- Extra list-RPC fields: plantId on outputs, createdBy (author name) on document lists.

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
      coalesce(sum(ordered_qty), 0) as ordered,
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
      coalesce(t.ordered, 0) as ordered,
      coalesce(t.reserved, 0) as reserved,
      coalesce(t.shipped, 0) as shipped,
      coalesce(t.open_to_reserve, 0) as "openToReserve",
      coalesce(u.name, '') as "createdBy"
    from store_document d
    join store_customer_order co on co.id = d.id
    left join totals t on t.order_id = d.id
    left join app_user u on u.id = d.created_by
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
      store_product_lines_json(d.id) as products,
      coalesce(u.name, '') as "createdBy"
    from store_document d
    join store_production_order po on po.id = d.id
    left join app_user u on u.id = d.created_by
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
      store_product_lines_json(d.id) as products,
      coalesce(u.name, '') as "createdBy"
    from store_document d
    join store_transfer t on t.id = d.id
    left join app_user u on u.id = d.created_by
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
      store_product_lines_json(d.id) as products,
      coalesce(u.name, '') as "createdBy"
    from store_document d
    join store_shipment s on s.id = d.id
    left join store_location_ref fl on fl.stock_location_id = s.from_location_id
    left join store_location_ref tl on tl.stock_location_id = s.to_location_id
    left join store_document fd on fd.id = fl.entity_id and fl.kind = 'customer_order'
    left join store_document td on td.id = tl.entity_id and tl.kind = 'customer_order'
    left join app_user u on u.id = d.created_by
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
      po.plant_id::text as "plantId",
      store_product_lines_json(d.id) as products,
      coalesce(u.name, '') as "createdBy"
    from store_document d
    join store_production_output o on o.id = d.id
    left join store_document pod on pod.id = o.production_order_id
    left join store_production_order po on po.id = o.production_order_id
    left join app_user u on u.id = d.created_by
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
      end as operation,
      coalesce(u.name, '') as "createdBy"
    from store_document d
    join store_adjustment a on a.id = d.id
    left join store_location_ref lr
      on lr.stock_location_id = a.location_id and lr.kind = 'warehouse'
    left join app_user u on u.id = d.created_by
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
      ) as lines,
      coalesce(u.name, '') as "createdBy"
    from store_document d
    join store_reservation r on r.id = d.id
    left join store_location_ref lr on lr.stock_location_id = r.location_id
    left join store_document ld on ld.id = lr.entity_id and lr.kind <> 'warehouse'
    left join store_owner_ref orf on orf.stock_owner_id = r.owner_id
    left join store_document od on od.id = orf.entity_id and orf.kind = 'customer_order'
    left join store_region reg on reg.id = orf.entity_id and orf.kind = 'region'
    left join app_user u on u.id = d.created_by
  ) r;
$f$;
