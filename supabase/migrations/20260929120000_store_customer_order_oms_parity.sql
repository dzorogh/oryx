-- Карточка заказа клиента: паритет с прод-заказом OMS.
-- Тенанты с регионом, поля учётной системы, события статуса платежей, деньги перемещения,
-- копия заказа, заметка, файлы (бакет store-documents), расширенный store_document_context.

begin;

-- ---------------------------------------------------------------------------
-- Тенанты
-- ---------------------------------------------------------------------------

create table public.store_tenant (
  id text primary key,
  name text not null check (btrim(name) <> ''),
  region_id bigint references public.store_region (id),
  sort_order integer not null default 0
);

comment on table public.store_tenant is
  'Тенанты демо (id = id из src/lib/demo-tenants.ts). У тенанта ровно один регион или ни одного; заказ клиента доступен тенантам своего региона.';

comment on column public.store_tenant.region_id is
  'Регион тенанта. NULL — тенант без региона. Смена региона меняет тенанта в шапке всех заказов региона без правки заказов.';

insert into public.store_tenant (id, name, region_id, sort_order)
select v.id, v.name, r.id, v.sort_order
from (values
  ('tenant-globaldrive', 'Globaldrive', 'ru', 10),
  ('tenant-lunnar-capital', 'Lunnar Capital', null, 20),
  ('tenant-my-testing', 'My Testing', null, 30),
  ('tenant-oryxbms', 'OryxBMS', null, 40),
  ('tenant-sharmax-by', 'Sharmax Belarus', 'by', 50),
  ('tenant-sharmax-kz', 'Sharmax Kazakhstan', 'kz', 60),
  ('tenant-sharmax-mx', 'Sharmax Mexico', 'mx', 70),
  ('tenant-sharmax-om', 'Sharmax Oman', 'om', 80),
  ('tenant-sharmax-qa', 'Sharmax Qatar', null, 90),
  ('tenant-sharmax-sa', 'Sharmax Saudi', null, 100),
  ('tenant-sharmax-es', 'Sharmax Spain', null, 110),
  ('tenant-sharmax-ae', 'Sharmax UAE', 'ae', 120),
  ('tenant-sharmax-uz', 'Sharmax Uzbekistan', 'uz', 130)
) as v(id, name, region_code, sort_order)
left join lateral (
  select r.id from public.store_region r
  where r.code = v.region_code and r.deleted_at is null
  order by r.id
  limit 1
) r on true
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Учётная система у заказа клиента
-- ---------------------------------------------------------------------------

alter table public.store_customer_order
  add column accounting_number text,
  add column accounting_url text
    check (accounting_url is null or accounting_url ~* '^https?://[^[:space:]]+$');

comment on column public.store_customer_order.accounting_number is
  'Номер заказа в учётной системе. Вводится вручную, интеграции нет.';

comment on column public.store_customer_order.accounting_url is
  'Ссылка на заказ в учётной системе (http/https). Вводится вручную, интеграции нет.';

-- ---------------------------------------------------------------------------
-- События статуса платежа (системные сообщения ленты комментариев)
-- ---------------------------------------------------------------------------

create table public.store_order_payment_event (
  id bigint generated always as identity primary key,
  payment_id bigint not null,
  document_id bigint not null references public.store_document (id),
  status text not null check (status in ('planned', 'invoiced', 'paid')),
  amount numeric(18, 4) not null,
  due_on date not null,
  changed_at timestamptz not null default now()
);

comment on table public.store_order_payment_event is
  'Смена статуса платежа: новый статус и срок/сумма на момент смены. Пишет только trigger на store_order_payment; создание платежа событием не считается. payment_id без FK — событие переживает удаление платежа.';

create index store_order_payment_event_document_idx
  on public.store_order_payment_event (document_id, changed_at);

create or replace function public.store_order_payment_event_writer()
returns trigger
language plpgsql
set search_path = public
as $f$
begin
  if new.status is distinct from old.status then
    insert into public.store_order_payment_event (payment_id, document_id, status, amount, due_on)
    values (new.id, new.document_id, new.status, new.amount, new.due_on);
  end if;
  return new;
end;
$f$;

create trigger store_order_payment_event_trg
  after update of status on public.store_order_payment
  for each row execute function public.store_order_payment_event_writer();

