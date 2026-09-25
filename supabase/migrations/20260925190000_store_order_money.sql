-- Деньги заказа на производство и заказа клиента: валюта, снимок курсов, сумма, график платежей.
-- Настройка «Валюта производств». Календарь выпусков и карточка документа отдают сырые денежные факты;
-- формулы — в src/features/logistics/order-money.ts.

begin;

-- ---------------------------------------------------------------------------
-- Курс валюты к USD
-- ---------------------------------------------------------------------------

alter table public.store_currency
  add column rate numeric not null default 1 check (rate > 0);

comment on column public.store_currency.rate is
  'Последний известный курс: единиц валюты за 1 USD (USD = 1). Обновляется курсами floatrates, которые браузер передаёт в RPC создания заказа. Источник снимка, если курсы не пришли.';

update public.store_currency c
set rate = v.rate
from (values
  ('USD', 1::numeric),
  ('CNY', 7.12),
  ('EUR', 0.86),
  ('RUB', 82.5),
  ('AED', 3.6725),
  ('KZT', 480),
  ('BYN', 3.27),
  ('UZS', 12650),
  ('MXN', 18.4),
  ('INR', 88.2),
  ('OMR', 0.385)
) as v(code, rate)
where c.code = v.code;

-- ---------------------------------------------------------------------------
-- Настройки Store (синглтон)
-- ---------------------------------------------------------------------------

create table public.store_setting (
  id boolean primary key default true check (id),
  production_currency_id bigint not null references public.store_currency (id)
);

comment on table public.store_setting is
  'Общие настройки Store, одна строка (id = true).';

comment on column public.store_setting.production_currency_id is
  'Валюта производств: валюта по умолчанию нового заказа на производство и валюта всех сумм календаря выпусков.';

insert into public.store_setting (id, production_currency_id)
select true, c.id
from public.store_currency c
where c.code = 'USD' and c.deleted_at is null
order by c.id
limit 1;

-- ---------------------------------------------------------------------------
-- Деньги заказа и платежи
-- ---------------------------------------------------------------------------

create table public.store_order_money (
  document_id bigint primary key references public.store_document (id),
  currency_id bigint not null references public.store_currency (id),
  amount numeric(18, 4) check (amount is null or amount >= 0),
  rates jsonb not null default '{}'::jsonb check (jsonb_typeof(rates) = 'object')
);

comment on table public.store_order_money is
  'Деньги заказа на производство или заказа клиента. Создаётся триггером при вставке подтипа заказа.';

comment on column public.store_order_money.currency_id is
  'Валюта заказа: сумма, расчётная стоимость и все платежи. Смена валюты не пересчитывает числа.';

comment on column public.store_order_money.amount is
  'Необязательная сумма заказа в валюте заказа. NULL — берётся расчётная стоимость строк.';

comment on column public.store_order_money.rates is
  'Снимок курсов {"USD":1,"CNY":7.12,…}: единиц валюты за 1 USD на момент создания; правится вручную в карточке. Не меняется при обновлении store_currency.';

create table public.store_order_payment (
  id bigint generated always as identity primary key,
  document_id bigint not null references public.store_order_money (document_id),
  due_on date not null,
  amount numeric(18, 4) not null check (amount > 0),
  status text not null default 'planned' check (status in ('planned', 'invoiced', 'paid')),
  created_at timestamptz not null default now()
);

comment on table public.store_order_payment is
  'График платежей заказа: срок, сумма в валюте заказа, ручной статус. Для PO — оплата заводу, для заказа клиента — поступление от клиента.';

comment on column public.store_order_payment.status is
  'planned «Запланирован» | invoiced «Выставлен счёт» | paid «Оплачен». Только вручную, любой переход.';

create index store_order_payment_document_idx on public.store_order_payment (document_id, due_on);

do $$
declare
  t text;
begin
  foreach t in array array['store_setting', 'store_order_money', 'store_order_payment']
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

revoke all on sequence public.store_order_payment_id_seq from anon, authenticated;
grant usage, select on sequence public.store_order_payment_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- Помощники
-- ---------------------------------------------------------------------------

create or replace function public.store_currency_rates_snapshot()
returns jsonb
language sql
stable
set search_path = public
as $f$
  select coalesce(
    jsonb_object_agg(c.code, case when c.code = 'USD' then 1 else c.rate end order by c.code),
    '{"USD":1}'::jsonb
  )
  from public.store_currency c
  where c.deleted_at is null;
$f$;

