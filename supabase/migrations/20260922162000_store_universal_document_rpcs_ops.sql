-- Universal lines: shipment, transfer, adjustment, reset, close PO fix
begin;

create or replace function public.store_close_production_order(p_id bigint)
returns text
language plpgsql
as $f$
declare
  v_hold record;
  v_res_id bigint;
begin
  if exists (select 1 from public.store_production_order where id = p_id and status = 'closed') then
    return 'closed';
  end if;

  for v_hold in
    select
      case
        when sum(case when r.to_owner_type is not null and l.from_owner_type is null then l.quantity
                      when r.to_owner_type is null and l.from_owner_type is not null then -l.quantity
                      else 0 end) > 0
        then coalesce(
          max(r.to_owner_type) filter (where r.to_owner_type is not null),
          max(l.from_owner_type) filter (where l.from_owner_type is not null)
        )
      end as owner_type,
      case
        when sum(case when r.to_owner_type is not null and l.from_owner_type is null then l.quantity
                      when r.to_owner_type is null and l.from_owner_type is not null then -l.quantity
                      else 0 end) > 0
        then coalesce(
          max(r.to_owner_id) filter (where r.to_owner_type is not null),
          max(l.from_owner_id) filter (where l.from_owner_type is not null)
        )
      end as owner_id,
      l.product_id,
      sum(
        case
          when r.to_owner_type is not null and l.from_owner_type is null then l.quantity
          when r.to_owner_type is null and l.from_owner_type is not null then -l.quantity
          else 0
        end
      ) as qty
    from public.store_reservation r
    join public.store_document_product_line l on l.document_id = r.id
    where r.location_type = 'production_order'
      and r.location_id = p_id
      and r.status = 'posted'
    group by l.product_id,
      coalesce(r.to_owner_type, l.from_owner_type),
      coalesce(r.to_owner_id, l.from_owner_id)
    having sum(
      case
        when r.to_owner_type is not null and l.from_owner_type is null then l.quantity
        when r.to_owner_type is null and l.from_owner_type is not null then -l.quantity
        else 0
      end
    ) > 0
  loop
    v_res_id := public.store_create_document('reservation');
    insert into public.store_reservation (
      id, location_type, location_id, to_owner_type, to_owner_id, status, origin, note
    ) values (
      v_res_id, 'production_order', p_id, null, null, 'draft', 'order_close', 'Production order closed'
    );
    perform public.store_add_document_product_line(
      v_res_id, v_hold.product_id, v_hold.qty,
      v_hold.owner_type, v_hold.owner_id, null, null
    );
    perform public.store_post_reservation(v_res_id);
  end loop;

  update public.store_production_order set status = 'closed' where id = p_id;
  return 'closed';
end;
$f$;

-- Simpler close: use assigned helper per product×owner
create or replace function public.store_close_production_order(p_id bigint)
returns text
language plpgsql
as $f$
declare
  v_row record;
  v_res_id bigint;
  v_qty numeric;
begin
  if exists (select 1 from public.store_production_order where id = p_id and status = 'closed') then
    return 'closed';
  end if;

  for v_row in
    select distinct l.product_id, r.to_owner_type as owner_type, r.to_owner_id as owner_id
    from public.store_reservation r
    join public.store_document_product_line l on l.document_id = r.id
    where r.location_type = 'production_order'
      and r.location_id = p_id
      and r.status = 'posted'
      and r.to_owner_type is not null
  loop
    v_qty := public.store_po_assigned_qty(p_id, v_row.product_id, v_row.owner_type, v_row.owner_id);
    if v_qty <= 0 then
      continue;
    end if;
    v_res_id := public.store_create_document('reservation');
    insert into public.store_reservation (
      id, location_type, location_id, to_owner_type, to_owner_id, status, origin, note
    ) values (
      v_res_id, 'production_order', p_id, null, null, 'draft', 'order_close', 'Production order closed'
    );
    perform public.store_add_document_product_line(
      v_res_id, v_row.product_id, v_qty,
      v_row.owner_type, v_row.owner_id, null, null
    );
    perform public.store_post_reservation(v_res_id);
  end loop;

  update public.store_production_order set status = 'closed' where id = p_id;
  return 'closed';
