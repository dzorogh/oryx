-- Hub on region + variant stock facts for catalog/product card.

alter table public.store_region
  add column if not exists hub_warehouse_id bigint references public.store_warehouse(id);

comment on column public.store_region.hub_warehouse_id is
  'Хаб региона (склад kind=hub). Один хаб может обслуживать несколько регионов.';

create or replace function public.store_region_hub_warehouse_guard()
returns trigger
language plpgsql
as $f$
declare
  v_kind text;
begin
  if new.hub_warehouse_id is null then
    return new;
  end if;
  select kind into v_kind
  from public.store_warehouse
  where id = new.hub_warehouse_id and deleted_at is null;
  if v_kind is null then
    raise exception 'Склад хаба % не найден', new.hub_warehouse_id;
  end if;
  if v_kind <> 'hub' then
    raise exception 'Хаб региона должен быть складом kind=hub, получено %', v_kind;
  end if;
  return new;
end;
$f$;

drop trigger if exists store_region_hub_warehouse_guard on public.store_region;
create trigger store_region_hub_warehouse_guard
  before insert or update of hub_warehouse_id on public.store_region
  for each row execute function public.store_region_hub_warehouse_guard();

drop function if exists public.store_update_region(bigint, text);

create or replace function public.store_update_region(
  p_id bigint,
  p_name text,
  p_hub_warehouse_id bigint default null
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  update public.store_region
  set
    name = trim(p_name),
    hub_warehouse_id = p_hub_warehouse_id
  where id = p_id and deleted_at is null;
  if not found then
    raise exception 'Регион % не найден', p_id;
  end if;
  return 'ok';
end;
$f$;

revoke all on function public.store_update_region(bigint, text, bigint) from public;
grant execute on function public.store_update_region(bigint, text, bigint) to anon, authenticated, service_role;

create or replace function public.store_variant_stock_facts()
returns table (
  "variantId" bigint,
  "warehouseId" bigint,
  bucket text,
  "regionId" bigint,
  quantity numeric
)
language sql
stable
security definer
set search_path = public
as $f$
  -- Остатки на складах хабов и заводов.
  select
    b.product_variant_id as "variantId",
    w.id as "warehouseId",
    case
      when b.owner_kind = 'free' then 'free'
      when b.owner_kind = 'region' then 'region'
      when b.owner_kind = 'customer_order' then 'order'
    end as bucket,
    case when b.owner_kind = 'region' then b.owner_entity_id else null end as "regionId",
    b.quantity
  from public.store_stock_balance_ref b
  join public.store_warehouse w
    on w.stock_location_id = b.stock_location_id
   and w.deleted_at is null
  where b.location_kind = 'warehouse'
    and w.kind in ('hub', 'plant')
    and b.owner_kind in ('free', 'region', 'customer_order')
    and abs(b.quantity) > 1e-9

  union all

  -- В пути: остатки на месте transfer → склад назначения.
  select
    b.product_variant_id,
    t.to_warehouse_id,
    'transit',
    null::bigint,
    b.quantity
  from public.store_stock_balance_ref b
  join public.store_transfer t on t.stock_location_id = b.stock_location_id
  where b.location_kind = 'transfer'
    and abs(b.quantity) > 1e-9

  union all

  -- В производстве: строки draft-выпусков → склад завода PO.
  select
    l.product_variant_id,
    p.warehouse_id,
    'production',
    null::bigint,
    l.quantity
  from public.store_document_product_line l
  join public.store_production_output o on o.id = l.document_id
  join public.store_document d on d.id = o.id
  join public.store_production_order po on po.id = o.production_order_id
  join public.store_plant p on p.id = po.plant_id
  where d.kind = 'production_output'
    and d.status = 'draft'
    and p.warehouse_id is not null
    and abs(l.quantity) > 1e-9;
$f$;

comment on function public.store_variant_stock_facts() is
  'Плоские факты запасов варианта: free|region|order на hub/plant, production (draft outputs), transit (по to_warehouse).';

revoke all on function public.store_variant_stock_facts() from public;
grant execute on function public.store_variant_stock_facts() to anon, authenticated, service_role;
