-- Тип склада (plant | hub | customer), источник заказа клиента,
-- цена строки заказа и добавление строк в запланированный выпуск.

begin;

-- ---------------------------------------------------------------------------
-- Тип склада
-- ---------------------------------------------------------------------------

alter table public.store_warehouse add column if not exists kind text;

update public.store_warehouse w
set kind = 'plant'
where exists (
  select 1 from public.store_plant p
  where p.warehouse_id = w.id and p.deleted_at is null
);

update public.store_warehouse
set kind = 'hub'
where name = 'Dubai Hub' and kind is distinct from 'plant';

update public.store_warehouse
set kind = 'customer'
where kind is null;

alter table public.store_warehouse alter column kind set not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'store_warehouse_kind_check'
  ) then
    alter table public.store_warehouse
      add constraint store_warehouse_kind_check check (kind in ('plant', 'hub', 'customer'));
  end if;
end $$;

comment on column public.store_warehouse.kind is
  'Тип склада: plant — склад завода (ставится вместе с привязкой, не редактируется), hub — склад-хаб, customer — склад покупателя.';

-- ---------------------------------------------------------------------------
-- Источник заказа клиента
-- ---------------------------------------------------------------------------

alter table public.store_customer_order
  add column if not exists source_kind text,
  add column if not exists source_plant_id bigint,
  add column if not exists source_warehouse_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'store_customer_order_source_plant_id_fkey'
  ) then
    alter table public.store_customer_order
      add constraint store_customer_order_source_plant_id_fkey
      foreign key (source_plant_id) references public.store_plant (id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'store_customer_order_source_warehouse_id_fkey'
  ) then
    alter table public.store_customer_order
      add constraint store_customer_order_source_warehouse_id_fkey
      foreign key (source_warehouse_id) references public.store_warehouse (id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'store_customer_order_source_check'
  ) then
    alter table public.store_customer_order
      add constraint store_customer_order_source_check check (
    (source_kind is null and source_plant_id is null and source_warehouse_id is null)
    or (source_kind = 'plant' and source_plant_id is not null and source_warehouse_id is null)
    or (source_kind = 'hub' and source_warehouse_id is not null and source_plant_id is null)
  );
  end if;
end $$;

comment on column public.store_customer_order.source_kind is
  'Источник заказа: plant (завод) или hub (склад-хаб). NULL у заказов, созданных до поля.';
comment on column public.store_customer_order.source_plant_id is
  'Завод-источник, если source_kind = plant.';
comment on column public.store_customer_order.source_warehouse_id is
  'Склад-хаб, если source_kind = hub. Склад должен иметь kind = hub.';

-- ---------------------------------------------------------------------------
-- Строка документа: явная цена перекрывает прайс
-- ---------------------------------------------------------------------------

drop function if exists public.store_insert_line(bigint, bigint, numeric, bigint, bigint);

create or replace function public.store_insert_line(
  p_document_id bigint,
  p_variant_id bigint,
  p_quantity numeric,
  p_from_owner_id bigint default null,
  p_to_owner_id bigint default null,
  p_unit_price numeric default null
)
returns bigint
language plpgsql
as $f$
declare
  v_kind text;
  v_name text;
  v_price numeric;
  v_currency bigint;
  v_region bigint;
  v_line_id bigint;
begin
  select kind into v_kind from public.store_document where id = p_document_id;
  select name into v_name from public.store_product_variant
    where id = p_variant_id and deleted_at is null;
  if v_name is null then
    raise exception 'Вариант % не найден или удалён', p_variant_id;
  end if;

  if v_kind = 'adjustment' then
    if p_quantity = 0 then
      raise exception 'Количество корректировки не может быть нулевым';
    end if;
  else
    if p_quantity <= 0 then
      raise exception 'Количество должно быть больше нуля';
    end if;
  end if;

  v_region := null;
  if v_kind = 'customer_order' then
    select region_id into v_region from public.store_customer_order where id = p_document_id;
  end if;
  select unit_price, currency_id into v_price, v_currency
  from public.store_resolve_line_price(v_kind, p_variant_id, v_region);
  if p_unit_price is not null then
    v_price := p_unit_price;
  end if;

  insert into public.store_document_product_line (
    document_id, product_variant_id, quantity, from_owner_id, to_owner_id,
    variant_name, unit_price, currency_id
  ) values (
    p_document_id, p_variant_id, round(p_quantity, 2), p_from_owner_id, p_to_owner_id,
    v_name, v_price, v_currency
  ) returning id into v_line_id;
  return v_line_id;
