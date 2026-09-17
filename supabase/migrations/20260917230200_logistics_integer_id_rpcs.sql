-- Recreate logistics RPCs on bigint ids. Display codes are not stored.

drop function if exists public.logistics_add_production_line(text, text, text, numeric);
drop function if exists public.logistics_assert_product_manufactured_at(text, text);
drop function if exists public.logistics_cancel_document(text, text);
drop function if exists public.logistics_close_customer_order(text);
drop function if exists public.logistics_close_production_order(text);
drop function if exists public.logistics_complete_output(text);
drop function if exists public.logistics_complete_transfer(text);
drop function if exists public.logistics_create_production_order(text, text, text, jsonb);
drop function if exists public.logistics_create_production_order(text, text, text, text, text, numeric);
drop function if exists public.logistics_ensure_reserve(text, numeric, text, text, text, text, text, text, text, text, text);
drop function if exists public.logistics_move(text, numeric, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
drop function if exists public.logistics_post_release(text);
drop function if exists public.logistics_post_reservation(text);
drop function if exists public.logistics_post_return(text);
drop function if exists public.logistics_post_shipment(text);
drop function if exists public.logistics_qty(text, text, text, text, text, text);
drop function if exists public.logistics_reserved_for_line(text);
drop function if exists public.logistics_reverse_source(text, text);
drop function if exists public.logistics_send_transfer(text);
drop function if exists public.logistics_set_production_status(text, text);
drop function if exists public.logistics_shipped_for_line(text);
drop function if exists public.logistics_sync_production_activation(text);
drop function if exists public.logistics_write_tx(text, numeric, text, text, text, text, text, text, text, text, text, text, text, timestamptz);
drop function if exists public.logistics_post_output(text);

create or replace function public.logistics_qty(
  p_product_id bigint,
  p_location_type text,
  p_location_id bigint,
  p_stock_state text,
  p_customer_order_id bigint,
  p_customer_order_line_id bigint
) returns numeric
language sql
stable
as $$
  select coalesce(sum(quantity), 0)
  from public.logistics_stock_transaction
  where product_id = p_product_id
    and location_type = p_location_type
    and location_id = p_location_id
    and stock_state = p_stock_state
    and customer_order_id is not distinct from p_customer_order_id
    and customer_order_line_id is not distinct from p_customer_order_line_id;
$$;

create or replace function public.logistics_reserved_for_line(p_line_id bigint)
returns numeric
language sql
stable
as $$
  select coalesce(sum(quantity), 0)
  from public.logistics_stock_transaction
  where stock_state = 'reserved' and customer_order_line_id = p_line_id;
$$;

create or replace function public.logistics_shipped_for_line(p_line_id bigint)
returns numeric
language sql
stable
as $$
  select coalesce(sum(quantity), 0)
  from public.logistics_stock_transaction
  where stock_state = 'shipped' and customer_order_line_id = p_line_id;
$$;

create or replace function public.logistics_write_tx(
  p_product_id bigint,
  p_quantity numeric,
  p_location_type text,
  p_location_id bigint,
  p_stock_state text,
  p_customer_order_id bigint,
  p_customer_order_line_id bigint,
  p_source_type text,
  p_source_id bigint,
  p_source_line_id bigint,
  p_operation_id text,
  p_idempotency_key text,
  p_reverses_transaction_id bigint default null,
  p_occurred_at timestamptz default now()
) returns bigint
language plpgsql
as $$
declare
  v_existing bigint;
  v_id bigint;
  v_unit text;
begin
  select transaction_id into v_existing
  from public.logistics_stock_transaction
  where idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return v_existing;
  end if;

  select unit into v_unit from public.logistics_product where id = p_product_id;
  if v_unit is null then
    raise exception 'Unknown product %', p_product_id;
  end if;

  insert into public.logistics_stock_transaction (
    occurred_at, posted_at, product_id, unit, quantity,
    location_type, location_id, stock_state, customer_order_id, customer_order_line_id,
    source_type, source_id, source_line_id, operation_id, idempotency_key, reverses_transaction_id
  ) values (
    p_occurred_at, now(), p_product_id, v_unit, p_quantity,
    p_location_type, p_location_id, p_stock_state, p_customer_order_id, p_customer_order_line_id,
    p_source_type, p_source_id, p_source_line_id, p_operation_id, p_idempotency_key, p_reverses_transaction_id
  ) returning transaction_id into v_id;
  return v_id;
end;
$$;

create or replace function public.logistics_move(
  p_product_id bigint,
  p_quantity numeric,
  p_from_type text,
  p_from_id bigint,
  p_to_type text,
  p_to_id bigint,
  p_from_state text,
  p_to_state text,
  p_from_order_id bigint,
  p_from_order_line_id bigint,
  p_to_order_id bigint,
  p_to_order_line_id bigint,
  p_source_type text,
  p_source_id bigint,
  p_source_line_id bigint,
  p_operation_id text,
  p_key_prefix text
) returns void
language plpgsql
as $$
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  if public.logistics_qty(
    p_product_id, p_from_type, p_from_id, p_from_state, p_from_order_id, p_from_order_line_id
  ) < p_quantity then
    raise exception 'Not enough stock for % %', p_from_state, p_product_id;
  end if;

  perform public.logistics_write_tx(
    p_product_id, -p_quantity, p_from_type, p_from_id, p_from_state,
    p_from_order_id, p_from_order_line_id, p_source_type, p_source_id, p_source_line_id,
    p_operation_id, p_key_prefix || ':minus'
  );
  perform public.logistics_write_tx(
    p_product_id, p_quantity, p_to_type, p_to_id, p_to_state,
    p_to_order_id, p_to_order_line_id, p_source_type, p_source_id, p_source_line_id,
    p_operation_id, p_key_prefix || ':plus'
  );
end;
$$;

create or replace function public.logistics_reverse_source(p_source_type text, p_source_id bigint)
returns void
language plpgsql
as $$
declare
  r record;
  v_op text := p_source_type || ':' || p_source_id || ':cancel';
begin
  for r in
    select *
    from public.logistics_stock_transaction
    where source_type = p_source_type
      and source_id = p_source_id
      and reverses_transaction_id is null
      and transaction_id not in (
        select reverses_transaction_id
        from public.logistics_stock_transaction
        where reverses_transaction_id is not null
      )
    order by posted_at, transaction_id
  loop
    perform public.logistics_write_tx(
      r.product_id, -r.quantity, r.location_type, r.location_id, r.stock_state,
      r.customer_order_id, r.customer_order_line_id, r.source_type, r.source_id, r.source_line_id,
      v_op, r.idempotency_key || ':rev', r.transaction_id
    );
  end loop;
end;
$$;

create or replace function public.logistics_post_reservation(p_id bigint)
returns text
language plpgsql
as $$
declare
  v_doc public.logistics_reservation%rowtype;
  v_line public.logistics_reservation_line%rowtype;
  v_order_line public.logistics_customer_order_line%rowtype;
  v_op text := 'reservation:' || p_id || ':post';
  v_open numeric;
begin
  select * into strict v_doc from public.logistics_reservation where id = p_id;
  if v_doc.status = 'posted' then
    return 'posted';
  end if;
  if v_doc.status = 'cancelled' then
    raise exception 'Cancelled documents cannot be posted';
  end if;

  for v_line in select * from public.logistics_reservation_line where reservation_id = p_id
  loop
    select * into strict v_order_line
    from public.logistics_customer_order_line
    where id = v_line.customer_order_line_id;
    if v_order_line.product_id <> v_line.product_id then
      raise exception 'Product must match the customer order line';
    end if;
    if v_order_line.order_id <> v_doc.customer_order_id then
      raise exception 'Reservation line must belong to the customer order';
    end if;
    v_open := v_order_line.quantity
      - public.logistics_shipped_for_line(v_line.customer_order_line_id)
      - public.logistics_reserved_for_line(v_line.customer_order_line_id);
    if v_line.quantity > v_open then
      raise exception 'Cannot reserve more than the open customer order quantity';
    end if;
    perform public.logistics_move(
      v_line.product_id, v_line.quantity,
      v_line.location_type, v_line.location_id, v_line.location_type, v_line.location_id,
      'free', 'reserved', null, null, v_doc.customer_order_id, v_line.customer_order_line_id,
      'reservation', p_id, v_line.id, v_op, v_op || ':' || v_line.id
    );
  end loop;

  update public.logistics_reservation
  set status = 'posted', posted_at = now()
  where id = p_id;
  return 'posted';
end;
$$;

create or replace function public.logistics_post_release(p_id bigint)
returns text
language plpgsql
as $$
declare
  v_doc public.logistics_reservation_release%rowtype;
  v_line public.logistics_reservation_release_line%rowtype;
  v_op text := 'reservation_release:' || p_id || ':post';
begin
  select * into strict v_doc from public.logistics_reservation_release where id = p_id;
  if v_doc.status = 'posted' then
    return 'posted';
  end if;
  if v_doc.status = 'cancelled' then
    raise exception 'Cancelled documents cannot be posted';
  end if;

  for v_line in select * from public.logistics_reservation_release_line where release_id = p_id
  loop
    perform public.logistics_move(
      v_line.product_id, v_line.quantity,
      v_line.location_type, v_line.location_id, v_line.location_type, v_line.location_id,
      'reserved', 'free', v_doc.customer_order_id, v_line.customer_order_line_id, null, null,
      'reservation_release', p_id, v_line.id, v_op, v_op || ':' || v_line.id
    );
  end loop;

  update public.logistics_reservation_release
  set status = 'posted', posted_at = now()
  where id = p_id;
  return 'posted';
end;
$$;

create or replace function public.logistics_post_shipment(p_id bigint)
returns text
language plpgsql
as $$
declare
  v_doc public.logistics_shipment%rowtype;
  v_line public.logistics_shipment_line%rowtype;
  v_order_line public.logistics_customer_order_line%rowtype;
  v_op text := 'shipment:' || p_id || ':post';
  v_shipped numeric;
begin
  select * into strict v_doc from public.logistics_shipment where id = p_id;
  if v_doc.status = 'posted' then
    return 'posted';
  end if;
  if v_doc.status = 'cancelled' then
    raise exception 'Cancelled documents cannot be posted';
  end if;

  for v_line in select * from public.logistics_shipment_line where shipment_id = p_id
  loop
    select * into strict v_order_line
    from public.logistics_customer_order_line
    where id = v_line.customer_order_line_id;
    if v_order_line.product_id <> v_line.product_id or v_order_line.order_id <> v_doc.customer_order_id then
      raise exception 'Shipment line must match the single customer order';
    end if;
    v_shipped := public.logistics_shipped_for_line(v_line.customer_order_line_id);
    if v_shipped + v_line.quantity > v_order_line.quantity then
      raise exception 'Cannot ship more than the ordered quantity';
    end if;
    perform public.logistics_move(
      v_line.product_id, v_line.quantity,
      'warehouse', v_doc.warehouse_id, 'customer_order', v_doc.customer_order_id,
      'reserved', 'shipped',
      v_doc.customer_order_id, v_line.customer_order_line_id,
      v_doc.customer_order_id, v_line.customer_order_line_id,
      'shipment', p_id, v_line.id, v_op, v_op || ':' || v_line.id
    );
  end loop;

  update public.logistics_shipment
  set status = 'posted', posted_at = now()
  where id = p_id;
  return 'posted';
end;
$$;

create or replace function public.logistics_post_return(p_id bigint)
returns text
language plpgsql
as $$
declare
  v_doc public.logistics_return%rowtype;
  v_ship public.logistics_shipment%rowtype;
  v_line public.logistics_return_line%rowtype;
  v_ship_line public.logistics_shipment_line%rowtype;
  v_already numeric;
  v_op text := 'shipment_return:' || p_id || ':post';
begin
  select * into strict v_doc from public.logistics_return where id = p_id;
  if v_doc.status = 'posted' then
    return 'posted';
  end if;
  if v_doc.status = 'cancelled' then
    raise exception 'Cancelled documents cannot be posted';
  end if;
  select * into strict v_ship from public.logistics_shipment where id = v_doc.shipment_id;
  if v_ship.status <> 'posted' then
    raise exception 'Return requires a posted shipment';
  end if;

  for v_line in select * from public.logistics_return_line where return_id = p_id
  loop
    select * into strict v_ship_line from public.logistics_shipment_line where id = v_line.shipment_line_id;
    select coalesce(sum(rl.quantity), 0) into v_already
    from public.logistics_return_line rl
    join public.logistics_return r on r.id = rl.return_id
    where rl.shipment_line_id = v_line.shipment_line_id
      and r.status = 'posted'
      and r.id <> p_id;
    if v_already + v_line.quantity > v_ship_line.quantity then
      raise exception 'Return cannot exceed the shipped quantity';
    end if;
    perform public.logistics_move(
      v_ship_line.product_id, v_line.quantity,
      'customer_order', v_ship.customer_order_id, 'warehouse', v_ship.warehouse_id,
      'shipped', 'free',
      v_ship.customer_order_id, v_ship_line.customer_order_line_id,
      null, null,
      'shipment_return', p_id, v_line.id, v_op, v_op || ':' || v_line.id
    );
  end loop;

  update public.logistics_return
  set status = 'posted', posted_at = now()
  where id = p_id;
  return 'posted';
end;
$$;

create or replace function public.logistics_sync_production_activation(p_id bigint)
returns text
language plpgsql
as $$
declare
  v_order public.logistics_production_order%rowtype;
  v_line public.logistics_production_order_line%rowtype;
  v_delta numeric;
  v_op text := 'production_activation:' || p_id || ':sync';
begin
  select * into strict v_order from public.logistics_production_order where id = p_id;
  if v_order.status in ('cancelled', 'closed') then
    return v_order.status;
  end if;

  for v_line in select * from public.logistics_production_order_line where order_id = p_id
  loop
    v_delta := v_line.quantity - v_line.activated_quantity;
    if v_delta > 0 then
      perform public.logistics_write_tx(
        v_line.product_id, v_delta, 'production_order_line', v_line.id, 'free',
        null, null, 'production_activation', p_id, v_line.id,
        v_op, v_op || ':' || v_line.id || ':' || (v_line.activated_quantity + v_delta)::text
      );
      update public.logistics_production_order_line
      set activated_quantity = activated_quantity + v_delta
      where id = v_line.id;
    elsif v_delta < 0 then
      if public.logistics_qty(
        v_line.product_id, 'production_order_line', v_line.id, 'free', null, null
      ) < -v_delta then
        raise exception 'Not enough unused production quantity to reduce the line';
      end if;
      perform public.logistics_write_tx(
        v_line.product_id, v_delta, 'production_order_line', v_line.id, 'free',
        null, null, 'production_activation', p_id, v_line.id,
        v_op, v_op || ':' || v_line.id || ':down:' || v_line.quantity::text
      );
      update public.logistics_production_order_line
      set activated_quantity = v_line.quantity
      where id = v_line.id;
    end if;
  end loop;
  return v_order.status;
end;
$$;

create or replace function public.logistics_set_production_status(p_id bigint, p_status text)
returns text
language plpgsql
as $$
begin
  if p_status in ('closed', 'cancelled') then
    raise exception 'Use the close operation to finish a production order';
  end if;
  update public.logistics_production_order
  set status = p_status
  where id = p_id;
  return public.logistics_sync_production_activation(p_id);
end;
$$;

create or replace function public.logistics_assert_product_manufactured_at(
  p_product_id bigint,
  p_manufacturer_id bigint
)
returns void
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.logistics_product_manufacturer
    where product_id = p_product_id
  ) and not exists (
    select 1
    from public.logistics_product_manufacturer
    where product_id = p_product_id
      and manufacturer_id = p_manufacturer_id
  ) then
    raise exception 'Product is not manufactured at this plant';
  end if;
