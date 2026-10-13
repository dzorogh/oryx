-- Доставка клиента и метаданные заказа: отдельные таблицы, не перемещения и не деньги заказа.
-- «Изменён» — store_document.updated_at. Комментарии живут в браузере и эту дату не двигают.

begin;

alter table public.store_document
  add column updated_at timestamptz not null default now();

comment on column public.store_document.updated_at is
  'Момент последней правки документа (UTC): шапка, статус, срок, заметка, строки, деньги, платежи, файлы, доставка клиента и метаданные. Комментарии не учитываются. У уже существующих строк заполнен created_at.';

update public.store_document
set updated_at = created_at;

-- ---------------------------------------------------------------------------
-- Доставка клиента (учёт клиента, не перемещение)
-- ---------------------------------------------------------------------------

create table public.store_customer_order_client_delivery (
  order_id bigint primary key references public.store_customer_order (id) on delete cascade,
  payment_status text,
  invoice_amount numeric(18, 4),
  invoice_currency_id bigint references public.store_currency (id),
  paid_amount numeric(18, 4),
  paid_currency_id bigint references public.store_currency (id),
  due_on date,
  constraint store_customer_order_client_delivery_status_chk
    check (payment_status is null or payment_status in ('awaiting_invoice', 'pending_payment', 'paid')),
  constraint store_customer_order_client_delivery_invoice_nonneg_chk
    check (invoice_amount is null or invoice_amount >= 0),
  constraint store_customer_order_client_delivery_paid_nonneg_chk
    check (paid_amount is null or paid_amount >= 0),
  constraint store_customer_order_client_delivery_invoice_currency_chk
    check ((invoice_amount is null) = (invoice_currency_id is null)),
  constraint store_customer_order_client_delivery_paid_currency_chk
    check ((paid_amount is null) = (paid_currency_id is null))
);

comment on table public.store_customer_order_client_delivery is
  'Доставка, которую клиент организует сам от склада отгрузки. Стоимость и статус оплаты для его учёта. Не связана с перемещениями, transfer_money и деньгами заказа.';

comment on column public.store_customer_order_client_delivery.payment_status is
  'awaiting_invoice «Счёт не выставлен» | pending_payment «Ожидается полная оплата» | paid «Оплачено». NULL — не задан.';

comment on column public.store_customer_order_client_delivery.invoice_amount is
  'Сумма инвойса доставки, не меньше нуля. NULL вместе с валютой — поле пустое.';

comment on column public.store_customer_order_client_delivery.invoice_currency_id is
  'Валюта инвойса. Обязательна, когда сумма задана, и пуста вместе с пустой суммой.';

comment on column public.store_customer_order_client_delivery.paid_amount is
  'Оплаченная сумма доставки, не меньше нуля. Своя валюта, не обязательно валюта инвойса.';

comment on column public.store_customer_order_client_delivery.paid_currency_id is
  'Валюта оплаченной суммы. Обязательна, когда сумма задана.';

comment on column public.store_customer_order_client_delivery.due_on is
  'Срок оплаты доставки. NULL — не задан.';

-- ---------------------------------------------------------------------------
-- Метаданные учёта (новые поля, не удалённые accounting_number / accounting_url)
-- ---------------------------------------------------------------------------

create table public.store_customer_order_meta (
  order_id bigint primary key references public.store_customer_order (id) on delete cascade,
  external_id text,
  track_number text,
  supplier_order_number text,
  external_url text,
  constraint store_customer_order_meta_length_chk check (
    (external_id is null or char_length(external_id) <= 200)
    and (track_number is null or char_length(track_number) <= 200)
    and (supplier_order_number is null or char_length(supplier_order_number) <= 200)
    and (external_url is null or char_length(external_url) <= 200)
  ),
  constraint store_customer_order_meta_url_chk check (
    external_url is null or external_url ~* '^https?://[^[:space:]]+$'
  )
);

comment on table public.store_customer_order_meta is
  'Учётные поля заказа клиента. Видит и правит только менеджер. Не связаны с удалёнными accounting_number и accounting_url.';

comment on column public.store_customer_order_meta.external_id is
  'ID в системе учёта. Не длиннее 200 символов.';

comment on column public.store_customer_order_meta.track_number is
  'Номер отслеживания. Не длиннее 200 символов.';

comment on column public.store_customer_order_meta.supplier_order_number is
  'Номер заказа поставщика. Не длиннее 200 символов.';

comment on column public.store_customer_order_meta.external_url is
  'Ссылка в системе учёта: только http:// или https://, не длиннее 200 символов.';

do $$
declare
  t text;
begin
  foreach t in array array['store_customer_order_client_delivery', 'store_customer_order_meta']
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

-- ---------------------------------------------------------------------------
-- «Изменён»: now() на документе при правке перечисленных таблиц
-- ---------------------------------------------------------------------------

create or replace function public.store_touch_document_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_row jsonb;
  v_id bigint;
