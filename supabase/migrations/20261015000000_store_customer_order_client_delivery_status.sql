-- Доставка клиента: статус самой доставки рядом со статусом её оплаты.

begin;

alter table public.store_customer_order_client_delivery
  add column delivery_status text,
  add constraint store_customer_order_client_delivery_delivery_status_chk
    check (delivery_status is null or delivery_status in ('awaiting_pickup', 'in_transit', 'delivered'));

comment on column public.store_customer_order_client_delivery.delivery_status is
  'awaiting_pickup «Ожидает забора» | in_transit «В пути» | delivered «Доставлено». NULL — не задан.';

drop function public.store_set_customer_order_client_delivery(bigint, text, numeric, text, numeric, text, date);

create function public.store_set_customer_order_client_delivery(
  p_order_id bigint,
  p_payment_status text,
  p_invoice_amount numeric,
  p_invoice_currency_code text,
  p_paid_amount numeric,
  p_paid_currency_code text,
  p_due_on date,
  p_delivery_status text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text := nullif(btrim(coalesce(p_payment_status, '')), '');
  v_delivery_status text := nullif(btrim(coalesce(p_delivery_status, '')), '');
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
  if v_delivery_status is not null and v_delivery_status not in ('awaiting_pickup', 'in_transit', 'delivered') then
    raise exception 'Неизвестный статус доставки';
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
    order_id, delivery_status, payment_status, invoice_amount, invoice_currency_id, paid_amount, paid_currency_id, due_on
  ) values (
    p_order_id, v_delivery_status, v_status, v_invoice_amount, v_invoice_currency, v_paid_amount, v_paid_currency, p_due_on
  )
  on conflict (order_id) do update set
    delivery_status = excluded.delivery_status,
    payment_status = excluded.payment_status,
    invoice_amount = excluded.invoice_amount,
    invoice_currency_id = excluded.invoice_currency_id,
    paid_amount = excluded.paid_amount,
    paid_currency_id = excluded.paid_currency_id,
    due_on = excluded.due_on;
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
    'delivery_status', c.delivery_status,
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

revoke all on function public.store_set_customer_order_client_delivery(bigint, text, numeric, text, numeric, text, date, text) from public, anon, authenticated;
grant execute on function public.store_set_customer_order_client_delivery(bigint, text, numeric, text, numeric, text, date, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
