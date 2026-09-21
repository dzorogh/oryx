-- Unified shipment/return document: one table, route-derived intention, atomic create-and-post.
-- Live demo shipment/return rows and their facts are removed; story seed recreates them.

begin;

delete from public.store_stock_transaction
where document_type in ('shipment', 'return');

delete from public.store_document_history
where document_type in ('shipment', 'return');

delete from public.store_return_line;
delete from public.store_return;
delete from public.store_shipment_line;
delete from public.store_shipment;

drop function if exists public.store_post_shipment(bigint);
drop function if exists public.store_post_return(bigint);

drop table if exists public.store_return_line;
drop table if exists public.store_return;

alter table public.store_shipment
  drop constraint if exists store_shipment_warehouse_id_fkey;

alter table public.store_shipment
  drop column if exists warehouse_id,
  drop column if exists status;

alter table public.store_shipment
  add column from_location_type text not null,
  add column from_location_id bigint not null,
  add column to_location_type text not null,
  add column to_location_id bigint not null;

alter table public.store_shipment
  add constraint store_shipment_route_chk check (
    (
      from_location_type = 'warehouse'
      and to_location_type = 'customer_order'
      and to_location_id = customer_order_id
    )
    or (
      from_location_type = 'customer_order'
      and to_location_type = 'warehouse'
      and from_location_id = customer_order_id
    )
  );

comment on table public.store_shipment is
  'Единый документ отгрузки и возврата. Маршрут from→to задаёт намерение. Код SHP-id не хранится. Существование = проведение.';
comment on column public.store_shipment.customer_order_id is
  'Заказ, которому принадлежит движение. Один конец маршрута всегда этот заказ.';
comment on column public.store_shipment.from_location_type is
  'Тип места-источника: warehouse или customer_order.';
comment on column public.store_shipment.from_location_id is
  'Идентификатор места-источника.';
comment on column public.store_shipment.to_location_type is
  'Тип места-назначения: warehouse или customer_order.';
comment on column public.store_shipment.to_location_id is
  'Идентификатор места-назначения.';
comment on column public.store_shipment.created_at is
  'Момент проведения. Черновика нет.';

alter table public.store_shipment_line
  add column to_owner_type text,
  add column to_owner_id bigint;

alter table public.store_shipment_line
  add constraint store_shipment_line_to_owner_pair_chk
    check (
      (to_owner_type is null and to_owner_id is null)
      or (to_owner_type in ('order', 'region') and to_owner_id is not null)
    );

create unique index store_shipment_line_dest_uidx
  on public.store_shipment_line (
    shipment_id,
    product_id,
    coalesce(to_owner_type, ''),
    coalesce(to_owner_id, 0)
  );

comment on column public.store_shipment_line.to_owner_type is
  'Назначение остатка на складе-получателе. Для отгрузки всегда текущий заказ.';
comment on column public.store_shipment_line.to_owner_id is
  'Идентификатор назначения. NULL вместе с типом = Свободно.';

create or replace function public.store_owner_row_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'store_reservation' then
    perform public.store_assert_owner(new.to_owner_type, new.to_owner_id);
  elsif tg_table_name = 'store_reservation_line' then
    perform public.store_assert_owner(new.from_owner_type, new.from_owner_id);
  elsif tg_table_name = 'store_stock_transaction' then
    perform public.store_assert_owner(new.assigned_to_type, new.assigned_to_id);
  elsif tg_table_name in ('store_transfer_allocation', 'store_output_allocation') then
    perform public.store_assert_owner(new.owner_type, new.owner_id);
  elsif tg_table_name = 'store_shipment_line' then
    perform public.store_assert_owner(new.to_owner_type, new.to_owner_id);
  end if;
  return new;
end;
$$;

drop trigger if exists store_shipment_line_owner_guard on public.store_shipment_line;
create trigger store_shipment_line_owner_guard
  before insert or update on public.store_shipment_line
  for each row execute function public.store_owner_row_guard();

create table public.store_shipment_request (
  request_key text primary key,
  shipment_id bigint not null references public.store_shipment (id),
  created_at timestamptz not null default now()
);

comment on table public.store_shipment_request is
  'Ключи идемпотентности store_create_and_post_shipment. Повтор возвращает тот же документ.';

alter table public.store_shipment_request enable row level security;
create policy store_shipment_request_open_all
  on public.store_shipment_request
  for all
  using (true)
  with check (true);
grant select, insert, update, delete on table public.store_shipment_request
  to anon, authenticated, service_role;