end;
$f$;

-- ---------------------------------------------------------------------------
-- Склад: тип выбирается при создании и в карточке, кроме склада завода
-- ---------------------------------------------------------------------------

drop function if exists public.store_create_warehouse(text);

create or replace function public.store_create_warehouse(p_name text, p_kind text default 'customer')
returns bigint
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_loc bigint;
  v_id bigint;
  v_kind text := coalesce(nullif(trim(p_kind), ''), 'customer');
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Название склада обязательно';
  end if;
  if v_kind not in ('hub', 'customer') then
    raise exception 'Тип склада при создании — хаб или склад покупателя';
  end if;
  v_loc := public.store_new_stock_location('warehouse');
  insert into public.store_warehouse (name, stock_location_id, kind)
  values (trim(p_name), v_loc, v_kind) returning id into v_id;
  return v_id;
end;
$f$;

drop function if exists public.store_update_warehouse(bigint, text);

create or replace function public.store_update_warehouse(p_id bigint, p_name text, p_kind text default null)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_linked boolean;
  v_kind text := nullif(trim(p_kind), '');
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Название склада обязательно';
  end if;
  select exists (
    select 1 from public.store_plant p
    where p.warehouse_id = p_id and p.deleted_at is null
  ) into v_linked;
  if v_linked then
    if v_kind is not null and v_kind <> 'plant' then
      raise exception 'Тип склада завода не редактируется';
    end if;
    update public.store_warehouse set name = trim(p_name), kind = 'plant'
    where id = p_id and deleted_at is null;
  else
    if v_kind is not null and v_kind not in ('hub', 'customer') then
      raise exception 'Тип склада — хаб или склад покупателя';
    end if;
    if v_kind is not null and v_kind <> 'hub' and exists (
      select 1 from public.store_customer_order
      where source_kind = 'hub' and source_warehouse_id = p_id
    ) then
      raise exception 'Склад указан источником заказов клиента и не может перестать быть хабом';
    end if;
    update public.store_warehouse
    set name = trim(p_name),
        kind = coalesce(v_kind, kind)
    where id = p_id and deleted_at is null;
  end if;
  if not found then raise exception 'Склад % не найден', p_id; end if;
  return 'ok';
end;
$f$;