create or replace function public.store_apply_currency_rates(p_rates jsonb)
returns void
language plpgsql
set search_path = public
as $f$
declare
  v_code text;
  v_raw jsonb;
  v_rate numeric;
begin
  if p_rates is null or jsonb_typeof(p_rates) <> 'object' then
    return;
  end if;
  for v_code, v_raw in select key, value from jsonb_each(p_rates)
  loop
    begin
      v_rate := (v_raw #>> '{}')::numeric;
    exception when others then
      raise exception 'Курс валюты % должен быть числом', upper(v_code);
    end;
    if v_rate is null or v_rate <= 0 then
      raise exception 'Курс валюты % должен быть больше нуля', upper(v_code);
    end if;
    update public.store_currency
    set rate = v_rate
    where code = upper(v_code) and code <> 'USD' and deleted_at is null;
  end loop;
end;
$f$;

create or replace function public.store_order_money_init()
returns trigger
language plpgsql
set search_path = public
as $f$
declare
  v_currency bigint;
begin
  if tg_table_name = 'store_production_order' then
    select s.production_currency_id into v_currency from public.store_setting s where s.id;
  else
    select r.default_dealer_currency_id into v_currency from public.store_region r where r.id = new.region_id;
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

create trigger store_production_order_money_init
  after insert on public.store_production_order
  for each row execute function public.store_order_money_init();

create trigger store_customer_order_money_init
  after insert on public.store_customer_order
  for each row execute function public.store_order_money_init();

-- Существующие заказы: деньги с текущими курсами справочника.
insert into public.store_order_money (document_id, currency_id, rates)
select po.id, s.production_currency_id, public.store_currency_rates_snapshot()
from public.store_production_order po
cross join public.store_setting s
on conflict (document_id) do nothing;

insert into public.store_order_money (document_id, currency_id, rates)
select co.id, r.default_dealer_currency_id, public.store_currency_rates_snapshot()
from public.store_customer_order co
join public.store_region r on r.id = co.region_id
on conflict (document_id) do nothing;

-- ---------------------------------------------------------------------------
-- Создание заказов: + p_rates (курсы floatrates из браузера)
-- ---------------------------------------------------------------------------

drop function if exists public.store_create_production_order(bigint, jsonb, text, date, text, bigint, bigint, timestamptz);

create or replace function public.store_create_production_order(
  p_plant_id bigint,
  p_lines jsonb default '[]'::jsonb,
  p_description text default '',
  p_expected_end_on date default null,
  p_status text default 'draft',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null,
  p_rates jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_loc bigint;
  e jsonb;
  v_line_ids bigint[] := '{}';
  v_line_id bigint;
  v_status text := coalesce(p_status, 'draft');
  v_seq bigint;
begin
  if not exists (select 1 from public.store_plant where id = p_plant_id and deleted_at is null) then
    raise exception 'Завод % не найден', p_plant_id;
  end if;
  if v_status not in ('draft', 'in_progress') then
    raise exception 'Начальный статус производства должен быть draft или in_progress';
  end if;
  perform public.store_apply_currency_rates(p_rates);
  v_id := public.store_create_document(
    'production_order', coalesce(p_description, ''), v_status, p_expected_end_on,
    p_sequence_number, p_id, p_created_at, null
  );
  v_loc := public.store_new_stock_location('production_order');
  insert into public.store_production_order (id, plant_id, stock_location_id)
  values (v_id, p_plant_id, v_loc);
  for e in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_line_id := public.store_insert_line(
      v_id, (e->>'product_variant_id')::bigint, (e->>'quantity')::numeric
    );
    v_line_ids := v_line_ids || v_line_id;
  end loop;
  select sequence_number into v_seq from public.store_document where id = v_id;
  return jsonb_build_object('id', v_id, 'lines', to_jsonb(v_line_ids), 'sequence_number', v_seq);
end;
$f$;

drop function if exists public.store_create_customer_order(bigint, text, date, jsonb, bigint, bigint, timestamptz, text, bigint);

create or replace function public.store_create_customer_order(
  p_region_id bigint,
  p_description text default '',
  p_expected_end_on date default null,
  p_lines jsonb default '[]'::jsonb,
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null,
  p_source_kind text default null,
  p_source_id bigint default null,
  p_rates jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_loc bigint;
  v_owner bigint;
  e jsonb;
  v_line_ids bigint[] := '{}';
  v_line_id bigint;
  v_variant bigint;
  v_plant bigint;
  v_price numeric;
begin
  if not exists (select 1 from public.store_region where id = p_region_id and deleted_at is null) then
    raise exception 'Регион % не найден', p_region_id;
  end if;
  if p_source_kind is not null and p_source_kind not in ('plant', 'hub') then
    raise exception 'Источник заказа — завод или хаб';
  end if;
  if p_source_kind = 'plant' then
    if not exists (select 1 from public.store_plant where id = p_source_id and deleted_at is null) then
      raise exception 'Завод % не найден', p_source_id;
    end if;
  elsif p_source_kind = 'hub' then
    if not exists (
      select 1 from public.store_warehouse
      where id = p_source_id and deleted_at is null and kind = 'hub'
    ) then
      raise exception 'Склад-хаб % не найден', p_source_id;
    end if;
  elsif p_source_id is not null then
    raise exception 'Источник заказа — завод или хаб';
  end if;

  perform public.store_apply_currency_rates(p_rates);
  v_id := public.store_create_document(
    'customer_order', coalesce(p_description, ''), 'in_progress', p_expected_end_on,
    p_sequence_number, p_id, p_created_at, null
  );
  v_loc := public.store_new_stock_location('customer_order');
  v_owner := public.store_new_stock_owner('customer_order');
  insert into public.store_customer_order (
    id, region_id, stock_location_id, stock_owner_id,
    source_kind, source_plant_id, source_warehouse_id
  ) values (
    v_id, p_region_id, v_loc, v_owner,
    p_source_kind,
    case when p_source_kind = 'plant' then p_source_id else null end,
    case when p_source_kind = 'hub' then p_source_id else null end
  );

  for e in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    if p_source_kind = 'plant' then
      select plant_id into v_plant from public.store_product_variant where id = v_variant;
      if v_plant is distinct from p_source_id then
        raise exception 'Товар не выпускается выбранным заводом';
      end if;
    end if;
    v_price := null;
    if e ? 'unit_price' and e->>'unit_price' is not null and e->>'unit_price' <> '' then
      v_price := (e->>'unit_price')::numeric;
    end if;
    v_line_id := public.store_insert_line(
      v_id, v_variant, (e->>'quantity')::numeric, null, null, v_price
    );
    v_line_ids := v_line_ids || v_line_id;
  end loop;
  return jsonb_build_object('id', v_id, 'lines', to_jsonb(v_line_ids));
end;
$f$;

-- ---------------------------------------------------------------------------
-- Команды денег заказа
-- ---------------------------------------------------------------------------

create or replace function public.store_assert_order_money(p_document_id bigint)
returns void
language plpgsql
stable
set search_path = public
as $f$
begin
  if not exists (select 1 from public.store_order_money where document_id = p_document_id) then
    raise exception 'Деньги заказа % не найдены', p_document_id;
  end if;
end;
$f$;

create or replace function public.store_set_order_currency(p_document_id bigint, p_currency_code text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_code text := upper(trim(coalesce(p_currency_code, '')));
  v_currency bigint;
  v_rates jsonb;
begin
  perform public.store_assert_order_money(p_document_id);
  select rates into v_rates from public.store_order_money where document_id = p_document_id for update;
  if not (v_rates ? v_code) then
    raise exception 'Валюты % нет в снимке курсов заказа', v_code;
  end if;
  select id into v_currency from public.store_currency
  where code = v_code and deleted_at is null order by id limit 1;
  if v_currency is null then
    raise exception 'Валюта % не найдена', v_code;
  end if;
  update public.store_order_money set currency_id = v_currency where document_id = p_document_id;
  return 'ok';
end;
$f$;

create or replace function public.store_set_order_amount(p_document_id bigint, p_amount numeric)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  perform public.store_assert_order_money(p_document_id);
  if p_amount is not null and p_amount < 0 then
    raise exception 'Сумма заказа не может быть отрицательной';
  end if;
  update public.store_order_money
  set amount = case when p_amount is null then null else round(p_amount, 4) end
  where document_id = p_document_id;
  return 'ok';
end;
$f$;

create or replace function public.store_set_order_rates(p_document_id bigint, p_rates jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_code text;
  v_raw jsonb;
  v_rate numeric;
  v_next jsonb;
  v_currency_code text;
begin
  perform public.store_assert_order_money(p_document_id);
  if p_rates is null or jsonb_typeof(p_rates) <> 'object' then
    raise exception 'Нужны курсы валют';
  end if;
  select m.rates, c.code into v_next, v_currency_code
  from public.store_order_money m
  join public.store_currency c on c.id = m.currency_id
  where m.document_id = p_document_id
  for update of m;
  for v_code, v_raw in select key, value from jsonb_each(p_rates)
  loop
    v_code := upper(v_code);
    begin
      v_rate := (v_raw #>> '{}')::numeric;
    exception when others then
      raise exception 'Курс валюты % должен быть числом', v_code;
    end;
    if v_rate is null or v_rate <= 0 then
      raise exception 'Курс валюты % должен быть больше нуля', v_code;
    end if;
    if v_code = 'USD' and v_rate <> 1 then
      raise exception 'Курс USD всегда равен 1';
    end if;
    v_next := v_next || jsonb_build_object(v_code, v_rate);
  end loop;
  if not (v_next ? v_currency_code) then
    raise exception 'В снимке нет курса валюты заказа %', v_currency_code;
  end if;
  update public.store_order_money set rates = v_next where document_id = p_document_id;
  return 'ok';
end;
$f$;

create or replace function public.store_save_order_payment(
  p_document_id bigint,
  p_due_on date,
  p_amount numeric,
  p_status text default 'planned',
  p_payment_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_status text := coalesce(nullif(trim(p_status), ''), 'planned');
begin
  perform public.store_assert_order_money(p_document_id);
  if p_due_on is null then
    raise exception 'Укажите срок оплаты';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Сумма платежа должна быть больше нуля';
  end if;
  if v_status not in ('planned', 'invoiced', 'paid') then
    raise exception 'Статус платежа % недопустим', v_status;
  end if;
  if p_payment_id is null then
    insert into public.store_order_payment (document_id, due_on, amount, status)
    values (p_document_id, p_due_on, round(p_amount, 4), v_status)
    returning id into v_id;
  else
    update public.store_order_payment
    set due_on = p_due_on, amount = round(p_amount, 4), status = v_status
    where id = p_payment_id and document_id = p_document_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Платёж % не найден', p_payment_id;
    end if;
  end if;
  return v_id;
end;
$f$;

create or replace function public.store_delete_order_payment(p_payment_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  delete from public.store_order_payment where id = p_payment_id;
  if not found then
    raise exception 'Платёж % не найден', p_payment_id;
  end if;
  return 'ok';
end;
$f$;

create or replace function public.store_set_production_currency(p_currency_code text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_code text := upper(trim(coalesce(p_currency_code, '')));
  v_currency bigint;
begin
  select id into v_currency from public.store_currency
  where code = v_code and deleted_at is null order by id limit 1;
  if v_currency is null then
    raise exception 'Валюта % не найдена', v_code;
  end if;
  insert into public.store_setting (id, production_currency_id) values (true, v_currency)
  on conflict (id) do update set production_currency_id = excluded.production_currency_id;
  return 'ok';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Чтение карточки: + order_money, order_payments, currencies
-- ---------------------------------------------------------------------------

create or replace function public.store_order_money_payload(p_document_id bigint)
returns jsonb
language sql
stable
set search_path = public
as $f$
  select jsonb_build_object(
    'order_money', (
      select jsonb_build_object(
        'document_id', m.document_id,
        'currency_id', m.currency_id,
        'currency_code', c.code,
        'amount', m.amount,
        'rates', m.rates
      )
      from store_order_money m
      join store_currency c on c.id = m.currency_id
      where m.document_id = p_document_id
    ),
    'order_payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'document_id', p.document_id,
        'due_on', p.due_on,
        'amount', p.amount,
        'status', p.status
      ) order by p.due_on, p.id)
      from store_order_payment p
      where p.document_id = p_document_id
    ), '[]'::jsonb),
    'currencies', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name) order by c.code)
      from store_currency c
      where c.deleted_at is null
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
  end if;

  if v_kind in ('customer_order', 'production_order') then
    v_extra := v_extra || store_order_money_payload(v_id);
  end if;

  return store_context_payload(v_variants, v_docs, true, false)
    || v_extra
    || jsonb_build_object('found', true, 'document_id', v_id, 'kind', v_kind);
end;
$f$;

-- ---------------------------------------------------------------------------
-- Календарь выпусков: + productionCurrency, moneyOrders, payments, code регионов
-- ---------------------------------------------------------------------------

create or replace function public.store_output_calendar_page()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  with
  free as (
    select public.store_free_owner_id() as id
  ),
  categories as (
    select
      c.id,
      c.parent_id as "parentId",
      c.name
    from store_category c
    where c.deleted_at is null
    order by c.id
  ),
  products as (
    select
      v.id,
      coalesce(v.name, p.name) as name,
      coalesce(v.unit, 'шт') as unit,
      v.plant_id as "plantId",
      coalesce(
        (
          select jsonb_agg(pc.category_id order by pc.category_id)
          from store_product_category pc
          join store_category c on c.id = pc.category_id and c.deleted_at is null
          where pc.product_id = v.product_id
        ),
        '[]'::jsonb
      ) as "categoryIds"
    from store_product_variant v
    join store_product p on p.id = v.product_id
    where p.deleted_at is null
      and v.deleted_at is null
    order by v.id
  ),
  plants as (
    select pl.id
    from store_plant pl
    where pl.deleted_at is null
    order by pl.id
  ),
  regions as (
    select
      r.id,
      r.code,
      r.name,
      r.stock_owner_id as "ownerId"
    from store_region r
    where r.deleted_at is null
    order by r.id
  ),
  stock_rows as (
    select
      b.product_variant_id as "productId",
      b.stock_owner_id as "ownerId",
      b.location_kind as "locationKind",
      b.location_entity_id as "locationId",
      td.sequence_number as "locationSequence",
      sum(b.quantity) as quantity
    from store_stock_balance_ref b
    left join store_document td on td.id = b.location_entity_id and b.location_kind = 'transfer'
    where b.location_kind in ('warehouse', 'transfer')
    group by b.product_variant_id, b.stock_owner_id, b.location_kind, b.location_entity_id, td.sequence_number
    having sum(b.quantity) <> 0
  ),
  output_lines as (
    select
      o.id as "outputId",
      store_doc_number(d.kind, d.sequence_number) as "outputNumber",
      d.sequence_number as "outputSequence",
      d.status,
      d.expected_end_on as "expectedEndOn",
      po.id as "productionOrderId",
      store_doc_number(pod.kind, pod.sequence_number) as "productionOrderNumber",
      pod.sequence_number as "productionOrderSequence",
      po.plant_id as "plantId",
      l.product_variant_id as "productId",
      coalesce(l.to_owner_id, (select id from free)) as "ownerId",
      l.quantity,
      l.id as "lineId"
    from store_production_output o
    join store_document d on d.id = o.id
    join store_production_order po on po.id = o.production_order_id
    join store_document pod on pod.id = po.id
    join store_document_product_line l on l.document_id = o.id
    where d.status = 'draft'
    order by o.id, l.id
  ),
  open_orders as (
    select
      po.id as "productionOrderId",
      store_doc_number(d.kind, d.sequence_number) as number,
      d.sequence_number as "sequenceNumber",
      po.plant_id as "plantId",
      l.product_variant_id as "productId",
      (sum(l.quantity) - public.store_po_output_qty(po.id, l.product_variant_id)) as remaining
    from store_production_order po
    join store_document d on d.id = po.id
    join store_document_product_line l on l.document_id = po.id
    where d.status not in ('done', 'cancelled')
    group by po.id, d.kind, d.sequence_number, po.plant_id, l.product_variant_id
    having (sum(l.quantity) - public.store_po_output_qty(po.id, l.product_variant_id)) > 0
    order by po.id, l.product_variant_id
  ),
  owning_order_ids as (
    select distinct orf.entity_id as id
    from store_owner_ref orf
    where orf.kind = 'customer_order'
      and (
        orf.stock_owner_id in (select "ownerId" from stock_rows)
        or orf.stock_owner_id in (select "ownerId" from output_lines)
      )
  ),
  customer_orders as (
    select
      co.id,
      store_doc_number(d.kind, d.sequence_number) as number,
      co.region_id as "regionId",
      co.stock_owner_id as "ownerId",
      d.sequence_number as "sequenceNumber"
    from store_customer_order co
    join store_document d on d.id = co.id
    where d.status not in ('done', 'cancelled')
       or co.id in (select id from owning_order_ids)
    order by d.sequence_number, co.id
  ),
  money_orders as (
    select
      m.document_id as id,
      d.kind,
      store_doc_number(d.kind, d.sequence_number) as number,
      d.sequence_number as "sequenceNumber",
      d.status,
      po.plant_id as "plantId",
      co.region_id as "regionId",
      c.code as "currencyCode",
      m.amount,
      m.rates,
      coalesce((
        select jsonb_agg(jsonb_build_object('currencyCode', lc.code, 'total', t.total) order by lc.code)
        from (
          select l.currency_id, sum(l.unit_price * l.quantity) as total
          from store_document_product_line l
          where l.document_id = m.document_id and l.unit_price is not null
          group by l.currency_id
        ) t
        left join store_currency lc on lc.id = t.currency_id
      ), '[]'::jsonb) as "lineTotals"
    from store_order_money m
    join store_document d on d.id = m.document_id
    join store_currency c on c.id = m.currency_id
    left join store_production_order po on po.id = m.document_id
    left join store_customer_order co on co.id = m.document_id
    where d.status is distinct from 'cancelled'
      and d.kind in ('production_order', 'customer_order')
  ),
  payments as (
    select
      p.id,
      p.document_id as "orderId",
      p.due_on as "dueOn",
      p.amount,
      p.status
    from store_order_payment p
    where p.document_id in (select id from money_orders)
  )
  select jsonb_build_object(
    'freeOwnerId', (select id from free),
    'productionCurrency', (
      select c.code
      from store_setting s
      join store_currency c on c.id = s.production_currency_id
      where s.id
    ),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from categories c), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from products p), '[]'::jsonb),
    'plants', coalesce((select jsonb_agg(to_jsonb(pl) order by pl.id) from plants pl), '[]'::jsonb),
    'regions', coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from regions r), '[]'::jsonb),
    'customerOrders', coalesce((select jsonb_agg(to_jsonb(o) order by o."sequenceNumber", o.id) from customer_orders o), '[]'::jsonb),
    'stock', coalesce((select jsonb_agg(to_jsonb(s) order by s."productId", s."locationKind", s."locationId", s."ownerId") from stock_rows s), '[]'::jsonb),
    'outputLines', coalesce((select jsonb_agg((to_jsonb(l) - 'lineId') order by l."outputId", l."lineId") from output_lines l), '[]'::jsonb),
    'openOrders', coalesce((select jsonb_agg(to_jsonb(o) order by o."productionOrderId", o."productId") from open_orders o), '[]'::jsonb),
    'moneyOrders', coalesce((select jsonb_agg(to_jsonb(o) order by o.kind, o."sequenceNumber", o.id) from money_orders o), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(p) order by p."dueOn", p.id) from payments p), '[]'::jsonb)
  );
