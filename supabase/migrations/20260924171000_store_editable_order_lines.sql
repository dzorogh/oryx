-- Одна команда «задать количество товара» для заказа клиента и заказа на производство.
-- Строки этих заказов можно менять при любом статусе документа.

begin;

create or replace function public.store_document_line_guard()
returns trigger
language plpgsql
as $$
declare
  v_kind text;
  v_status text;
begin
  select d.kind, d.status into v_kind, v_status
  from public.store_document d
  where d.id = coalesce(new.document_id, old.document_id);

  if tg_op = 'UPDATE' then
    if new.document_id is distinct from old.document_id
      or new.product_variant_id is distinct from old.product_variant_id
      or new.from_owner_id is distinct from old.from_owner_id
      or new.to_owner_id is distinct from old.to_owner_id
      or new.variant_name is distinct from old.variant_name
      or new.unit_price is distinct from old.unit_price
      or new.currency_id is distinct from old.currency_id
    then
      raise exception 'Поля снимка и владельцев строки нельзя изменять';
    end if;
  end if;

  if v_kind in ('shipment', 'adjustment', 'reservation') and tg_op in ('UPDATE', 'DELETE') then
    raise exception 'Строки отгрузки, корректировки и резерва нельзя изменять';
  elsif v_kind in ('transfer', 'production_output') then
    if v_status in ('done', 'cancelled') and tg_op in ('UPDATE', 'DELETE') then
      raise exception 'Строки завершённого документа нельзя изменять';
    end if;
    if tg_op = 'INSERT' and v_status in ('done', 'cancelled') then
      raise exception 'Строки завершённого документа нельзя изменять';
    end if;
    if v_kind = 'transfer' and v_status = 'in_progress' and tg_op in ('UPDATE', 'DELETE') then
      raise exception 'Строки отправленного перемещения нельзя изменять';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

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

  if v_kind = 'production_order' and v_qty > 0 then
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

  select id into v_line_id
  from public.store_document_product_line
  where document_id = p_document_id
    and product_variant_id = p_product_variant_id
    and from_owner_id is null
    and to_owner_id is null
  for update;

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
        and d.status is distinct from 'cancelled';
      if v_shipped > 0 or v_reserved > 0 or v_output_hold > 0 then
        raise exception 'Сначала снимите резерв и верните отгруженное';
      end if;
    end if;
    delete from public.store_document_product_line where id = v_line_id;
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

drop function if exists public.store_add_production_line(bigint, bigint, numeric);

revoke all on function public.store_set_order_line_quantity(bigint, bigint, numeric) from public;
grant execute on function public.store_set_order_line_quantity(bigint, bigint, numeric) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
