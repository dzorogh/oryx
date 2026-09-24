-- Reservations are always created posted: no drafts, no separate post step, no line edits.

drop function if exists public.store_create_reservation_draft(bigint, bigint, jsonb, text, text, bigint, bigint, timestamptz);
drop function if exists public.store_post_reservation(bigint);

alter table public.store_reservation
  alter column posted_at set default now(),
  alter column posted_at set not null;

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
set search_path to 'public'
as $$
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
  values (v_id, p_location_id, p_owner_id, p_creation_source, coalesce(p_created_at, now()));

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

  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.store_add_document_product_line(
  p_document_id bigint,
  p_product_variant_id bigint,
  p_quantity numeric,
  p_from_owner_id bigint default null,
  p_to_owner_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_kind text;
  v_status text;
  v_line bigint;
begin
  select kind, status into v_kind, v_status from public.store_document where id = p_document_id;
  if v_kind in ('shipment', 'adjustment', 'reservation') then
    raise exception 'Строки отгрузки, корректировки и резерва нельзя добавлять после создания';
  elsif v_kind in ('customer_order', 'production_order', 'transfer', 'production_output') then
    if v_status in ('done', 'cancelled') then
      raise exception 'Строки завершённого документа нельзя изменять';
    end if;
    if v_kind = 'transfer' and v_status = 'in_progress' then
      raise exception 'Строки отправленного перемещения нельзя изменять';
    end if;
  end if;
  v_line := public.store_insert_line(
    p_document_id, p_product_variant_id, p_quantity, p_from_owner_id, p_to_owner_id
  );
  return v_line;
end;
$$;

create or replace function public.store_document_line_guard()
returns trigger
language plpgsql
as $$
declare
  v_kind text;
  v_status text;
begin
  select d.kind, d.status into v_kind, v_status
  from public.store_document d
  where d.id = coalesce(new.document_id, old.document_id);

  if tg_op = 'UPDATE' then
    if new.document_id is distinct from old.document_id
      or new.product_variant_id is distinct from old.product_variant_id
      or new.from_owner_id is distinct from old.from_owner_id
      or new.to_owner_id is distinct from old.to_owner_id
      or new.variant_name is distinct from old.variant_name
      or new.unit_price is distinct from old.unit_price
      or new.currency_id is distinct from old.currency_id
    then
      raise exception 'Поля снимка и владельцев строки нельзя изменять';
    end if;
  end if;

  -- INSERT allowed during create-and-post; freeze on UPDATE/DELETE for final kinds
  if v_kind in ('shipment', 'adjustment', 'reservation') and tg_op in ('UPDATE', 'DELETE') then
    raise exception 'Строки отгрузки, корректировки и резерва нельзя изменять';
  elsif v_kind in ('customer_order', 'production_order', 'transfer', 'production_output') then
    if v_status in ('done', 'cancelled') and tg_op in ('UPDATE', 'DELETE') then
      raise exception 'Строки завершённого документа нельзя изменять';
    end if;
    if tg_op = 'INSERT' and v_status in ('done', 'cancelled') then
      raise exception 'Строки завершённого документа нельзя изменять';
    end if;
    if v_kind = 'transfer' and v_status = 'in_progress' and tg_op in ('UPDATE', 'DELETE') then
      raise exception 'Строки отправленного перемещения нельзя изменять';
    end if;
    if v_kind = 'production_output' and v_status in ('in_progress', 'done') and tg_op in ('UPDATE', 'DELETE') then
      raise exception 'Строки выпуска нельзя изменять после старта';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.store_reservation_list()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
  from (
    select
      d.id::text as id,
      d.sequence_number::text as "sequenceNumber",
      store_doc_number(d.kind, d.sequence_number) as number,
      d.created_at as "createdAt",
      coalesce(d.description, '') as description,
      r.creation_source as "creationSource",
      coalesce(lr.kind, 'warehouse') as "locationType",
      coalesce(lr.entity_id::text, r.location_id::text) as "locationId",
      case when lr.kind <> 'warehouse' then store_doc_number(ld.kind, ld.sequence_number) end as "locationNumber",
      case when lr.kind <> 'warehouse' then ld.sequence_number::text end as "locationSequence",
      exists (
        select 1 from store_plant p where lr.kind = 'warehouse' and p.warehouse_id = lr.entity_id
      ) as "locationIsPlantWarehouse",
      case
        when orf.kind = 'customer_order' then 'order'
        when orf.kind = 'region' then 'region'
        else null
      end as "toOwnerType",
      orf.entity_id::text as "toOwnerId",
      case
        when orf.kind = 'customer_order' then store_doc_number('customer_order', od.sequence_number)
        when orf.kind = 'region' then reg.code
      end as "toOwnerNumber",
      (
        select coalesce(jsonb_agg(to_jsonb(ln) order by ln.id), '[]'::jsonb)
        from (
          select
            l.id::text as id,
            l.product_variant_id::text as "productId",
            l.quantity,
            case
              when fo.kind = 'customer_order' then 'order'
              when fo.kind = 'region' then 'region'
              else null
            end as "fromOwnerType",
            l.from_owner_id::text as "fromOwnerId",
            case
              when fo.kind = 'customer_order' then (
                select store_doc_number('customer_order', x.sequence_number)
                from store_document x
                where x.id = l.from_owner_id and x.kind = 'customer_order'
              )
              when fo.kind = 'region' then (
                select x.code from store_region x where x.id = l.from_owner_id
              )
            end as "fromOwnerNumber",
            coalesce(v.name, l.variant_name) as "productName",
            coalesce(v.unit, 'шт') as "productUnit"
          from store_document_product_line l
          left join store_product_variant v on v.id = l.product_variant_id
          left join store_owner_ref fo on fo.stock_owner_id = l.from_owner_id
          where l.document_id = d.id
        ) ln
      ) as lines,
      coalesce(u.name, '') as "createdBy"
    from store_document d
    join store_reservation r on r.id = d.id
    left join store_location_ref lr on lr.stock_location_id = r.location_id
    left join store_document ld on ld.id = lr.entity_id and lr.kind <> 'warehouse'
    left join store_owner_ref orf on orf.stock_owner_id = r.owner_id
    left join store_document od on od.id = orf.entity_id and orf.kind = 'customer_order'
    left join store_region reg on reg.id = orf.entity_id and orf.kind = 'region'
    left join app_user u on u.id = d.created_by
  ) r;
$$;
