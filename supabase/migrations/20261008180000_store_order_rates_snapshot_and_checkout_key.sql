-- Курсы нового заказа сливаются в его снимок денег, справочник store_currency не меняется.
-- Повтор оформления с тем же ключом возвращает уже созданный заказ.

begin;

create or replace function public.store_merge_order_rates(p_document_id bigint, p_rates jsonb)
returns void
language plpgsql
set search_path = public
as $f$
declare
  v_code text;
  v_raw jsonb;
  v_rate numeric;
  v_next jsonb;
  v_currency_code text;
begin
  if p_rates is null or jsonb_typeof(p_rates) <> 'object' then
    return;
  end if;

  select m.rates, c.code into v_next, v_currency_code
  from public.store_order_money m
  join public.store_currency c on c.id = m.currency_id
  where m.document_id = p_document_id
  for update of m;

  if not found then
    raise exception 'Деньги заказа % не найдены', p_document_id;
  end if;

  for v_code, v_raw in select key, value from jsonb_each(p_rates)
  loop
    v_code := upper(v_code);
    if not exists (
      select 1 from public.store_currency
      where code = v_code and deleted_at is null
    ) then
      continue;
    end if;
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
end;
$f$;

comment on function public.store_merge_order_rates(bigint, jsonb) is
  'Сливает переданные курсы в store_order_money.rates уже созданного заказа. Справочник store_currency не трогает. Пустые курсы — снимок триггера остаётся.';

revoke all on function public.store_merge_order_rates(bigint, jsonb) from public, anon, authenticated;

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
  v_id := public.store_create_document(
    'production_order', coalesce(p_description, ''), v_status, p_expected_end_on,
    p_sequence_number, p_id, p_created_at, null
  );
  v_loc := public.store_new_stock_location('production_order');
  insert into public.store_production_order (id, plant_id, stock_location_id)
  values (v_id, p_plant_id, v_loc);
  perform public.store_merge_order_rates(v_id, p_rates);
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
  perform public.store_merge_order_rates(v_id, p_rates);

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

alter table public.store_customer_order
  add column if not exists checkout_key text;

comment on column public.store_customer_order.checkout_key is
  'Ключ идемпотентности оформления из корзины. Повтор с тем же ключом возвращает этот заказ и не создаёт второй. NULL у заказов вне оформления.';

create unique index if not exists store_customer_order_checkout_key_uidx
  on public.store_customer_order (checkout_key)
  where checkout_key is not null;

drop function if exists public.store_checkout_customer_order(bigint, text, bigint, jsonb, jsonb, text);

