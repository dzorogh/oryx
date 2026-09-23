-- Резерв под производство только в выпусках (не на месте production_order).

begin;

-- ---------------------------------------------------------------------------
-- Helpers: qty in uncancelled / active outputs
-- ---------------------------------------------------------------------------
create or replace function public.store_po_output_qty(
  p_po_id bigint,
  p_variant_id bigint
)
returns numeric language sql stable as $f$
  select coalesce(sum(l.quantity), 0)
  from public.store_document_product_line l
  join public.store_production_output o on o.id = l.document_id
  join public.store_document d on d.id = o.id
  where o.production_order_id = p_po_id
    and d.status is distinct from 'cancelled'
    and l.product_variant_id = p_variant_id;
$f$;

create or replace function public.store_po_assigned_qty(
  p_po_id bigint,
  p_variant_id bigint,
  p_owner_id bigint default null
)
returns numeric language sql stable as $f$
  -- Занятое в активных выпусках (draft / in_progress), to_owner ≠ free.
  select coalesce(sum(l.quantity), 0)
  from public.store_document_product_line l
  join public.store_production_output o on o.id = l.document_id
  join public.store_document d on d.id = o.id
  where o.production_order_id = p_po_id
    and d.status in ('draft', 'in_progress')
    and l.product_variant_id = p_variant_id
    and coalesce(l.to_owner_id, public.store_free_owner_id()) <> public.store_free_owner_id()
    and (
      p_owner_id is null
      or l.to_owner_id = p_owner_id
    );
$f$;