-- ---------------------------------------------------------------------------
-- Файлы документа (метаданные; объекты — бакет store-documents)
-- ---------------------------------------------------------------------------

create table public.store_document_file (
  id bigint generated always as identity primary key,
  document_id bigint not null references public.store_document (id),
  storage_path text not null unique,
  name text not null check (btrim(name) <> ''),
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 10485760),
  mime_type text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.store_document_file is
  'Файлы заказа клиента: объект в Storage-бакете store-documents по пути «<document_id>/…». Пишут только store_add_document_file / store_delete_document_file.';

create index store_document_file_document_idx on public.store_document_file (document_id, created_at);

do $$
declare
  t text;
begin
  foreach t in array array['store_tenant', 'store_order_payment_event', 'store_document_file']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy store_select_%I on public.%I for select to anon, authenticated using (true)',
      t, t
    );
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

revoke all on sequence public.store_order_payment_event_id_seq from anon, authenticated;
grant usage, select on sequence public.store_order_payment_event_id_seq to service_role;
revoke all on sequence public.store_document_file_id_seq from anon, authenticated;
grant usage, select on sequence public.store_document_file_id_seq to service_role;

-- Бакет и политики: браузер (anon) пишет и читает объекты только этого бакета.
insert into storage.buckets (id, name, public, file_size_limit)
values ('store-documents', 'store-documents', false, 10485760)
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists store_documents_select on storage.objects;
drop policy if exists store_documents_insert on storage.objects;
drop policy if exists store_documents_delete on storage.objects;

create policy store_documents_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'store-documents');

create policy store_documents_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'store-documents');

create policy store_documents_delete on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'store-documents');

-- ---------------------------------------------------------------------------
-- Деньги перемещения: та же модель, валюта производств при создании
-- ---------------------------------------------------------------------------

create or replace function public.store_order_money_init()
returns trigger
language plpgsql
set search_path = public
as $f$
declare
  v_currency bigint;
begin
  if tg_table_name in ('store_production_order', 'store_transfer') then
    select s.production_currency_id into v_currency from public.store_setting s where s.id;
  else
    select coalesce(r.order_currency_id, r.default_dealer_currency_id)
    into v_currency
    from public.store_region r
    where r.id = new.region_id;
  end if;
  if v_currency is null then
    select c.id into v_currency from public.store_currency c
    where c.code = 'USD' and c.deleted_at is null order by c.id limit 1;
  end if;
  insert into public.store_order_money (document_id, currency_id, rates)
  values (new.id, v_currency, public.store_currency_rates_snapshot())
  on conflict (document_id) do nothing;
  return new;
end;
$f$;

create trigger store_transfer_money_init
  after insert on public.store_transfer
  for each row execute function public.store_order_money_init();

insert into public.store_order_money (document_id, currency_id, rates)
select t.id, s.production_currency_id, public.store_currency_rates_snapshot()
from public.store_transfer t
cross join public.store_setting s
on conflict (document_id) do nothing;

comment on table public.store_order_money is
  'Деньги заказа на производство, заказа клиента или перемещения (оплата доставки). Создаётся триггером при вставке подтипа.';

-- ---------------------------------------------------------------------------
-- Команды
-- ---------------------------------------------------------------------------

