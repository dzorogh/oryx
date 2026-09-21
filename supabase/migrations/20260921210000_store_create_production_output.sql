-- Atomic idempotent production output: optional reservation + header + lines + optional complete.

create table public.store_output_request (
  request_key text primary key,
  output_id bigint not null references public.store_output (id),
  created_at timestamptz not null default now()
);

comment on table public.store_output_request is
  'Ключи идемпотентности store_create_production_output. Повтор возвращает тот же выпуск.';

alter table public.store_output_request enable row level security;
create policy store_output_request_open_all
  on public.store_output_request
  for all
  using (true)
  with check (true);
grant select, insert, update, delete on table public.store_output_request
  to anon, authenticated, service_role;

create or replace function public.store_create_production_output(
  p_request_key text,
  p_production_order_id bigint,
  p_production_order_line_id bigint,
  p_product_id bigint,
  p_quantity numeric,
  p_expected_end_on date default null,
  p_complete boolean default true,
  p_allocation_owner_type text default null,
  p_allocation_owner_id bigint default null,
  p_allocation_quantity numeric default null
)
returns jsonb
language plpgsql
as $$
declare
  v_existing bigint;
  v_order public.store_production_order%rowtype;
  v_prod_line public.store_production_order_line%rowtype;
  v_already numeric;
  v_free numeric;
  v_open numeric;
  v_order_line public.store_customer_order_line%rowtype;
  v_alloc_qty numeric;
  v_res_id bigint;
  v_output_id bigint;
begin
  if p_request_key is null or length(btrim(p_request_key)) = 0 then
    raise exception 'Укажите ключ запроса выпуска';
  end if;

  perform pg_advisory_xact_lock(('x' || substr(md5(p_request_key), 1, 16))::bit(64)::bigint);

  select output_id into v_existing
  from public.store_output_request
  where request_key = p_request_key;
  if v_existing is not null then
    return jsonb_build_object('id', v_existing);
  end if;

  if p_production_order_id is null then
    raise exception 'Выберите заказ на производство';
  end if;
  select * into v_order from public.store_production_order where id = p_production_order_id;
  if v_order.id is null then
    raise exception 'Неизвестный заказ на производство %', p_production_order_id;
  end if;
  if v_order.status in ('closed', 'cancelled') then
    raise exception 'Нельзя создать выпуск по закрытому или отменённому заказу';
  end if;

  perform pg_advisory_xact_lock(
    ('x' || substr(md5('store_production_order:' || p_production_order_id::text), 1, 16))::bit(64)::bigint
  );

  if p_production_order_line_id is null or p_product_id is null then
    raise exception 'Выберите строку заказа на производство и товар';
  end if;
  if coalesce(p_quantity, 0) <= 0 then
    raise exception 'Количество должно быть больше нуля';
  end if;

  select * into v_prod_line
  from public.store_production_order_line
  where id = p_production_order_line_id;
  if v_prod_line.id is null then
    raise exception 'Неизвестная строка заказа на производство %', p_production_order_line_id;
  end if;
  if v_prod_line.order_id is distinct from p_production_order_id then
    raise exception 'Строка не принадлежит заказу на производство';
  end if;
  if v_prod_line.product_id is distinct from p_product_id then
    raise exception 'Товар выпуска должен совпадать со строкой заказа';
  end if;

  select coalesce(sum(ol.quantity), 0) into v_already
  from public.store_output_line ol
  join public.store_output o on o.id = ol.output_id
  where ol.production_order_line_id = p_production_order_line_id
    and o.status = 'done';
  if v_already + p_quantity > v_prod_line.quantity then
    raise exception 'Нельзя выпустить больше строки заказа на производство';
  end if;

  v_alloc_qty := coalesce(p_allocation_quantity, 0);
  if v_alloc_qty < 0 then
    raise exception 'Количество должно быть больше нуля';
  end if;
  if v_alloc_qty > p_quantity then
    raise exception 'Занятое количество не может превышать выпуск';
  end if;

  if v_alloc_qty > 0 then
    if p_allocation_owner_type is null or p_allocation_owner_id is null then
      raise exception 'Назначение остатка должно быть полным';
    end if;
    if p_allocation_owner_type is distinct from 'order' then
      raise exception 'Выпуск может резервировать только под заказ клиента';
    end if;
    perform public.store_assert_owner(p_allocation_owner_type, p_allocation_owner_id);

    v_free := public.store_qty(
      p_product_id, 'production_order', p_production_order_id, null, null
    );
    if v_alloc_qty > v_free then
      raise exception 'Недостаточно свободного количества';
    end if;

    select * into v_order_line
    from public.store_customer_order_line
    where order_id = p_allocation_owner_id and product_id = p_product_id;
    if v_order_line.id is null then
      raise exception 'В заказе клиента нет этого товара';
    end if;
    if (select status from public.store_customer_order where id = p_allocation_owner_id) is distinct from 'open' then
      raise exception 'Заказ клиента уже закрыт';
    end if;
    v_open := v_order_line.quantity
      - public.store_shipped_for_owner_product('order', p_allocation_owner_id, p_product_id)
      - public.store_reserved_for_owner_product('order', p_allocation_owner_id, p_product_id);
    if v_alloc_qty > v_open then
      raise exception 'Нельзя зарезервировать больше открытого количества заказа';
    end if;

    insert into public.store_reservation (
      location_type, location_id, to_owner_type, to_owner_id, status, origin, note
    ) values (
      'production_order', p_production_order_id,
      p_allocation_owner_type, p_allocation_owner_id,
      'draft', 'manual', ''
    )
    returning id into v_res_id;

    insert into public.store_reservation_line (
      reservation_id, product_id, quantity, from_owner_type, from_owner_id
    ) values (
      v_res_id, p_product_id, v_alloc_qty, null, null
    );

    perform public.store_post_reservation(v_res_id);
  elsif p_allocation_owner_type is not null or p_allocation_owner_id is not null then
    raise exception 'Назначение остатка должно быть полным';
  end if;

  insert into public.store_output (
    production_order_id, status, expected_end_on
  ) values (
    p_production_order_id, 'planned', p_expected_end_on
  )
  returning id into v_output_id;

  insert into public.store_output_line (
    output_id, production_order_line_id, product_id, quantity
  ) values (
    v_output_id, p_production_order_line_id, p_product_id, p_quantity
  );

  if coalesce(p_complete, true) then
    perform public.store_complete_output(v_output_id);
  end if;

  insert into public.store_output_request (request_key, output_id)
  values (p_request_key, v_output_id);

  return jsonb_build_object('id', v_output_id);
end;
$$;

grant execute on function public.store_create_production_output(
  text, bigint, bigint, bigint, numeric, date, boolean, text, bigint, numeric
) to anon, authenticated, service_role;
