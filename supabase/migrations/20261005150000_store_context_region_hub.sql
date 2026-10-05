-- Хаб региона в контексте документов: перемещение из заказа клиента подсвечивает склад,
-- где клиент забирает заказ (store_region.hub_warehouse_id региона заказа).

begin;

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
    'code_prefixes', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.entity), '[]'::jsonb)
      from (select entity, number_prefix from store_code_prefix) r
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
        select
          v.id, v.product_id, v.name, v.unit, v.image_url, v.plant_id,
          coalesce((
            select jsonb_agg(pc.category_id order by pc.category_id)
            from store_product_category pc
            join store_category c on c.id = pc.category_id and c.deleted_at is null
            where pc.product_id = v.product_id
          ), '[]'::jsonb) as category_ids
        from store_product_variant v
        where v.id = any (v_variants)
      ) r
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'parent_id', c.parent_id, 'name', c.name) order by c.id)
      from store_category c
      where c.deleted_at is null
    ), '[]'::jsonb),
    'dealer_prices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_variant_id', pr.product_variant_id,
        'region_id', pr.region_id,
        'amount', pr.amount,
        'currency_id', pr.currency_id,
        'currency_code', cur.code
      ) order by pr.id)
      from store_product_price pr
      left join store_currency cur on cur.id = pr.currency_id
      where pr.price_kind = 'dealer' and pr.active
        and pr.product_variant_id = any (v_variants)
    ), '[]'::jsonb),
    'warehouses', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, name, stock_location_id, kind from store_warehouse) r
    ),
    'plants', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, name, warehouse_id from store_plant) r
    ),
    'regions', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, code, name, stock_owner_id, hub_warehouse_id from store_region) r
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
      from (
        select id, region_id, stock_location_id, stock_owner_id,
               source_kind, source_plant_id, source_warehouse_id
        from store_customer_order
      ) r
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

revoke all on function public.store_context_payload(bigint[], bigint[], boolean, boolean) from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