end;
$f$;

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
as $f$
declare
  v_existing bigint;
  v_id bigint;
  v_item record;
  v_direction text;
  v_warehouse_id bigint;
  v_to_owner_type text;
  v_to_owner_id bigint;
  v_from_owner_type text;
  v_from_owner_id bigint;
  v_order_line public.store_document_product_line%rowtype;
  v_reserved numeric;
  v_shipped numeric;
  v_needed numeric;
  v_product_totals jsonb := '{}'::jsonb;
  v_seq bigint;
begin
  if p_request_key is null or length(btrim(p_request_key)) = 0 then
    raise exception 'Укажите ключ запроса документа';
  end if;

  perform pg_advisory_xact_lock(('x' || substr(md5(p_request_key), 1, 16))::bit(64)::bigint);

  select shipment_id into v_existing from public.store_shipment_request where request_key = p_request_key;
  if v_existing is not null then
    select case when from_location_type = 'warehouse' then 'shipment' else 'return' end
      into v_direction from public.store_shipment where id = v_existing;
    return jsonb_build_object('id', v_existing, 'direction', coalesce(v_direction, 'shipment'));
  end if;

  if p_customer_order_id is null or not exists (select 1 from public.store_customer_order where id = p_customer_order_id) then
    raise exception 'Выберите заказ клиента';
  end if;

  if p_from_location_type = 'warehouse' and p_to_location_type = 'customer_order' then
    v_direction := 'shipment';
    v_warehouse_id := p_from_location_id;
    if p_to_location_id is distinct from p_customer_order_id then
      raise exception 'Допустимы только маршруты склад → заказ клиента и заказ клиента → склад';
    end if;
  elsif p_from_location_type = 'customer_order' and p_to_location_type = 'warehouse' then
    v_direction := 'return';
    v_warehouse_id := p_to_location_id;
    if p_from_location_id is distinct from p_customer_order_id then
      raise exception 'Допустимы только маршруты склад → заказ клиента и заказ клиента → склад';
    end if;
  else
    raise exception 'Допустимы только маршруты склад → заказ клиента и заказ клиента → склад';
  end if;

  if v_warehouse_id is null or not exists (select 1 from public.store_warehouse where id = v_warehouse_id) then
    raise exception 'Выберите склад';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Добавьте хотя бы одну строку товара';
  end if;

  v_seq := coalesce(p_id, (
    select coalesce(max(sequence_number), 0) + 1 from public.store_document where kind = 'shipment'
  ));
  v_id := public.store_create_document('shipment', v_seq, p_id, p_created_at);

  insert into public.store_shipment (
    id, customer_order_id,
    from_location_type, from_location_id,
    to_location_type, to_location_id
  ) values (
    v_id, p_customer_order_id,
    p_from_location_type, p_from_location_id,
    p_to_location_type, p_to_location_id
  );

  for v_item in
    select * from jsonb_to_recordset(p_lines) as x(
      product_id bigint, quantity numeric, to_owner_type text, to_owner_id bigint
    )
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'Количество должно быть больше нуля';
    end if;

    select * into v_order_line
    from public.store_document_product_line
    where document_id = p_customer_order_id and product_id = v_item.product_id
    limit 1;
    if v_order_line.id is null then
      raise exception 'Товар должен быть в заказе клиента';
    end if;

    if v_direction = 'shipment' then
      v_to_owner_type := 'order';
      v_to_owner_id := p_customer_order_id;
      v_from_owner_type := 'order';
      v_from_owner_id := p_customer_order_id;
    else
      v_to_owner_type := nullif(btrim(coalesce(v_item.to_owner_type, '')), '');
      v_to_owner_id := v_item.to_owner_id;
      if (v_to_owner_type is null) <> (v_to_owner_id is null) then
        raise exception 'Назначение остатка должно быть полным';
      end if;
      if v_to_owner_type = 'order' and v_to_owner_id is distinct from p_customer_order_id then
        raise exception 'Возврат нельзя назначить другому заказу';
      end if;
      perform public.store_assert_owner(v_to_owner_type, v_to_owner_id);
      v_from_owner_type := v_to_owner_type;
      v_from_owner_id := v_to_owner_id;
    end if;

    v_product_totals := jsonb_set(
      v_product_totals,
      array[v_item.product_id::text],
      to_jsonb(coalesce((v_product_totals ->> v_item.product_id::text)::numeric, 0) + v_item.quantity)
    );

    perform public.store_add_document_product_line(
      v_id, v_item.product_id, v_item.quantity,
      v_from_owner_type, v_from_owner_id, v_to_owner_type, v_to_owner_id
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
        'order', p_customer_order_id, 'order', p_customer_order_id,
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
        'order', p_customer_order_id, v_to_owner_type, v_to_owner_id,
        'return', v_id
      );
    end if;
  end loop;

  perform public.store_record_document_history(
    v_direction, v_id, 'created', 'posted', null, coalesce(p_created_at, now()), null
  );
  insert into public.store_shipment_request (request_key, shipment_id) values (p_request_key, v_id);
  return jsonb_build_object('id', v_id, 'direction', v_direction);
