-- Лишнее при запуске плана — только то, что добавил сам план.
-- Уже существующее превышение резерва над заказом запуск не блокирует.

create or replace function public.store_launch_order_plan(p_plan_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_plan public.store_order_plan;
  v_order bigint;
  v_order_status text;
  v_order_owner bigint;
  v_bad text;
  v_keys jsonb;
  v_coverage jsonb;
  r record;
  e record;
  v_id bigint;
  v_cur numeric;
  v_lines jsonb;
begin
  select * into v_plan from public.store_order_plan where id = p_plan_id for update;
  if v_plan.id is null then
    raise exception 'План не найден';
  end if;
  if v_plan.launched_at is not null then
    raise exception 'План уже запущен';
  end if;
  if v_plan.archived_at is not null then
    raise exception 'План в архиве — сначала верните его';
  end if;
  v_order := v_plan.customer_order_id;

  select d.status, c.stock_owner_id into v_order_status, v_order_owner
  from public.store_document d
  join public.store_customer_order c on c.id = d.id
  where d.id = v_order
  for update of d;
  if v_order_status in ('done', 'cancelled') then
    raise exception 'Заказ клиента закрыт — запуск недоступен';
  end if;

  if not exists (select 1 from public.store_order_plan_action where plan_id = p_plan_id) then
    raise exception 'В плане нет действий';
  end if;

  -- 1. Блокировки и перепроверка
  select jsonb_agg(jsonb_build_object('v', a.product_variant_id, 'l', a.location_id, 'o', a.owner_id))
  into v_keys
  from public.store_order_plan_action a
  where a.plan_id = p_plan_id and a.kind = 'reserve';
  if v_keys is not null then
    perform public.store_lock_stock_keys(v_keys);
  end if;

  perform 1
  from public.store_document d
  where d.id in (
    select o.id
    from public.store_production_output o
    join public.store_order_plan_action a on a.location_id = o.stock_location_id
    where a.plan_id = p_plan_id
    union
    select po.id
    from public.store_production_order po
    join public.store_order_plan_action a on a.location_id = po.stock_location_id
    where a.plan_id = p_plan_id
  )
  order by d.id
  for update;

  if exists (
    select 1
    from public.store_order_plan_action a
    where a.plan_id = p_plan_id
      and not exists (
        select 1 from public.store_document_product_line l
        where l.document_id = v_order and l.product_variant_id = a.product_variant_id
      )
  ) then
    raise exception 'В плане товар, которого нет в заказе клиента';
  end if;

  select string_agg(
    format('%s — %s: в плане %s, доступно %s',
      public.store_location_code(x.location_id), x.variant_name,
      public.store_qty_label(x.quantity), public.store_qty_label(x.available)),
    '; ' order by x.id)
  into v_bad
  from (
    select a.id, a.location_id, a.quantity, v.name as variant_name,
           public.store_place_available(a.product_variant_id, a.location_id, a.owner_id) as available
    from public.store_order_plan_action a
    join public.store_product_variant v on v.id = a.product_variant_id
    where a.plan_id = p_plan_id and a.kind = 'reserve'
  ) x
  where x.quantity > x.available;
  if v_bad is not null then
    raise exception 'Не хватает: %', v_bad;
  end if;

  select string_agg(public.store_location_code(a.location_id), ', ' order by a.id)
  into v_bad
  from public.store_order_plan_action a
  join public.store_production_order po on po.stock_location_id = a.location_id
  join public.store_document d on d.id = po.id
  where a.plan_id = p_plan_id and a.kind = 'produce' and d.status = 'cancelled';
  if v_bad is not null then
    raise exception 'Заказ на производство отменён: %', v_bad;
  end if;

  select string_agg(format('%s: лишнее %s', v.name, public.store_qty_label(x.excess)), '; ' order by v.id)
  into v_bad
  from (
    select c.product_variant_id,
           coalesce((
             select sum(a.quantity) from public.store_order_plan_action a
             where a.plan_id = p_plan_id and a.product_variant_id = c.product_variant_id
           ), 0) as plan_qty,
           (c.shipped + c.warehouse + c.transfer + c.output + coalesce((
             select sum(a.quantity) from public.store_order_plan_action a
             where a.plan_id = p_plan_id and a.product_variant_id = c.product_variant_id
           ), 0) - c.ordered) as over_by
    from public.store_order_coverage(v_order) c
  ) raw
  join public.store_product_variant v on v.id = raw.product_variant_id
  cross join lateral (select least(raw.plan_qty, raw.over_by) as excess) x
  where raw.plan_qty > 0 and raw.over_by > 0;
  if v_bad is not null then
    raise exception 'Лишнее: %', v_bad;
  end if;

  select jsonb_agg(jsonb_build_object(
    'variantId', c.product_variant_id,
    'ordered', c.ordered,
    'shipped', c.shipped,
    'warehouse', c.warehouse,
    'transfer', c.transfer,
    'output', c.output
  ) order by c.product_variant_id)
  into v_coverage
  from public.store_order_coverage(v_order) c;

  -- 2. Резервы на складе и в пути: один RSV на место
  for r in
    select a.location_id,
           jsonb_agg(jsonb_build_object(
             'product_variant_id', a.product_variant_id,
             'quantity', a.quantity,
             'from_owner_id', a.owner_id
           ) order by a.id) as lines
    from public.store_order_plan_action a
    join public.store_stock_location sl on sl.id = a.location_id and sl.kind in ('warehouse', 'transfer')
    where a.plan_id = p_plan_id and a.kind = 'reserve'
    group by a.location_id
    order by a.location_id
  loop
    v_id := (public.store_create_and_post_reservation(r.location_id, v_order_owner, r.lines, '', 'manual')->>'id')::bigint;
    update public.store_order_plan_action
    set result_document_id = v_id
    where plan_id = p_plan_id and kind = 'reserve' and location_id = r.location_id;
  end loop;

  -- 3. Резервы в черновиках выпусков: перевод владельца в этом выпуске
  for r in
    select o.id as output_id, a.location_id, a.owner_id,
           jsonb_agg(jsonb_build_object(
             'product_variant_id', a.product_variant_id,
             'quantity', a.quantity
           ) order by a.id) as lines
    from public.store_order_plan_action a
    join public.store_production_output o on o.stock_location_id = a.location_id
    where a.plan_id = p_plan_id and a.kind = 'reserve'
    group by o.id, a.location_id, a.owner_id
    order by o.id, a.owner_id
  loop
    perform public.store_move_in_production_output(r.output_id, r.owner_id, v_order_owner, r.lines);
    update public.store_order_plan_action
    set result_document_id = r.output_id
    where plan_id = p_plan_id and kind = 'reserve' and location_id = r.location_id and owner_id = r.owner_id;
  end loop;

  -- 4. Незанятый план PO и «докинуть»: строки PO увеличиваются, один новый черновик выпуска на PO
  for r in
    select po.id as po_id, po.stock_location_id as location_id
    from public.store_production_order po
    where po.stock_location_id in (
      select a.location_id from public.store_order_plan_action a where a.plan_id = p_plan_id
    )
    order by po.id
  loop
    for e in
      select a.product_variant_id, a.quantity
      from public.store_order_plan_action a
      where a.plan_id = p_plan_id and a.kind = 'produce' and a.location_id = r.location_id
      order by a.id
    loop
      select coalesce(sum(l.quantity), 0) into v_cur
      from public.store_document_product_line l
      where l.document_id = r.po_id
        and l.product_variant_id = e.product_variant_id
        and l.from_owner_id is null
        and l.to_owner_id is null;
      perform public.store_set_order_line_quantity(r.po_id, e.product_variant_id, v_cur + e.quantity);
    end loop;

    select jsonb_agg(jsonb_build_object(
             'product_variant_id', x.product_variant_id,
             'quantity', x.quantity,
             'allocation_owner_id', v_order_owner
           ) order by x.product_variant_id)
    into v_lines
    from (
      select a.product_variant_id, sum(a.quantity) as quantity
      from public.store_order_plan_action a
      where a.plan_id = p_plan_id and a.location_id = r.location_id
      group by a.product_variant_id
    ) x;

    v_id := (public.store_create_production_output(
      r.po_id, v_lines, null, false, '', null, null, null, true
    )->>'id')::bigint;
    update public.store_order_plan_action
    set result_document_id = v_id
    where plan_id = p_plan_id and location_id = r.location_id;
  end loop;

  -- 5. Новые PO: один на завод, статус «Черновик», черновик выпуска на весь объём под заказ
  for r in
    select a.plant_id,
           jsonb_agg(jsonb_build_object(
             'product_variant_id', a.product_variant_id,
             'quantity', a.quantity
           ) order by a.id) as lines,
           jsonb_agg(jsonb_build_object(
             'product_variant_id', a.product_variant_id,
             'quantity', a.quantity,
             'allocation_owner_id', v_order_owner
           ) order by a.id) as output_lines
    from public.store_order_plan_action a
    where a.plan_id = p_plan_id and a.kind = 'produce' and a.plant_id is not null
    group by a.plant_id
    order by a.plant_id
  loop
    v_id := (public.store_create_production_order(r.plant_id, r.lines, '', null, 'draft')->>'id')::bigint;
    perform public.store_create_production_output(v_id, r.output_lines, null, false);
    update public.store_order_plan_action
    set result_document_id = v_id
    where plan_id = p_plan_id and kind = 'produce' and plant_id = r.plant_id;
  end loop;

  if exists (
    select 1 from public.store_order_coverage(v_order) c
    where c.shipped + c.warehouse + c.transfer + c.output > c.ordered
      and exists (
        select 1 from public.store_order_plan_action a
        where a.plan_id = p_plan_id and a.product_variant_id = c.product_variant_id
      )
  ) then
    raise exception 'Запуск дал бы лишнее по заказу клиента';
  end if;

  update public.store_order_plan
  set launched_at = now(),
      updated_at = now(),
      launched_by = public.store_current_user_id(),
      launched_coverage = coalesce(v_coverage, '[]'::jsonb)
  where id = p_plan_id;

  return public.store_order_plan_payload(v_order);
end;
$f$;

revoke all on function public.store_launch_order_plan(bigint) from public;
grant execute on function public.store_launch_order_plan(bigint) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