create or replace function public.store_set_tenant_region(p_tenant_id text, p_region_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  if p_region_id is not null
    and not exists (select 1 from public.store_region where id = p_region_id and deleted_at is null)
  then
    raise exception 'Регион % не найден', p_region_id;
  end if;
  update public.store_tenant set region_id = p_region_id where id = p_tenant_id;
  if not found then
    raise exception 'Тенант % не найден', p_tenant_id;
  end if;
  return 'ok';
end;
$f$;

create or replace function public.store_copy_customer_order(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_src public.store_customer_order%rowtype;
  v_id bigint;
  v_loc bigint;
  v_owner bigint;
  v_currency bigint;
begin
  select * into v_src from public.store_customer_order where id = p_id;
  if not found then
    raise exception 'Заказ клиента % не найден', p_id;
  end if;
  if not exists (
    select 1
    from public.store_document_product_line l
    join public.store_product_variant v on v.id = l.product_variant_id and v.deleted_at is null
    where l.document_id = p_id and l.quantity > 0
  ) then
    raise exception 'Нет строк для копии';
  end if;

  v_id := public.store_create_document('customer_order', '', 'draft', null, null, null, null, null);
  v_loc := public.store_new_stock_location('customer_order');
  v_owner := public.store_new_stock_owner('customer_order');
  insert into public.store_customer_order (
    id, region_id, stock_location_id, stock_owner_id,
    source_kind, source_plant_id, source_warehouse_id
  ) values (
    v_id, v_src.region_id, v_loc, v_owner,
    v_src.source_kind, v_src.source_plant_id, v_src.source_warehouse_id
  );

  select currency_id into v_currency from public.store_order_money where document_id = p_id;
  if v_currency is not null then
    update public.store_order_money set currency_id = v_currency where document_id = v_id;
  end if;

  insert into public.store_document_product_line (
    document_id, product_variant_id, quantity, variant_name, unit_price, currency_id
  )
  select v_id, l.product_variant_id, l.quantity, v.name, l.unit_price, l.currency_id
  from public.store_document_product_line l
  join public.store_product_variant v on v.id = l.product_variant_id and v.deleted_at is null
  where l.document_id = p_id and l.quantity > 0
  order by l.id;

  return (
    select jsonb_build_object('id', v_id, 'sequence_number', d.sequence_number)
    from public.store_document d
    where d.id = v_id
  );
end;
$f$;

create or replace function public.store_set_document_description(p_document_id bigint, p_description text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_text text := btrim(coalesce(p_description, ''), E' \t\r\n');
begin
  if not exists (
    select 1 from public.store_document where id = p_document_id and kind = 'customer_order'
  ) then
    raise exception 'Заказ клиента % не найден', p_document_id;
  end if;
  if length(v_text) > 4000 then
    raise exception 'Заметка длиннее 4000 символов';
  end if;
  update public.store_document set description = v_text where id = p_document_id;
  return 'ok';
end;
$f$;

create or replace function public.store_set_customer_order_accounting(
  p_id bigint,
  p_number text,
  p_url text
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_number text := nullif(btrim(coalesce(p_number, '')), '');
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  if v_url is not null and v_url !~* '^https?://[^[:space:]]+$' then
    raise exception 'Ссылка должна начинаться с http:// или https://';
  end if;
  if length(coalesce(v_number, '')) > 200 then
    raise exception 'Номер в учётной системе длиннее 200 символов';
  end if;
  update public.store_customer_order
  set accounting_number = v_number, accounting_url = v_url
  where id = p_id;
  if not found then
    raise exception 'Заказ клиента % не найден', p_id;
  end if;
  return 'ok';
end;
$f$;

create or replace function public.store_add_document_file(
  p_document_id bigint,
  p_storage_path text,
  p_name text,
  p_size_bytes bigint,
  p_mime_type text default ''
)
returns bigint
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if not exists (
    select 1 from public.store_document where id = p_document_id and kind = 'customer_order'
  ) then
    raise exception 'Заказ клиента % не найден', p_document_id;
  end if;
  if v_name = '' then
    raise exception 'Нужно имя файла';
  end if;
  if p_size_bytes is null or p_size_bytes < 0 or p_size_bytes > 10485760 then
    raise exception 'Файл больше 10 МБ';
  end if;
  if p_storage_path is null or left(p_storage_path, length(p_document_id::text) + 1) <> p_document_id::text || '/' then
    raise exception 'Путь файла не относится к заказу';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'store-documents' and o.name = p_storage_path
  ) then
    raise exception 'Файл не загружен в хранилище';
  end if;
  insert into public.store_document_file (document_id, storage_path, name, size_bytes, mime_type)
  values (p_document_id, p_storage_path, v_name, p_size_bytes, coalesce(p_mime_type, ''))
  returning id into v_id;
  return v_id;
end;
$f$;

create or replace function public.store_delete_document_file(p_file_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_path text;
begin
  delete from public.store_document_file where id = p_file_id returning storage_path into v_path;
  if v_path is null then
    raise exception 'Файл % не найден', p_file_id;
  end if;
  return v_path;
end;
$f$;

-- ---------------------------------------------------------------------------
-- store_context_payload: + accounting_number / accounting_url в строках заказов клиента
-- ---------------------------------------------------------------------------

create or replace function public.store_context_payload(
  p_variant_ids bigint[],
  p_document_ids bigint[],
  p_include_transactions boolean default true,
  p_balances_all boolean default false
)
returns jsonb
language plpgsql
stable
set search_path = public
as $f$
declare
  v_p bigint[];
  v_d0 bigint[];
  v_d bigint[];
  v_variants bigint[];
begin
  v_p := coalesce(p_variant_ids, array[]::bigint[]);
  v_d0 := coalesce(p_document_ids, array[]::bigint[]);

  select coalesce(array_agg(distinct x), array[]::bigint[])
  into v_d
  from (
    select unnest(v_d0) as x
    union
    select l.document_id
    from store_document_product_line l
    where cardinality(v_p) > 0 and l.product_variant_id = any (v_p)
    union
    select t.document_id
    from store_stock_transaction t
    where cardinality(v_p) > 0 and t.product_variant_id = any (v_p)
  ) s;

  select coalesce(array_agg(distinct x), array[]::bigint[])
  into v_variants
  from (
    select unnest(v_p) as x
    union
    select l.product_variant_id
    from store_document_product_line l
    where cardinality(v_d) > 0 and l.document_id = any (v_d)
  ) s;

  return jsonb_build_object(
    'code_prefixes', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.entity), '[]'::jsonb)
      from (select entity, number_prefix from store_code_prefix) r
    ),
    'documents', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, kind, sequence_number, description, status, expected_end_on, created_at, created_by
        from store_document
        where id = any (v_d)
           or kind in ('customer_order', 'production_order', 'transfer')
      ) r
    ),
    'product_variants', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select
          v.id, v.product_id, v.name, v.unit, v.image_url, v.plant_id,
          coalesce((
            select jsonb_agg(pc.category_id order by pc.category_id)
            from store_product_category pc
            join store_category c on c.id = pc.category_id and c.deleted_at is null
            where pc.product_id = v.product_id
          ), '[]'::jsonb) as category_ids
        from store_product_variant v
        where v.id = any (v_variants)
      ) r
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'parent_id', c.parent_id, 'name', c.name) order by c.id)
      from store_category c
      where c.deleted_at is null
    ), '[]'::jsonb),
    'dealer_prices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_variant_id', pr.product_variant_id,
        'region_id', pr.region_id,
        'amount', pr.amount,
        'currency_id', pr.currency_id,
        'currency_code', cur.code
      ) order by pr.id)
      from store_product_price pr
      left join store_currency cur on cur.id = pr.currency_id
      where pr.price_kind = 'dealer' and pr.active
        and pr.product_variant_id = any (v_variants)
    ), '[]'::jsonb),
    'warehouses', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, name, stock_location_id, kind from store_warehouse) r
    ),
    'plants', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, name, warehouse_id from store_plant) r
    ),
    'regions', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, code, name, stock_owner_id from store_region) r
    ),
    'stock_locations', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, kind from store_stock_location) r
    ),
    'stock_owners', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, kind from store_stock_owner) r
    ),
    'customer_orders', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, region_id, stock_location_id, stock_owner_id,
               source_kind, source_plant_id, source_warehouse_id,
               accounting_number, accounting_url
        from store_customer_order
      ) r
    ),
    'production_orders', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, plant_id, stock_location_id from store_production_order) r
    ),
    'transfers', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, from_warehouse_id, to_warehouse_id, stock_location_id from store_transfer) r
    ),
    'reservations', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, location_id, owner_id, creation_source, posted_at
        from store_reservation
        where id = any (v_d)
      ) r
    ),
    'shipments', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, from_location_id, to_location_id
        from store_shipment
        where id = any (v_d)
      ) r
    ),
    'production_outputs', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, production_order_id, stock_location_id
        from store_production_output
        where id = any (v_d)
      ) r
    ),
    'adjustments', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, location_id
        from store_adjustment
        where id = any (v_d)
      ) r
    ),
    'document_product_lines', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, document_id, product_variant_id, quantity, from_owner_id, to_owner_id,
               variant_name, unit_price, currency_id
        from store_document_product_line
        where document_id = any (v_d)
      ) r
    ),
    'stock_transactions', case
      when not p_include_transactions then '[]'::jsonb
      else (
        select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at, r.id), '[]'::jsonb)
        from (
          select id, created_at, product_variant_id, quantity, location_id, owner_id, document_id
          from store_stock_transaction
          where product_variant_id = any (v_p)
        ) r
      )
    end,
    'users', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (select id, name from app_user) r
    ),
    'document_history', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
      from (
        select id, document_id, status, expected_end_on, changed_at, changed_by
        from store_document_history
        where document_id = any (v_d)
      ) r
    ),
    'balances', case
      when p_balances_all then store_balance_json(null)
      when cardinality(v_p) > 0 then store_balance_json(v_p)
      else '[]'::jsonb
    end
  );
