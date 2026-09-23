-- Drop store_product_variant.sku: product identity is PRD-N only (formatLogisticsCode).

begin;

drop index if exists public.store_product_variant_sku_active_uidx;

-- Old signature: (p_sku, p_name, p_unit, p_plant_id, p_image_url, p_product_id)
drop function if exists public.store_create_product_variant(text, text, text, bigint, text, bigint);

alter table public.store_product_variant drop column if exists sku;

create or replace function public.store_create_product_variant(
  p_name text,
  p_unit text default 'шт',
  p_plant_id bigint default null,
  p_image_url text default null,
  p_product_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_product_id bigint;
  v_variant_id bigint;
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Название обязательно';
  end if;
  if p_product_id is null then
    insert into public.store_product (name) values (trim(p_name)) returning id into v_product_id;
  else
    v_product_id := p_product_id;
  end if;
  insert into public.store_product_variant (product_id, name, unit, plant_id, image_url)
  values (v_product_id, trim(p_name), coalesce(nullif(trim(p_unit), ''), 'шт'), p_plant_id, p_image_url)
  returning id into v_variant_id;
  return jsonb_build_object('product_id', v_product_id, 'variant_id', v_variant_id);
end;
$f$;

grant execute on function public.store_create_product_variant(text, text, bigint, text, bigint) to anon, authenticated, service_role;

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
      coalesce(v.unit, 'шт') as "productUnit"
    from store_document_product_line l
    left join store_product_variant v on v.id = l.product_variant_id
    where l.document_id = p_document_id
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
      from (select id, product_id, name, unit, image_url, plant_id from store_product_variant) r
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
      from (select id, product_id, name, unit, image_url, plant_id from store_product_variant) r
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
        from (select id, product_id, name, unit, image_url, plant_id from store_product_variant) r
      ),
      'form', p_form
    );
end;
$f$;

notify pgrst, 'reload schema';

commit;