end;
$f$;

create or replace function public.store_send_transfer(p_id bigint)
returns text
language plpgsql
as $f$
declare
  v_doc public.store_transfer%rowtype;
  v_line public.store_document_product_line%rowtype;
begin
  select * into strict v_doc from public.store_transfer where id = p_id;
  if v_doc.status in ('sent', 'delivered') then
    return v_doc.status;
  end if;
  if v_doc.status = 'cancelled' then
    raise exception 'Cancelled documents cannot be posted';
  end if;

  for v_line in select * from public.store_document_product_line where document_id = p_id
  loop
    perform public.store_move(
      v_line.product_id, v_line.quantity,
      'warehouse', v_doc.from_warehouse_id, 'transfer', p_id,
      v_line.from_owner_type, v_line.from_owner_id,
      v_line.to_owner_type, v_line.to_owner_id,
      'transfer', p_id
    );
  end loop;

  update public.store_transfer set status = 'sent' where id = p_id;
  return 'sent';
end;
$f$;

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
as $f$
declare
  v_existing bigint;
  v_status text;
  v_id bigint;
  v_item record;
  v_owner_type text;
  v_seq bigint;
begin
  if p_request_key is null or length(btrim(p_request_key)) = 0 then
    raise exception 'Transfer request key is required';
  end if;

  perform pg_advisory_xact_lock(('x' || substr(md5(p_request_key), 1, 16))::bit(64)::bigint);

  select transfer_id into v_existing from public.store_transfer_request where request_key = p_request_key;
  if v_existing is not null then
    select status into v_status from public.store_transfer where id = v_existing;
    return jsonb_build_object('id', v_existing, 'status', coalesce(v_status, 'sent'));
  end if;

  if p_from_warehouse_id is null or p_to_warehouse_id is null or p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'Both warehouses are required and must differ';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one transfer line';
  end if;

  v_seq := coalesce(p_id, (
    select coalesce(max(sequence_number), 0) + 1 from public.store_document where kind = 'transfer'
  ));
  v_id := public.store_create_document('transfer', v_seq, p_id, p_created_at);

  insert into public.store_transfer (
    id, from_warehouse_id, to_warehouse_id, status, expected_end_on
  ) values (
    v_id, p_from_warehouse_id, p_to_warehouse_id, 'draft', p_expected_end_on
  );

  for v_item in
    select * from jsonb_to_recordset(p_lines) as x(
      product_id bigint, quantity numeric, owner_type text, owner_id bigint
    )
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'Each line needs a product and a positive quantity';
    end if;
    v_owner_type := nullif(btrim(coalesce(v_item.owner_type, '')), '');
    perform public.store_assert_owner(v_owner_type, v_item.owner_id);
    perform public.store_add_document_product_line(
      v_id, v_item.product_id, v_item.quantity,
      v_owner_type, v_item.owner_id, v_owner_type, v_item.owner_id
    );
  end loop;

  v_status := public.store_send_transfer(v_id);
  insert into public.store_transfer_request (request_key, transfer_id) values (p_request_key, v_id);
  perform public.store_record_document_history('transfer', v_id, 'created', v_status, p_expected_end_on, coalesce(p_created_at, now()), null);
  return jsonb_build_object('id', v_id, 'status', v_status);
end;
$f$;

create or replace function public.store_create_and_post_adjustment(
  p_operation text,
  p_warehouse_id bigint,
  p_explanation text,
  p_lines jsonb,
  p_source_document_type text default null,
  p_source_document_id bigint default null
)
returns jsonb
language plpgsql
as $f$
declare
  v_id bigint;
  v_item record;
  v_signed numeric;
  v_seen bigint[] := '{}';
  v_available numeric;
  v_source_type text;
