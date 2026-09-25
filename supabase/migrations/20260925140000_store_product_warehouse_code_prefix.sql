-- Настраиваемые префиксы кодов товара (PRD-{id варианта}) и склада (WH-{id}).

alter table public.store_catalog_code_prefix
  drop constraint store_catalog_code_prefix_code_check;

alter table public.store_catalog_code_prefix
  add constraint store_catalog_code_prefix_code_check
  check (code in ('plant', 'product', 'warehouse'));

comment on table public.store_catalog_code_prefix is
  'Префиксы отображаемых кодов справочников Store. Код в UI — prefix-id; смена префикса меняет отображение без переписи строк справочника. Регионы сюда не входят: у store_region.code свой сохранённый код, REG-{id} только если он пуст.';

comment on column public.store_catalog_code_prefix.code is
  'Стабильный код справочника и PK: plant, product, warehouse.';

comment on column public.store_catalog_code_prefix.number_prefix is
  'Префикс кода: латиница в верхнем регистре и цифры, 1–8 символов (по умолчанию PLT, PRD или WH).';

insert into public.store_catalog_code_prefix (code, number_prefix) values
  ('product', 'PRD'),
  ('warehouse', 'WH');
