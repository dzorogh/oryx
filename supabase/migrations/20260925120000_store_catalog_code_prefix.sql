-- Настраиваемый префикс кода справочника (сейчас только завод: PLT-{id}).

create table public.store_catalog_code_prefix (
  code text primary key check (code in ('plant')),
  number_prefix text not null check (number_prefix ~ '^[A-Z0-9]{1,8}$')
);

comment on table public.store_catalog_code_prefix is
  'Префиксы отображаемых кодов справочников Store. Код в UI — prefix-id; смена префикса меняет отображение без переписи строк справочника. Склады, товары и регионы сюда не входят — их префиксы фиксированы.';

comment on column public.store_catalog_code_prefix.code is
  'Стабильный код справочника и PK: plant.';

comment on column public.store_catalog_code_prefix.number_prefix is
  'Префикс кода: латиница в верхнем регистре и цифры, 1–8 символов (по умолчанию PLT).';

insert into public.store_catalog_code_prefix (code, number_prefix) values ('plant', 'PLT');

alter table public.store_catalog_code_prefix enable row level security;
create policy store_select_store_catalog_code_prefix on public.store_catalog_code_prefix
  for select to anon, authenticated using (true);

revoke all on table public.store_catalog_code_prefix from anon, authenticated;
grant select on table public.store_catalog_code_prefix to anon, authenticated;
grant all on table public.store_catalog_code_prefix to service_role;

create or replace function public.store_update_catalog_code_prefix(p_code text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  update public.store_catalog_code_prefix set number_prefix = upper(trim(p_prefix)) where code = p_code;
  if not found then raise exception 'Справочник % не найден', p_code; end if;
  return 'ok';
end;
$f$;

revoke all on function public.store_update_catalog_code_prefix(text, text) from public;
grant execute on function public.store_update_catalog_code_prefix(text, text) to anon, authenticated, service_role;
