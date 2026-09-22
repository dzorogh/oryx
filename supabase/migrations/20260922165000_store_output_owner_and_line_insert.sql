-- Allow the creating transaction to insert shipment/adjustment lines before history is recorded.
-- Allocated production output keeps the customer order on the line so «Выпущено» can be read without WIP.

create or replace function public.store_document_line_guard()
returns trigger
language plpgsql
as $f$
declare
  v_kind text;
  v_status text;
  v_doc_id bigint;
begin
  v_doc_id := coalesce(new.document_id, old.document_id);
  select d.kind into v_kind from public.store_document d where d.id = v_doc_id;

  if tg_op = 'UPDATE' then
    if new.document_id is distinct from old.document_id
      or new.from_owner_type is distinct from old.from_owner_type
      or new.from_owner_id is distinct from old.from_owner_id
      or new.to_owner_type is distinct from old.to_owner_type
      or new.to_owner_id is distinct from old.to_owner_id
      or new.product_name is distinct from old.product_name
      or new.product_sku is distinct from old.product_sku
      or new.product_unit is distinct from old.product_unit
      or new.variant is distinct from old.variant
      or new.manufacturer_name is distinct from old.manufacturer_name
      or new.manufacturer_code is distinct from old.manufacturer_code
    then
      raise exception 'Поля снимка и владельцев строки нельзя изменять';
    end if;
    if new.product_id is distinct from old.product_id and new.product_id is not null then
      raise exception 'Поля снимка и владельцев строки нельзя изменять';
    end if;
    if new.manufacturer_id is distinct from old.manufacturer_id and new.manufacturer_id is not null then
      raise exception 'Поля снимка и владельцев строки нельзя изменять';
    end if;
  end if;

  if v_kind = 'customer_order' then
    select status into v_status from public.store_customer_order where id = v_doc_id;
    if v_status = 'closed' then
      raise exception 'Строки закрытого заказа клиента нельзя изменять';
    end if;
  elsif v_kind = 'production_order' then
    select status into v_status from public.store_production_order where id = v_doc_id;
    if v_status in ('closed', 'cancelled') then
      raise exception 'Строки закрытого заказа на производство нельзя изменять';
    end if;
    if tg_op = 'UPDATE' and new.quantity is distinct from old.quantity then
      if new.quantity < public.store_po_assigned_qty(new.document_id, coalesce(new.product_id, old.product_id))
                      + public.store_po_produced_qty(new.document_id, coalesce(new.product_id, old.product_id)) then
        raise exception 'План нельзя опустить ниже назначенного плюс выпущенного';
      end if;
    end if;
  elsif v_kind = 'reservation' then
    select status into v_status from public.store_reservation where id = v_doc_id;
    if v_status = 'posted' then
      raise exception 'Строки проведённого резерва нельзя изменять';
    end if;
  elsif v_kind = 'transfer' then
    select status into v_status from public.store_transfer where id = v_doc_id;
    if v_status in ('sent', 'delivered', 'cancelled') then
      raise exception 'Строки отправленного перемещения нельзя изменять';
    end if;
  elsif v_kind = 'output' then
    select status into v_status from public.store_output where id = v_doc_id;
    if v_status in ('done', 'cancelled') then
      raise exception 'Строки завершённого выпуска нельзя изменять';
    end if;
  elsif v_kind in ('shipment', 'adjustment') then
    if tg_op = 'INSERT' and not exists (
      select 1 from public.store_document_history
      where document_id = v_doc_id and event_type = 'created'
    ) then
      null;
    else
      raise exception 'Строки отгрузки, возврата и корректировки нельзя изменять';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$f$;

create or replace function public.store_region_snapshot_immutable()
returns trigger
language plpgsql
as $f$
begin
  if new.line_id is distinct from old.line_id
    or new.region_code is distinct from old.region_code
    or new.region_name is distinct from old.region_name
    or new.purchase_price is distinct from old.purchase_price
    or new.purchase_currency is distinct from old.purchase_currency
    or new.dealer_price is distinct from old.dealer_price
    or new.dealer_currency is distinct from old.dealer_currency
    or new.retail_price is distinct from old.retail_price
    or new.retail_currency is distinct from old.retail_currency
    or new.dealer_status is distinct from old.dealer_status
    or new.retail_status is distinct from old.retail_status
    or (new.region_id is distinct from old.region_id and new.region_id is not null)
  then
    raise exception 'Региональный снимок строки нельзя изменять';
  end if;
  return new;
end;
$f$;

