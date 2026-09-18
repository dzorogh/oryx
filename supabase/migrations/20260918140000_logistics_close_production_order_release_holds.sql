-- Close production order: release residual reserved holds, then write off free.

begin;

create or replace function public.store_close_production_order(p_id bigint)
returns text
language plpgsql
as $$
declare
  v_hold record;
  v_line record;
  v_res_id bigint;
  r record;
  v_op text := 'production_close:' || p_id;
begin
  if exists (select 1 from public.store_production_order where id = p_id and status = 'closed') then
    return 'closed';
  end if;

  for v_hold in
    select customer_order_id, location_id
    from public.store_stock_transaction
    where stock_state = 'reserved'
      and location_type = 'production_order_line'
      and location_id in (select id from public.store_production_order_line where order_id = p_id)
      and customer_order_id is not null
    group by 1, 2
    having sum(quantity) > 0
    order by 1, 2
  loop
    insert into public.store_reservation (
      customer_order_id, location_type, location_id, operation, status, origin, note
    ) values (
      v_hold.customer_order_id,
      'production_order_line',
      v_hold.location_id,
      'release',
      'draft',
      'order_close',
      'Production order closed'
    )
    returning id into v_res_id;

    for v_line in
      select customer_order_line_id, sum(quantity) as qty
      from public.store_stock_transaction
      where stock_state = 'reserved'
        and customer_order_id = v_hold.customer_order_id
        and location_type = 'production_order_line'
        and location_id = v_hold.location_id
      group by 1
      having sum(quantity) > 0
      order by 1
    loop
      insert into public.store_reservation_line (
        reservation_id, customer_order_line_id, quantity
      ) values (
        v_res_id, v_line.customer_order_line_id, v_line.qty
      );
    end loop;

    perform public.store_post_reservation(v_res_id);
  end loop;

  if exists (
    select 1
    from public.store_stock_transaction
    where stock_state = 'reserved'
      and location_type = 'production_order_line'
      and location_id in (select id from public.store_production_order_line where order_id = p_id)
    group by product_id, location_id, customer_order_id, customer_order_line_id
    having sum(quantity) > 0
  ) then
    raise exception 'Cannot close a production order while reserved quantity remains';
  end if;

  for r in
    select product_id, location_id, stock_state, customer_order_id, customer_order_line_id, sum(quantity) as qty
    from public.store_stock_transaction
    where location_type = 'production_order_line'
      and location_id in (select id from public.store_production_order_line where order_id = p_id)
      and stock_state = 'free'
    group by 1, 2, 3, 4, 5
    having sum(quantity) > 0
  loop
    perform public.store_write_tx(
      r.product_id, -r.qty, 'production_order_line', r.location_id, r.stock_state,
      r.customer_order_id, r.customer_order_line_id,
      'production_close', p_id, r.location_id, v_op,
      v_op || ':' || r.location_id || ':' || r.stock_state || ':' || coalesce(r.customer_order_line_id::text, 'free')
    );
  end loop;

  update public.store_production_order
  set status = 'closed', closed_at = now()
  where id = p_id;
  return 'closed';
end;
$$;

grant execute on function public.store_close_production_order(bigint) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
