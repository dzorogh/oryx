-- Sequential integer ids for every logistics entity.
-- Display codes are PREFIX || '-' || id and are not stored.

drop view if exists public.logistics_stock_balance;

do $$
declare
  r record;
begin
  for r in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'f'
      and connamespace = 'public'::regnamespace
      and (
        conrelid::regclass::text like 'public.logistics_%'
        or confrelid::regclass::text like 'public.logistics_%'
        or conrelid::regclass::text like 'logistics_%'
        or confrelid::regclass::text like 'logistics_%'
      )
  loop
    execute format('alter table %s drop constraint if exists %I', r.tbl, r.conname);
  end loop;
end
$$;

alter table public.logistics_customer_order drop column if exists number;
alter table public.logistics_production_order drop column if exists number;
alter table public.logistics_reservation drop column if exists number;
alter table public.logistics_reservation_release drop column if exists number;
alter table public.logistics_transfer drop column if exists number;
alter table public.logistics_shipment drop column if exists number;
alter table public.logistics_output drop column if exists number;
alter table public.logistics_return drop column if exists number;
alter table public.logistics_warehouse drop column if exists code;
alter table public.logistics_manufacturer drop column if exists code;

create temporary table logistics_id_map (
  entity text not null,
  old_id text not null,
  new_id bigint not null,
  primary key (entity, old_id)
);

insert into logistics_id_map
select 'product', id, row_number() over (order by id) from public.logistics_product;
insert into logistics_id_map
select 'warehouse', id, row_number() over (order by id) from public.logistics_warehouse;
insert into logistics_id_map
select 'manufacturer', id, row_number() over (order by id) from public.logistics_manufacturer;
insert into logistics_id_map
select 'setting', id, row_number() over (order by id) from public.logistics_setting;
insert into logistics_id_map
select 'product_manufacturer', id, row_number() over (order by id) from public.logistics_product_manufacturer;
insert into logistics_id_map
select 'customer_order', id, row_number() over (order by id) from public.logistics_customer_order;
insert into logistics_id_map
select 'customer_order_line', id, row_number() over (order by id) from public.logistics_customer_order_line;
insert into logistics_id_map
select 'production_order', id, row_number() over (order by id) from public.logistics_production_order;
insert into logistics_id_map
select 'production_order_line', id, row_number() over (order by id) from public.logistics_production_order_line;
insert into logistics_id_map
select 'reservation', id, row_number() over (order by id) from public.logistics_reservation;
insert into logistics_id_map
select 'reservation_line', id, row_number() over (order by id) from public.logistics_reservation_line;
insert into logistics_id_map
select 'reservation_release', id, row_number() over (order by id) from public.logistics_reservation_release;
insert into logistics_id_map
select 'reservation_release_line', id, row_number() over (order by id) from public.logistics_reservation_release_line;
insert into logistics_id_map
select 'transfer', id, row_number() over (order by id) from public.logistics_transfer;
insert into logistics_id_map
select 'transfer_line', id, row_number() over (order by id) from public.logistics_transfer_line;
insert into logistics_id_map
select 'transfer_allocation', id, row_number() over (order by id) from public.logistics_transfer_allocation;
insert into logistics_id_map
select 'shipment', id, row_number() over (order by id) from public.logistics_shipment;
insert into logistics_id_map
select 'shipment_line', id, row_number() over (order by id) from public.logistics_shipment_line;
insert into logistics_id_map
select 'output', id, row_number() over (order by id) from public.logistics_output;
insert into logistics_id_map
select 'output_line', id, row_number() over (order by id) from public.logistics_output_line;
insert into logistics_id_map
select 'output_allocation', id, row_number() over (order by id) from public.logistics_output_allocation;
insert into logistics_id_map
select 'return', id, row_number() over (order by id) from public.logistics_return;
insert into logistics_id_map
select 'return_line', id, row_number() over (order by id) from public.logistics_return_line;
insert into logistics_id_map
select 'stock_transaction', transaction_id, row_number() over (order by transaction_id)
from public.logistics_stock_transaction;