end;
$$;

create or replace function public.logistics_create_production_order(
  p_manufacturer_id bigint,
  p_lines jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_id bigint;
  v_item record;
  v_line_id bigint;
  v_lines jsonb := '[]'::jsonb;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one production line';
  end if;

  insert into public.logistics_production_order (manufacturer_id, status)
  values (p_manufacturer_id, 'draft')
  returning id into v_id;

  for v_item in
    select * from jsonb_to_recordset(p_lines) as x(product_id bigint, quantity numeric)
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'Each line needs a product and a positive quantity';
    end if;
    perform public.logistics_assert_product_manufactured_at(v_item.product_id, p_manufacturer_id);
    insert into public.logistics_production_order_line (
      order_id, product_id, quantity, activated_quantity
    ) values (v_id, v_item.product_id, v_item.quantity, 0)
    returning id into v_line_id;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('id', v_line_id, 'product_id', v_item.product_id));
  end loop;

  perform public.logistics_sync_production_activation(v_id);
  return jsonb_build_object('id', v_id, 'lines', v_lines);
end;
$$;

create or replace function public.logistics_add_production_line(
  p_id bigint,
  p_product_id bigint,
  p_quantity numeric
)
returns bigint
language plpgsql
as $$
declare
  v_status text;
  v_manufacturer_id bigint;
  v_line_id bigint;
