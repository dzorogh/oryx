create or replace function public.logistics_cancel_document(p_kind text, p_id bigint)
returns text
language plpgsql
as $$
begin
  if p_kind in ('reservation', 'reservation_release') then
    raise exception 'Posted reservations cannot be cancelled. Create a reservation release instead.';
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

grant execute on function public.logistics_cancel_document(text, bigint) to anon, authenticated, service_role;