create temporary table logistics_loc_map (location_type text primary key, entity text);
insert into logistics_loc_map values
  ('warehouse', 'warehouse'),
  ('production_order_line', 'production_order_line'),
  ('transfer', 'transfer'),
  ('customer_order', 'customer_order');

create temporary table logistics_src_map (source_type text primary key, entity text, line_entity text);
insert into logistics_src_map values
  ('reservation', 'reservation', 'reservation_line'),
  ('reservation_release', 'reservation_release', 'reservation_release_line'),
  ('shipment', 'shipment', 'shipment_line'),
  ('shipment_return', 'return', 'return_line'),
  ('production_activation', 'production_order', 'production_order_line'),
  ('production_output', 'output', 'output_line'),
  ('production_close', 'production_order', 'production_order_line'),
  ('transfer_send', 'transfer', 'transfer_line'),
  ('transfer_complete', 'transfer', 'transfer_line'),
  ('customer_order_close', 'customer_order', 'customer_order_line');

update public.logistics_warehouse t
set manufacturer_id = m.new_id::text
from logistics_id_map m
where m.entity = 'manufacturer' and t.manufacturer_id = m.old_id;

update public.logistics_manufacturer t
set warehouse_id = m.new_id::text
from logistics_id_map m
where m.entity = 'warehouse' and t.warehouse_id = m.old_id;

update public.logistics_product_manufacturer t
set product_id = m.new_id::text
from logistics_id_map m
where m.entity = 'product' and t.product_id = m.old_id;
update public.logistics_product_manufacturer t
set manufacturer_id = m.new_id::text
from logistics_id_map m
where m.entity = 'manufacturer' and t.manufacturer_id = m.old_id;

update public.logistics_customer_order_line t
set order_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order' and t.order_id = m.old_id;
update public.logistics_customer_order_line t
set product_id = m.new_id::text
from logistics_id_map m
where m.entity = 'product' and t.product_id = m.old_id;

update public.logistics_production_order t
set manufacturer_id = m.new_id::text
from logistics_id_map m
where m.entity = 'manufacturer' and t.manufacturer_id = m.old_id;

update public.logistics_production_order_line t
set order_id = m.new_id::text
from logistics_id_map m
where m.entity = 'production_order' and t.order_id = m.old_id;
update public.logistics_production_order_line t
set product_id = m.new_id::text
from logistics_id_map m
where m.entity = 'product' and t.product_id = m.old_id;

update public.logistics_reservation t
set customer_order_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order' and t.customer_order_id = m.old_id;

update public.logistics_reservation_line t
set reservation_id = m.new_id::text
from logistics_id_map m
where m.entity = 'reservation' and t.reservation_id = m.old_id;
update public.logistics_reservation_line t
set customer_order_line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order_line' and t.customer_order_line_id = m.old_id;
update public.logistics_reservation_line t
set product_id = m.new_id::text
from logistics_id_map m
where m.entity = 'product' and t.product_id = m.old_id;

update public.logistics_reservation_release t
set customer_order_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order' and t.customer_order_id = m.old_id;

update public.logistics_reservation_release_line t
set release_id = m.new_id::text
from logistics_id_map m
where m.entity = 'reservation_release' and t.release_id = m.old_id;
update public.logistics_reservation_release_line t
set customer_order_line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order_line' and t.customer_order_line_id = m.old_id;
update public.logistics_reservation_release_line t
set product_id = m.new_id::text
from logistics_id_map m
where m.entity = 'product' and t.product_id = m.old_id;

update public.logistics_transfer t
set from_warehouse_id = m.new_id::text
from logistics_id_map m
where m.entity = 'warehouse' and t.from_warehouse_id = m.old_id;
update public.logistics_transfer t
set to_warehouse_id = m.new_id::text
from logistics_id_map m
where m.entity = 'warehouse' and t.to_warehouse_id = m.old_id;

update public.logistics_transfer_line t
set transfer_id = m.new_id::text
from logistics_id_map m
where m.entity = 'transfer' and t.transfer_id = m.old_id;
update public.logistics_transfer_line t
set product_id = m.new_id::text
from logistics_id_map m
where m.entity = 'product' and t.product_id = m.old_id;

