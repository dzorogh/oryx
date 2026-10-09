-- Строка статуса есть у каждой пары вариант × регион, по умолчанию «Недоступен» / «Черновик» — так же
-- каталог и оформление трактуют вариант без строки. Фильтр по статусу видит все варианты.

begin;

alter table public.store_product_region_status alter column dealer_status set default 'unavailable';

insert into public.store_product_region_status (product_variant_id, region_id, dealer_status, retail_status)
select v.id, r.id, 'unavailable', 'draft'
from public.store_product_variant v
cross join public.store_region r
where r.deleted_at is null
on conflict (product_variant_id, region_id) do nothing;

create or replace function public.store_region_status_for_new_variant()
returns trigger
language plpgsql
set search_path = public
as $f$
begin
  insert into public.store_product_region_status (product_variant_id, region_id, dealer_status, retail_status)
  select new.id, r.id, 'unavailable', 'draft'
  from public.store_region r
  where r.deleted_at is null
  on conflict (product_variant_id, region_id) do nothing;
  return new;
end;
$f$;

create or replace function public.store_region_status_for_new_region()
returns trigger
language plpgsql
set search_path = public
as $f$
begin
  insert into public.store_product_region_status (product_variant_id, region_id, dealer_status, retail_status)
  select v.id, new.id, 'unavailable', 'draft'
  from public.store_product_variant v
  on conflict (product_variant_id, region_id) do nothing;
  return new;
end;
$f$;

create trigger store_product_variant_region_status
  after insert on public.store_product_variant
  for each row execute function public.store_region_status_for_new_variant();

create trigger store_region_region_status
  after insert or update of deleted_at on public.store_region
  for each row
  when (new.deleted_at is null)
  execute function public.store_region_status_for_new_region();

commit;
