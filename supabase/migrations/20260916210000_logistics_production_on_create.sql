-- Production stock is written as soon as the order exists. No activation threshold.

create or replace function public.logistics_sync_production_activation(p_id text)
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

create or replace function public.logistics_set_production_status(p_id text, p_status text)
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

create or replace function public.logistics_create_production_order(
  p_id text,
  p_number text,
  p_manufacturer_id text,
  p_line_id text,
  p_product_id text,
  p_quantity numeric
)
returns text
language plpgsql
as $$
begin
  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  insert into public.logistics_production_order (id, number, manufacturer_id, status)
  values (p_id, p_number, p_manufacturer_id, 'draft');
  insert into public.logistics_production_order_line (
    id, order_id, product_id, quantity, activated_quantity
  ) values (p_line_id, p_id, p_product_id, p_quantity, 0);
  return public.logistics_sync_production_activation(p_id);
end;
$$;

grant execute on function public.logistics_create_production_order(text, text, text, text, text, numeric)
  to anon, authenticated, service_role;