end;
$f$;

-- ---------------------------------------------------------------------------
-- store_document_context: данные карточки заказа клиента и деньги перемещения
-- ---------------------------------------------------------------------------

create or replace function public.store_customer_order_oms_payload(
  p_order_id bigint,
  p_transfer_ids bigint[]
)
returns jsonb
language sql
stable
set search_path = public
as $f$
  select jsonb_build_object(
    'tenants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'region_id', t.region_id, 'sort_order', t.sort_order
      ) order by t.sort_order, t.name)
      from store_tenant t
    ), '[]'::jsonb),
    'variant_logistics', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_variant_id', v.id,
        'quantity_per_unit', v.quantity_per_unit,
        'length_cm', g.length_cm,
        'width_cm', g.width_cm,
        'height_cm', g.height_cm,
        'weight_kg', g.weight_kg,
        'stacking', g.stacking,
        'stacking_limit', g.stacking_limit,
        'rotate_length', g.rotate_length,
        'rotate_width', g.rotate_width,
        'max_per_container', g.max_per_container
      ) order by v.id)
      from store_product_variant v
      left join store_product_variant_logistics g on g.product_variant_id = v.id
      where v.id in (
        select l.product_variant_id from store_document_product_line l where l.document_id = p_order_id
      )
    ), '[]'::jsonb),
    'container_types', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', c.code,
        'name', c.name,
        'inner_length_mm', c.inner_length_mm,
        'inner_width_mm', c.inner_width_mm,
        'inner_height_mm', c.inner_height_mm,
        'max_weight_kg', c.max_weight_kg
      ) order by c.sort_order, c.id)
      from store_container_type c
      where c.active
    ), '[]'::jsonb),
    'transfer_money', coalesce((
      select jsonb_agg(jsonb_build_object(
        'document_id', m.document_id,
        'currency_code', c.code,
        'rates', m.rates,
        'payments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', p.id,
            'document_id', p.document_id,
            'due_on', p.due_on,
            'amount', p.amount,
            'status', p.status
          ) order by p.due_on, p.id)
          from store_order_payment p
          where p.document_id = m.document_id
        ), '[]'::jsonb)
      ) order by m.document_id)
      from store_order_money m
      join store_currency c on c.id = m.currency_id
      where m.document_id = any (coalesce(p_transfer_ids, array[]::bigint[]))
    ), '[]'::jsonb),
    'order_payment_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'payment_id', e.payment_id,
        'document_id', e.document_id,
        'status', e.status,
        'amount', e.amount,
        'due_on', e.due_on,
        'changed_at', e.changed_at
      ) order by e.changed_at, e.id)
      from store_order_payment_event e
      where e.document_id = p_order_id
    ), '[]'::jsonb),
    'document_files', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'document_id', f.document_id,
        'storage_path', f.storage_path,
        'name', f.name,
        'size_bytes', f.size_bytes,
        'mime_type', f.mime_type,
        'created_at', f.created_at
      ) order by f.created_at, f.id)
      from store_document_file f
      where f.document_id = p_order_id
    ), '[]'::jsonb)
  );