create or replace function public.store_cancel_po_active_outputs(p_po_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $f$
begin
  update public.store_document d
  set status = 'cancelled'
  from public.store_production_output o
  where o.id = d.id
    and o.production_order_id = p_po_id
    and d.status in ('draft', 'in_progress');
end;
$f$;

-- ---------------------------------------------------------------------------
-- Ban production_order locations in reservation RPCs
-- ---------------------------------------------------------------------------
create or replace function public.store_create_and_post_reservation(
  p_location_id bigint,
  p_owner_id bigint,
  p_lines jsonb,
  p_description text default '',
  p_creation_source text default 'manual',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_loc_kind text;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_from_owner bigint;
  v_free bigint := public.store_free_owner_id();
begin
  select kind into v_loc_kind from public.store_stock_location where id = p_location_id;
  if v_loc_kind is null then raise exception 'Место % не найдено', p_location_id; end if;
  if v_loc_kind = 'production_order' then
    raise exception 'Резервируйте в выпуске заказа на производство';
  end if;
  if v_loc_kind not in ('warehouse', 'transfer') then
    raise exception 'Резерв допускает места warehouse, transfer';
  end if;
  if not exists (select 1 from public.store_stock_owner where id = p_owner_id) then
    raise exception 'Владелец % не найден', p_owner_id;
  end if;
  if p_creation_source not in ('manual', 'customer_order_close', 'production_order_close') then
    raise exception 'Некорректный creation_source';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Нужна хотя бы одна строка резерва';
  end if;

  v_id := public.store_create_document(
    'reservation', coalesce(p_description, ''), null, null,
    p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_reservation (id, location_id, owner_id, creation_source, posted_at)
  values (v_id, p_location_id, p_owner_id, p_creation_source, null);

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    v_from_owner := coalesce((e->>'from_owner_id')::bigint, v_free);
    perform public.store_insert_line(v_id, v_variant, v_qty, v_from_owner, null);
    perform public.store_move(
      v_variant, v_qty, p_location_id, v_from_owner, p_location_id, p_owner_id, v_id
    );
  end loop;

  update public.store_reservation set posted_at = now() where id = v_id;
  return jsonb_build_object('id', v_id);
end;
$f$;

create or replace function public.store_create_reservation_draft(
  p_location_id bigint,
  p_owner_id bigint,
  p_lines jsonb,
  p_description text default '',
  p_creation_source text default 'manual',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  e jsonb;
  v_free bigint := public.store_free_owner_id();
  v_loc_kind text;
begin
  select kind into v_loc_kind from public.store_stock_location where id = p_location_id;
  if v_loc_kind = 'production_order' then
    raise exception 'Резервируйте в выпуске заказа на производство';
  end if;
  if v_loc_kind is null or v_loc_kind not in ('warehouse', 'transfer') then
    raise exception 'Некорректное место резерва';
  end if;
  v_id := public.store_create_document(
    'reservation', coalesce(p_description, ''), null, null,
    p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_reservation (id, location_id, owner_id, creation_source, posted_at)
  values (v_id, p_location_id, p_owner_id, coalesce(p_creation_source, 'manual'), null);
  for e in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    perform public.store_insert_line(
      v_id,
      (e->>'product_variant_id')::bigint,
      (e->>'quantity')::numeric,
      coalesce((e->>'from_owner_id')::bigint, v_free),
      null
    );
  end loop;
  return jsonb_build_object('id', v_id);
end;
$f$;

create or replace function public.store_post_reservation(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_loc bigint;
  v_owner bigint;
  v_loc_kind text;
  v_posted timestamptz;
  r record;
  v_from bigint;
begin
  perform public.store_assert_subtype_kind(p_id, 'reservation');
  select location_id, owner_id, posted_at into v_loc, v_owner, v_posted
  from public.store_reservation where id = p_id;
  if v_posted is not null then return 'ok'; end if;
  select kind into v_loc_kind from public.store_stock_location where id = v_loc;
  if v_loc_kind = 'production_order' then
    raise exception 'Резервируйте в выпуске заказа на производство';
  end if;

  for r in
    select product_variant_id, quantity, from_owner_id
    from public.store_document_product_line where document_id = p_id
  loop
    v_from := coalesce(r.from_owner_id, public.store_free_owner_id());
    perform public.store_move(r.product_variant_id, r.quantity, v_loc, v_from, v_loc, v_owner, p_id);
  end loop;
  update public.store_reservation set posted_at = now() where id = p_id;
  return 'ok';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Close / cancel PO: cancel active outputs, no production_order_close RSV
-- ---------------------------------------------------------------------------
create or replace function public.store_close_production_order(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
begin
  perform public.store_assert_subtype_kind(p_id, 'production_order');
  select status into v_status from public.store_document where id = p_id;
  if v_status = 'done' then return 'ok'; end if;
  if v_status = 'cancelled' then
    raise exception 'Отменённый заказ на производство нельзя закрыть';
  end if;

  perform public.store_cancel_po_active_outputs(p_id);
  update public.store_document set status = 'done' where id = p_id;
  return 'ok';
end;
$f$;

create or replace function public.store_cancel_document(p_kind text, p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_kind text;
  v_status text;
begin
  select kind, status into v_kind, v_status from public.store_document where id = p_id;
  if v_kind is distinct from p_kind then
    raise exception 'Несоответствие вида документа';
  end if;
  if v_kind in ('reservation', 'shipment', 'adjustment') then
    raise exception 'Проведённый складской документ нельзя отменить. Создайте новый документ.';
  end if;
  if v_kind = 'transfer' and v_status in ('in_progress', 'done') then
    raise exception 'Проведённый складской документ нельзя отменить. Создайте новый документ.';
  end if;
  if v_kind = 'production_output' and v_status = 'done' then
    raise exception 'Проведённый складской документ нельзя отменить. Создайте новый документ.';
  end if;
  if v_status in ('done', 'cancelled') then
    raise exception 'Документ уже завершён';
  end if;
  if v_kind = 'production_order' then
    perform public.store_cancel_po_active_outputs(p_id);
  end if;
  update public.store_document set status = 'cancelled' where id = p_id;
  return 'ok';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Create production output: plan by uncancelled outputs + allocation_quantity split
-- ---------------------------------------------------------------------------
create or replace function public.store_create_production_output(
  p_production_order_id bigint,
  p_lines jsonb,
  p_expected_end_on date default null,
  p_complete boolean default true,
  p_description text default '',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_plant bigint;
  v_wh_loc bigint;
  v_status text;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_alloc_owner bigint;
  v_alloc_qty numeric;
  v_free_qty numeric;
  v_free bigint := public.store_free_owner_id();
  v_committed numeric;
  v_plan numeric;
begin
  perform public.store_assert_subtype_kind(p_production_order_id, 'production_order');
  select status into v_status from public.store_document where id = p_production_order_id;
  if v_status in ('done', 'cancelled') then
    raise exception 'Нельзя выпускать по завершённому заказу на производство';
  end if;
  select po.plant_id, w.stock_location_id into v_plant, v_wh_loc
  from public.store_production_order po
  join public.store_plant p on p.id = po.plant_id
  join public.store_warehouse w on w.id = p.warehouse_id
  where po.id = p_production_order_id;

  v_id := public.store_create_document(
    'production_output', coalesce(p_description, ''), 'draft',
    p_expected_end_on, p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_production_output (id, production_order_id)
  values (v_id, p_production_order_id);

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Количество выпуска должно быть больше нуля';
    end if;
    v_plan := public.store_po_plan_qty(p_production_order_id, v_variant);
    v_committed := public.store_po_output_qty(p_production_order_id, v_variant);
    if v_committed + v_qty > v_plan then
      raise exception 'Нельзя выпустить больше плана по варианту %', v_variant;
    end if;

    v_alloc_owner := coalesce((e->>'allocation_owner_id')::bigint, v_free);
    if e ? 'allocation_quantity' and e->>'allocation_quantity' is not null then
      v_alloc_qty := (e->>'allocation_quantity')::numeric;
    elsif v_alloc_owner <> v_free then
      v_alloc_qty := v_qty;
    else
      v_alloc_qty := 0;
    end if;
    if v_alloc_qty < 0 or v_alloc_qty > v_qty then
      raise exception 'Занятое количество не может превышать выпуск';
    end if;
    v_free_qty := v_qty - v_alloc_qty;

    if v_alloc_qty > 0 then
      perform public.store_insert_line(v_id, v_variant, v_alloc_qty, null, v_alloc_owner);
      if p_complete then
        perform public.store_lock_stock_keys(jsonb_build_array(
          jsonb_build_object('v', v_variant, 'l', v_wh_loc, 'o', v_alloc_owner)
        ));
        perform public.store_write_tx(v_variant, v_alloc_qty, v_wh_loc, v_alloc_owner, v_id);
      end if;
    end if;
    if v_free_qty > 0 then
      perform public.store_insert_line(v_id, v_variant, v_free_qty, null, v_free);
      if p_complete then
        perform public.store_lock_stock_keys(jsonb_build_array(
          jsonb_build_object('v', v_variant, 'l', v_wh_loc, 'o', v_free)
        ));
        perform public.store_write_tx(v_variant, v_free_qty, v_wh_loc, v_free, v_id);
      end if;
    end if;
  end loop;

  if p_complete then
    update public.store_document set status = 'done' where id = v_id;
  end if;
  return jsonb_build_object('id', v_id);
end;
$f$;

-- ---------------------------------------------------------------------------
-- Reserve free qty inside a draft production output
-- ---------------------------------------------------------------------------
create or replace function public.store_reserve_in_production_output(
  p_output_id bigint,
  p_owner_id bigint,
  p_lines jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_free bigint := public.store_free_owner_id();
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_free_line record;
  v_owned_line record;
begin
  perform public.store_assert_subtype_kind(p_output_id, 'production_output');
  select status into v_status from public.store_document where id = p_output_id;
  if v_status is distinct from 'draft' then
    raise exception 'Резерв в выпуске можно менять только в черновике';
  end if;
  if not exists (select 1 from public.store_stock_owner where id = p_owner_id) then
    raise exception 'Владелец % не найден', p_owner_id;
  end if;
  if p_owner_id = v_free then
    raise exception 'Нужен владелец-заказ клиента';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Нужна хотя бы одна строка';
  end if;

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Количество резерва должно быть больше нуля';
    end if;

    select id, quantity into v_free_line
    from public.store_document_product_line
    where document_id = p_output_id
      and product_variant_id = v_variant
      and coalesce(to_owner_id, v_free) = v_free
    for update;
    if v_free_line.id is null or v_free_line.quantity < v_qty then
      raise exception 'Недостаточно свободного количества в черновике выпуска';
    end if;

    if v_free_line.quantity = v_qty then
      delete from public.store_document_product_line where id = v_free_line.id;
    else
      update public.store_document_product_line
      set quantity = quantity - v_qty
      where id = v_free_line.id;
    end if;

    select id, quantity into v_owned_line
    from public.store_document_product_line
    where document_id = p_output_id
      and product_variant_id = v_variant
      and to_owner_id = p_owner_id
    for update;
    if v_owned_line.id is null then
      perform public.store_insert_line(p_output_id, v_variant, v_qty, null, p_owner_id);
    else
      update public.store_document_product_line
      set quantity = quantity + v_qty
      where id = v_owned_line.id;
    end if;
  end loop;

  return 'ok';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Convert legacy PO-location RSV 149/151 → draft outputs + compensating releases
-- ---------------------------------------------------------------------------
do $migrate$
declare
  v_free bigint := public.store_free_owner_id();
  r record;
  v_net numeric;
  v_out bigint;
  v_rsv bigint;
  v_po bigint;
  v_expected date;
  v_variant bigint;
  v_owner bigint;
begin
  for r in
    select res.id as rsv_id,
           res.location_id,
           res.owner_id,
           po.id as po_id,
           d.expected_end_on,
           l.product_variant_id,
           l.quantity,
           l.from_owner_id
    from public.store_reservation res
    join public.store_stock_location sl on sl.id = res.location_id
    join public.store_production_order po on po.stock_location_id = res.location_id
    join public.store_document d on d.id = po.id
    join public.store_document_product_line l on l.document_id = res.id
    where res.id in (149, 151)
      and sl.kind = 'production_order'
      and res.posted_at is not null
      and res.owner_id <> v_free
      and coalesce(l.from_owner_id, v_free) = v_free
  loop
    v_po := r.po_id;
    v_expected := r.expected_end_on;
    v_variant := r.product_variant_id;
    v_owner := r.owner_id;
    v_net := r.quantity;

    v_out := public.store_create_document(
      'production_output',
      'Конверсия резерва с места заказа на производство',
      'draft',
      v_expected,
      null, null, null, null
    );
    insert into public.store_production_output (id, production_order_id)
    values (v_out, v_po);
    perform public.store_insert_line(v_out, v_variant, v_net, null, v_owner);

    v_rsv := public.store_create_document(
      'reservation',
      'Компенсация после переноса резерва в выпуск',
      null, null, null, null, null, null
    );
    insert into public.store_reservation (id, location_id, owner_id, creation_source, posted_at)
    values (v_rsv, r.location_id, v_free, 'manual', now());
    perform public.store_insert_line(v_rsv, v_variant, v_net, v_owner, null);
  end loop;
end;
$migrate$;

grant execute on function public.store_po_output_qty(bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.store_cancel_po_active_outputs(bigint) to service_role;
grant execute on function public.store_reserve_in_production_output(bigint, bigint, jsonb) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
