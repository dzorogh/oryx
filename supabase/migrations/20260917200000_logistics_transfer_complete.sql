-- Transfers close by status change: draft → sent → delivered.
-- Partial receipts and discrepancies are removed.

update public.logistics_transfer
set status = 'delivered'
where status = 'received';

update public.logistics_transfer t
set status = case
  when coalesce((
    select sum(quantity)
    from public.logistics_stock_transaction
    where location_type = 'transfer' and location_id = t.id
  ), 0) = 0 then 'delivered'
  else 'sent'
end
where status = 'partially_received';

create or replace function public.logistics_send_transfer(p_id text)
returns text
language plpgsql
as $$
declare
  v_doc public.logistics_transfer%rowtype;
  v_line public.logistics_transfer_line%rowtype;
  v_alloc public.logistics_transfer_allocation%rowtype;
  v_order_line public.logistics_customer_order_line%rowtype;
  v_allocated numeric;
  v_free numeric;
  v_op text := 'transfer_send:' || p_id;
begin
  select * into strict v_doc from public.logistics_transfer where id = p_id;
  if v_doc.status in ('sent', 'delivered') then
    return v_doc.status;
  end if;
  if v_doc.status = 'cancelled' then
    raise exception 'Cancelled documents cannot be posted';
  end if;

  for v_line in select * from public.logistics_transfer_line where transfer_id = p_id
  loop
    select coalesce(sum(quantity), 0) into v_allocated
    from public.logistics_transfer_allocation
    where line_id = v_line.id;
    if v_allocated > v_line.quantity then
      raise exception 'Allocated quantity cannot exceed the document line';
    end if;
    v_free := v_line.quantity - v_allocated;

    for v_alloc in select * from public.logistics_transfer_allocation where line_id = v_line.id
    loop
      select * into strict v_order_line
      from public.logistics_customer_order_line
      where id = v_alloc.customer_order_line_id;
      if v_order_line.product_id <> v_line.product_id then
        raise exception 'Product must match the customer order line';
      end if;
      perform public.logistics_move(
        v_line.product_id, v_alloc.quantity,
        'warehouse', v_doc.from_warehouse_id, 'transfer', p_id,
        'reserved', 'reserved',
        v_alloc.customer_order_id, v_alloc.customer_order_line_id,
        v_alloc.customer_order_id, v_alloc.customer_order_line_id,
        'transfer_send', p_id, v_line.id, v_op, v_op || ':alloc:' || v_alloc.id
      );
    end loop;

    if v_free > 0 then
      perform public.logistics_move(
        v_line.product_id, v_free,
        'warehouse', v_doc.from_warehouse_id, 'transfer', p_id,
        'free', 'free', null, null, null, null,
        'transfer_send', p_id, v_line.id, v_op, v_op || ':free:' || v_line.id
      );
    end if;
  end loop;

  update public.logistics_transfer
  set status = 'sent', sent_at = now()
  where id = p_id;
  return 'sent';
end;
$$;

create or replace function public.logistics_complete_transfer(p_id text)
returns text
language plpgsql
as $$
declare
  v_doc public.logistics_transfer%rowtype;
  r record;
  v_line_id text;
  v_op text := 'transfer_complete:' || p_id;
begin
  select * into strict v_doc from public.logistics_transfer where id = p_id;
  if v_doc.status = 'delivered' then
    return 'delivered';
  end if;
  if v_doc.status <> 'sent' then
    raise exception 'Transfer must be sent before it can be delivered';
  end if;

  for r in
    select product_id, stock_state, customer_order_id, customer_order_line_id, sum(quantity) as qty
    from public.logistics_stock_transaction
    where location_type = 'transfer' and location_id = p_id
    group by 1, 2, 3, 4
    having sum(quantity) > 0
  loop
    select id into v_line_id
    from public.logistics_transfer_line
    where transfer_id = p_id and product_id = r.product_id
    limit 1;

    perform public.logistics_move(
      r.product_id, r.qty,
      'transfer', p_id, 'warehouse', v_doc.to_warehouse_id,
      r.stock_state, r.stock_state,
      r.customer_order_id, r.customer_order_line_id,
      r.customer_order_id, r.customer_order_line_id,
      'transfer_complete', p_id, v_line_id, v_op,
      v_op || ':' || r.product_id || ':' || r.stock_state || ':' || coalesce(r.customer_order_line_id, 'free')
    );
  end loop;

  update public.logistics_transfer
  set status = 'delivered'
  where id = p_id;
  return 'delivered';
end;
$$;

create or replace function public.logistics_cancel_document(p_kind text, p_id text)
returns text
language plpgsql
as $$
begin
  if p_kind = 'reservation' then
    if exists (select 1 from public.logistics_reservation where id = p_id and status = 'cancelled') then
      return 'cancelled';
    end if;
    if exists (select 1 from public.logistics_reservation where id = p_id and status = 'posted') then
      perform public.logistics_reverse_source('reservation', p_id);
    end if;
    update public.logistics_reservation set status = 'cancelled', cancelled_at = now() where id = p_id;
  elsif p_kind = 'reservation_release' then
    if exists (select 1 from public.logistics_reservation_release where id = p_id and status = 'posted') then
      perform public.logistics_reverse_source('reservation_release', p_id);
    end if;
    update public.logistics_reservation_release set status = 'cancelled', cancelled_at = now() where id = p_id;
  elsif p_kind = 'shipment' then
    if exists (select 1 from public.logistics_shipment where id = p_id and status = 'posted') then
      perform public.logistics_reverse_source('shipment', p_id);
    end if;
    update public.logistics_shipment set status = 'cancelled', cancelled_at = now() where id = p_id;
  elsif p_kind = 'shipment_return' then
    if exists (select 1 from public.logistics_return where id = p_id and status = 'posted') then
      perform public.logistics_reverse_source('shipment_return', p_id);
    end if;
    update public.logistics_return set status = 'cancelled', cancelled_at = now() where id = p_id;
  elsif p_kind = 'production_output' then
    if exists (select 1 from public.logistics_output where id = p_id and status = 'posted') then
      perform public.logistics_reverse_source('production_output', p_id);
    end if;
    update public.logistics_output set status = 'cancelled', cancelled_at = now() where id = p_id;
  elsif p_kind = 'transfer' then
    if exists (select 1 from public.logistics_transfer where id = p_id and status = 'delivered') then
      raise exception 'Delivered transfers are kept as history';
    end if;
    if exists (select 1 from public.logistics_transfer where id = p_id and status = 'sent') then
      perform public.logistics_reverse_source('transfer_send', p_id);
    end if;
    update public.logistics_transfer set status = 'cancelled', cancelled_at = now() where id = p_id;
  else
    raise exception 'Unknown document kind %', p_kind;
  end if;
  return 'cancelled';
end;
$$;

drop function if exists public.logistics_receive_transfer(text, jsonb);
drop function if exists public.logistics_record_discrepancy(text, text);

drop table if exists public.logistics_transfer_receive_part;
drop table if exists public.logistics_transfer_receive_event;
drop table if exists public.logistics_transfer_discrepancy;

grant execute on function public.logistics_complete_transfer(text) to anon, authenticated, service_role;