begin
  if p_operation not in ('write_off', 'decrease', 'increase') then
    raise exception 'Unknown adjustment operation';
  end if;
  if p_warehouse_id is null or not exists (select 1 from public.store_warehouse where id = p_warehouse_id) then
    raise exception 'Выберите склад';
  end if;
  if p_explanation is null or length(btrim(p_explanation)) = 0 then
    raise exception 'Укажите объяснение корректировки';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Добавьте хотя бы одну строку товара';
  end if;

  v_source_type := nullif(btrim(coalesce(p_source_document_type, '')), '');
  if (v_source_type is null) <> (p_source_document_id is null) then
    raise exception 'Ссылка на исходный документ должна быть полной';
  end if;

  v_id := public.store_create_document('adjustment');
  insert into public.store_adjustment (
    id, operation, warehouse_id, explanation, source_document_type, source_document_id, status
  ) values (
    v_id, p_operation, p_warehouse_id, btrim(p_explanation), v_source_type, p_source_document_id, 'posted'
  );

  for v_item in
    select * from jsonb_to_recordset(p_lines) as x(product_id bigint, quantity numeric)
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'Количество должно быть больше нуля';
    end if;
    if v_item.product_id = any(v_seen) then
      raise exception 'Один товар можно указать только один раз';
    end if;
    v_seen := array_append(v_seen, v_item.product_id);

    if p_operation in ('write_off', 'decrease') then
      v_available := public.store_qty(v_item.product_id, 'warehouse', p_warehouse_id, null, null);
      if v_available < v_item.quantity then
        raise exception 'Недостаточно свободного остатка в выбранном месте';
      end if;
      v_signed := -v_item.quantity;
    else
      v_signed := v_item.quantity;
    end if;

    perform public.store_add_document_product_line(v_id, v_item.product_id, v_item.quantity);
    perform public.store_write_tx(
      v_item.product_id, v_signed, 'warehouse', p_warehouse_id,
      null, null, 'adjustment', v_id
    );
  end loop;

  perform public.store_record_document_history('adjustment', v_id, 'created', 'posted', null);
  return jsonb_build_object('id', v_id, 'status', 'posted');
end;
$f$;

-- Story reset for remapped ids + universal lines
create or replace function public.store_reset_logistics_stories(p_lo bigint, p_hi bigint)
returns text
language plpgsql
security definer
set search_path to 'public'
as $f$
begin
  if p_lo is null or p_hi is null or p_lo < 901 or p_hi > 999 or p_lo > p_hi then
    raise exception 'Story reset range must stay inside 901-999';
  end if;

  perform set_config('session_replication_role', 'replica', true);

  -- Delete by sequence_number in story range across kinds, plus remapped absolute ids
  delete from public.store_document_history
  where document_id in (
    select id from public.store_document
    where sequence_number between p_lo and p_hi
       or id between p_lo and p_hi
  );

  delete from public.store_stock_transaction
  where document_id in (select id from public.store_document where sequence_number between p_lo and p_hi or id between p_lo and p_hi)
     or (assigned_to_type = 'order' and assigned_to_id between p_lo and p_hi)
     or (location_type = 'customer_order' and location_id between p_lo and p_hi)
     or (location_type = 'production_order' and location_id in (
          select id from public.store_document where kind = 'production_order' and sequence_number between p_lo and p_hi
        ))
     or (location_type = 'transfer' and location_id in (
          select id from public.store_document where kind = 'transfer' and sequence_number between p_lo and p_hi
        ));

  delete from public.store_shipment_request
  where shipment_id in (
    select id from public.store_document where kind = 'shipment' and sequence_number between p_lo and p_hi
  );
  delete from public.store_output_request
  where output_id in (
    select id from public.store_document where kind = 'output' and sequence_number between p_lo and p_hi
  );
  delete from public.store_transfer_request
  where transfer_id in (
    select id from public.store_document where kind = 'transfer' and sequence_number between p_lo and p_hi
  );

  delete from public.store_document_product_line_region_snapshot
  where line_id in (
    select l.id from public.store_document_product_line l
    join public.store_document d on d.id = l.document_id
    where d.sequence_number between p_lo and p_hi or d.id between p_lo and p_hi
       or (d.kind = 'customer_order' and d.id between p_lo and p_hi)
  );

  delete from public.store_document_product_line
  where document_id in (
    select id from public.store_document
    where sequence_number between p_lo and p_hi or id between p_lo and p_hi
  );

  delete from public.store_adjustment
  where id in (select id from public.store_document where kind = 'adjustment' and sequence_number between p_lo and p_hi)
     or source_document_id in (select id from public.store_document where sequence_number between p_lo and p_hi);

  delete from public.store_shipment
  where id in (select id from public.store_document where kind = 'shipment' and sequence_number between p_lo and p_hi)
     or customer_order_id between p_lo and p_hi;

  delete from public.store_output
  where id in (select id from public.store_document where kind = 'output' and sequence_number between p_lo and p_hi)
     or production_order_id in (
       select id from public.store_document where kind = 'production_order' and sequence_number between p_lo and p_hi
     );

  delete from public.store_transfer
  where id in (select id from public.store_document where kind = 'transfer' and sequence_number between p_lo and p_hi);

  delete from public.store_reservation
  where id in (select id from public.store_document where kind = 'reservation' and sequence_number between p_lo and p_hi)
     or (to_owner_type = 'order' and to_owner_id between p_lo and p_hi)
     or (location_type = 'production_order' and location_id in (
       select id from public.store_document where kind = 'production_order' and sequence_number between p_lo and p_hi
     ));

  delete from public.store_production_order
  where id in (select id from public.store_document where kind = 'production_order' and sequence_number between p_lo and p_hi);

  delete from public.store_customer_order where id between p_lo and p_hi;

  delete from public.store_document
  where sequence_number between p_lo and p_hi
     or id between p_lo and p_hi;

  perform set_config('session_replication_role', 'origin', true);
  return 'reset';