create or replace function public.store_create_plant(p_name text, p_warehouse_id bigint default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_wh bigint;
  v_id bigint;
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Название завода обязательно';
  end if;
  if p_warehouse_id is null then
    v_wh := public.store_create_warehouse(trim(p_name) || ' — склад');
  else
    if not exists (
      select 1 from public.store_warehouse where id = p_warehouse_id and deleted_at is null
    ) then
      raise exception 'Склад % не найден', p_warehouse_id;
    end if;
    if exists (
      select 1 from public.store_plant
      where warehouse_id = p_warehouse_id and deleted_at is null
    ) then
      raise exception 'Склад % уже привязан к заводу', p_warehouse_id;
    end if;
    v_wh := p_warehouse_id;
  end if;
  insert into public.store_plant (name, warehouse_id) values (trim(p_name), v_wh)
  returning id into v_id;
  update public.store_warehouse set kind = 'plant' where id = v_wh;
  return v_id;
end;
$f$;

revoke all on function public.store_create_warehouse(text, text) from public;
grant execute on function public.store_create_warehouse(text, text) to anon, authenticated, service_role;
revoke all on function public.store_update_warehouse(bigint, text, text) from public;
grant execute on function public.store_update_warehouse(bigint, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Заказ клиента: источник и цена в строках
-- ---------------------------------------------------------------------------

drop function if exists public.store_create_customer_order(bigint, text, date, jsonb, bigint, bigint, timestamptz);

create or replace function public.store_create_customer_order(
  p_region_id bigint,
  p_description text default '',
  p_expected_end_on date default null,
  p_lines jsonb default '[]'::jsonb,
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null,
  p_source_kind text default null,
  p_source_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_loc bigint;
  v_owner bigint;
  e jsonb;
  v_line_ids bigint[] := '{}';
  v_line_id bigint;
  v_variant bigint;
  v_plant bigint;
  v_price numeric;
begin
  if not exists (select 1 from public.store_region where id = p_region_id and deleted_at is null) then
    raise exception 'Регион % не найден', p_region_id;
  end if;
  if p_source_kind is not null and p_source_kind not in ('plant', 'hub') then
    raise exception 'Источник заказа — завод или хаб';
  end if;
  if p_source_kind = 'plant' then
    if not exists (select 1 from public.store_plant where id = p_source_id and deleted_at is null) then
      raise exception 'Завод % не найден', p_source_id;
    end if;
  elsif p_source_kind = 'hub' then
    if not exists (
      select 1 from public.store_warehouse
      where id = p_source_id and deleted_at is null and kind = 'hub'
    ) then
      raise exception 'Склад-хаб % не найден', p_source_id;
    end if;
  elsif p_source_id is not null then
    raise exception 'Источник заказа — завод или хаб';
  end if;

  v_id := public.store_create_document(
    'customer_order', coalesce(p_description, ''), 'in_progress', p_expected_end_on,
    p_sequence_number, p_id, p_created_at, null
  );
  v_loc := public.store_new_stock_location('customer_order');
  v_owner := public.store_new_stock_owner('customer_order');
  insert into public.store_customer_order (
    id, region_id, stock_location_id, stock_owner_id,
    source_kind, source_plant_id, source_warehouse_id
  ) values (
    v_id, p_region_id, v_loc, v_owner,
    p_source_kind,
    case when p_source_kind = 'plant' then p_source_id else null end,
    case when p_source_kind = 'hub' then p_source_id else null end
  );

  for e in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    if p_source_kind = 'plant' then
      select plant_id into v_plant from public.store_product_variant where id = v_variant;
      if v_plant is distinct from p_source_id then
        raise exception 'Товар не выпускается выбранным заводом';
      end if;
    end if;
    v_price := null;
    if e ? 'unit_price' and e->>'unit_price' is not null and e->>'unit_price' <> '' then
      v_price := (e->>'unit_price')::numeric;
    end if;
    v_line_id := public.store_insert_line(
      v_id, v_variant, (e->>'quantity')::numeric, null, null, v_price
    );
    v_line_ids := v_line_ids || v_line_id;
  end loop;
  return jsonb_build_object('id', v_id, 'lines', to_jsonb(v_line_ids));
end;
$f$;

create or replace function public.store_add_customer_order_lines(p_id bigint, p_lines jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_source text;
  v_plant bigint;
  e jsonb;
  v_variant bigint;
  v_line_plant bigint;
  v_price numeric;
  v_line_ids bigint[] := '{}';
begin
  perform public.store_assert_subtype_kind(p_id, 'customer_order');
  select status into v_status from public.store_document where id = p_id for update;
  if v_status in ('done', 'cancelled', 'closed') then
    raise exception 'Строки завершённого документа нельзя изменять';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Нужна хотя бы одна строка';
  end if;
  select source_kind, source_plant_id into v_source, v_plant
  from public.store_customer_order where id = p_id;

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    if v_source = 'plant' then
      select plant_id into v_line_plant from public.store_product_variant where id = v_variant;
      if v_line_plant is distinct from v_plant then
        raise exception 'Товар не выпускается выбранным заводом';
      end if;
    end if;
    v_price := null;
    if e ? 'unit_price' and e->>'unit_price' is not null and e->>'unit_price' <> '' then
      v_price := (e->>'unit_price')::numeric;
    end if;
    v_line_ids := v_line_ids || public.store_insert_line(
      p_id, v_variant, (e->>'quantity')::numeric, null, null, v_price
    );
  end loop;
  return jsonb_build_object('lines', to_jsonb(v_line_ids));
end;
$f$;

revoke all on function public.store_create_customer_order(bigint, text, date, jsonb, bigint, bigint, timestamptz, text, bigint) from public;
grant execute on function public.store_create_customer_order(bigint, text, date, jsonb, bigint, bigint, timestamptz, text, bigint) to anon, authenticated, service_role;
revoke all on function public.store_add_customer_order_lines(bigint, jsonb) from public;
grant execute on function public.store_add_customer_order_lines(bigint, jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Строки запланированного выпуска из незанятого плана PO
-- ---------------------------------------------------------------------------

create or replace function public.store_add_draft_output_lines(p_output_id bigint, p_lines jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_po bigint;
  v_free bigint := public.store_free_owner_id();
  v_po_status text;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_plan numeric;
  v_committed numeric;
  v_existing bigint;
  v_line_ids bigint[] := '{}';
begin
  perform public.store_assert_subtype_kind(p_output_id, 'production_output');
  select d.status, o.production_order_id into v_status, v_po
  from public.store_document d
  join public.store_production_output o on o.id = d.id
  where d.id = p_output_id
  for update of d;
  if v_status is distinct from 'draft' then
    raise exception 'Товары можно добавить только в запланированный выпуск';
  end if;
  select status into v_po_status from public.store_document where id = v_po;
  if v_po_status in ('closed', 'done', 'cancelled') then
    raise exception 'Нельзя добавить строки в выпуск закрытого заказа на производство';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Нужна хотя бы одна строка';
  end if;

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Количество выпуска должно быть больше нуля';
    end if;
    v_plan := public.store_po_plan_qty(v_po, v_variant);
    v_committed := public.store_po_output_qty(v_po, v_variant);
    if v_committed + v_qty > v_plan then
      raise exception 'Нельзя выпустить больше плана по варианту %', v_variant;
    end if;
    select id into v_existing
    from public.store_document_product_line
    where document_id = p_output_id and product_variant_id = v_variant
    order by id
    limit 1;
    if v_existing is not null then
      update public.store_document_product_line
      set quantity = quantity + v_qty
      where id = v_existing;
      v_line_ids := v_line_ids || v_existing;
    else
      v_line_ids := v_line_ids || public.store_insert_line(p_output_id, v_variant, v_qty, null, v_free);
    end if;
  end loop;
  return jsonb_build_object('lines', to_jsonb(v_line_ids));
end;
$f$;

revoke all on function public.store_add_draft_output_lines(bigint, jsonb) from public;
grant execute on function public.store_add_draft_output_lines(bigint, jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Чтение: тип склада, источник заказа, категории, дилерские цены
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

  return store_context_payload(array[]::bigint[], v_docs, false, true)
    || jsonb_build_object(
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
          where v.deleted_at is null
        ) r
      ),
      'dealer_prices', coalesce((
        select jsonb_agg(jsonb_build_object(
          'product_variant_id', pr.product_variant_id,
          'region_id', pr.region_id,
          'amount', pr.amount,
          'currency_id', pr.currency_id,
          'currency_code', cur.code
        ) order by pr.id)
        from store_product_price pr
        join store_product_variant v on v.id = pr.product_variant_id and v.deleted_at is null
        left join store_currency cur on cur.id = pr.currency_id
        where pr.price_kind = 'dealer' and pr.active
      ), '[]'::jsonb),
      'form', p_form
    );
end;
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
      ) r
    ),
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
      select jsonb_agg(jsonb_build_object('id', c.id, 'parent_id', c.parent_id, 'name', c.name) order by c.id)
      from store_category c
      where c.deleted_at is null
    ), '[]'::jsonb),
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
      from (select id, name, stock_location_id, kind from store_warehouse) r
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
      from (select id, product_id, name, unit, image_url, plant_id from store_product_variant) r
    ),
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
      from (select id, location_id, owner_id, creation_source, posted_at from store_reservation) r
    ),
    'shipments', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, from_location_id, to_location_id from store_shipment) r
    ),
    'production_outputs', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, production_order_id, stock_location_id from store_production_output) r
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

notify pgrst, 'reload schema';

commit;