create or replace function public.store_create_and_post_shipment(
  p_request_key text,
  p_customer_order_id bigint,
  p_from_location_type text,
  p_from_location_id bigint,
  p_to_location_type text,
  p_to_location_id bigint,
  p_lines jsonb,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
as $$
declare
  v_existing bigint;
  v_id bigint;
  v_item record;
  v_direction text;
  v_warehouse_id bigint;
  v_to_owner_type text;
  v_to_owner_id bigint;
  v_order_line public.store_customer_order_line%rowtype;
  v_reserved numeric;
  v_shipped numeric;
  v_needed numeric;
  v_product_totals jsonb := '{}'::jsonb;
begin
  if p_request_key is null or length(btrim(p_request_key)) = 0 then
    raise exception 'Укажите ключ запроса документа';
  end if;

  perform pg_advisory_xact_lock(('x' || substr(md5(p_request_key), 1, 16))::bit(64)::bigint);

  select shipment_id into v_existing
  from public.store_shipment_request
  where request_key = p_request_key;
  if v_existing is not null then
    select case
      when from_location_type = 'warehouse' then 'shipment'
      else 'return'
    end into v_direction
    from public.store_shipment
    where id = v_existing;
    return jsonb_build_object('id', v_existing, 'direction', coalesce(v_direction, 'shipment'));
  end if;

  if p_customer_order_id is null then
    raise exception 'Выберите заказ клиента';
  end if;
  if not exists (select 1 from public.store_customer_order where id = p_customer_order_id) then
    raise exception 'Неизвестный заказ клиента %', p_customer_order_id;
  end if;
  if exists (
    select 1 from public.store_customer_order
    where id = p_customer_order_id and status is distinct from 'open'
  ) then
    raise exception 'Нельзя провести отгрузку или возврат по закрытому заказу клиента';
  end if;

  perform pg_advisory_xact_lock(('x' || substr(md5('store_shipment:' || p_customer_order_id::text), 1, 16))::bit(64)::bigint);

  if p_from_location_type = 'warehouse' and p_to_location_type = 'customer_order' then
    v_direction := 'shipment';
    v_warehouse_id := p_from_location_id;
    if p_to_location_id is distinct from p_customer_order_id then
      raise exception 'Допустимы только маршруты склад → заказ клиента (отгрузка) и заказ клиента → склад (возврат)';
    end if;
  elsif p_from_location_type = 'customer_order' and p_to_location_type = 'warehouse' then
    v_direction := 'return';
    v_warehouse_id := p_to_location_id;
    if p_from_location_id is distinct from p_customer_order_id then
      raise exception 'Допустимы только маршруты склад → заказ клиента (отгрузка) и заказ клиента → склад (возврат)';
    end if;
  else
    raise exception 'Допустимы только маршруты склад → заказ клиента (отгрузка) и заказ клиента → склад (возврат)';
  end if;

  if v_warehouse_id is null or not exists (select 1 from public.store_warehouse where id = v_warehouse_id) then
    raise exception 'Выберите склад';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Добавьте хотя бы одну строку товара';
  end if;

  insert into public.store_shipment (
    id, customer_order_id,
    from_location_type, from_location_id,
    to_location_type, to_location_id,
    created_at
  ) values (
    coalesce(p_id, nextval(pg_get_serial_sequence('public.store_shipment', 'id'))),
    p_customer_order_id,
    p_from_location_type, p_from_location_id,
    p_to_location_type, p_to_location_id,
    coalesce(p_created_at, now())
  )
  returning id into v_id;

  for v_item in
    select * from jsonb_to_recordset(p_lines) as x(
      product_id bigint,
      quantity numeric,
      to_owner_type text,
      to_owner_id bigint
    )
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'Количество должно быть больше нуля';
    end if;
    if not exists (select 1 from public.store_product where id = v_item.product_id) then
      raise exception 'Неизвестный товар %', v_item.product_id;
    end if;

    select * into v_order_line
    from public.store_customer_order_line
    where order_id = p_customer_order_id and product_id = v_item.product_id;
    if v_order_line.id is null then
      raise exception 'Товар должен быть в заказе клиента';
    end if;

    if v_direction = 'shipment' then
      v_to_owner_type := 'order';
      v_to_owner_id := p_customer_order_id;
    else
      v_to_owner_type := nullif(btrim(coalesce(v_item.to_owner_type, '')), '');
      v_to_owner_id := v_item.to_owner_id;
      if (v_to_owner_type is null) <> (v_to_owner_id is null) then
        raise exception 'Назначение остатка должно быть полным';
      end if;
      if v_to_owner_type = 'order' and v_to_owner_id is distinct from p_customer_order_id then
        raise exception 'Возврат нельзя назначить другому заказу. Создайте отдельный резерв.';
      end if;
      perform public.store_assert_owner(v_to_owner_type, v_to_owner_id);
    end if;

    if exists (
      select 1
      from public.store_shipment_line
      where shipment_id = v_id
        and product_id = v_item.product_id
        and to_owner_type is not distinct from v_to_owner_type
        and to_owner_id is not distinct from v_to_owner_id
    ) then
      raise exception 'Одинаковый товар и назначение можно указать только один раз';
    end if;

    v_product_totals := jsonb_set(
      v_product_totals,
      array[v_item.product_id::text],
      to_jsonb(coalesce((v_product_totals ->> v_item.product_id::text)::numeric, 0) + v_item.quantity)
    );

    insert into public.store_shipment_line (
      shipment_id, product_id, quantity, to_owner_type, to_owner_id
    ) values (
      v_id, v_item.product_id, v_item.quantity, v_to_owner_type, v_to_owner_id
    );

    if v_direction = 'shipment' then
      v_reserved := public.store_qty(
        v_item.product_id, 'warehouse', v_warehouse_id, 'order', p_customer_order_id
      );
      if v_reserved < v_item.quantity then
        raise exception 'Недостаточно резерва заказа на выбранном складе';
      end if;
      v_shipped := public.store_shipped_for_owner_product('order', p_customer_order_id, v_item.product_id);
      if v_shipped + v_item.quantity > v_order_line.quantity then
        raise exception 'Нельзя отгрузить больше заказанного количества';
      end if;
      perform public.store_move(
        v_item.product_id, v_item.quantity,
        'warehouse', v_warehouse_id, 'customer_order', p_customer_order_id,
        'order', p_customer_order_id,
        'order', p_customer_order_id,
        'shipment', v_id
      );
    else
      v_needed := (v_product_totals ->> v_item.product_id::text)::numeric;
      v_shipped := public.store_shipped_for_owner_product('order', p_customer_order_id, v_item.product_id);
      if v_needed > v_shipped then
        raise exception 'Недостаточно отгруженного количества по заказу';
      end if;
      perform public.store_move(
        v_item.product_id, v_item.quantity,
        'customer_order', p_customer_order_id, 'warehouse', v_warehouse_id,
        'order', p_customer_order_id,
        v_to_owner_type, v_to_owner_id,
        'return', v_id
      );
    end if;
  end loop;

  perform public.store_record_document_history(
    v_direction, v_id, 'created', 'posted', null, coalesce(p_created_at, now()), null
  );

  insert into public.store_shipment_request (request_key, shipment_id)
  values (p_request_key, v_id);

  return jsonb_build_object('id', v_id, 'direction', v_direction);
end;
$$;

grant execute on function public.store_create_and_post_shipment(text, bigint, text, bigint, text, bigint, jsonb, bigint, timestamptz)
  to anon, authenticated, service_role;

-- История пишется только из RPC с классom shipment|return по маршруту.
-- Триггер на INSERT всегда ставил shipment и дублировал строку.
drop trigger if exists store_shipment_history on public.store_shipment;

create or replace function public.store_document_history_trigger()
returns trigger
language plpgsql
as $$
declare
  v_type text;
  v_expected date;
  v_status text;
  v_row jsonb;
begin
  v_type := case tg_table_name
    when 'store_customer_order' then 'customer_order'
    when 'store_production_order' then 'production_order'
    when 'store_reservation' then 'reservation'
    when 'store_transfer' then 'transfer'
    when 'store_shipment' then 'shipment'
    when 'store_output' then 'output'
    else null
  end;
  if v_type is null then
    return new;
  end if;

  v_row := to_jsonb(new);
  v_expected := nullif(v_row ->> 'expected_end_on', '')::date;
  v_status := nullif(v_row ->> 'status', '');

  if tg_op = 'INSERT' then
    perform public.store_record_document_history(
      v_type, new.id, 'created', v_status, v_expected, new.created_at, new.created_by
    );
    return new;
  end if;

  if v_status is distinct from nullif(to_jsonb(old) ->> 'status', '') then
    perform public.store_record_document_history(
      v_type, new.id, 'status_changed', v_status, v_expected, now(), public.store_current_user_id()
    );
  end if;

  if tg_table_name in (
    'store_customer_order', 'store_production_order', 'store_transfer', 'store_output'
  ) and v_expected is distinct from nullif(to_jsonb(old) ->> 'expected_end_on', '')::date then
    perform public.store_record_document_history(
      v_type, new.id, 'expected_end_changed', v_status, v_expected, now(), public.store_current_user_id()
    );
  end if;

  return new;
end;
$$;

create or replace function public.store_cancel_document(p_kind text, p_id bigint)
returns text
language plpgsql
as $$
declare
  v_status text;
begin
  if p_kind in ('reservation', 'reservation_release') then
    raise exception 'Posted reservations cannot be cancelled. Create a Reservation that releases to Free instead.';
  elsif p_kind = 'adjustment' then
    raise exception 'Posted adjustments cannot be cancelled';
  elsif p_kind in ('shipment', 'shipment_return', 'return') then
    raise exception 'Проведённый документ отгрузки или возврата нельзя отменить. Создайте документ обратного маршрута.';
  elsif p_kind = 'production_output' then
    select status into v_status from public.store_output where id = p_id;
    if v_status is null then
      raise exception 'Unknown output %', p_id;
    end if;
    if v_status = 'done' then
      raise exception 'Posted warehouse documents cannot be cancelled';
    end if;
    update public.store_output set status = 'cancelled' where id = p_id;
  elsif p_kind = 'transfer' then
    select status into v_status from public.store_transfer where id = p_id;
    if v_status is null then
      raise exception 'Unknown transfer %', p_id;
    end if;
    if v_status in ('sent', 'delivered') then
      raise exception 'Posted warehouse documents cannot be cancelled';
    end if;
    update public.store_transfer set status = 'cancelled' where id = p_id;
  else
    raise exception 'Unknown document kind %', p_kind;
  end if;
  return 'cancelled';
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

  delete from public.store_document_history
  where document_id between p_lo and p_hi
     or (document_type = 'customer_order' and document_id between p_lo and p_hi)
     or (document_type = 'reservation' and document_id in (
       select id from public.store_reservation
       where id between p_lo and p_hi
          or (to_owner_type = 'order' and to_owner_id between p_lo and p_hi)
     ))
     or (document_type in ('shipment', 'return') and document_id in (
       select id from public.store_shipment
       where id between p_lo and p_hi or customer_order_id between p_lo and p_hi
     ))
     or (document_type = 'output' and document_id between p_lo and p_hi)
     or (document_type = 'production_order' and document_id between p_lo and p_hi)
     or (document_type = 'transfer' and document_id between p_lo and p_hi)
     or (document_type = 'adjustment' and document_id in (
       select id from public.store_adjustment
       where id between p_lo and p_hi
          or source_document_id between p_lo and p_hi
     ));

  delete from public.store_stock_transaction
  where (assigned_to_type = 'order' and assigned_to_id between p_lo and p_hi)
     or document_id between p_lo and p_hi
     or document_id in (
       select store_reservation.id from public.store_reservation
       where id between p_lo and p_hi
          or (to_owner_type = 'order' and to_owner_id between p_lo and p_hi)
     )
     or document_id in (
       select store_shipment.id from public.store_shipment
       where id between p_lo and p_hi or customer_order_id between p_lo and p_hi
     )
     or document_id in (
       select store_output.id from public.store_output where id between p_lo and p_hi
     )
     or document_id in (
       select store_production_order.id from public.store_production_order where id between p_lo and p_hi
     )
     or document_id in (
       select store_transfer.id from public.store_transfer where id between p_lo and p_hi
     )
     or document_id in (
       select store_adjustment.id from public.store_adjustment
       where id between p_lo and p_hi
          or source_document_id between p_lo and p_hi
     );

  delete from public.store_adjustment_line
  where id between p_lo and p_hi
     or adjustment_id in (
       select id from public.store_adjustment
       where id between p_lo and p_hi
          or source_document_id between p_lo and p_hi
     );

  delete from public.store_adjustment
  where id between p_lo and p_hi
     or source_document_id between p_lo and p_hi;

  delete from public.store_shipment_request
  where shipment_id in (
    select id from public.store_shipment
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

grant execute on function public.store_cancel_document(text, bigint)
  to anon, authenticated, service_role;
grant execute on function public.store_reset_logistics_stories(bigint, bigint)
  to anon, authenticated, service_role;

update public.store_setting
set code_prefixes = coalesce(code_prefixes, '{}'::jsonb)
  || jsonb_build_object('return', 'SHP', 'returnLine', 'SHL');

notify pgrst, 'reload schema';

commit;
