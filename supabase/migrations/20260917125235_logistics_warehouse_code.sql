alter table public.logistics_warehouse
  add column if not exists code text;

update public.logistics_warehouse w
set code = m.code
from public.logistics_manufacturer m
where m.warehouse_id = w.id
  and (w.code is null or btrim(w.code) = '');

update public.logistics_warehouse
set code = 'DH'
where id = 'wh-2'
  and (code is null or btrim(code) = '');

update public.logistics_warehouse
set code = id
where code is null or btrim(code) = '';

alter table public.logistics_warehouse
  alter column code set not null;

alter table public.logistics_warehouse
  drop constraint if exists logistics_warehouse_code_key;

alter table public.logistics_warehouse
  add constraint logistics_warehouse_code_key unique (code);
