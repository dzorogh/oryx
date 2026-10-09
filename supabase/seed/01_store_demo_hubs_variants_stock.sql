-- Demo: hubs, multi-variant products, stock for Ready/Total.
-- Applied by `npm run seed:logistics` after the stories, on ids from a fresh seed (restart identity).

do $seed$
declare
  v_dubai bigint;
  v_cis bigint;
  v_americas bigint;
  v_europe bigint;
  v_loc_dubai bigint;
  v_loc_cis bigint;
  v_loc_americas bigint;
  v_loc_europe bigint;
  v_loc_plant bigint;
  r record;
  v_product_id bigint;
  v_base_variant bigint;
  v_new_id bigint;
  v_variant_ids bigint[];
  v_name text;
  v_suffix text;
  v_i int;
  v_po jsonb;
  v_po_id bigint;
  v_color text[] := array['Красный','Чёрный','Белый','Синий','Зелёный'];
  v_trim text[] := array['Base','Touring','Pro','Limited'];
  v_products bigint[] := array[1,2,3,4,5,6,7,8,9,10,11,12];
  v_counts int[] := array[3,4,2,5,3,2,4,3,6,2,3,4];
  v_archive_count int := 0;
begin
  select id into strict v_dubai from store_warehouse where name = 'Dubai Hub' and deleted_at is null;

  -- Hubs (skip if already seeded by name).
  if not exists (select 1 from store_warehouse where name = 'CIS Hub' and deleted_at is null) then
    v_cis := public.store_create_warehouse('CIS Hub', 'hub');
  else
    select id into v_cis from store_warehouse where name = 'CIS Hub' and deleted_at is null;
  end if;
  if not exists (select 1 from store_warehouse where name = 'Americas Hub' and deleted_at is null) then
    v_americas := public.store_create_warehouse('Americas Hub', 'hub');
  else
    select id into v_americas from store_warehouse where name = 'Americas Hub' and deleted_at is null;
  end if;
  if not exists (select 1 from store_warehouse where name = 'Europe Hub' and deleted_at is null) then
    v_europe := public.store_create_warehouse('Europe Hub', 'hub');
  else
    select id into v_europe from store_warehouse where name = 'Europe Hub' and deleted_at is null;
  end if;

  select stock_location_id into v_loc_dubai from store_warehouse where id = v_dubai;
  select stock_location_id into v_loc_cis from store_warehouse where id = v_cis;
  select stock_location_id into v_loc_americas from store_warehouse where id = v_americas;
  select stock_location_id into v_loc_europe from store_warehouse where id = v_europe;

  -- Bind hubs to regions; keep each region's order currency (the RPC overwrites it).
  perform public.store_update_region(g.id, g.name, h.hub_id, g.order_currency_id)
  from store_region g
  join (values
    ('AE', v_dubai), ('OM', v_dubai), ('IN', v_dubai),
    ('RU', v_cis), ('KZ', v_cis), ('BY', v_cis), ('UZ', v_cis),
    ('MX', v_americas), ('US', v_americas),
    ('DE', v_europe)
  ) as h(code, hub_id) on h.code = g.code
  where g.deleted_at is null;

  -- Extra variants for first 12 products (skip if product already has >1 active variant).
  for v_i in 1..array_length(v_products, 1) loop
    v_product_id := v_products[v_i];
    if (select count(*) from store_product_variant where product_id = v_product_id and deleted_at is null) > 1 then
      continue;
    end if;

    select id, name, plant_id, image_url, unit
      into r
    from store_product_variant
    where product_id = v_product_id and deleted_at is null
    order by id
    limit 1;
    v_base_variant := r.id;
    v_variant_ids := array[v_base_variant];

    for v_i in 2..v_counts[v_i] loop
      if v_i <= 3 then
        v_suffix := v_color[((v_product_id + v_i) % 5) + 1];
      else
        v_suffix := v_trim[((v_product_id + v_i) % 4) + 1];
      end if;
      v_name := r.name || ' · ' || v_suffix;
      v_new_id := (public.store_create_product_variant(
        v_name,
        coalesce(r.unit, 'шт'),
        r.plant_id,
        r.image_url,
        v_product_id
      )->>'variant_id')::bigint;
      v_variant_ids := v_variant_ids || v_new_id;

      -- Copy prices from base variant across all regions / purchase.
      insert into store_product_price (product_variant_id, price_kind, region_id, currency_id, amount, active)
      select v_new_id, price_kind, region_id, currency_id,
             round(amount * (0.92 + (v_i * 0.03)), 2), active
      from store_product_price
      where product_variant_id = v_base_variant and active;

      insert into store_product_region_status (product_variant_id, region_id, dealer_status, retail_status)
      select v_new_id, region_id, dealer_status, retail_status
      from store_product_region_status
      where product_variant_id = v_base_variant
      on conflict (product_variant_id, region_id) do update
        set dealer_status = excluded.dealer_status, retail_status = excluded.retail_status;

      -- Archive 1–2 variants across the seed.
      if v_archive_count < 2 and v_i = v_counts[(select array_position(v_products, v_product_id))] then
        update store_product_variant set deleted_at = now() where id = v_new_id;
        v_archive_count := v_archive_count + 1;
      end if;
    end loop;
  end loop;

  -- Stock: free on hubs + plants for many variants of products 1–12.
  perform public.store_create_and_post_adjustment(
    v_loc_dubai,
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 8 + (v.id % 7))), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(v_products) and v.deleted_at is null
    ),
    'Демо: приход на Dubai Hub'
  );

  perform public.store_create_and_post_adjustment(
    v_loc_cis,
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 12 + (v.id % 5))), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[1,2,3,4,5,6]) and v.deleted_at is null
    ),
    'Демо: приход на CIS Hub'
  );

  perform public.store_create_and_post_adjustment(
    v_loc_americas,
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 6 + (v.id % 4))), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[7,8,9,10]) and v.deleted_at is null
    ),
    'Демо: приход на Americas Hub'
  );

  perform public.store_create_and_post_adjustment(
    v_loc_europe,
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 5 + (v.id % 3))), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[11,12,1,2]) and v.deleted_at is null
    ),
    'Демо: приход на Europe Hub'
  );

  -- Free stock on a couple of plant warehouses.
  select stock_location_id into v_loc_plant from store_warehouse where id = 2; -- plant wh for plant 1
  perform public.store_create_and_post_adjustment(
    v_loc_plant,
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 3 + (v.id % 3))), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[1,5,6]) and v.deleted_at is null
    ),
    'Демо: приход на склад завода'
  );

  select stock_location_id into v_loc_plant from store_warehouse where id = 5;
  perform public.store_create_and_post_adjustment(
    v_loc_plant,
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 4)), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[2,3,4]) and v.deleted_at is null
    ),
    'Демо: приход на склад завода 2'
  );

  -- Region reserves on hubs (kz on CIS, ae on Dubai, de on Europe).
  perform public.store_create_and_post_reservation(
    v_loc_cis,
    (select stock_owner_id from store_region where code = 'KZ' and deleted_at is null),
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 2)), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[1,2,3]) and v.deleted_at is null
      limit 8
    ),
    'Демо: резерв под KZ'
  );

  perform public.store_create_and_post_reservation(
    v_loc_dubai,
    (select stock_owner_id from store_region where code = 'AE' and deleted_at is null),
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 1)), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[4,5,6]) and v.deleted_at is null
      limit 6
    ),
    'Демо: резерв под AE'
  );

  perform public.store_create_and_post_reservation(
    v_loc_europe,
    (select stock_owner_id from store_region where code = 'DE' and deleted_at is null),
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 1)), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[11,12]) and v.deleted_at is null
    ),
    'Демо: резерв под DE'
  );

  -- Transfers in transit (plant → hub).
  perform public.store_create_and_send_transfer(
    5, -- plant warehouse
    v_cis,
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 2)), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[2,3]) and v.deleted_at is null
      limit 4
    ),
    current_date + 7,
    'Демо: в пути на CIS Hub'
  );

  perform public.store_create_and_send_transfer(
    2,
    v_dubai,
    (
      select coalesce(jsonb_agg(jsonb_build_object('product_variant_id', v.id, 'quantity', 1)), '[]'::jsonb)
      from store_product_variant v
      where v.product_id = any(array[1,5]) and v.deleted_at is null
      limit 3
    ),
    current_date + 10,
    'Демо: в пути на Dubai Hub'
  );

  -- Planned (draft) production outputs.
  for r in
    select v.id as variant_id, v.plant_id, v.name
    from store_product_variant v
    where v.product_id = any(array[1,2,4,8]) and v.deleted_at is null and v.plant_id is not null
    limit 8
  loop
    v_po := public.store_create_production_order(
      r.plant_id,
      jsonb_build_array(jsonb_build_object('product_variant_id', r.variant_id, 'quantity', 10)),
      'Демо: план выпуска ' || r.name,
      current_date + 14,
      'in_progress'
    );
    v_po_id := (v_po->>'id')::bigint;
    perform public.store_create_production_output(
      v_po_id,
      jsonb_build_array(jsonb_build_object('product_variant_id', r.variant_id, 'quantity', 3 + (r.variant_id % 3))),
      current_date + 7,
      false,
      'Демо: запланированный выпуск'
    );
  end loop;
end;
$seed$;