$f$;

create or replace function public.store_document_context(p_kind text, p_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $f$
declare
  v_kind text := case when p_kind = 'output' then 'production_output' else p_kind end;
  v_id bigint;
  v_loc bigint;
  v_owner bigint;
  v_variants bigint[];
  v_docs bigint[];
  v_scope_docs bigint[];
  v_scope_variants bigint[];
  v_transfers bigint[] := array[]::bigint[];
  v_extra jsonb := '{}'::jsonb;
begin
  select d.id into v_id
  from store_document d
  where d.kind = v_kind
    and (d.id::text = p_ref or d.sequence_number::text = p_ref)
  order by case when d.sequence_number::text = p_ref then 0 else 1 end
  limit 1;

  if v_id is null then
    return jsonb_build_object('found', false, 'kind', v_kind, 'ref', p_ref);
  end if;

  select coalesce(array_agg(distinct l.product_variant_id), array[]::bigint[])
  into v_variants
  from store_document_product_line l
  where l.document_id = v_id;

  v_docs := array[v_id] || array(
    select o.id from store_production_output o where o.production_order_id = v_id
  );

  -- Orders and transfers own a stock location (and a customer order an owner):
  -- pull in documents and products that touch them, not only the line products.
  select c.stock_location_id, c.stock_owner_id into v_loc, v_owner
  from store_customer_order c where c.id = v_id;
  if v_loc is null then
    select p.stock_location_id into v_loc from store_production_order p where p.id = v_id;
  end if;
  if v_loc is null then
    select t.stock_location_id into v_loc from store_transfer t where t.id = v_id;
  end if;

  if v_loc is not null then
    select s.document_ids, s.variant_ids into v_scope_docs, v_scope_variants
    from store_place_scope(v_loc, v_owner) s;
    v_docs := v_docs || v_scope_docs;
    v_variants := v_variants || v_scope_variants;
  end if;

  if v_kind = 'customer_order' then
    v_extra := jsonb_build_object('order_plan', store_order_plan_payload(v_id));
    v_docs := v_docs || array(
      select a.result_document_id
      from store_order_plan_action a
      join store_order_plan p on p.id = a.plan_id
      where p.customer_order_id = v_id and a.result_document_id is not null
    );

    -- Transfers that may carry this order's goods (the client picks the exact set):
    -- their other products come in too, so owner groups of each transfer are complete.
    select coalesce(array_agg(distinct t.id), array[]::bigint[])
    into v_transfers
    from store_transfer t
    where t.id = any (v_docs)
       or t.stock_location_id in (select r.location_id from store_reservation r where r.id = any (v_docs))
       or t.stock_location_id in (select x.location_id from store_stock_transaction x where x.owner_id = v_owner);
    v_variants := v_variants || array(
      select l.product_variant_id from store_document_product_line l where l.document_id = any (v_transfers)
    );

    v_extra := v_extra || store_customer_order_oms_payload(v_id, v_transfers);
  end if;

  if v_kind in ('customer_order', 'production_order', 'transfer') then
    v_extra := v_extra || store_order_money_payload(v_id);
  end if;

  return store_context_payload(v_variants, v_docs, true, false)
    || v_extra
    || jsonb_build_object('found', true, 'document_id', v_id, 'kind', v_kind);
end;
$f$;

-- ---------------------------------------------------------------------------
-- Гранты
-- ---------------------------------------------------------------------------

revoke all on function public.store_order_payment_event_writer() from public, anon, authenticated;
revoke all on function public.store_order_money_init() from public, anon, authenticated;
revoke all on function public.store_context_payload(bigint[], bigint[], boolean, boolean) from public, anon, authenticated;
revoke all on function public.store_customer_order_oms_payload(bigint, bigint[]) from public, anon, authenticated;

revoke all on function public.store_set_tenant_region(text, bigint) from public, anon, authenticated;
grant execute on function public.store_set_tenant_region(text, bigint) to anon, authenticated, service_role;
revoke all on function public.store_copy_customer_order(bigint) from public, anon, authenticated;
grant execute on function public.store_copy_customer_order(bigint) to anon, authenticated, service_role;
revoke all on function public.store_set_document_description(bigint, text) from public, anon, authenticated;
grant execute on function public.store_set_document_description(bigint, text) to anon, authenticated, service_role;
revoke all on function public.store_set_customer_order_accounting(bigint, text, text) from public, anon, authenticated;
grant execute on function public.store_set_customer_order_accounting(bigint, text, text) to anon, authenticated, service_role;
revoke all on function public.store_add_document_file(bigint, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.store_add_document_file(bigint, text, text, bigint, text) to anon, authenticated, service_role;
revoke all on function public.store_delete_document_file(bigint) from public, anon, authenticated;
grant execute on function public.store_delete_document_file(bigint) to anon, authenticated, service_role;

revoke all on function public.store_document_context(text, text) from public, anon, authenticated;
grant execute on function public.store_document_context(text, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
