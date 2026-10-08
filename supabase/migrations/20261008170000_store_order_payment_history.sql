-- Автор платежа и полная история: создание и каждое изменение статуса, срока или суммы.
-- Событие по-прежнему живёт в store_order_payment_event и переживает удаление платежа.

begin;

alter table public.store_order_payment
  add column created_by bigint not null default public.store_current_user_id()
    references public.app_user (id);

comment on column public.store_order_payment.created_by is
  'Автор платежа: store_current_user_id() в момент создания. Имя берётся из app_user.';

alter table public.store_order_payment_event
  add column kind text not null default 'update' check (kind in ('create', 'update')),
  add column prev_status text check (prev_status is null or prev_status in ('planned', 'invoiced', 'paid')),
  add column prev_amount numeric(18, 4),
  add column prev_due_on date,
  add column changed_by bigint not null default public.store_current_user_id()
    references public.app_user (id);

comment on table public.store_order_payment_event is
  'История платежа: создание и каждое изменение статуса, срока или суммы. Пишет только trigger на store_order_payment. payment_id без FK — событие переживает удаление платежа.';

comment on column public.store_order_payment_event.kind is
  'create — платёж создан; update — изменились статус, срок или сумма. Старые строки смены статуса — update.';

comment on column public.store_order_payment_event.prev_status is
  'Статус до изменения. NULL у старого события, записанного до колонки: в окне истории «было» нет.';

comment on column public.store_order_payment_event.changed_by is
  'Автор события: store_current_user_id() в момент записи.';

create or replace function public.store_order_payment_event_writer()
returns trigger
language plpgsql
set search_path = public
as $f$
begin
  if tg_op = 'INSERT' then
    insert into public.store_order_payment_event (
      payment_id, document_id, kind, status, amount, due_on, changed_by
    ) values (
      new.id,
      new.document_id,
      'create',
      new.status,
      new.amount,
      new.due_on,
      store_current_user_id()
    );
    return new;
  end if;

  if new.status is distinct from old.status
     or new.amount is distinct from old.amount
     or new.due_on is distinct from old.due_on then
    insert into public.store_order_payment_event (
      payment_id, document_id, kind, status, amount, due_on,
      prev_status, prev_amount, prev_due_on, changed_by
    ) values (
      new.id,
      new.document_id,
      'update',
      new.status,
      new.amount,
      new.due_on,
      old.status,
      old.amount,
      old.due_on,
      store_current_user_id()
    );
  end if;
  return new;
end;
$f$;

drop trigger if exists store_order_payment_event_trg on public.store_order_payment;

create trigger store_order_payment_event_trg
  after insert or update of status, amount, due_on on public.store_order_payment
  for each row execute function public.store_order_payment_event_writer();

-- Платёж без событий: create на created_at с текущими значениями. У платежа со старым
-- событием статуса исходные значения неизвестны — create не пишем, prev_* остаются NULL.
insert into public.store_order_payment_event (
  payment_id, document_id, kind, status, amount, due_on, changed_at, changed_by
)
select p.id, p.document_id, 'create', p.status, p.amount, p.due_on, p.created_at, p.created_by
from public.store_order_payment p
where not exists (
  select 1 from public.store_order_payment_event e where e.payment_id = p.id
);

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
        'status', p.status,
        'created_at', p.created_at,
        'created_by', p.created_by,
        'history', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kind', e.kind,
            'status', e.status,
            'amount', e.amount,
            'due_on', e.due_on,
            'prev_status', e.prev_status,
            'prev_amount', e.prev_amount,
            'prev_due_on', e.prev_due_on,
            'changed_at', e.changed_at,
            'changed_by', e.changed_by
          ) order by e.changed_at, case when e.kind = 'create' then 0 else 1 end, e.id)
          from store_order_payment_event e
          where e.payment_id = p.id
        ), '[]'::jsonb)
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
        and e.kind = 'update'
        and e.prev_status is distinct from e.status
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

commit;
