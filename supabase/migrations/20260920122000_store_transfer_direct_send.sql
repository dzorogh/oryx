-- Atomic create-and-send for transfers. Public clients never persist Draft.
-- Existing Draft rows are posted through store_send_transfer in id order.

begin;

create table public.store_transfer_request (
  request_key text primary key,
  transfer_id bigint not null references public.store_transfer (id),
  created_at timestamptz not null default now()
);

comment on table public.store_transfer_request is
  'Idempotency keys for store_create_and_send_transfer. A retry returns the same sent transfer.';

alter table public.store_transfer_request enable row level security;
create policy store_transfer_request_open_all
  on public.store_transfer_request
  for all
  using (true)
  with check (true);
grant select, insert, update, delete on table public.store_transfer_request
  to anon, authenticated, service_role;

create unique index store_transfer_line_product_uidx
  on public.store_transfer_line (transfer_id, product_id);

comment on table public.store_transfer is
  'Warehouse-to-warehouse transfer. Create-and-send is atomic. Public lifecycle: sent → delivered, no partial receipt. Code TR-id is not stored.';
comment on column public.store_transfer.status is
  'Public: sent / delivered / cancelled. draft exists only as an uncommitted state inside create-and-send.';
comment on column public.store_transfer.created_at is
  'When the transfer document was created.';
comment on column public.store_transfer.sent_at is
  'When the transfer was sent. Set by store_send_transfer.';

