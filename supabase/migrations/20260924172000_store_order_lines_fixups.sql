-- Правки store_set_order_line_quantity и схлопывание подряд идущих одинаковых снимков истории выпуска.

begin;

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

alter table public.store_document_history disable trigger store_document_history_no_update;

delete from public.store_document_history h
using (
  select id
  from (
    select
      hist.id,
      hist.status,
      hist.expected_end_on,
      lag(hist.status) over (partition by hist.document_id order by hist.changed_at, hist.id) as prev_status,
      lag(hist.expected_end_on) over (partition by hist.document_id order by hist.changed_at, hist.id) as prev_end
    from public.store_document_history hist
    join public.store_document d on d.id = hist.document_id
    where d.kind = 'production_output'
  ) ranked
  where ranked.prev_status is not null
    and ranked.status is not distinct from ranked.prev_status
    and ranked.expected_end_on is not distinct from ranked.prev_end
) dup
where h.id = dup.id;

alter table public.store_document_history enable trigger store_document_history_no_update;

notify pgrst, 'reload schema';

commit;