begin
  if tg_table_name = 'store_document' then
    new.updated_at := now();
    return new;
  end if;

  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := case tg_table_name
    when 'store_customer_order' then (v_row ->> 'id')::bigint
    when 'store_document_product_line' then (v_row ->> 'document_id')::bigint
    when 'store_order_money' then (v_row ->> 'document_id')::bigint
    when 'store_order_payment' then (v_row ->> 'document_id')::bigint
    when 'store_document_file' then (v_row ->> 'document_id')::bigint
    when 'store_customer_order_client_delivery' then (v_row ->> 'order_id')::bigint
    when 'store_customer_order_meta' then (v_row ->> 'order_id')::bigint
    else null
  end;

  if v_id is not null then
    update public.store_document
    set updated_at = now()
    where id = v_id;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$f$;

comment on function public.store_touch_document_updated_at() is
  'Ставит store_document.updated_at = now() при insert/update/delete документа и связанных строк, денег, платежей, файлов, доставки клиента и метаданных. Смена только updated_at историю lifecycle не пишет.';

create trigger store_document_touch_updated_at
  before insert or update of description, status, expected_end_on
  on public.store_document
  for each row execute function public.store_touch_document_updated_at();

create trigger store_customer_order_touch_updated_at
  after insert or update or delete on public.store_customer_order
  for each row execute function public.store_touch_document_updated_at();

create trigger store_document_product_line_touch_updated_at
  after insert or update or delete on public.store_document_product_line
  for each row execute function public.store_touch_document_updated_at();

create trigger store_order_money_touch_updated_at
  after insert or update or delete on public.store_order_money
  for each row execute function public.store_touch_document_updated_at();

create trigger store_order_payment_touch_updated_at
  after insert or update or delete on public.store_order_payment
  for each row execute function public.store_touch_document_updated_at();

create trigger store_document_file_touch_updated_at
  after insert or update or delete on public.store_document_file
  for each row execute function public.store_touch_document_updated_at();

create trigger store_customer_order_client_delivery_touch_updated_at
  after insert or update or delete on public.store_customer_order_client_delivery
  for each row execute function public.store_touch_document_updated_at();

create trigger store_customer_order_meta_touch_updated_at
  after insert or update or delete on public.store_customer_order_meta
  for each row execute function public.store_touch_document_updated_at();

revoke all on function public.store_touch_document_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Команды
-- ---------------------------------------------------------------------------