begin
  select status, manufacturer_id
    into strict v_status, v_manufacturer_id
  from public.logistics_production_order
  where id = p_id;
  if v_status in ('cancelled', 'closed') then
    raise exception 'Cannot add a line to a closed production order';
  end if;
  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  perform public.logistics_assert_product_manufactured_at(p_product_id, v_manufacturer_id);
  insert into public.logistics_production_order_line (
    order_id, product_id, quantity, activated_quantity
  ) values (p_id, p_product_id, p_quantity, 0)
  returning id into v_line_id;
  perform public.logistics_sync_production_activation(p_id);
  return v_line_id;
end;
$$;

create or replace function public.logistics_complete_output(p_id bigint)
returns text
language plpgsql
as $$
declare
  v_doc public.logistics_output%rowtype;
  v_order public.logistics_production_order%rowtype;
  v_mfr public.logistics_manufacturer%rowtype;
  v_line public.logistics_output_line%rowtype;
  v_prod_line public.logistics_production_order_line%rowtype;
  v_already numeric;
  v_remain numeric;
  v_take numeric;
  r record;
  v_op text := 'production_output:' || p_id || ':complete';
begin
  select * into strict v_doc from public.logistics_output where id = p_id;
  if v_doc.status = 'done' then
    return 'done';
  end if;
  if v_doc.status = 'cancelled' then
    raise exception 'Cancelled outputs cannot be completed';
  end if;
  if exists (
    select 1 from public.logistics_stock_transaction
    where source_type = 'production_output' and source_id = p_id
  ) then
    update public.logistics_output
    set status = 'done', done_at = coalesce(done_at, now())
    where id = p_id;
    return 'done';
  end if;
  select * into strict v_order from public.logistics_production_order where id = v_doc.production_order_id;
  if v_order.status in ('closed', 'cancelled') then
    raise exception 'Cannot output from a closed production order';
  end if;
  select * into strict v_mfr from public.logistics_manufacturer where id = v_order.manufacturer_id;

  for v_line in select * from public.logistics_output_line where output_id = p_id
  loop
    select * into strict v_prod_line
    from public.logistics_production_order_line
    where id = v_line.production_order_line_id;
    if v_prod_line.product_id <> v_line.product_id then
      raise exception 'Output product must match the production order line';
    end if;
    select coalesce(sum(ol.quantity), 0) into v_already
    from public.logistics_output_line ol
    join public.logistics_output o on o.id = ol.output_id
    where ol.production_order_line_id = v_line.production_order_line_id
      and o.status = 'done';
    if v_already + v_line.quantity > v_prod_line.quantity then
      raise exception 'Cannot output more than the production order line';
    end if;

    v_remain := v_line.quantity;

    for r in
      select customer_order_id, customer_order_line_id, sum(quantity) as qty
      from public.logistics_stock_transaction
      where location_type = 'production_order_line'
        and location_id = v_prod_line.id
        and product_id = v_line.product_id
        and stock_state = 'reserved'
      group by 1, 2
      having sum(quantity) > 0
      order by customer_order_id, customer_order_line_id
    loop
      exit when v_remain <= 0;
      v_take := least(r.qty, v_remain);
      perform public.logistics_move(
        v_line.product_id, v_take,
        'production_order_line', v_prod_line.id, 'warehouse', v_mfr.warehouse_id,
        'reserved', 'reserved',
        r.customer_order_id, r.customer_order_line_id,
        r.customer_order_id, r.customer_order_line_id,
        'production_output', p_id, v_line.id, v_op,
        v_op || ':rsv:' || coalesce(r.customer_order_line_id::text, 'none')
      );
      v_remain := v_remain - v_take;
    end loop;

    if v_remain > 0 then
      perform public.logistics_move(
        v_line.product_id, v_remain,
        'production_order_line', v_prod_line.id, 'warehouse', v_mfr.warehouse_id,
        'free', 'free', null, null, null, null,
        'production_output', p_id, v_line.id, v_op, v_op || ':free:' || v_line.id
      );
    end if;
  end loop;

  update public.logistics_output
  set status = 'done', done_at = now()
  where id = p_id;
  return 'done';
