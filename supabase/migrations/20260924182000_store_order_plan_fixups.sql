-- Правки плана заказа клиента: security_invoker у store_location_ref, удаление строки заказа чистит
-- действия незапущенных планов, ноль в действии плана без проверки строки заказа, переименование
-- только черновика открытого заказа.

begin;

alter view public.store_location_ref set (security_invoker = true);

create or replace function public.store_set_order_line_quantity(
  p_document_id bigint,
  p_product_variant_id bigint,
  p_quantity numeric
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_kind text;
  v_line_id bigint;
  v_qty numeric;
  v_shipped numeric;
  v_reserved numeric;
  v_output_hold numeric;
  v_label text;
begin
  select kind into v_kind
  from public.store_document
  where id = p_document_id
  for update;
  if v_kind is null then
    raise exception 'Документ % не найден', p_document_id;
  end if;
  if v_kind not in ('customer_order', 'production_order') then
    raise exception 'Количество строки задаётся только у заказа клиента или заказа на производство';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Количество не может быть отрицательным';
  end if;
  v_qty := round(p_quantity, 2);

  select id into v_line_id
  from public.store_document_product_line
  where document_id = p_document_id
    and product_variant_id = p_product_variant_id
    and from_owner_id is null
    and to_owner_id is null
  for update;

  if v_kind = 'production_order' and v_line_id is null and v_qty > 0 then
    if not exists (
      select 1
      from public.store_production_order po
      join public.store_product_variant v
        on v.id = p_product_variant_id
       and v.deleted_at is null
       and v.plant_id = po.plant_id
      where po.id = p_document_id
    ) then
      raise exception 'Товар не относится к заводу заказа';
    end if;
  end if;

  if v_qty = 0 then
    if v_line_id is null then
      return 'ok';
    end if;
    if v_kind = 'production_order'
       and public.store_po_output_qty(p_document_id, p_product_variant_id) > 0 then
      raise exception 'Товар есть в выпусках — уменьшите план, но не удаляйте';
    end if;
    if v_kind = 'customer_order' then
      select coalesce(sum(b.quantity), 0) into v_shipped
      from public.store_stock_balance_ref b
      where b.product_variant_id = p_product_variant_id
        and b.stock_state = 'shipped'
        and b.owner_kind = 'customer_order'
        and b.owner_entity_id = p_document_id;
      select coalesce(sum(b.quantity), 0) into v_reserved
      from public.store_stock_balance_ref b
      where b.product_variant_id = p_product_variant_id
        and b.stock_state = 'reserved'
        and b.owner_kind = 'customer_order'
        and b.owner_entity_id = p_document_id;
      select coalesce(sum(l.quantity), 0) into v_output_hold
      from public.store_document_product_line l
      join public.store_production_output o on o.id = l.document_id
      join public.store_document d on d.id = o.id
      join public.store_customer_order co on co.stock_owner_id = l.to_owner_id
      where co.id = p_document_id
        and l.product_variant_id = p_product_variant_id
        and d.status = 'draft';
      if v_shipped > 0 or v_reserved > 0 or v_output_hold > 0 then
        raise exception 'Сначала снимите резерв и верните отгруженное';
      end if;
    end if;
    delete from public.store_document_product_line where id = v_line_id;
    if v_kind = 'customer_order' then
      delete from public.store_order_plan_action a
      using public.store_order_plan p
      where p.id = a.plan_id
        and p.customer_order_id = p_document_id
        and p.launched_at is null
        and a.product_variant_id = p_product_variant_id;
    end if;
    return 'ok';
  end if;

  if v_kind = 'customer_order' then
    select coalesce(sum(b.quantity), 0) into v_shipped
    from public.store_stock_balance_ref b
    where b.product_variant_id = p_product_variant_id
      and b.stock_state = 'shipped'
      and b.owner_kind = 'customer_order'
      and b.owner_entity_id = p_document_id;
    if v_qty < v_shipped then
      v_label := regexp_replace(to_char(v_shipped, 'FM999999990.99'), '\.$', '');
      raise exception 'Нельзя меньше отгруженного (%)', v_label;
    end if;
  end if;

  if v_line_id is null then
    perform public.store_insert_line(p_document_id, p_product_variant_id, v_qty);
  else
    update public.store_document_product_line
    set quantity = v_qty
    where id = v_line_id;
  end if;
  return 'ok';
end;
$f$;

create or replace function public.store_rename_order_plan(p_plan_id bigint, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_plan public.store_order_plan;
  v_order_status text;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_name = '' then
    raise exception 'Название плана не может быть пустым';
  end if;
  if char_length(v_name) > 80 then
    raise exception 'Название плана — не длиннее 80 символов';
  end if;
  select * into v_plan from public.store_order_plan where id = p_plan_id for update;
  if v_plan.id is null then
    raise exception 'План не найден';
  end if;
  if v_plan.launched_at is not null or v_plan.archived_at is not null then
    raise exception 'Переименовать можно только черновик плана';
  end if;
  select d.status into v_order_status from public.store_document d where d.id = v_plan.customer_order_id;
  if v_order_status in ('done', 'cancelled') then
    raise exception 'Заказ клиента закрыт — план только для просмотра';
  end if;
  update public.store_order_plan set name = v_name, updated_at = now() where id = p_plan_id;
  return public.store_order_plan_payload(v_plan.customer_order_id);
end;
$f$;

create or replace function public.store_set_order_plan_action(
  p_plan_id bigint,
  p_kind text,
  p_product_variant_id bigint,
  p_location_id bigint,
  p_owner_id bigint,
  p_plant_id bigint,
  p_quantity numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_plan public.store_order_plan;
  v_order_status text;
  v_order_owner bigint;
  v_free bigint := public.store_free_owner_id();
  v_loc_kind text;
  v_qty numeric;
  v_action_id bigint;
  v_old numeric;
  v_avail numeric;
  v_remaining numeric;
  v_variant_plant bigint;
  v_po_id bigint;
  v_po_status text;
  v_po_plant bigint;
begin
  select * into v_plan from public.store_order_plan where id = p_plan_id for update;
  if v_plan.id is null then
    raise exception 'План не найден';
  end if;
  if v_plan.launched_at is not null then
    raise exception 'Запущенный план нельзя менять';
  end if;
  if v_plan.archived_at is not null then
    raise exception 'План в архиве — сначала верните его';
  end if;

  select d.status, c.stock_owner_id into v_order_status, v_order_owner
  from public.store_customer_order c
  join public.store_document d on d.id = c.id
  where c.id = v_plan.customer_order_id;
  if v_order_status in ('done', 'cancelled') then
    raise exception 'Заказ клиента закрыт — план только для просмотра';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Количество не может быть отрицательным';
  end if;
  v_qty := round(p_quantity, 2);

  select plant_id into v_variant_plant from public.store_product_variant where id = p_product_variant_id;

  if p_kind = 'reserve' then
    if p_location_id is null or p_owner_id is null or p_plant_id is not null then
      raise exception 'Резерв задаётся местом и владельцем источника';
    end if;
    select kind into v_loc_kind from public.store_stock_location where id = p_location_id;
    if v_loc_kind is null or v_loc_kind not in ('warehouse', 'transfer', 'production_output', 'production_order') then
      raise exception 'Это место не может быть источником';
    end if;
    if not exists (select 1 from public.store_stock_owner where id = p_owner_id) then
      raise exception 'Владелец не найден';
    end if;
    if p_owner_id = v_order_owner then
      raise exception 'Резерв этого заказа не источник плана';
    end if;
    if v_loc_kind = 'production_order' and p_owner_id <> v_free then
      raise exception 'Незанятый план заказа на производство — только «свободно»';
    end if;
  elsif p_kind = 'produce' then
    if p_owner_id is not null or (p_location_id is null) = (p_plant_id is null) then
      raise exception 'Производство задаётся заказом на производство или заводом';
    end if;
    if p_location_id is not null then
      select po.id, d.status, po.plant_id into v_po_id, v_po_status, v_po_plant
      from public.store_production_order po
      join public.store_document d on d.id = po.id
      where po.stock_location_id = p_location_id;
      if v_po_id is null then
        raise exception 'Заказ на производство не найден';
      end if;
    elsif not exists (select 1 from public.store_plant where id = p_plant_id and deleted_at is null) then
      raise exception 'Завод не найден';
    end if;
  else
    raise exception 'Неизвестный вид действия %', p_kind;
  end if;

  select id, quantity into v_action_id, v_old
  from public.store_order_plan_action
  where plan_id = p_plan_id
    and kind = p_kind
    and product_variant_id = p_product_variant_id
    and location_id is not distinct from p_location_id
    and owner_id is not distinct from p_owner_id
    and plant_id is not distinct from p_plant_id
  for update;
  v_old := coalesce(v_old, 0);

  if v_qty > v_old then
    if not exists (
      select 1 from public.store_document_product_line
      where document_id = v_plan.customer_order_id and product_variant_id = p_product_variant_id
    ) then
      raise exception 'Товара нет в заказе клиента';
    end if;

    if p_kind = 'produce' and v_po_id is not null then
      if v_po_status = 'cancelled' then
        raise exception 'Заказ на производство отменён';
      end if;
      if v_po_plant is distinct from v_variant_plant and not exists (
        select 1 from public.store_document_product_line
        where document_id = v_po_id and product_variant_id = p_product_variant_id
      ) then
        raise exception 'Товар не относится к заводу заказа';
      end if;
    elsif p_kind = 'produce' then
      if v_variant_plant is not null and v_variant_plant <> p_plant_id then
        raise exception 'Товар не относится к этому заводу';
      end if;
    end if;

    if p_kind = 'reserve' then
      v_avail := public.store_place_available(p_product_variant_id, p_location_id, p_owner_id);
      if v_qty > v_avail then
        raise exception 'Больше доступного: доступно %', public.store_qty_label(v_avail);
      end if;
    end if;

    select c.ordered - c.shipped - c.warehouse - c.transfer - c.output into v_remaining
    from public.store_order_coverage(v_plan.customer_order_id) c
    where c.product_variant_id = p_product_variant_id;
    v_remaining := coalesce(v_remaining, 0) - coalesce((
      select sum(quantity) from public.store_order_plan_action
      where plan_id = p_plan_id and product_variant_id = p_product_variant_id
    ), 0);
    if v_qty - v_old > v_remaining then
      raise exception 'Больше, чем осталось покрыть: осталось %', public.store_qty_label(greatest(v_remaining, 0));
    end if;
  end if;

  if v_qty = 0 then
    if v_action_id is not null then
      delete from public.store_order_plan_action where id = v_action_id;
    end if;
  elsif v_action_id is null then
    insert into public.store_order_plan_action (plan_id, kind, product_variant_id, quantity, location_id, owner_id, plant_id)
    values (p_plan_id, p_kind, p_product_variant_id, v_qty, p_location_id, p_owner_id, p_plant_id);
  else
    update public.store_order_plan_action set quantity = v_qty where id = v_action_id;
  end if;
  update public.store_order_plan set updated_at = now() where id = p_plan_id;

  return public.store_order_plan_payload(v_plan.customer_order_id);
end;
$f$;

notify pgrst, 'reload schema';

commit;