create or replace function public.store_set_customer_order_client_delivery(
  p_order_id bigint,
  p_payment_status text,
  p_invoice_amount numeric,
  p_invoice_currency_code text,
  p_paid_amount numeric,
  p_paid_currency_code text,
  p_due_on date
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text := nullif(btrim(coalesce(p_payment_status, '')), '');
  v_invoice_amount numeric := p_invoice_amount;
  v_paid_amount numeric := p_paid_amount;
  v_invoice_code text := nullif(upper(btrim(coalesce(p_invoice_currency_code, ''))), '');
  v_paid_code text := nullif(upper(btrim(coalesce(p_paid_currency_code, ''))), '');
  v_invoice_currency bigint;
  v_paid_currency bigint;
begin
  if not exists (
    select 1
    from public.store_customer_order o
    join public.store_document d on d.id = o.id
    where o.id = p_order_id and d.kind = 'customer_order'
  ) then
    raise exception 'Заказ клиента % не найден', p_order_id;
  end if;
  if v_status is not null and v_status not in ('awaiting_invoice', 'pending_payment', 'paid') then
    raise exception 'Неизвестный статус оплаты доставки';
  end if;

  if v_invoice_amount is null then
    v_invoice_code := null;
  elsif v_invoice_amount < 0 then
    raise exception 'Сумма не может быть отрицательной';
  elsif v_invoice_code is null then
    raise exception 'Укажите валюту инвойса';
  else
    select c.id into v_invoice_currency
    from public.store_currency c
    where c.code = v_invoice_code and c.deleted_at is null
    order by c.id
    limit 1;
    if v_invoice_currency is null then
      raise exception 'Валюта % не найдена', v_invoice_code;
    end if;
    v_invoice_amount := round(v_invoice_amount, 4);
  end if;

  if v_paid_amount is null then
    v_paid_code := null;
  elsif v_paid_amount < 0 then
    raise exception 'Сумма не может быть отрицательной';
  elsif v_paid_code is null then
    raise exception 'Укажите валюту оплаты';
  else
    select c.id into v_paid_currency
    from public.store_currency c
    where c.code = v_paid_code and c.deleted_at is null
    order by c.id
    limit 1;
    if v_paid_currency is null then
      raise exception 'Валюта % не найдена', v_paid_code;
    end if;
    v_paid_amount := round(v_paid_amount, 4);
  end if;

  insert into public.store_customer_order_client_delivery (
    order_id, payment_status, invoice_amount, invoice_currency_id, paid_amount, paid_currency_id, due_on
  ) values (
    p_order_id, v_status, v_invoice_amount, v_invoice_currency, v_paid_amount, v_paid_currency, p_due_on
  )
  on conflict (order_id) do update set
    payment_status = excluded.payment_status,
    invoice_amount = excluded.invoice_amount,
    invoice_currency_id = excluded.invoice_currency_id,
    paid_amount = excluded.paid_amount,
    paid_currency_id = excluded.paid_currency_id,
    due_on = excluded.due_on;
  return 'ok';
end;
$f$;

create or replace function public.store_set_customer_order_meta(
  p_order_id bigint,
  p_external_id text,
  p_track_number text,
  p_supplier_order_number text,
  p_external_url text
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_external_id text := nullif(btrim(coalesce(p_external_id, ''), E' \t\r\n'), '');
  v_track text := nullif(btrim(coalesce(p_track_number, ''), E' \t\r\n'), '');
  v_supplier text := nullif(btrim(coalesce(p_supplier_order_number, ''), E' \t\r\n'), '');
  v_url text := nullif(btrim(coalesce(p_external_url, ''), E' \t\r\n'), '');
begin
  if not exists (
    select 1
    from public.store_customer_order o
    join public.store_document d on d.id = o.id
    where o.id = p_order_id and d.kind = 'customer_order'
  ) then
    raise exception 'Заказ клиента % не найден', p_order_id;
  end if;
  if char_length(coalesce(v_external_id, '')) > 200
     or char_length(coalesce(v_track, '')) > 200
     or char_length(coalesce(v_supplier, '')) > 200
     or char_length(coalesce(v_url, '')) > 200 then
    raise exception 'Не длиннее 200 символов';
  end if;
  if v_url is not null and v_url !~* '^https?://[^[:space:]]+$' then
    raise exception 'Ссылка должна начинаться с http:// или https://';
  end if;

  insert into public.store_customer_order_meta (
    order_id, external_id, track_number, supplier_order_number, external_url
  ) values (
    p_order_id, v_external_id, v_track, v_supplier, v_url
  )
  on conflict (order_id) do update set
    external_id = excluded.external_id,
    track_number = excluded.track_number,
    supplier_order_number = excluded.supplier_order_number,
    external_url = excluded.external_url;
  return 'ok';
end;
$f$;

create or replace function public.store_customer_order_extras(p_order_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $f$
declare
  v_updated timestamptz;
  v_delivery jsonb;
  v_meta jsonb;
begin
  select d.updated_at into v_updated
  from public.store_document d
  join public.store_customer_order o on o.id = d.id
  where d.id = p_order_id and d.kind = 'customer_order';
  if v_updated is null then
    raise exception 'Заказ клиента % не найден', p_order_id;
  end if;

  select jsonb_build_object(
    'payment_status', c.payment_status,
    'invoice_amount', c.invoice_amount,
    'invoice_currency_code', ic.code,
    'paid_amount', c.paid_amount,
    'paid_currency_code', pc.code,
    'due_on', c.due_on
  )
  into v_delivery
  from public.store_customer_order_client_delivery c
  left join public.store_currency ic on ic.id = c.invoice_currency_id
  left join public.store_currency pc on pc.id = c.paid_currency_id
  where c.order_id = p_order_id;

  select jsonb_build_object(
    'external_id', m.external_id,
    'track_number', m.track_number,
    'supplier_order_number', m.supplier_order_number,
    'external_url', m.external_url
  )
  into v_meta
  from public.store_customer_order_meta m
  where m.order_id = p_order_id;

  return jsonb_build_object(
    'updated_at', v_updated,
    'client_delivery', v_delivery,
    'meta', v_meta
  );
end;
$f$;

revoke all on function public.store_set_customer_order_client_delivery(bigint, text, numeric, text, numeric, text, date) from public, anon, authenticated;
grant execute on function public.store_set_customer_order_client_delivery(bigint, text, numeric, text, numeric, text, date) to anon, authenticated, service_role;
revoke all on function public.store_set_customer_order_meta(bigint, text, text, text, text) from public, anon, authenticated;
grant execute on function public.store_set_customer_order_meta(bigint, text, text, text, text) to anon, authenticated, service_role;
revoke all on function public.store_customer_order_extras(bigint) from public, anon, authenticated;
grant execute on function public.store_customer_order_extras(bigint) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Видимость вкладок
-- ---------------------------------------------------------------------------

insert into public.store_role_visibility (page, element_key, label, manager_visible, customer_visible, sort_order) values
  ('customer_order', 'tab.client_delivery', 'Вкладка: доставка клиента', true, true, 172),
  ('customer_order', 'tab.metadata', 'Вкладка: метаданные', true, false, 174)
on conflict (page, element_key) do update set
  label = excluded.label,
  manager_visible = excluded.manager_visible,
  customer_visible = excluded.customer_visible,
  sort_order = excluded.sort_order;

notify pgrst, 'reload schema';

commit;
