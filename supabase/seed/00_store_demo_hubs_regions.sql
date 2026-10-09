-- Demo: CIS / Americas / Europe hubs, the hub and order currency of each region.
-- Applied by `npm run seed:logistics` before the orders, so seeded orders get the region's currency like checkout does.

do $seed$
declare
  v_dubai bigint;
  v_cis bigint;
  v_americas bigint;
  v_europe bigint;
begin
  select id into strict v_dubai from store_warehouse where name = 'Dubai Hub' and deleted_at is null;

  select id into v_cis from store_warehouse where name = 'CIS Hub' and deleted_at is null;
  if v_cis is null then
    v_cis := public.store_create_warehouse('CIS Hub', 'hub');
  end if;
  select id into v_americas from store_warehouse where name = 'Americas Hub' and deleted_at is null;
  if v_americas is null then
    v_americas := public.store_create_warehouse('Americas Hub', 'hub');
  end if;
  select id into v_europe from store_warehouse where name = 'Europe Hub' and deleted_at is null;
  if v_europe is null then
    v_europe := public.store_create_warehouse('Europe Hub', 'hub');
  end if;

  perform public.store_update_region(g.id, g.name, h.hub_id, c.id)
  from store_region g
  join (values
    ('AE', v_dubai, 'AED'), ('OM', v_dubai, 'OMR'), ('IN', v_dubai, 'INR'),
    ('RU', v_cis, 'RUB'), ('KZ', v_cis, 'KZT'), ('BY', v_cis, 'BYN'), ('UZ', v_cis, 'USD'),
    ('MX', v_americas, 'MXN'), ('US', v_americas, 'USD'),
    ('DE', v_europe, 'EUR')
  ) as h(code, hub_id, currency) on h.code = g.code
  join store_currency c on c.code = h.currency and c.deleted_at is null
  where g.deleted_at is null;
end;
$seed$;
