-- Stock page: category tree for the «Товары» matrix. Read-only; no category data changes.

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
      from (
        select
          v.id,
          v.product_id,
          v.name,
          v.unit,
          v.image_url,
          v.plant_id,
          coalesce(
            (
              select jsonb_agg(pc.category_id order by pc.category_id)
              from store_product_category pc
              join store_category c on c.id = pc.category_id and c.deleted_at is null
              where pc.product_id = v.product_id
            ),
            '[]'::jsonb
          ) as category_ids
        from store_product_variant v
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
    'document_kinds', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.code), '[]'::jsonb)
      from (select code, number_prefix from store_document_kind) r
    ),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', c.id, 'parent_id', c.parent_id, 'name', c.name)
        order by c.id
      )
      from store_category c
      where c.deleted_at is null
    ), '[]'::jsonb),
    'balances', store_balance_json(null)
  );
$f$;

notify pgrst, 'reload schema';
