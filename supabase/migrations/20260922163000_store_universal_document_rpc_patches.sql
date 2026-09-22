-- Patches applied live during universal-lines cutover (keep repo migrations complete)

-- Line guard: allow INSERT during document creation
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
      or new.product_id is distinct from old.product_id
      or new.manufacturer_id is distinct from old.manufacturer_id
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
  end if;

  if tg_op = 'INSERT' then
    return new;
  end if;

  if v_kind = 'customer_order' then
    select status into v_status from public.store_customer_order where id = v_doc_id;
    if v_status in ('closed') then
      raise exception 'Строки закрытого заказа клиента нельзя изменять';
    end if;
  elsif v_kind = 'production_order' then
    select status into v_status from public.store_production_order where id = v_doc_id;
    if v_status in ('closed', 'cancelled', 'done') then
      raise exception 'Строки завершённого заказа на производство нельзя изменять';
    end if;
    if tg_op = 'UPDATE' and new.quantity is distinct from old.quantity then
      if new.quantity < public.store_po_assigned_qty(new.document_id, new.product_id)
                      + public.store_po_produced_qty(new.document_id, new.product_id) then
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
    raise exception 'Строки отгрузки, возврата и корректировки нельзя изменять';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$f$;

drop trigger if exists store_dpl_region_snapshot_immutable on public.store_document_product_line_region_snapshot;
create trigger store_dpl_region_snapshot_immutable
  before update on public.store_document_product_line_region_snapshot
  for each row execute function public.store_region_snapshot_immutable();

create or replace function public.store_create_reservation_draft(
  p_location_type text,
  p_location_id bigint,
  p_to_owner_type text,
  p_to_owner_id bigint,
  p_lines jsonb,
  p_note text default '',
  p_origin text default 'manual',
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
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Добавьте хотя бы одну строку';
  end if;

  v_id := public.store_create_document(
    'reservation',
    coalesce(p_sequence_number, p_id),
    p_id,
    p_created_at
  );

  insert into public.store_reservation (
    id, location_type, location_id, to_owner_type, to_owner_id, status, origin, note
  ) values (
    v_id, p_location_type, p_location_id,
    nullif(btrim(coalesce(p_to_owner_type, '')), ''), p_to_owner_id,
    'draft', coalesce(nullif(btrim(p_origin), ''), 'manual'), coalesce(p_note, '')
  );

  for v_item in
    select * from jsonb_to_recordset(p_lines) as x(
      product_id bigint, quantity numeric,
      from_owner_type text, from_owner_id bigint
    )
  loop
    perform public.store_add_document_product_line(
      v_id, v_item.product_id, v_item.quantity,
      v_item.from_owner_type, v_item.from_owner_id,
      nullif(btrim(coalesce(p_to_owner_type, '')), ''), p_to_owner_id
    );
  end loop;

  perform public.store_record_document_history(
    'reservation', v_id, 'created', 'draft', null, coalesce(p_created_at, now()), null
  );
  return jsonb_build_object('id', v_id, 'status', 'draft');
end;
$f$;

grant execute on function public.store_create_reservation_draft(text, bigint, text, bigint, jsonb, text, text, bigint, bigint, timestamptz)
  to anon, authenticated, service_role;

drop function if exists public.store_create_production_order(bigint, jsonb);

create or replace function public.store_create_production_order(
  p_manufacturer_id bigint,
  p_lines jsonb,
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null,
  p_expected_end_on date default null,
  p_status text default 'draft'
)
returns jsonb
language plpgsql
as $f$
declare
  v_id bigint;
  v_item record;
  v_line_id bigint;
  v_lines jsonb := '[]'::jsonb;
  v_status text := coalesce(nullif(btrim(p_status), ''), 'draft');
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one production line';
  end if;
  if p_manufacturer_id is null or not exists (select 1 from public.store_manufacturer where id = p_manufacturer_id) then
    raise exception 'Unknown manufacturer';
  end if;
  if v_status in ('closed', 'cancelled') then
    raise exception 'Cannot create a closed production order';
  end if;

  v_id := public.store_create_document(
    'production_order',
    coalesce(p_sequence_number, case when p_id is null then null else p_id - 2000000 end),
    p_id,
    p_created_at
  );
  insert into public.store_production_order (id, manufacturer_id, status, expected_end_on)
  values (v_id, p_manufacturer_id, 'draft', p_expected_end_on);

  for v_item in
    select * from jsonb_to_recordset(p_lines) as x(product_id bigint, quantity numeric)
  loop
    perform public.store_assert_product_manufactured_at(v_item.product_id, p_manufacturer_id);
    v_line_id := public.store_add_document_product_line(v_id, v_item.product_id, v_item.quantity);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('id', v_line_id, 'product_id', v_item.product_id));
  end loop;

  if v_status is distinct from 'draft' then
    update public.store_production_order set status = v_status where id = v_id;
  end if;

  perform public.store_record_document_history(
    'production_order', v_id, 'created', v_status, p_expected_end_on, coalesce(p_created_at, now()), null
  );
  return jsonb_build_object('id', v_id, 'lines', v_lines);
end;
$f$;

grant execute on function public.store_create_production_order(bigint, jsonb, bigint, bigint, timestamptz, date, text)
  to anon, authenticated, service_role;