update public.logistics_transfer_allocation t
set line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'transfer_line' and t.line_id = m.old_id;
update public.logistics_transfer_allocation t
set customer_order_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order' and t.customer_order_id = m.old_id;
update public.logistics_transfer_allocation t
set customer_order_line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order_line' and t.customer_order_line_id = m.old_id;

update public.logistics_shipment t
set customer_order_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order' and t.customer_order_id = m.old_id;
update public.logistics_shipment t
set warehouse_id = m.new_id::text
from logistics_id_map m
where m.entity = 'warehouse' and t.warehouse_id = m.old_id;

update public.logistics_shipment_line t
set shipment_id = m.new_id::text
from logistics_id_map m
where m.entity = 'shipment' and t.shipment_id = m.old_id;
update public.logistics_shipment_line t
set customer_order_line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order_line' and t.customer_order_line_id = m.old_id;
update public.logistics_shipment_line t
set product_id = m.new_id::text
from logistics_id_map m
where m.entity = 'product' and t.product_id = m.old_id;

update public.logistics_output t
set production_order_id = m.new_id::text
from logistics_id_map m
where m.entity = 'production_order' and t.production_order_id = m.old_id;

update public.logistics_output_line t
set output_id = m.new_id::text
from logistics_id_map m
where m.entity = 'output' and t.output_id = m.old_id;
update public.logistics_output_line t
set production_order_line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'production_order_line' and t.production_order_line_id = m.old_id;
update public.logistics_output_line t
set product_id = m.new_id::text
from logistics_id_map m
where m.entity = 'product' and t.product_id = m.old_id;

update public.logistics_output_allocation t
set line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'output_line' and t.line_id = m.old_id;
update public.logistics_output_allocation t
set customer_order_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order' and t.customer_order_id = m.old_id;
update public.logistics_output_allocation t
set customer_order_line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order_line' and t.customer_order_line_id = m.old_id;

update public.logistics_return t
set shipment_id = m.new_id::text
from logistics_id_map m
where m.entity = 'shipment' and t.shipment_id = m.old_id;

update public.logistics_return_line t
set return_id = m.new_id::text
from logistics_id_map m
where m.entity = 'return' and t.return_id = m.old_id;
update public.logistics_return_line t
set shipment_line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'shipment_line' and t.shipment_line_id = m.old_id;

update public.logistics_stock_transaction t
set product_id = m.new_id::text
from logistics_id_map m
where m.entity = 'product' and t.product_id = m.old_id;
update public.logistics_stock_transaction t
set customer_order_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order' and t.customer_order_id = m.old_id;
update public.logistics_stock_transaction t
set customer_order_line_id = m.new_id::text
from logistics_id_map m
where m.entity = 'customer_order_line' and t.customer_order_line_id = m.old_id;
update public.logistics_stock_transaction t
set reverses_transaction_id = m.new_id::text
from logistics_id_map m
where m.entity = 'stock_transaction' and t.reverses_transaction_id = m.old_id;

update public.logistics_reservation_line t
set location_id = m.new_id::text
from logistics_loc_map e, logistics_id_map m
where t.location_type = e.location_type
  and m.entity = e.entity
  and m.old_id = t.location_id;

update public.logistics_reservation_release_line t
set location_id = m.new_id::text
from logistics_loc_map e, logistics_id_map m
where t.location_type = e.location_type
  and m.entity = e.entity
  and m.old_id = t.location_id;

update public.logistics_stock_transaction t
set location_id = m.new_id::text
from logistics_loc_map e, logistics_id_map m
where t.location_type = e.location_type
  and m.entity = e.entity
  and m.old_id = t.location_id;

update public.logistics_stock_transaction t
set source_id = m.new_id::text
from logistics_src_map e, logistics_id_map m
where t.source_type = e.source_type
  and m.entity = e.entity
  and m.old_id = t.source_id;

update public.logistics_stock_transaction t
set source_line_id = m.new_id::text
from logistics_src_map e, logistics_id_map m
where t.source_type = e.source_type
  and m.entity = e.line_entity
  and m.old_id = t.source_line_id;

