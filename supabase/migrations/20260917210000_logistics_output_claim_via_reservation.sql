-- Output no longer silently claims stock. Reservation is the only claim.
-- Posted output moves already-reserved quantity first, then free.

create or replace function public.logistics_post_output(p_id text)
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
  v_op text := 'production_output:' || p_id || ':post';
begin
  select * into strict v_doc from public.logistics_output where id = p_id;
  if v_doc.status = 'posted' then
    return 'posted';
  end if;
  if v_doc.status = 'cancelled' then
    raise exception 'Cancelled documents cannot be posted';
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
      and o.status = 'posted';
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
        v_op || ':rsv:' || coalesce(r.customer_order_line_id, 'none')
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
  set status = 'posted', posted_at = now()
  where id = p_id;
  return 'posted';
end;
$$;

grant execute on function public.logistics_post_output(text) to anon, authenticated, service_role;
