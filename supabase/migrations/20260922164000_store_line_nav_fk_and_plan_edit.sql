-- Allow navigation FKs to become NULL on catalog delete.
-- Production-order lines stay editable in status done; freeze only closed/cancelled.
-- Freeze applies to inserts as well as updates and deletes.

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