create or replace function public.store_create_production_output(
  p_request_key text,
  p_production_order_id bigint,
  p_product_id bigint,
  p_quantity numeric,
  p_expected_end_on date default null,
  p_complete boolean default true,
  p_allocation_owner_type text default null,
  p_allocation_owner_id bigint default null,
  p_allocation_quantity numeric default null
)
returns jsonb
language plpgsql
as $f$
declare
  v_existing bigint;
  v_order public.store_production_order%rowtype;
  v_mfr public.store_manufacturer%rowtype;
  v_already numeric;
  v_plan numeric;
  v_free_demand numeric;
  v_order_line public.store_document_product_line%rowtype;
  v_alloc_qty numeric;
  v_res_id bigint;
  v_output_id bigint;
begin
  if p_request_key is null or length(btrim(p_request_key)) = 0 then
    raise exception 'Укажите ключ запроса выпуска';
  end if;

  perform pg_advisory_xact_lock(('x' || substr(md5(p_request_key), 1, 16))::bit(64)::bigint);

  select output_id into v_existing from public.store_output_request where request_key = p_request_key;
  if v_existing is not null then
    return jsonb_build_object('id', v_existing);
  end if;

  select * into v_order from public.store_production_order where id = p_production_order_id;
  if v_order.id is null then
    raise exception 'Неизвестный заказ на производство %', p_production_order_id;
  end if;
  if v_order.status in ('closed', 'cancelled') then
    raise exception 'Нельзя создать выпуск по закрытому или отменённому заказу';
  end if;

  if p_product_id is null or coalesce(p_quantity, 0) <= 0 then
    raise exception 'Выберите товар и положительное количество';
  end if;

  v_plan := public.store_po_plan_qty(p_production_order_id, p_product_id);
  if v_plan <= 0 then
    raise exception 'В заказе на производство нет этого товара';
  end if;
  v_already := public.store_po_produced_qty(p_production_order_id, p_product_id);
  if v_already + p_quantity > v_plan then
    raise exception 'Нельзя выпустить больше строки заказа на производство';
  end if;

  v_alloc_qty := coalesce(p_allocation_quantity, 0);
  if v_alloc_qty < 0 then
    raise exception 'Количество должно быть больше нуля';
  end if;
  if v_alloc_qty > p_quantity then
    raise exception 'Занятое количество не может превышать выпуск';
  end if;

  select * into strict v_mfr from public.store_manufacturer where id = v_order.manufacturer_id;

  if v_alloc_qty > 0 then
    if p_allocation_owner_type is distinct from 'order' or p_allocation_owner_id is null then
      raise exception 'Выпуск может резервировать только под заказ клиента';
    end if;
    perform public.store_assert_owner(p_allocation_owner_type, p_allocation_owner_id);
    select * into v_order_line
    from public.store_document_product_line
    where document_id = p_allocation_owner_id and product_id = p_product_id
    limit 1;
    if v_order_line.id is null then
      raise exception 'В заказе клиента нет этого товара';
    end if;
  elsif p_allocation_owner_type is not null or p_allocation_owner_id is not null then
    raise exception 'Назначение остатка должно быть полным';
  end if;

  v_output_id := public.store_create_document('output');
  insert into public.store_output (id, production_order_id, status, expected_end_on)
  values (v_output_id, p_production_order_id, 'planned', p_expected_end_on);

  if v_alloc_qty > 0 and v_alloc_qty < p_quantity then
    perform public.store_add_document_product_line(v_output_id, p_product_id, p_quantity - v_alloc_qty);
    perform public.store_add_document_product_line(
      v_output_id, p_product_id, v_alloc_qty, null, null, p_allocation_owner_type, p_allocation_owner_id
    );
  elsif v_alloc_qty > 0 then
    perform public.store_add_document_product_line(
      v_output_id, p_product_id, p_quantity, null, null, p_allocation_owner_type, p_allocation_owner_id
    );
  else
    perform public.store_add_document_product_line(v_output_id, p_product_id, p_quantity);
  end if;

  if coalesce(p_complete, true) then
    perform public.store_complete_output(v_output_id);
  end if;

  -- After stock is on warehouse, optionally reserve free warehouse stock for the order
  if v_alloc_qty > 0 then
    v_res_id := public.store_create_document('reservation');
    insert into public.store_reservation (
      id, location_type, location_id, to_owner_type, to_owner_id, status, origin, note
    ) values (
      v_res_id, 'warehouse', v_mfr.warehouse_id,
      p_allocation_owner_type, p_allocation_owner_id,
      'draft', 'manual', ''
    );
    perform public.store_add_document_product_line(
      v_res_id, p_product_id, v_alloc_qty, null, null,
      p_allocation_owner_type, p_allocation_owner_id
    );
    perform public.store_post_reservation(v_res_id);
  end if;

  insert into public.store_output_request (request_key, output_id) values (p_request_key, v_output_id);
  perform public.store_record_document_history('output', v_output_id, 'created',
    case when coalesce(p_complete, true) then 'done' else 'planned' end, p_expected_end_on);

  return jsonb_build_object('id', v_output_id);
end;
$f$;

