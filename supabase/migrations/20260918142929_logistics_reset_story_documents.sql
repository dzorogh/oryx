-- Reset OMS-901..999 demo stories, including posted reservations.

begin;

create or replace function public.store_reset_logistics_stories(p_lo bigint, p_hi bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_lo is null or p_hi is null or p_lo < 901 or p_hi > 999 or p_lo > p_hi then
    raise exception 'Story reset range must stay inside 901-999';
  end if;

  perform set_config('session_replication_role', 'replica', true);

  delete from public.store_stock_transaction
  where customer_order_id between p_lo and p_hi
     or source_id between p_lo and p_hi
     or source_id in (
       select id from public.store_reservation where customer_order_id between p_lo and p_hi
     )
     or source_id in (
       select id from public.store_shipment where customer_order_id between p_lo and p_hi
     )
     or source_id in (
       select id from public.store_return r
       join public.store_shipment s on s.id = r.shipment_id
       where s.customer_order_id between p_lo and p_hi or s.id between p_lo and p_hi or r.id between p_lo and p_hi
     )
     or source_id in (
       select id from public.store_output where id between p_lo and p_hi
     )
     or source_id in (
       select id from public.store_production_order where id between p_lo and p_hi
     )
     or source_id in (
       select id from public.store_transfer where id between p_lo and p_hi
     );

  delete from public.store_return_line
  where id between p_lo and p_hi
     or return_id in (
       select r.id from public.store_return r
       left join public.store_shipment s on s.id = r.shipment_id
       where r.id between p_lo and p_hi
          or s.id between p_lo and p_hi
          or s.customer_order_id between p_lo and p_hi
     );

  delete from public.store_return
  where id between p_lo and p_hi
     or shipment_id in (
       select id from public.store_shipment
       where id between p_lo and p_hi or customer_order_id between p_lo and p_hi
     );

  delete from public.store_shipment_line
  where id between p_lo and p_hi
     or customer_order_line_id between p_lo and p_hi
     or shipment_id in (
       select id from public.store_shipment
       where id between p_lo and p_hi or customer_order_id between p_lo and p_hi
     );

  delete from public.store_shipment
  where id between p_lo and p_hi or customer_order_id between p_lo and p_hi;

  delete from public.store_output_allocation
  where id between p_lo and p_hi
     or customer_order_id between p_lo and p_hi
     or customer_order_line_id between p_lo and p_hi;

  delete from public.store_output_line where id between p_lo and p_hi or output_id between p_lo and p_hi;
  delete from public.store_output where id between p_lo and p_hi;

  delete from public.store_transfer_allocation
  where id between p_lo and p_hi
     or customer_order_id between p_lo and p_hi
     or customer_order_line_id between p_lo and p_hi;

  delete from public.store_transfer_line where id between p_lo and p_hi or transfer_id between p_lo and p_hi;
  delete from public.store_transfer where id between p_lo and p_hi;

  delete from public.store_reservation_line
  where id between p_lo and p_hi
     or customer_order_line_id between p_lo and p_hi
     or reservation_id in (
       select id from public.store_reservation
       where id between p_lo and p_hi or customer_order_id between p_lo and p_hi
     );

  delete from public.store_reservation
  where id between p_lo and p_hi or customer_order_id between p_lo and p_hi;

  delete from public.store_production_order_line where id between p_lo and p_hi or order_id between p_lo and p_hi;
  delete from public.store_production_order where id between p_lo and p_hi;
  delete from public.store_customer_order_line where id between p_lo and p_hi or order_id between p_lo and p_hi;
  delete from public.store_customer_order where id between p_lo and p_hi;

  perform set_config('session_replication_role', 'origin', true);
  return 'reset';
exception
  when others then
    perform set_config('session_replication_role', 'origin', true);
    raise;
end;
$$;

grant execute on function public.store_reset_logistics_stories(bigint, bigint)
  to anon, authenticated, service_role;

commit;
