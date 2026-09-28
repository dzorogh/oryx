-- Единый реестр префиксов кодов сущностей Store (документы + справочники).

create table public.store_code_prefix (
  entity text primary key check (entity ~ '^[a-z][a-z0-9_]{0,39}$'),
  number_prefix text not null check (number_prefix ~ '^[A-Z0-9]{1,8}$')
);

comment on table public.store_code_prefix is
  'Переопределения префиксов отображаемых кодов. Список сущностей и дефолты — в коде (ENTITY_CODES); нет строки → дефолт. Код в UI — prefix-id.';

comment on column public.store_code_prefix.entity is
  'Ключ сущности snake_case: customer_order, plant, warehouse и т.д.';

comment on column public.store_code_prefix.number_prefix is
  'Префикс: латиница верхнего регистра и цифры, 1–8 символов.';

insert into public.store_code_prefix (entity, number_prefix)
select code, upper(trim(number_prefix))
from public.store_document_kind
union all
select code, number_prefix
from public.store_catalog_code_prefix;

alter table public.store_code_prefix enable row level security;
create policy store_select_store_code_prefix on public.store_code_prefix
  for select to anon, authenticated using (true);

revoke all on table public.store_code_prefix from anon, authenticated;
grant select on table public.store_code_prefix to anon, authenticated;
grant all on table public.store_code_prefix to service_role;

create or replace function public.store_set_code_prefix(p_entity text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  insert into public.store_code_prefix (entity, number_prefix)
  values (p_entity, upper(trim(p_prefix)))
  on conflict (entity) do update set number_prefix = excluded.number_prefix;
  return 'ok';
end;
$f$;

revoke all on function public.store_set_code_prefix(text, text) from public;
grant execute on function public.store_set_code_prefix(text, text) to anon, authenticated, service_role;

-- store_doc_number: префикс из store_code_prefix
create or replace function public.store_doc_number(p_kind text, p_sequence bigint)
returns text
language sql
stable
set search_path = public
as $f$
  select coalesce(
    (select number_prefix from public.store_code_prefix where entity = p_kind),
    upper(p_kind)
  ) || '-' || p_sequence::text;
$f$;

-- store_location_code: префикс склада из store_code_prefix
create or replace function public.store_location_code(p_location_id bigint)
returns text
language sql
stable
set search_path = public
as $f$
  select case lr.kind
    when 'warehouse' then coalesce(
      (select number_prefix from public.store_code_prefix where entity = 'warehouse'),
      'WH'
    ) || '-' || lr.entity_id
    else public.store_doc_number(d.kind, d.sequence_number)
  end
  from public.store_location_ref lr
  left join public.store_document d on d.id = lr.entity_id and lr.kind <> 'warehouse'
  where lr.stock_location_id = p_location_id;
$f$;

comment on function public.store_location_code(bigint) is
  'Код места для текстов ошибок плана заказа: склад — префикс из store_code_prefix (по умолчанию WH) и id склада; остальные места — номер документа.';

-- Payload-хелпер: code_prefixes вместо document_kinds
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
    'code_prefixes', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.entity), '[]'::jsonb)
      from (select entity, number_prefix from store_code_prefix) r
    )
  );
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
    'code_prefixes', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.entity), '[]'::jsonb)
      from (select entity, number_prefix from store_code_prefix) r
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'parent_id', c.parent_id, 'name', c.name) order by c.id)
      from store_category c
      where c.deleted_at is null
    ), '[]'::jsonb),
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
    'code_prefixes', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.entity), '[]'::jsonb)
      from (select entity, number_prefix from store_code_prefix) r
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

create or replace function public.store_checkout_customer_order(
  p_region_id bigint,
  p_source_kind text,
  p_source_id bigint,
  p_lines jsonb default '[]'::jsonb,
  p_rates jsonb default null,
  p_description text default ''
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
  v_qty numeric;
begin
  if not exists (select 1 from public.store_region where id = p_region_id and deleted_at is null) then
    raise exception 'Регион % не найден', p_region_id;
  end if;
  if p_source_kind is null or p_source_kind not in ('plant', 'hub') then
    raise exception 'Источник заказа — производственная площадка или склад региона';
  end if;
  if p_source_kind = 'plant' then
    if not exists (select 1 from public.store_plant where id = p_source_id and deleted_at is null) then
      raise exception 'Площадка % не найдена', p_source_id;
    end if;
  elsif p_source_kind = 'hub' then
    if not exists (
      select 1 from public.store_warehouse
      where id = p_source_id and deleted_at is null and kind = 'hub'
    ) then
      raise exception 'Склад-хаб % не найден', p_source_id;
    end if;
  end if;

  if jsonb_typeof(coalesce(p_lines, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0
  then
    raise exception 'Нужна хотя бы одна строка заказа';
  end if;

  perform public.store_apply_currency_rates(p_rates);
  v_id := public.store_create_document(
    'customer_order', coalesce(p_description, ''), 'draft', null,
    null, null, null, null
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
    if not exists (
      select 1 from public.store_product_variant
      where id = v_variant and deleted_at is null
    ) then
      raise exception 'Вариант % не найден', v_variant;
    end if;
    if p_source_kind = 'plant' then
      select plant_id into v_plant from public.store_product_variant where id = v_variant;
      if v_plant is distinct from p_source_id then
        raise exception 'Товар не выпускается выбранной площадкой';
      end if;
    end if;
    v_qty := (e->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Количество должно быть больше нуля';
    end if;
    v_price := null;
    if e ? 'unit_price' and e->>'unit_price' is not null and e->>'unit_price' <> '' then
      v_price := (e->>'unit_price')::numeric;
    end if;
    if v_price is null or v_price < 0 then
      raise exception 'Нужна цена строки';
    end if;
    v_line_id := public.store_insert_line(
      v_id, v_variant, v_qty, null, null, v_price
    );
    v_line_ids := v_line_ids || v_line_id;
  end loop;

  return (
    select jsonb_build_object(
      'id', v_id,
      'lines', to_jsonb(v_line_ids),
      'number_prefix', coalesce(
        (select number_prefix from public.store_code_prefix where entity = 'customer_order'),
        'OMS'
      ),
      'sequence_number', d.sequence_number
    )
    from public.store_document d
    where d.id = v_id
  );
end;
$f$;

-- Удалить старые RPC и хранилища префиксов
drop function if exists public.store_update_document_kind_prefix(text, text);
drop function if exists public.store_update_catalog_code_prefix(text, text);
drop table if exists public.store_catalog_code_prefix;

alter table public.store_document_kind drop column if exists number_prefix;

comment on table public.store_document_kind is
  'Реестр видов документов Store. Хранит русское название и допустимый lifecycle. Префиксы номеров — в store_code_prefix.';