exception
  when others then
    perform set_config('session_replication_role', 'origin', true);
    raise;
end;
$f$;

-- Customer order create helper for seed/UI
create or replace function public.store_create_customer_order(
  p_description text default '',
  p_expected_end_on date default null,
  p_lines jsonb default '[]'::jsonb,
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
as $f$
declare
  v_id bigint;
  v_item record;
  v_line_id bigint;
  v_lines jsonb := '[]'::jsonb;
begin
  v_id := public.store_create_document(
    'customer_order',
    coalesce(p_sequence_number, p_id),
    coalesce(p_id, p_sequence_number),
    p_created_at
  );
  insert into public.store_customer_order (id, status, expected_end_on, description)
  values (v_id, 'open', p_expected_end_on, coalesce(p_description, ''));

  for v_item in
    select * from jsonb_to_recordset(coalesce(p_lines, '[]'::jsonb)) as x(product_id bigint, quantity numeric)
  loop
    v_line_id := public.store_add_document_product_line(v_id, v_item.product_id, v_item.quantity);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('id', v_line_id, 'product_id', v_item.product_id));
  end loop;

  perform public.store_record_document_history(
    'customer_order', v_id, 'created', 'open', p_expected_end_on, coalesce(p_created_at, now()), null
  );
  return jsonb_build_object('id', v_id, 'lines', v_lines);
end;
$f$;

grant execute on function public.store_create_customer_order(text, date, jsonb, bigint, bigint, timestamptz)
  to anon, authenticated, service_role;

commit;

-- History trigger: created_at/created_by live on store_document
create or replace function public.store_document_history_trigger()
returns trigger
language plpgsql
as $f$
declare
  v_type text;
  v_expected date;
  v_status text;
  v_row jsonb;
  v_created_at timestamptz;
  v_created_by bigint;
begin
  v_type := case tg_table_name
    when 'store_customer_order' then 'customer_order'
    when 'store_production_order' then 'production_order'
    when 'store_reservation' then 'reservation'
    when 'store_transfer' then 'transfer'
    when 'store_shipment' then 'shipment'
    when 'store_output' then 'output'
    when 'store_adjustment' then 'adjustment'
    else null
  end;
  if v_type is null then
    return new;
  end if;

  v_row := to_jsonb(new);
  v_expected := nullif(v_row ->> 'expected_end_on', '')::date;
  v_status := coalesce(nullif(v_row ->> 'status', ''), 'posted');

  select d.created_at, d.created_by into v_created_at, v_created_by
  from public.store_document d where d.id = new.id;

  if tg_table_name = 'store_shipment' then
    if (v_row ->> 'from_location_type') = 'customer_order' then
      v_type := 'return';
    else
      v_type := 'shipment';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if exists (
      select 1 from public.store_document_history h
      where h.document_type = v_type and h.document_id = new.id and h.event_type = 'created'
    ) then
      return new;
    end if;
    perform public.store_record_document_history(
      v_type, new.id, 'created', v_status, v_expected,
      coalesce(v_created_at, now()), coalesce(v_created_by, public.store_current_user_id())
    );
    return new;
  end if;

  if v_status is distinct from coalesce(nullif(to_jsonb(old) ->> 'status', ''), 'posted') then
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
$f$;