$f$;

-- ---------------------------------------------------------------------------
-- Гранты
-- ---------------------------------------------------------------------------

revoke all on function public.store_currency_rates_snapshot() from public, anon, authenticated;
revoke all on function public.store_apply_currency_rates(jsonb) from public, anon, authenticated;
revoke all on function public.store_order_money_init() from public, anon, authenticated;
revoke all on function public.store_assert_order_money(bigint) from public, anon, authenticated;
revoke all on function public.store_order_money_payload(bigint) from public, anon, authenticated;

revoke all on function public.store_create_production_order(bigint, jsonb, text, date, text, bigint, bigint, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.store_create_production_order(bigint, jsonb, text, date, text, bigint, bigint, timestamptz, jsonb) to anon, authenticated, service_role;
revoke all on function public.store_create_customer_order(bigint, text, date, jsonb, bigint, bigint, timestamptz, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.store_create_customer_order(bigint, text, date, jsonb, bigint, bigint, timestamptz, text, bigint, jsonb) to anon, authenticated, service_role;

revoke all on function public.store_set_order_currency(bigint, text) from public, anon, authenticated;
grant execute on function public.store_set_order_currency(bigint, text) to anon, authenticated, service_role;
revoke all on function public.store_set_order_amount(bigint, numeric) from public, anon, authenticated;
grant execute on function public.store_set_order_amount(bigint, numeric) to anon, authenticated, service_role;
revoke all on function public.store_set_order_rates(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.store_set_order_rates(bigint, jsonb) to anon, authenticated, service_role;
revoke all on function public.store_save_order_payment(bigint, date, numeric, text, bigint) from public, anon, authenticated;
grant execute on function public.store_save_order_payment(bigint, date, numeric, text, bigint) to anon, authenticated, service_role;
revoke all on function public.store_delete_order_payment(bigint) from public, anon, authenticated;
grant execute on function public.store_delete_order_payment(bigint) to anon, authenticated, service_role;
revoke all on function public.store_set_production_currency(text) from public, anon, authenticated;
grant execute on function public.store_set_production_currency(text) to anon, authenticated, service_role;

revoke all on function public.store_document_context(text, text) from public, anon, authenticated;
grant execute on function public.store_document_context(text, text) to anon, authenticated, service_role;
revoke all on function public.store_output_calendar_page() from public, anon, authenticated;
grant execute on function public.store_output_calendar_page() to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