end;
$$;

create or replace function public.logistics_send_transfer(p_id bigint)
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

create or replace function public.logistics_complete_transfer(p_id bigint)
returns text
language plpgsql
as $$
declare
  v_doc public.logistics_transfer%rowtype;
  r record;
  v_line_id bigint;
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
      v_op || ':' || r.product_id || ':' || r.stock_state || ':' || coalesce(r.customer_order_line_id::text, 'free')
    );
  end loop;

  update public.logistics_transfer
  set status = 'delivered'
  where id = p_id;
  return 'delivered';
end;
$$;

create or replace function public.logistics_close_customer_order(p_id bigint)
returns text
language plpgsql
as $$
declare
  r record;
  v_rel_id bigint;
  v_op text := 'customer_order_close:' || p_id;
begin
  if exists (select 1 from public.logistics_customer_order where id = p_id and status = 'closed') then
    return 'closed';
  end if;

  insert into public.logistics_reservation_release (customer_order_id, reason, status, posted_at)
  values (p_id, 'Order closed', 'posted', now())
  returning id into v_rel_id;

  for r in
    select product_id, location_type, location_id, customer_order_line_id, sum(quantity) as qty
    from public.logistics_stock_transaction
    where stock_state = 'reserved' and customer_order_id = p_id
    group by 1, 2, 3, 4
    having sum(quantity) > 0
  loop
    insert into public.logistics_reservation_release_line (
      release_id, customer_order_line_id, product_id, quantity, location_type, location_id
    ) values (
      v_rel_id, r.customer_order_line_id, r.product_id, r.qty, r.location_type, r.location_id
    );
    perform public.logistics_move(
      r.product_id, r.qty, r.location_type, r.location_id, r.location_type, r.location_id,
      'reserved', 'free', p_id, r.customer_order_line_id, null, null,
      'customer_order_close', p_id, r.customer_order_line_id, v_op,
      v_op || ':' || r.location_type || ':' || r.location_id || ':' || r.customer_order_line_id
    );
  end loop;

  update public.logistics_customer_order
  set status = 'closed', closed_at = now()
  where id = p_id;
  return 'closed';
