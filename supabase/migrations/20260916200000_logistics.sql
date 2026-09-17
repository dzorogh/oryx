-- Orders & logistics demo: documents, immutable stock ledger, open anon RLS.

create table if not exists public.logistics_product (
  id text primary key,
  sku text not null unique,
  name text not null,
  unit text not null default 'pcs'
);

create table if not exists public.logistics_warehouse (
  id text primary key,
  name text not null,
  manufacturer_id text
);

create table if not exists public.logistics_manufacturer (
  id text primary key,
  name text not null,
  warehouse_id text not null unique references public.logistics_warehouse (id)
);

alter table public.logistics_warehouse
  drop constraint if exists logistics_warehouse_manufacturer_id_fkey;
alter table public.logistics_warehouse
  add constraint logistics_warehouse_manufacturer_id_fkey
  foreign key (manufacturer_id) references public.logistics_manufacturer (id);

create table if not exists public.logistics_setting (
  id text primary key,
  production_activation_status text not null default 'planned'
);

create table if not exists public.logistics_customer_order (
  id text primary key,
  number text not null unique,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.logistics_customer_order_line (
  id text primary key,
  order_id text not null references public.logistics_customer_order (id) on delete cascade,
  product_id text not null references public.logistics_product (id),
  quantity numeric not null check (quantity > 0)
);

create table if not exists public.logistics_production_order (
  id text primary key,
  number text not null unique,
  manufacturer_id text not null references public.logistics_manufacturer (id),
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.logistics_production_order_line (
  id text primary key,
  order_id text not null references public.logistics_production_order (id) on delete cascade,
  product_id text not null references public.logistics_product (id),
  quantity numeric not null check (quantity > 0),
  activated_quantity numeric not null default 0
);

create table if not exists public.logistics_reservation (
  id text primary key,
  number text not null unique,
  customer_order_id text not null references public.logistics_customer_order (id),
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists public.logistics_reservation_line (
  id text primary key,
  reservation_id text not null references public.logistics_reservation (id) on delete cascade,
  customer_order_line_id text not null references public.logistics_customer_order_line (id),
  product_id text not null references public.logistics_product (id),
  quantity numeric not null check (quantity > 0),
  location_type text not null,
  location_id text not null
);

create table if not exists public.logistics_reservation_release (
  id text primary key,
  number text not null unique,
  customer_order_id text not null references public.logistics_customer_order (id),
  reason text not null default '',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists public.logistics_reservation_release_line (
  id text primary key,
  release_id text not null references public.logistics_reservation_release (id) on delete cascade,
  customer_order_line_id text not null references public.logistics_customer_order_line (id),
  product_id text not null references public.logistics_product (id),
  quantity numeric not null check (quantity > 0),
  location_type text not null,
  location_id text not null
);

create table if not exists public.logistics_transfer (
  id text primary key,
  number text not null unique,
  from_warehouse_id text not null references public.logistics_warehouse (id),
  to_warehouse_id text not null references public.logistics_warehouse (id),
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  cancelled_at timestamptz,
  check (from_warehouse_id <> to_warehouse_id)
);

create table if not exists public.logistics_transfer_line (
  id text primary key,
  transfer_id text not null references public.logistics_transfer (id) on delete cascade,
  product_id text not null references public.logistics_product (id),
  quantity numeric not null check (quantity > 0)
);

create table if not exists public.logistics_transfer_allocation (
  id text primary key,
  line_id text not null references public.logistics_transfer_line (id) on delete cascade,
  customer_order_id text not null references public.logistics_customer_order (id),
  customer_order_line_id text not null references public.logistics_customer_order_line (id),
  quantity numeric not null check (quantity > 0)
);

create table if not exists public.logistics_transfer_receive_event (
  id text primary key,
  transfer_id text not null references public.logistics_transfer (id) on delete cascade,
  occurred_at timestamptz not null default now()
);

create table if not exists public.logistics_transfer_receive_part (
  id text primary key,
  event_id text not null references public.logistics_transfer_receive_event (id) on delete cascade,
  line_id text not null references public.logistics_transfer_line (id),
  allocation_id text references public.logistics_transfer_allocation (id),
  quantity numeric not null check (quantity > 0)
);

create table if not exists public.logistics_transfer_discrepancy (
  id text primary key,
  transfer_id text not null references public.logistics_transfer (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  note text not null default ''
);

create table if not exists public.logistics_shipment (
  id text primary key,
  number text not null unique,
  customer_order_id text not null references public.logistics_customer_order (id),
  warehouse_id text not null references public.logistics_warehouse (id),
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists public.logistics_shipment_line (
  id text primary key,
  shipment_id text not null references public.logistics_shipment (id) on delete cascade,
  customer_order_line_id text not null references public.logistics_customer_order_line (id),
  product_id text not null references public.logistics_product (id),
  quantity numeric not null check (quantity > 0)
);

create table if not exists public.logistics_output (
  id text primary key,
  number text not null unique,
  production_order_id text not null references public.logistics_production_order (id),
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists public.logistics_output_line (
  id text primary key,
  output_id text not null references public.logistics_output (id) on delete cascade,
  production_order_line_id text not null references public.logistics_production_order_line (id),
  product_id text not null references public.logistics_product (id),
  quantity numeric not null check (quantity > 0)
);

create table if not exists public.logistics_output_allocation (
  id text primary key,
  line_id text not null references public.logistics_output_line (id) on delete cascade,
  customer_order_id text not null references public.logistics_customer_order (id),
  customer_order_line_id text not null references public.logistics_customer_order_line (id),
  quantity numeric not null check (quantity > 0)
);

create table if not exists public.logistics_return (
  id text primary key,
  number text not null unique,
  shipment_id text not null references public.logistics_shipment (id),
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists public.logistics_return_line (
  id text primary key,
  return_id text not null references public.logistics_return (id) on delete cascade,
  shipment_line_id text not null references public.logistics_shipment_line (id),
  quantity numeric not null check (quantity > 0)
);

create table if not exists public.logistics_stock_transaction (
  transaction_id text primary key,
  occurred_at timestamptz not null,
  posted_at timestamptz not null default now(),
  product_id text not null references public.logistics_product (id),
  unit text not null,
  quantity numeric not null,
  location_type text not null,
  location_id text not null,
  stock_state text not null,
  customer_order_id text,
  customer_order_line_id text,
  source_type text not null,
  source_id text not null,
  source_line_id text,
  operation_id text not null,
  idempotency_key text not null unique,
  reverses_transaction_id text
);

create index if not exists logistics_stock_tx_balance_idx
  on public.logistics_stock_transaction (
    product_id, location_type, location_id, stock_state, customer_order_id, customer_order_line_id
  );

create index if not exists logistics_stock_tx_source_idx
  on public.logistics_stock_transaction (source_type, source_id);

create or replace view public.logistics_stock_balance as
select
  product_id,
  location_type,
  location_id,
  stock_state,
  customer_order_id,
  customer_order_line_id,
  sum(quantity) as quantity
from public.logistics_stock_transaction
group by 1, 2, 3, 4, 5, 6
having abs(sum(quantity)) > 0.0000001;

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public' and tablename like 'logistics_%'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('drop policy if exists %I on public.%I', r.tablename || '_open_all', r.tablename);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
      r.tablename || '_open_all',
      r.tablename
    );
    execute format(
      'grant select, insert, update, delete on table public.%I to anon, authenticated, service_role',
      r.tablename
    );
  end loop;
end $$;

grant select on public.logistics_stock_balance to anon, authenticated, service_role;

create or replace function public.logistics_qty(
  p_product_id text,
  p_location_type text,
  p_location_id text,
  p_stock_state text,
  p_customer_order_id text,
  p_customer_order_line_id text
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

create or replace function public.logistics_reserved_for_line(p_line_id text)
returns numeric
language sql
stable
as $$
  select coalesce(sum(quantity), 0)
  from public.logistics_stock_transaction
  where stock_state = 'reserved' and customer_order_line_id = p_line_id;
$$;

create or replace function public.logistics_shipped_for_line(p_line_id text)
returns numeric
language sql
stable
as $$
  select coalesce(sum(quantity), 0)
  from public.logistics_stock_transaction
  where stock_state = 'shipped' and customer_order_line_id = p_line_id;
$$;

create or replace function public.logistics_write_tx(
  p_product_id text,
  p_quantity numeric,
  p_location_type text,
  p_location_id text,
  p_stock_state text,
  p_customer_order_id text,
  p_customer_order_line_id text,
  p_source_type text,
  p_source_id text,
  p_source_line_id text,
  p_operation_id text,
  p_idempotency_key text,
  p_reverses_transaction_id text default null,
  p_occurred_at timestamptz default now()
) returns text
language plpgsql
as $$
declare
  v_existing text;
  v_id text;
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

  v_id := coalesce(p_idempotency_key, gen_random_uuid()::text);
  insert into public.logistics_stock_transaction (
    transaction_id, occurred_at, posted_at, product_id, unit, quantity,
    location_type, location_id, stock_state, customer_order_id, customer_order_line_id,
    source_type, source_id, source_line_id, operation_id, idempotency_key, reverses_transaction_id
  ) values (
    v_id, p_occurred_at, now(), p_product_id, v_unit, p_quantity,
    p_location_type, p_location_id, p_stock_state, p_customer_order_id, p_customer_order_line_id,
    p_source_type, p_source_id, p_source_line_id, p_operation_id, p_idempotency_key, p_reverses_transaction_id
  );
  return v_id;
end;
$$;

create or replace function public.logistics_move(
  p_product_id text,
  p_quantity numeric,
  p_from_type text,
  p_from_id text,
  p_to_type text,
  p_to_id text,
  p_from_state text,
  p_to_state text,
  p_from_order_id text,
  p_from_order_line_id text,
  p_to_order_id text,
  p_to_order_line_id text,
  p_source_type text,
  p_source_id text,
  p_source_line_id text,
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

create or replace function public.logistics_reverse_source(p_source_type text, p_source_id text)
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

create or replace function public.logistics_ensure_reserve(
  p_product_id text,
  p_quantity numeric,
  p_location_type text,
  p_location_id text,
  p_customer_order_id text,
  p_customer_order_line_id text,
  p_source_type text,
  p_source_id text,
  p_source_line_id text,
  p_operation_id text,
  p_key_prefix text
) returns void
language plpgsql
as $$
declare
  v_have numeric;
  v_need numeric;
  v_ordered numeric;
  v_open numeric;
begin
  v_have := public.logistics_qty(
    p_product_id, p_location_type, p_location_id, 'reserved',
    p_customer_order_id, p_customer_order_line_id
  );
  if v_have >= p_quantity then
    return;
  end if;
  v_need := p_quantity - v_have;
  select quantity into v_ordered
  from public.logistics_customer_order_line
  where id = p_customer_order_line_id;
  v_open := coalesce(v_ordered, 0)
    - public.logistics_shipped_for_line(p_customer_order_line_id)
    - public.logistics_reserved_for_line(p_customer_order_line_id);
  if v_need > v_open then
    raise exception 'Cannot reserve more than the open customer order quantity';
  end if;
  perform public.logistics_move(
    p_product_id, v_need, p_location_type, p_location_id, p_location_type, p_location_id,
    'free', 'reserved', null, null, p_customer_order_id, p_customer_order_line_id,
    p_source_type, p_source_id, p_source_line_id, p_operation_id, p_key_prefix || ':autoreserve'
  );
end;
$$;

create or replace function public.logistics_post_reservation(p_id text)
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

create or replace function public.logistics_post_release(p_id text)
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

create or replace function public.logistics_post_shipment(p_id text)
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

create or replace function public.logistics_post_return(p_id text)
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

create or replace function public.logistics_production_status_rank(p_status text)
returns integer
language sql
immutable
as $$
  select case p_status
    when 'draft' then 0
    when 'planned' then 1
    when 'in_progress' then 2
    when 'done' then 3
    when 'closed' then 4
    when 'cancelled' then 5
    else -1
  end;
$$;

create or replace function public.logistics_sync_production_activation(p_id text)
returns text
language plpgsql
as $$
declare
  v_order public.logistics_production_order%rowtype;
  v_line public.logistics_production_order_line%rowtype;
  v_setting text;
  v_delta numeric;
  v_op text := 'production_activation:' || p_id || ':sync';
begin
  select * into strict v_order from public.logistics_production_order where id = p_id;
  if v_order.status = 'cancelled' then
    return v_order.status;
  end if;
  select production_activation_status into v_setting
  from public.logistics_setting
  where id = 'default';
  v_setting := coalesce(v_setting, 'planned');

  if public.logistics_production_status_rank(v_order.status)
     < public.logistics_production_status_rank(v_setting) then
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
  update public.logistics_production_order
  set status = p_status
  where id = p_id;
  return public.logistics_sync_production_activation(p_id);
end;
$$;

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
  v_alloc public.logistics_output_allocation%rowtype;
  v_order_line public.logistics_customer_order_line%rowtype;
  v_already numeric;
  v_allocated numeric;
  v_free numeric;
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
    select coalesce(sum(quantity), 0) into v_allocated
    from public.logistics_output_allocation
    where line_id = v_line.id;
    if v_allocated > v_line.quantity then
      raise exception 'Allocated quantity cannot exceed the document line';
    end if;
    v_free := v_line.quantity - v_allocated;

    for v_alloc in select * from public.logistics_output_allocation where line_id = v_line.id
    loop
      select * into strict v_order_line
      from public.logistics_customer_order_line
      where id = v_alloc.customer_order_line_id;
      if v_order_line.product_id <> v_line.product_id then
        raise exception 'Product must match the customer order line';
      end if;
      perform public.logistics_ensure_reserve(
        v_line.product_id, v_alloc.quantity, 'production_order_line', v_prod_line.id,
        v_alloc.customer_order_id, v_alloc.customer_order_line_id,
        'production_output', p_id, v_line.id, v_op, v_op || ':' || v_alloc.id
      );
      perform public.logistics_move(
        v_line.product_id, v_alloc.quantity,
        'production_order_line', v_prod_line.id, 'warehouse', v_mfr.warehouse_id,
        'reserved', 'reserved',
        v_alloc.customer_order_id, v_alloc.customer_order_line_id,
        v_alloc.customer_order_id, v_alloc.customer_order_line_id,
        'production_output', p_id, v_line.id, v_op, v_op || ':alloc:' || v_alloc.id
      );
    end loop;

    if v_free > 0 then
      perform public.logistics_move(
        v_line.product_id, v_free,
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
  if v_doc.status in ('sent', 'partially_received', 'received') then
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

create or replace function public.logistics_receive_transfer(p_id text, p_parts jsonb)
returns text
language plpgsql
as $$
declare
  v_doc public.logistics_transfer%rowtype;
  v_event_id text;
  v_part jsonb;
  v_line public.logistics_transfer_line%rowtype;
  v_alloc public.logistics_transfer_allocation%rowtype;
  v_qty numeric;
  v_sent numeric;
  v_got numeric;
  v_op text;
  v_state text;
  v_order_id text;
  v_order_line_id text;
  v_remain numeric;
  v_status text;
begin
  select * into strict v_doc from public.logistics_transfer where id = p_id;
  if v_doc.status not in ('sent', 'partially_received') then
    raise exception 'Transfer must be sent before receiving';
  end if;

  v_event_id := coalesce(p_parts->>'_event_id', 'recv-' || p_id || '-' || floor(extract(epoch from now()))::text);
  v_op := 'transfer_receive:' || v_event_id;
  insert into public.logistics_transfer_receive_event (id, transfer_id, occurred_at)
  values (v_event_id, p_id, now())
  on conflict (id) do nothing;

  for v_part in select * from jsonb_array_elements(coalesce(p_parts->'parts', p_parts))
  loop
    v_qty := (v_part->>'quantity')::numeric;
    select * into strict v_line from public.logistics_transfer_line where id = v_part->>'line_id';
    if v_part->>'allocation_id' is null or v_part->>'allocation_id' = '' then
      v_state := 'free';
      v_order_id := null;
      v_order_line_id := null;
      v_sent := v_line.quantity - coalesce((
        select sum(quantity) from public.logistics_transfer_allocation where line_id = v_line.id
      ), 0);
    else
      select * into strict v_alloc from public.logistics_transfer_allocation where id = v_part->>'allocation_id';
      v_state := 'reserved';
      v_order_id := v_alloc.customer_order_id;
      v_order_line_id := v_alloc.customer_order_line_id;
      v_sent := v_alloc.quantity;
    end if;

    select coalesce(sum(quantity), 0) into v_got
    from public.logistics_transfer_receive_part rp
    join public.logistics_transfer_receive_event ev on ev.id = rp.event_id
    where ev.transfer_id = p_id
      and rp.line_id = v_line.id
      and rp.allocation_id is not distinct from nullif(v_part->>'allocation_id', '');

    if v_got + v_qty > v_sent then
      raise exception 'Cannot receive more than the sent quantity';
    end if;

    insert into public.logistics_transfer_receive_part (id, event_id, line_id, allocation_id, quantity)
    values (
      coalesce(v_part->>'id', v_event_id || '-' || (v_part->>'line_id') || '-' || coalesce(v_part->>'allocation_id', 'free')),
      v_event_id,
      v_line.id,
      nullif(v_part->>'allocation_id', ''),
      v_qty
    );

    perform public.logistics_move(
      v_line.product_id, v_qty,
      'transfer', p_id, 'warehouse', v_doc.to_warehouse_id,
      v_state, v_state, v_order_id, v_order_line_id, v_order_id, v_order_line_id,
      'transfer_receive', v_event_id, v_line.id, v_op,
      v_op || ':' || v_line.id || ':' || coalesce(v_part->>'allocation_id', 'free')
    );
  end loop;

  select coalesce(sum(quantity), 0) into v_remain
  from public.logistics_stock_transaction
  where location_type = 'transfer' and location_id = p_id;

  update public.logistics_transfer
  set status = case when v_remain = 0 then 'received' else 'partially_received' end
  where id = p_id;

  select status into v_status from public.logistics_transfer where id = p_id;
  return v_status;
end;
$$;

create or replace function public.logistics_record_discrepancy(p_id text, p_note text default '')
returns text
language plpgsql
as $$
declare
  r record;
  v_event_id text := 'disc-' || p_id;
  v_op text := 'transfer_discrepancy:' || p_id;
  v_qty numeric;
begin
  if exists (select 1 from public.logistics_transfer_discrepancy where transfer_id = p_id) then
    return 'received';
  end if;

  insert into public.logistics_transfer_discrepancy (id, transfer_id, occurred_at, note)
  values (v_event_id, p_id, now(), coalesce(p_note, ''));

  for r in
    select product_id, stock_state, customer_order_id, customer_order_line_id, sum(quantity) as qty
    from public.logistics_stock_transaction
    where location_type = 'transfer' and location_id = p_id
    group by 1, 2, 3, 4
    having sum(quantity) > 0
  loop
    v_qty := r.qty;
    perform public.logistics_write_tx(
      r.product_id, -v_qty, 'transfer', p_id, r.stock_state,
      r.customer_order_id, r.customer_order_line_id,
      'transfer_discrepancy', v_event_id, null, v_op,
      v_op || ':' || r.product_id || ':' || r.stock_state || ':' || coalesce(r.customer_order_line_id, 'free')
    );
  end loop;

  update public.logistics_transfer set status = 'received' where id = p_id;
  return 'received';
end;
$$;

create or replace function public.logistics_close_customer_order(p_id text)
returns text
language plpgsql
as $$
declare
  r record;
  v_op text := 'customer_order_close:' || p_id;
  v_rel_id text := 'rel-close-' || p_id;
begin
  if exists (select 1 from public.logistics_customer_order where id = p_id and status = 'closed') then
    return 'closed';
  end if;

  insert into public.logistics_reservation_release (id, number, customer_order_id, reason, status, posted_at)
  values (v_rel_id, 'REL-CLOSE-' || p_id, p_id, 'Order closed', 'posted', now())
  on conflict (id) do nothing;

  for r in
    select product_id, location_type, location_id, customer_order_line_id, sum(quantity) as qty
    from public.logistics_stock_transaction
    where stock_state = 'reserved' and customer_order_id = p_id
    group by 1, 2, 3, 4
    having sum(quantity) > 0
  loop
    insert into public.logistics_reservation_release_line (
      id, release_id, customer_order_line_id, product_id, quantity, location_type, location_id
    ) values (
      v_rel_id || '-' || r.customer_order_line_id || '-' || r.location_id,
      v_rel_id, r.customer_order_line_id, r.product_id, r.qty, r.location_type, r.location_id
    ) on conflict (id) do nothing;
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

create or replace function public.logistics_close_production_order(p_id text)
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
      v_op || ':' || r.location_id || ':' || r.stock_state || ':' || coalesce(r.customer_order_line_id, 'free')
    );
  end loop;

  update public.logistics_production_order
  set status = 'closed', closed_at = now()
  where id = p_id;
  return 'closed';
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
    if exists (select 1 from public.logistics_transfer where id = p_id and status in ('partially_received', 'received')) then
      raise exception 'Received transfers are closed with discrepancy or kept as history';
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

grant execute on function public.logistics_post_reservation(text) to anon, authenticated, service_role;
grant execute on function public.logistics_post_release(text) to anon, authenticated, service_role;
grant execute on function public.logistics_post_shipment(text) to anon, authenticated, service_role;
grant execute on function public.logistics_post_return(text) to anon, authenticated, service_role;
grant execute on function public.logistics_sync_production_activation(text) to anon, authenticated, service_role;
grant execute on function public.logistics_set_production_status(text, text) to anon, authenticated, service_role;
grant execute on function public.logistics_post_output(text) to anon, authenticated, service_role;
grant execute on function public.logistics_send_transfer(text) to anon, authenticated, service_role;
grant execute on function public.logistics_receive_transfer(text, jsonb) to anon, authenticated, service_role;
grant execute on function public.logistics_record_discrepancy(text, text) to anon, authenticated, service_role;
grant execute on function public.logistics_close_customer_order(text) to anon, authenticated, service_role;
grant execute on function public.logistics_close_production_order(text) to anon, authenticated, service_role;
grant execute on function public.logistics_cancel_document(text, text) to anon, authenticated, service_role;

insert into public.logistics_setting (id, production_activation_status)
values ('default', 'planned')
on conflict (id) do nothing;
