-- Код региона пишем заглавными (AE, RU, …): так он виден везде, где выводится store_region.code.

begin;

update public.store_region set code = upper(code) where code <> upper(code);

alter table public.store_region
  add constraint store_region_code_upper check (code = upper(code));

comment on column public.store_region.code is
  'Код региона заглавными (AE, RU, …). Пустой — в интерфейсе REG-{id}.';

notify pgrst, 'reload schema';

commit;