end;
$$;

create or replace function public.logistics_close_production_order(p_id bigint)
returns text
language plpgsql
as $$
declare
  r record;
  v_op text := 'production_close:' || p_id;
begin
  if exists (select 1 from public.logistics_production_order where id = p_id and status = 'closed') then
    return 'closed';
  end if;

  for r in
    select product_id, location_id, stock_state, customer_order_id, customer_order_line_id, sum(quantity) as qty
    from public.logistics_stock_transaction
    where location_type = 'production_order_line'
      and location_id in (select id from public.logistics_production_order_line where order_id = p_id)
    group by 1, 2, 3, 4, 5
    having sum(quantity) > 0
  loop
    perform public.logistics_write_tx(
      r.product_id, -r.qty, 'production_order_line', r.location_id, r.stock_state,
      r.customer_order_id, r.customer_order_line_id,
      'production_close', p_id, r.location_id, v_op,
      v_op || ':' || r.location_id || ':' || r.stock_state || ':' || coalesce(r.customer_order_line_id::text, 'free')
    );
  end loop;

  update public.logistics_production_order
  set status = 'closed', closed_at = now()
  where id = p_id;
  return 'closed';
end;
$$;

create or replace function public.logistics_cancel_document(p_kind text, p_id bigint)
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
    if exists (select 1 from public.logistics_output where id = p_id and status = 'done') then
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

grant execute on function public.logistics_qty(bigint, text, bigint, text, bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_reserved_for_line(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_shipped_for_line(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_write_tx(bigint, numeric, text, bigint, text, bigint, bigint, text, bigint, bigint, text, text, bigint, timestamptz) to anon, authenticated, service_role;
grant execute on function public.logistics_move(bigint, numeric, text, bigint, text, bigint, text, text, bigint, bigint, bigint, bigint, text, bigint, bigint, text, text) to anon, authenticated, service_role;
grant execute on function public.logistics_reverse_source(text, bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_post_reservation(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_post_release(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_post_shipment(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_post_return(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_sync_production_activation(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_set_production_status(bigint, text) to anon, authenticated, service_role;
grant execute on function public.logistics_assert_product_manufactured_at(bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_create_production_order(bigint, jsonb) to anon, authenticated, service_role;
grant execute on function public.logistics_add_production_line(bigint, bigint, numeric) to anon, authenticated, service_role;
grant execute on function public.logistics_complete_output(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_send_transfer(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_complete_transfer(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_close_customer_order(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_close_production_order(bigint) to anon, authenticated, service_role;
grant execute on function public.logistics_cancel_document(text, bigint) to anon, authenticated, service_role;
