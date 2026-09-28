-- Cart checkout: logistics, containers, supply costs, quantity_per_unit, order currency, draft checkout RPC.

begin;

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.store_product_variant
  add column if not exists quantity_per_unit integer not null default 1
    check (quantity_per_unit > 0);

comment on column public.store_product_variant.quantity_per_unit is
  'Штук в одной упаковке (коробке). Количество в корзине кратно этому значению.';

alter table public.store_region
  add column if not exists order_currency_id bigint references public.store_currency (id);

comment on column public.store_region.order_currency_id is
  'Валюта заказов региона. NULL — берётся дилерская валюта региона.';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.store_product_variant_logistics (
  product_variant_id bigint primary key references public.store_product_variant (id) on delete cascade,
  length_cm numeric not null check (length_cm > 0),
  width_cm numeric not null check (width_cm > 0),
  height_cm numeric not null check (height_cm > 0),
  weight_kg numeric not null check (weight_kg > 0),
  stacking boolean not null default true,
  stacking_limit integer check (stacking_limit is null or stacking_limit > 0),
  rotate_length boolean not null default false,
  rotate_width boolean not null default false,
  max_per_container integer check (max_per_container is null or max_per_container > 0),
  source text not null default 'estimated' check (source in ('prod', 'estimated'))
);

comment on table public.store_product_variant_logistics is
  'Габариты и правила укладки варианта (см, кг).';

create table if not exists public.store_container_type (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  inner_length_mm numeric not null check (inner_length_mm > 0),
  inner_width_mm numeric not null check (inner_width_mm > 0),
  inner_height_mm numeric not null check (inner_height_mm > 0),
  max_weight_kg numeric not null check (max_weight_kg > 0),
  sort_order integer not null default 0,
  active boolean not null default true
);

comment on table public.store_container_type is
  'Справочник типов контейнеров для калькулятора укладки.';

create table if not exists public.store_product_supply_cost (
  product_variant_id bigint not null references public.store_product_variant (id) on delete cascade,
  region_id bigint not null references public.store_region (id) on delete cascade,
  percent numeric not null check (percent >= 0),
  primary key (product_variant_id, region_id)
);

comment on table public.store_product_supply_cost is
  'Supply costs % на пару вариант × регион. Нет строки = 0%.';

do $$
declare
  t text;
begin
  foreach t in array array[
    'store_product_variant_logistics',
    'store_container_type',
    'store_product_supply_cost'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists store_select_%I on public.%I', t, t);
    execute format(
      'create policy store_select_%I on public.%I for select to anon, authenticated using (true)',
      t, t
    );
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

revoke all on sequence public.store_container_type_id_seq from anon, authenticated;
grant usage, select on sequence public.store_container_type_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- store_order_money_init: prefer order_currency_id
-- ---------------------------------------------------------------------------

create or replace function public.store_order_money_init()
returns trigger
language plpgsql
set search_path = public
as $f$
declare
  v_currency bigint;
begin
  if tg_table_name = 'store_production_order' then
    select s.production_currency_id into v_currency from public.store_setting s where s.id;
  else
    select coalesce(r.order_currency_id, r.default_dealer_currency_id)
    into v_currency
    from public.store_region r
    where r.id = new.region_id;
  end if;
  if v_currency is null then
    select c.id into v_currency from public.store_currency c
    where c.code = 'USD' and c.deleted_at is null order by c.id limit 1;
  end if;
  insert into public.store_order_money (document_id, currency_id, rates)
  values (new.id, v_currency, public.store_currency_rates_snapshot())
  on conflict (document_id) do nothing;
  return new;
end;
$f$;

-- ---------------------------------------------------------------------------
-- store_update_region (+ order currency)
-- ---------------------------------------------------------------------------

drop function if exists public.store_update_region(bigint, text, bigint);

create or replace function public.store_update_region(
  p_id bigint,
  p_name text,
  p_hub_warehouse_id bigint default null,
  p_order_currency_id bigint default null
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  if p_order_currency_id is not null
    and not exists (
      select 1 from public.store_currency
      where id = p_order_currency_id and deleted_at is null
    )
  then
    raise exception 'Валюта % не найдена', p_order_currency_id;
  end if;

  update public.store_region
  set
    name = trim(p_name),
    hub_warehouse_id = p_hub_warehouse_id,
    order_currency_id = p_order_currency_id
  where id = p_id and deleted_at is null;
  if not found then
    raise exception 'Регион % не найден', p_id;
  end if;
  return 'ok';
end;
$f$;

revoke all on function public.store_update_region(bigint, text, bigint, bigint) from public, anon, authenticated;
grant execute on function public.store_update_region(bigint, text, bigint, bigint) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- store_checkout_customer_order — draft wrapper
-- ---------------------------------------------------------------------------

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
      'number_prefix', k.number_prefix,
      'sequence_number', d.sequence_number
    )
    from public.store_document d
    join public.store_document_kind k on k.code = d.kind
    where d.id = v_id
  );
end;
$f$;

revoke all on function public.store_checkout_customer_order(bigint, text, bigint, jsonb, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.store_checkout_customer_order(bigint, text, bigint, jsonb, jsonb, text)
  to anon, authenticated, service_role;

commit;
