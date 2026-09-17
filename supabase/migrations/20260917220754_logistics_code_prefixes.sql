alter table public.logistics_setting
  add column if not exists code_prefixes jsonb not null default '{}'::jsonb;

update public.logistics_setting
set code_prefixes = '{
  "product": "PRD",
  "manufacturer": "PLT",
  "warehouse": "WH",
  "customerOrder": "OMS",
  "productionOrder": "PO",
  "reservation": "RSV",
  "reservationRelease": "REL",
  "transfer": "TR",
  "shipment": "SHP",
  "output": "OUT",
  "return": "RET",
  "customerOrderLine": "COL",
  "productionOrderLine": "POL",
  "reservationLine": "RSVL",
  "reservationReleaseLine": "RELL",
  "transferLine": "TRL",
  "transferAllocation": "TRA",
  "shipmentLine": "SHL",
  "outputLine": "OUTL",
  "outputAllocation": "OUA",
  "returnLine": "RETL",
  "productManufacturer": "PM",
  "stockTransaction": "TXN",
  "setting": "SET"
}'::jsonb
where code_prefixes = '{}'::jsonb;

create or replace function public.logistics_code_kind_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'customer_order' then 'customerOrder'
    when 'production_order' then 'productionOrder'
    when 'reservation_release' then 'reservationRelease'
    when 'customer_order_line' then 'customerOrderLine'
    when 'production_order_line' then 'productionOrderLine'
    when 'reservation_line' then 'reservationLine'
    when 'reservation_release_line' then 'reservationReleaseLine'
    when 'transfer_line' then 'transferLine'
    when 'transfer_allocation' then 'transferAllocation'
    when 'shipment_line' then 'shipmentLine'
    when 'output_line' then 'outputLine'
    when 'output_allocation' then 'outputAllocation'
    when 'return_line' then 'returnLine'
    when 'product_manufacturer' then 'productManufacturer'
    when 'stock_transaction' then 'stockTransaction'
    else p_kind
  end;
$$;

drop function if exists public.logistics_code(text, bigint);

create function public.logistics_code(p_kind text, p_id bigint)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(
      (
        select s.code_prefixes ->> public.logistics_code_kind_key(p_kind)
        from public.logistics_setting s
        order by s.id
        limit 1
      ),
      ''
    ),
    case p_kind
      when 'product' then 'PRD'
      when 'manufacturer' then 'PLT'
      when 'warehouse' then 'WH'
      when 'customer_order' then 'OMS'
      when 'production_order' then 'PO'
      when 'reservation' then 'RSV'
      when 'reservation_release' then 'REL'
      when 'transfer' then 'TR'
      when 'shipment' then 'SHP'
      when 'output' then 'OUT'
      when 'return' then 'RET'
      when 'customer_order_line' then 'COL'
      when 'production_order_line' then 'POL'
      when 'reservation_line' then 'RSVL'
      when 'reservation_release_line' then 'RELL'
      when 'transfer_line' then 'TRL'
      when 'transfer_allocation' then 'TRA'
      when 'shipment_line' then 'SHL'
      when 'output_line' then 'OUTL'
      when 'output_allocation' then 'OUA'
      when 'return_line' then 'RETL'
      when 'product_manufacturer' then 'PM'
      when 'stock_transaction' then 'TXN'
      when 'setting' then 'SET'
      else p_kind
    end
  ) || '-' || p_id::text;
$$;

grant execute on function public.logistics_code_kind_key(text) to anon, authenticated, service_role;
grant execute on function public.logistics_code(text, bigint) to anon, authenticated, service_role;