create or replace function public.store_checkout_customer_order(
  p_region_id bigint,
  p_source_kind text,
  p_source_id bigint,
  p_lines jsonb default '[]'::jsonb,
  p_rates jsonb default null,
  p_description text default '',
  p_checkout_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint := null;
  v_loc bigint;
  v_owner bigint;
  e jsonb;
  v_line_id bigint;
  v_variant bigint;
  v_plant bigint;
  v_price numeric;
  v_qty numeric;
  v_percent numeric;
  v_dealer_status text;
  v_region_active boolean;
  v_hub_warehouse_id bigint;
  v_key text := nullif(btrim(coalesce(p_checkout_key, '')), '');
begin
  if v_key is not null then
    select co.id into v_id
    from public.store_customer_order co
    where co.checkout_key = v_key;
  end if;

  if v_id is null then
    select r.active, r.hub_warehouse_id
    into v_region_active, v_hub_warehouse_id
    from public.store_region r
    where r.id = p_region_id and r.deleted_at is null;
    if not found then
      raise exception 'Регион % не найден', p_region_id;
    end if;
    if not v_region_active then
      raise exception 'Регион % не активен', p_region_id;
    end if;
    if p_source_kind is null or p_source_kind not in ('plant', 'hub') then
      raise exception 'Источник заказа — производственная площадка или склад региона';
    end if;
    if p_source_kind = 'plant' then
      if not exists (select 1 from public.store_plant where id = p_source_id and deleted_at is null) then
        raise exception 'Площадка % не найдена', p_source_id;
      end if;
    elsif p_source_kind = 'hub' then
      if p_source_id is distinct from v_hub_warehouse_id then
        raise exception 'Склад не относится к региону';
      end if;
      if not exists (
        select 1 from public.store_warehouse
        where id = p_source_id and deleted_at is null and kind = 'hub'
      ) then
        raise exception 'Склад-хаб % не найден', p_source_id;
      end if;
    end if;

    if jsonb_typeof(coalesce(p_lines, '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0
    then
      raise exception 'Нужна хотя бы одна строка заказа';
    end if;

    begin
      v_id := public.store_create_document(
        'customer_order', coalesce(p_description, ''), 'draft', null,
        null, null, null, null
      );
      v_loc := public.store_new_stock_location('customer_order');
      v_owner := public.store_new_stock_owner('customer_order');
      insert into public.store_customer_order (
        id, region_id, stock_location_id, stock_owner_id,
        source_kind, source_plant_id, source_warehouse_id, checkout_key
      ) values (
        v_id, p_region_id, v_loc, v_owner,
        p_source_kind,
        case when p_source_kind = 'plant' then p_source_id else null end,
        case when p_source_kind = 'hub' then p_source_id else null end,
        v_key
      );
      perform public.store_merge_order_rates(v_id, p_rates);

      for e in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
      loop
        v_variant := (e->>'product_variant_id')::bigint;
        if not exists (
          select 1 from public.store_product_variant
          where id = v_variant and deleted_at is null
        ) then
          raise exception 'Вариант % не найден', v_variant;
        end if;
        if p_source_kind = 'plant' then
          select plant_id into v_plant from public.store_product_variant where id = v_variant;
          if v_plant is distinct from p_source_id then
            raise exception 'Товар не выпускается выбранной площадкой';
          end if;
        end if;
        v_qty := (e->>'quantity')::numeric;
        if v_qty is null or v_qty <= 0 then
          raise exception 'Количество должно быть больше нуля';
        end if;

        select p.unit_price into v_price
        from public.store_resolve_line_price('customer_order', v_variant, p_region_id) p;
        select s.dealer_status into v_dealer_status
        from public.store_product_region_status s
        where s.product_variant_id = v_variant and s.region_id = p_region_id;
        if v_dealer_status is distinct from 'available' then
          raise exception 'Товар временно недоступен для заказа.';
        end if;
        if v_price is null then
          raise exception 'Для товара не задана дилерская цена.';
        end if;
        if p_source_kind = 'hub' then
          select c.percent into v_percent
          from public.store_product_supply_cost c
          where c.product_variant_id = v_variant and c.region_id = p_region_id;
          v_percent := coalesce(v_percent, 0);
          v_price := round(v_price + round(v_price * v_percent / 100, 2), 2);
        else
          v_price := round(v_price, 2);
        end if;

        v_line_id := public.store_insert_line(
          v_id, v_variant, v_qty, null, null, v_price
        );
      end loop;
    exception
      when unique_violation then
        v_id := null;
        if v_key is not null then
          select co.id into v_id
          from public.store_customer_order co
          where co.checkout_key = v_key;
        end if;
        if v_id is null then
          raise;
        end if;
    end;
  end if;

  return (
    select jsonb_build_object(
      'id', v_id,
      'lines', coalesce((
        select jsonb_agg(l.id order by l.id)
        from public.store_document_product_line l
        where l.document_id = v_id
      ), '[]'::jsonb),
      'number_prefix', coalesce(
        (select number_prefix from public.store_code_prefix where entity = 'customer_order'),
        'OMS'
      ),
      'sequence_number', d.sequence_number
    )
    from public.store_document d
    where d.id = v_id
  );
end;
$f$;

comment on function public.store_checkout_customer_order(bigint, text, bigint, jsonb, jsonb, text, text) is
  'Черновик заказа клиента из корзины. Цена строки — дилерская региона (для хаба плюс расходы на поставку), unit_price клиента игнорируется. Курсы пишутся только в снимок заказа. p_checkout_key возвращает уже созданный заказ.';

revoke all on function public.store_checkout_customer_order(bigint, text, bigint, jsonb, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.store_checkout_customer_order(bigint, text, bigint, jsonb, jsonb, text, text)
  to anon, authenticated, service_role;

drop function if exists public.store_apply_currency_rates(jsonb);

notify pgrst, 'reload schema';

commit;