update public.logistics_product t set id = m.new_id::text
from logistics_id_map m where m.entity = 'product' and t.id = m.old_id;
update public.logistics_warehouse t set id = m.new_id::text
from logistics_id_map m where m.entity = 'warehouse' and t.id = m.old_id;
update public.logistics_manufacturer t set id = m.new_id::text
from logistics_id_map m where m.entity = 'manufacturer' and t.id = m.old_id;
update public.logistics_setting t set id = m.new_id::text
from logistics_id_map m where m.entity = 'setting' and t.id = m.old_id;
update public.logistics_product_manufacturer t set id = m.new_id::text
from logistics_id_map m where m.entity = 'product_manufacturer' and t.id = m.old_id;
update public.logistics_customer_order t set id = m.new_id::text
from logistics_id_map m where m.entity = 'customer_order' and t.id = m.old_id;
update public.logistics_customer_order_line t set id = m.new_id::text
from logistics_id_map m where m.entity = 'customer_order_line' and t.id = m.old_id;
update public.logistics_production_order t set id = m.new_id::text
from logistics_id_map m where m.entity = 'production_order' and t.id = m.old_id;
update public.logistics_production_order_line t set id = m.new_id::text
from logistics_id_map m where m.entity = 'production_order_line' and t.id = m.old_id;
update public.logistics_reservation t set id = m.new_id::text
from logistics_id_map m where m.entity = 'reservation' and t.id = m.old_id;
update public.logistics_reservation_line t set id = m.new_id::text
from logistics_id_map m where m.entity = 'reservation_line' and t.id = m.old_id;
update public.logistics_reservation_release t set id = m.new_id::text
from logistics_id_map m where m.entity = 'reservation_release' and t.id = m.old_id;
update public.logistics_reservation_release_line t set id = m.new_id::text
from logistics_id_map m where m.entity = 'reservation_release_line' and t.id = m.old_id;
update public.logistics_transfer t set id = m.new_id::text
from logistics_id_map m where m.entity = 'transfer' and t.id = m.old_id;
update public.logistics_transfer_line t set id = m.new_id::text
from logistics_id_map m where m.entity = 'transfer_line' and t.id = m.old_id;
update public.logistics_transfer_allocation t set id = m.new_id::text
from logistics_id_map m where m.entity = 'transfer_allocation' and t.id = m.old_id;
update public.logistics_shipment t set id = m.new_id::text
from logistics_id_map m where m.entity = 'shipment' and t.id = m.old_id;
update public.logistics_shipment_line t set id = m.new_id::text
from logistics_id_map m where m.entity = 'shipment_line' and t.id = m.old_id;
update public.logistics_output t set id = m.new_id::text
from logistics_id_map m where m.entity = 'output' and t.id = m.old_id;
update public.logistics_output_line t set id = m.new_id::text
from logistics_id_map m where m.entity = 'output_line' and t.id = m.old_id;
update public.logistics_output_allocation t set id = m.new_id::text
from logistics_id_map m where m.entity = 'output_allocation' and t.id = m.old_id;
update public.logistics_return t set id = m.new_id::text
from logistics_id_map m where m.entity = 'return' and t.id = m.old_id;
update public.logistics_return_line t set id = m.new_id::text
from logistics_id_map m where m.entity = 'return_line' and t.id = m.old_id;
update public.logistics_stock_transaction t set transaction_id = m.new_id::text
from logistics_id_map m where m.entity = 'stock_transaction' and t.transaction_id = m.old_id;

do $$
declare
  r record;
  leftover text;
begin
  for r in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name like 'logistics_%'
      and table_name <> 'logistics_stock_balance'
      and data_type = 'text'
      and (
        column_name = 'id'
        or column_name = 'transaction_id'
        or (
          column_name like '%_id'
          and column_name not in ('operation_id')
        )
      )
  loop
    execute format(
      'select %I from public.%I where %I is not null and %I !~ ''^[0-9]+$'' limit 1',
      r.column_name, r.table_name, r.column_name, r.column_name
    ) into leftover;
    if leftover is not null then
      raise exception '%.% still has a non-integer id: %', r.table_name, r.column_name, leftover;
    end if;
  end loop;
end
$$;