create or replace function public.store_create_and_send_transfer(
  p_request_key text,
  p_from_warehouse_id bigint,
  p_to_warehouse_id bigint,
  p_lines jsonb,
  p_expected_end_on date default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
as $$
declare
  v_existing bigint;
  v_status text;
  v_id bigint;
  v_item record;
  v_line_id bigint;
  v_owner_type text;
  v_seen bigint[] := '{}';
begin
  if p_request_key is null or length(btrim(p_request_key)) = 0 then
    raise exception 'Transfer request key is required';
  end if;

  perform pg_advisory_xact_lock(('x' || substr(md5(p_request_key), 1, 16))::bit(64)::bigint);

  select transfer_id into v_existing
  from public.store_transfer_request
  where request_key = p_request_key;
  if v_existing is not null then
    select status into v_status from public.store_transfer where id = v_existing;
    return jsonb_build_object('id', v_existing, 'status', coalesce(v_status, 'sent'));
  end if;

  if p_from_warehouse_id is null or p_to_warehouse_id is null then
    raise exception 'Both warehouses are required';
  end if;
  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'Source and destination warehouses must differ';
  end if;
  if not exists (select 1 from public.store_warehouse where id = p_from_warehouse_id) then
    raise exception 'Unknown warehouse %', p_from_warehouse_id;
  end if;
  if not exists (select 1 from public.store_warehouse where id = p_to_warehouse_id) then
    raise exception 'Unknown warehouse %', p_to_warehouse_id;
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one transfer line';
  end if;

  insert into public.store_transfer (
    id, from_warehouse_id, to_warehouse_id, status, expected_end_on, created_at
  )
  values (
    coalesce(p_id, nextval(pg_get_serial_sequence('public.store_transfer', 'id'))),
    p_from_warehouse_id,
    p_to_warehouse_id,
    'draft',
    p_expected_end_on,
    coalesce(p_created_at, now())
  )
  returning id into v_id;

  for v_item in
    select * from jsonb_to_recordset(p_lines) as x(
      product_id bigint,
      quantity numeric,
      owner_type text,
      owner_id bigint
    )
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'Each line needs a product and a positive quantity';
    end if;
    if v_item.product_id = any(v_seen) then
      raise exception 'Duplicate product % in transfer', v_item.product_id;
    end if;
    v_seen := array_append(v_seen, v_item.product_id);

    if not exists (select 1 from public.store_product where id = v_item.product_id) then
      raise exception 'Unknown product %', v_item.product_id;
    end if;

    v_owner_type := nullif(btrim(coalesce(v_item.owner_type, '')), '');
    perform public.store_assert_owner(v_owner_type, v_item.owner_id);

    insert into public.store_transfer_line (transfer_id, product_id, quantity)
    values (v_id, v_item.product_id, v_item.quantity)
    returning id into v_line_id;

    if v_owner_type is not null then
      insert into public.store_transfer_allocation (line_id, owner_type, owner_id, quantity)
      values (v_line_id, v_owner_type, v_item.owner_id, v_item.quantity);
    end if;
  end loop;

  v_status := public.store_send_transfer(v_id);

  insert into public.store_transfer_request (request_key, transfer_id)
  values (p_request_key, v_id);

  return jsonb_build_object('id', v_id, 'status', v_status);
end;
$$;

grant execute on function public.store_create_and_send_transfer(text, bigint, bigint, jsonb, date, bigint, timestamptz)
  to anon, authenticated, service_role;

do $$
declare
  v_doc record;
begin
  for v_doc in
    select id
    from public.store_transfer
    where status = 'draft'
    order by id
  loop
    perform public.store_send_transfer(v_doc.id);
  end loop;
end;
$$;

create or replace function public.store_reset_logistics_stories(p_lo bigint, p_hi bigint)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_lo is null or p_hi is null or p_lo < 901 or p_hi > 999 or p_lo > p_hi then
    raise exception 'Story reset range must stay inside 901-999';
  end if;

  perform set_config('session_replication_role', 'replica', true);

  delete from public.store_stock_transaction
  where (owner_type = 'order' and owner_id between p_lo and p_hi)
     or source_id between p_lo and p_hi
     or source_id in (
       select store_reservation.id from public.store_reservation
       where id between p_lo and p_hi
          or (to_owner_type = 'order' and to_owner_id between p_lo and p_hi)
     )
     or source_id in (
       select store_shipment.id from public.store_shipment where customer_order_id between p_lo and p_hi
     )
     or source_id in (
       select r.id from public.store_return r
       join public.store_shipment s on s.id = r.shipment_id
       where s.customer_order_id between p_lo and p_hi or s.id between p_lo and p_hi or r.id between p_lo and p_hi
     )
     or source_id in (
       select store_output.id from public.store_output where id between p_lo and p_hi
     )
     or source_id in (
       select store_production_order.id from public.store_production_order where id between p_lo and p_hi
     )
     or source_id in (
       select store_transfer.id from public.store_transfer where id between p_lo and p_hi
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
       select store_shipment.id from public.store_shipment
       where id between p_lo and p_hi or customer_order_id between p_lo and p_hi
     );

  delete from public.store_shipment_line
  where id between p_lo and p_hi
     or shipment_id in (
       select store_shipment.id from public.store_shipment
       where id between p_lo and p_hi or customer_order_id between p_lo and p_hi
     );

  delete from public.store_shipment
  where id between p_lo and p_hi or customer_order_id between p_lo and p_hi;

  delete from public.store_output_allocation
  where id between p_lo and p_hi
     or (owner_type = 'order' and owner_id between p_lo and p_hi);

  delete from public.store_output_line where id between p_lo and p_hi or output_id between p_lo and p_hi;
  delete from public.store_output where id between p_lo and p_hi;

  delete from public.store_transfer_request
  where transfer_id between p_lo and p_hi
     or transfer_id in (select id from public.store_transfer where id between p_lo and p_hi);

  delete from public.store_transfer_allocation
  where id between p_lo and p_hi
     or (owner_type = 'order' and owner_id between p_lo and p_hi);

  delete from public.store_transfer_line where id between p_lo and p_hi or transfer_id between p_lo and p_hi;
  delete from public.store_transfer where id between p_lo and p_hi;

  delete from public.store_reservation_line
  where id between p_lo and p_hi
     or (from_owner_type = 'order' and from_owner_id between p_lo and p_hi)
     or reservation_id in (
       select store_reservation.id from public.store_reservation
       where id between p_lo and p_hi
          or (to_owner_type = 'order' and to_owner_id between p_lo and p_hi)
     );

  delete from public.store_reservation
  where id between p_lo and p_hi
     or (to_owner_type = 'order' and to_owner_id between p_lo and p_hi);

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

grant execute on function public.store_reset_logistics_stories(bigint, bigint) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
