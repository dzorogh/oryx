drop function if exists public.store_create_production_output(
  text, bigint, bigint, numeric, date, boolean, text, bigint, numeric
);

create or replace function public.store_create_production_output(
  p_request_key text,
  p_production_order_id bigint,
  p_lines jsonb,
  p_expected_end_on date default null,
  p_complete boolean default true
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
  v_order_line public.store_document_product_line%rowtype;
  v_alloc_qty numeric;
  v_res_id bigint;
  v_output_id bigint;
  v_item record;
  v_owner record;
  v_seen_products bigint[] := array[]::bigint[];
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

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Выберите товар и положительное количество';
  end if;

  select * into strict v_mfr from public.store_manufacturer where id = v_order.manufacturer_id;

  for v_item in
    select *
    from jsonb_to_recordset(p_lines) as x(
      product_id bigint,
      quantity numeric,
      allocation_owner_type text,
      allocation_owner_id bigint,
      allocation_quantity numeric
    )
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'Выберите товар и положительное количество';
    end if;
    if v_item.product_id = any (v_seen_products) then
      raise exception 'Товар не должен повторяться в выпуске';
    end if;
    v_seen_products := array_append(v_seen_products, v_item.product_id);

    v_plan := public.store_po_plan_qty(p_production_order_id, v_item.product_id);
    if v_plan <= 0 then
      raise exception 'В заказе на производство нет этого товара';
    end if;
    v_already := public.store_po_produced_qty(p_production_order_id, v_item.product_id);
    if v_already + v_item.quantity > v_plan then
      raise exception 'Нельзя выпустить больше строки заказа на производство';
    end if;

    v_alloc_qty := coalesce(v_item.allocation_quantity, 0);
    if v_alloc_qty < 0 then
      raise exception 'Количество должно быть больше нуля';
    end if;
    if v_alloc_qty > v_item.quantity then
      raise exception 'Занятое количество не может превышать выпуск';
    end if;

    if v_alloc_qty > 0 then
      if v_item.allocation_owner_type is distinct from 'order' or v_item.allocation_owner_id is null then
        raise exception 'Выпуск может резервировать только под заказ клиента';
      end if;
      perform public.store_assert_owner(v_item.allocation_owner_type, v_item.allocation_owner_id);
      select * into v_order_line
      from public.store_document_product_line
      where document_id = v_item.allocation_owner_id and product_id = v_item.product_id
      limit 1;
      if v_order_line.id is null then
        raise exception 'В заказе клиента нет этого товара';
      end if;
    elsif v_item.allocation_owner_type is not null or v_item.allocation_owner_id is not null then
      raise exception 'Назначение остатка должно быть полным';
    end if;
  end loop;

  v_output_id := public.store_create_document('output');
  insert into public.store_output (id, production_order_id, status, expected_end_on)
  values (v_output_id, p_production_order_id, 'planned', p_expected_end_on);

  for v_item in
    select *
    from jsonb_to_recordset(p_lines) as x(
      product_id bigint,
      quantity numeric,
      allocation_owner_type text,
      allocation_owner_id bigint,
      allocation_quantity numeric
    )
  loop
    v_alloc_qty := coalesce(v_item.allocation_quantity, 0);
    if v_alloc_qty > 0 and v_alloc_qty < v_item.quantity then
      perform public.store_add_document_product_line(v_output_id, v_item.product_id, v_item.quantity - v_alloc_qty);
      perform public.store_add_document_product_line(
        v_output_id, v_item.product_id, v_alloc_qty, null, null,
        v_item.allocation_owner_type, v_item.allocation_owner_id
      );
    elsif v_alloc_qty > 0 then
      perform public.store_add_document_product_line(
        v_output_id, v_item.product_id, v_item.quantity, null, null,
        v_item.allocation_owner_type, v_item.allocation_owner_id
      );
    else
      perform public.store_add_document_product_line(v_output_id, v_item.product_id, v_item.quantity);
    end if;
  end loop;

  if coalesce(p_complete, true) then
    perform public.store_complete_output(v_output_id);
  end if;

  for v_owner in
    select
      x.allocation_owner_type as owner_type,
      x.allocation_owner_id as owner_id
    from jsonb_to_recordset(p_lines) as x(
      product_id bigint,
      quantity numeric,
      allocation_owner_type text,
      allocation_owner_id bigint,
      allocation_quantity numeric
    )
    where coalesce(x.allocation_quantity, 0) > 0
    group by x.allocation_owner_type, x.allocation_owner_id
  loop
    v_res_id := public.store_create_document('reservation');
    insert into public.store_reservation (
      id, location_type, location_id, to_owner_type, to_owner_id, status, origin, note
    ) values (
      v_res_id, 'warehouse', v_mfr.warehouse_id,
      v_owner.owner_type, v_owner.owner_id,
      'draft', 'manual', ''
    );
    for v_item in
      select *
      from jsonb_to_recordset(p_lines) as x(
        product_id bigint,
        quantity numeric,
        allocation_owner_type text,
        allocation_owner_id bigint,
        allocation_quantity numeric
      )
      where coalesce(x.allocation_quantity, 0) > 0
        and x.allocation_owner_type is not distinct from v_owner.owner_type
        and x.allocation_owner_id is not distinct from v_owner.owner_id
    loop
      perform public.store_add_document_product_line(
        v_res_id, v_item.product_id, coalesce(v_item.allocation_quantity, 0), null, null,
        v_item.allocation_owner_type, v_item.allocation_owner_id
      );
    end loop;
    perform public.store_post_reservation(v_res_id);
  end loop;

  insert into public.store_output_request (request_key, output_id) values (p_request_key, v_output_id);
  perform public.store_record_document_history('output', v_output_id, 'created',
    case when coalesce(p_complete, true) then 'done' else 'planned' end, p_expected_end_on);

  return jsonb_build_object('id', v_output_id);
end;
$f$;

grant execute on function public.store_create_production_output(
  text, bigint, jsonb, date, boolean
) to anon, authenticated, service_role;
