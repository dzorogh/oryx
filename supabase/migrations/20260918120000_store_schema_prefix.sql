-- Rename live logistics_* tables/view/RPC to store_*, collapse product–plant to
-- store_product.manufacturer_id, drop production_activation_status, add Russian comments.

begin;

-- ---------------------------------------------------------------------------
-- 1. Collapse M:N product–plant, drop dead setting column
-- ---------------------------------------------------------------------------
alter table public.logistics_product
  add column if not exists manufacturer_id bigint references public.logistics_manufacturer (id);

update public.logistics_product p
set manufacturer_id = j.manufacturer_id
from public.logistics_product_manufacturer j
where j.product_id = p.id
  and p.manufacturer_id is distinct from j.manufacturer_id;

drop table if exists public.logistics_product_manufacturer;

alter table public.logistics_setting
  drop column if exists production_activation_status;

update public.logistics_setting
set code_prefixes = code_prefixes - 'productManufacturer'
where code_prefixes ? 'productManufacturer';

-- ---------------------------------------------------------------------------
-- 2. Rename tables and the stock-balance view
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'logistics_%'
    order by c.relname
  loop
    execute format(
      'alter table public.%I rename to %I',
      r.relname,
      replace(r.relname, 'logistics_', 'store_')
    );
  end loop;
end $$;

alter table if exists public.logistics_stock_balance rename to store_stock_balance;

-- ---------------------------------------------------------------------------
-- 3. Rename sequences, indexes, constraints
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
      and c.relname like 'logistics_%'
    order by c.relname
  loop
    execute format(
      'alter sequence public.%I rename to %I',
      r.relname,
      replace(r.relname, 'logistics_', 'store_')
    );
  end loop;

  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'i'
      and c.relname like 'logistics_%'
    order by c.relname
  loop
    execute format(
      'alter index public.%I rename to %I',
      r.relname,
      replace(r.relname, 'logistics_', 'store_')
    );
  end loop;

  for r in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conname like 'logistics_%'
    order by conname
  loop
    execute format(
      'alter table %s rename constraint %I to %I',
      r.tbl,
      r.conname,
      replace(r.conname, 'logistics_', 'store_')
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Recreate RLS policies under store_* names
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename like 'store_%'
    order by tablename, policyname
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
      replace(r.policyname, 'logistics_', 'store_'),
      r.tablename
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Rename functions, then rewrite bodies to the new table/function names
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  def text;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'logistics_%'
    order by p.proname
  loop
    execute format(
      'alter function public.%I(%s) rename to %I',
      r.proname,
      r.args,
      replace(r.proname, 'logistics_', 'store_')
    );
  end loop;

  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'store_%'
      and p.prokind = 'f'
  loop
    def := pg_get_functiondef(r.oid);
    def := replace(def, 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION');
    def := replace(def, 'logistics_', 'store_');
    execute def;
  end loop;
end $$;

create or replace function public.store_assert_product_manufactured_at(
  p_product_id bigint,
  p_manufacturer_id bigint
) returns void
language plpgsql
as $$
declare
  v_plant bigint;
begin
  select manufacturer_id into v_plant
  from public.store_product
  where id = p_product_id;

  if v_plant is not null and v_plant is distinct from p_manufacturer_id then
    raise exception 'Product is not manufactured at this plant';
  end if;
end;
$$;

create or replace function public.store_code_kind_key(p_kind text)
returns text
language sql
immutable
as $$
  select case p_kind
    when 'customer_order' then 'customerOrder'
    when 'production_order' then 'productionOrder'
    when 'reservation_release' then 'reservationRelease'
    when 'customer_order_line' then 'customerOrderLine'
    when 'production_order_line' then 'productionOrderLine'
    when 'reservation_line' then 'reservationLine'
    when 'reservation_release_line' then 'reservationReleaseLine'
    when 'transfer_line' then 'transferLine'
    when 'transfer_allocation' then 'transferAllocation'
    when 'shipment_line' then 'shipmentLine'
    when 'output_line' then 'outputLine'
    when 'output_allocation' then 'outputAllocation'
    when 'return_line' then 'returnLine'
    when 'stock_transaction' then 'stockTransaction'
    else p_kind
  end;
$$;

create or replace function public.store_code(p_kind text, p_id bigint)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(
      (
        select s.code_prefixes ->> public.store_code_kind_key(p_kind)
        from public.store_setting s
        order by s.id
        limit 1
      ),
      ''
    ),
    case p_kind
      when 'product' then 'PRD'
      when 'manufacturer' then 'PLT'
      when 'warehouse' then 'WH'
      when 'customer_order' then 'OMS'
      when 'production_order' then 'PO'
      when 'reservation' then 'RSV'
      when 'reservation_release' then 'REL'
      when 'transfer' then 'TR'
      when 'shipment' then 'SHP'
      when 'output' then 'OUT'
      when 'return' then 'RET'
      when 'customer_order_line' then 'COL'
      when 'production_order_line' then 'POL'
      when 'reservation_line' then 'RSVL'
      when 'reservation_release_line' then 'RELL'
      when 'transfer_line' then 'TRL'
      when 'transfer_allocation' then 'TRA'
      when 'shipment_line' then 'SHL'
      when 'output_line' then 'OUTL'
      when 'output_allocation' then 'OUA'
      when 'return_line' then 'RETL'
      when 'stock_transaction' then 'TXN'
      when 'setting' then 'SET'
      else p_kind
    end
  ) || '-' || p_id::text;
$$;

-- ---------------------------------------------------------------------------
-- 6. Recreate view SQL against store_stock_transaction; rename triggers
-- ---------------------------------------------------------------------------
create or replace view public.store_stock_balance as
select
  product_id,
  location_type,
  location_id,
  stock_state,
  customer_order_id,
  customer_order_line_id,
  sum(quantity) as quantity
from public.store_stock_transaction
group by product_id, location_type, location_id, stock_state, customer_order_id, customer_order_line_id
having abs(sum(quantity)) > 0.0000001;

do $$
declare
  r record;
begin
  for r in
    select t.tgname, t.tgrelid::regclass as tbl
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = 'public'
      and t.tgname like 'logistics_%'
  loop
    execute format(
      'alter trigger %I on %s rename to %I',
      r.tgname,
      r.tbl,
      replace(r.tgname, 'logistics_', 'store_')
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Grants on renamed objects
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'v')
      and c.relname like 'store_%'
  loop
    if r.relkind = 'v' then
      execute format(
        'grant select on table public.%I to anon, authenticated, service_role',
        r.relname
      );
    else
      execute format(
        'grant select, insert, update, delete on table public.%I to anon, authenticated, service_role',
        r.relname
      );
    end if;
  end loop;

  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
      and c.relname like 'store_%'
  loop
    execute format(
      'grant usage, select on sequence public.%I to anon, authenticated, service_role',
      r.relname
    );
  end loop;

  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'store_%'
  loop
    execute format(
      'grant execute on function public.%I(%s) to anon, authenticated, service_role',
      r.proname,
      r.args
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Russian comments on every store_* table, view and column
-- ---------------------------------------------------------------------------
create temporary table store_schema_comments (
  obj text not null,
  col text,
  descr text not null
);

insert into store_schema_comments (obj, col, descr) values
  ('store_product', null, 'Товар каталога Store: одна запись на SKU, тот же id в документах логистики. Отображаемый код PREFIX-id не хранится.'),
  ('store_product', 'id', 'Целочисленный identity PK. URL и код товара строятся из этого id.'),
  ('store_product', 'sku', 'Артикул. Уникален.'),
  ('store_product', 'name', 'Название товара для каталога и документов.'),
  ('store_product', 'unit', 'Единица учёта остатков и строк документов, обычно pcs.'),
  ('store_product', 'image_url', 'Фото из Корпортала (Spatie medium). Пусто — в UI плейсхолдер, не Unsplash.'),
  ('store_product', 'dealer_price', 'Дилерская цена. NULL — UI считает демо-цену на клиенте.'),
  ('store_product', 'retail_price', 'Розничная цена. NULL — UI считает демо-цену на клиенте.'),
  ('store_product', 'category', 'Категория каталога. NULL — клиент выводит по эвристике из SKU/имени.'),
  ('store_product', 'family', 'Семейство каталога. NULL — клиент выводит по эвристике из имени.'),
  ('store_product', 'manufacturer_id', 'Необязательный завод. NULL — заказ на производство на любом заводе; если задан — только этот завод. Второй завод писать некуда: это не M:N.'),

  ('store_manufacturer', null, 'Завод. Ровно один склад завода; код PREFIX-id не хранится.'),
  ('store_manufacturer', 'id', 'Целочисленный identity PK, код PLT-id.'),
  ('store_manufacturer', 'name', 'Юридическое/полное название. Вне справочника в UI показывают только автокод.'),
  ('store_manufacturer', 'warehouse_id', 'Склад этого завода. Уникален: у завода ровно один склад.'),

  ('store_warehouse', null, 'Склад. Может быть общим/РЦ или складом завода. Код PREFIX-id не хранится.'),
  ('store_warehouse', 'id', 'Целочисленный identity PK, код WH-id.'),
  ('store_warehouse', 'name', 'Название склада. Вне справочника в UI показывают только автокод.'),
  ('store_warehouse', 'manufacturer_id', 'NULL — общий склад/РЦ; иначе склад этого завода. Не копия кода завода.'),

  ('store_setting', null, 'Настройки Store: живые префиксы кодов документов. Одна служебная строка.'),
  ('store_setting', 'id', 'PK строки настроек. В демо всегда 1.'),
  ('store_setting', 'code_prefixes', 'JSON ключ kind → префикс (OMS, PO, RSV, …). Коды документов из PREFIX-id, сами коды не хранятся.'),

  ('store_customer_order', null, 'Заказ клиента. Сам остатки не меняет: задаёт потребность и потолок брони. Код OMS-id не хранится.'),
  ('store_customer_order', 'id', 'Целочисленный identity PK, код OMS-id.'),
  ('store_customer_order', 'status', 'open — заказ исполняется; closed — закрыт, новые брони не открывают.'),
  ('store_customer_order', 'created_at', 'Момент создания.'),
  ('store_customer_order', 'closed_at', 'Момент закрытия. NULL пока status = open.'),
  ('store_customer_order', 'expected_end_on', 'Ожидаемая дата окончания, ставит менеджер вручную. Не считается из документов, правится в любой момент.'),
  ('store_customer_order', 'description', 'Свободный комментарий к заказу. Пустая строка, если не задан.'),

  ('store_customer_order_line', null, 'Строка заказа: товар и заказанное количество. Код COL-id не хранится.'),
  ('store_customer_order_line', 'id', 'Целочисленный identity PK.'),
  ('store_customer_order_line', 'order_id', 'Заказ-владелец.'),
  ('store_customer_order_line', 'product_id', 'Товар строки.'),
  ('store_customer_order_line', 'quantity', 'Заказано. Должно быть > 0.'),

  ('store_production_order', null, 'Заказ на производство: место и план, не назначение клиентского заказа. После создания количество сразу в производственном наличии. Код PO-id не хранится.'),
  ('store_production_order', 'id', 'Целочисленный identity PK, код PO-id.'),
  ('store_production_order', 'manufacturer_id', 'Завод, где производится. Assert сверяет с store_product.manufacturer_id.'),
  ('store_production_order', 'status', 'workflow: draft / planned / in_progress / done / closed / cancelled. Остатки двигает активация и выпуск, не смена статуса.'),
  ('store_production_order', 'created_at', 'Момент создания.'),
  ('store_production_order', 'closed_at', 'Момент закрытия. NULL пока заказ не closed.'),
  ('store_production_order', 'expected_end_on', 'Ожидаемая дата окончания, ставит менеджер вручную.'),

  ('store_production_order_line', null, 'Строка заказа на производство. Код POL-id не хранится.'),
  ('store_production_order_line', 'id', 'Целочисленный identity PK. Место остатка production_order_line.'),
  ('store_production_order_line', 'order_id', 'Заказ на производство.'),
  ('store_production_order_line', 'product_id', 'Товар строки.'),
  ('store_production_order_line', 'quantity', 'План. Должно быть > 0.'),
  ('store_production_order_line', 'activated_quantity', 'Уже выведено в свободное производственное наличие. Активация при создании PO не зависит от удалённой колонки setting.'),

  ('store_reservation', null, 'Единое бронирование Reservation: reserve или release. После posted неизменяемо: нет cancelled и нет сторно. Код RSV-id не хранится.'),
  ('store_reservation', 'id', 'Целочисленный identity PK, код RSV-id.'),
  ('store_reservation', 'customer_order_id', 'Заказ, чей claim двигаем. Один документ = один заказ.'),
  ('store_reservation', 'location_type', 'Место в заголовке: warehouse / production_order_line / transfer.'),
  ('store_reservation', 'location_id', 'id места: склад, строка PO или перемещение в пути.'),
  ('store_reservation', 'operation', 'reserve — занять свободное заказом; release — вернуть занятое в свободное.'),
  ('store_reservation', 'status', 'draft или posted. Posted нельзя править и удалять.'),
  ('store_reservation', 'origin', 'manual — человек; order_close — закрытие заказа.'),
  ('store_reservation', 'note', 'Комментарий. Пустая строка, если не задан.'),
  ('store_reservation', 'created_at', 'Момент создания черновика.'),
  ('store_reservation', 'posted_at', 'Момент проведения. Обязателен при status = posted.'),

  ('store_reservation_line', null, 'Строка Reservation: положительное количество по строке заказа. Код RSVL-id не хранится.'),
  ('store_reservation_line', 'id', 'Целочисленный identity PK.'),
  ('store_reservation_line', 'reservation_id', 'Документ Reservation.'),
  ('store_reservation_line', 'customer_order_line_id', 'Строка заказа. Должна принадлежать заказу из заголовка.'),
  ('store_reservation_line', 'quantity', 'Количество. Должно быть > 0.'),

  ('store_transfer', null, 'Перемещение между складами. Не назначает заказ: занятое можно снять со склада отправления, свободное едет свободным. draft → sent → delivered, без частичных приёмок. Код TR-id не хранится.'),
  ('store_transfer', 'id', 'Целочисленный identity PK, код TR-id. Пока sent, место transfer ведёт себя как склад.'),
  ('store_transfer', 'from_warehouse_id', 'Склад отправления. Не равен складу назначения.'),
  ('store_transfer', 'to_warehouse_id', 'Склад назначения.'),
  ('store_transfer', 'status', 'draft / sent / delivered / cancelled.'),
  ('store_transfer', 'created_at', 'Момент создания черновика.'),
  ('store_transfer', 'sent_at', 'Момент отправки. NULL пока draft.'),
  ('store_transfer', 'cancelled_at', 'Момент отмены. NULL если не cancelled.'),
  ('store_transfer', 'expected_end_on', 'Ожидаемая дата окончания, ставит менеджер вручную.'),

  ('store_transfer_line', null, 'Строка перемещения: товар и количество. Код TRL-id не хранится.'),
  ('store_transfer_line', 'id', 'Целочисленный identity PK.'),
  ('store_transfer_line', 'transfer_id', 'Перемещение.'),
  ('store_transfer_line', 'product_id', 'Товар.'),
  ('store_transfer_line', 'quantity', 'Количество. Должно быть > 0.'),

  ('store_transfer_allocation', null, 'Какой уже занятый кусок снимаем со склада при отправке. Свободное едет без allocation. Код TRA-id не хранится.'),
  ('store_transfer_allocation', 'id', 'Целочисленный identity PK.'),
  ('store_transfer_allocation', 'line_id', 'Строка перемещения.'),
  ('store_transfer_allocation', 'customer_order_id', 'Заказ, чей резерв едет.'),
  ('store_transfer_allocation', 'customer_order_line_id', 'Строка заказа.'),
  ('store_transfer_allocation', 'quantity', 'Количество резерва. Должно быть > 0.'),

  ('store_shipment', null, 'Отгрузка: один заказ + один склад, только из занятого. Код SHP-id не хранится.'),
  ('store_shipment', 'id', 'Целочисленный identity PK, код SHP-id.'),
  ('store_shipment', 'customer_order_id', 'Заказ отгрузки.'),
  ('store_shipment', 'warehouse_id', 'Склад, с которого отгружаем занятое.'),
  ('store_shipment', 'status', 'draft / posted / cancelled. Сторно журнала только через cancel RPC, не для Reservation.'),
  ('store_shipment', 'created_at', 'Момент создания черновика.'),
  ('store_shipment', 'posted_at', 'Момент проведения.'),
  ('store_shipment', 'cancelled_at', 'Момент отмены.'),

  ('store_shipment_line', null, 'Строка отгрузки. Код SHL-id не хранится.'),
  ('store_shipment_line', 'id', 'Целочисленный identity PK.'),
  ('store_shipment_line', 'shipment_id', 'Отгрузка.'),
  ('store_shipment_line', 'customer_order_line_id', 'Строка заказа.'),
  ('store_shipment_line', 'product_id', 'Товар (денормализация строки заказа).'),
  ('store_shipment_line', 'quantity', 'Количество. Должно быть > 0.'),

  ('store_output', null, 'Выпуск с заказа на производство. Planned → Done (+ Cancelled). Остатки двигаются только при Done. «Под заказ» — сахар: сначала обычный RSV, потом выпуск. Код OUT-id не хранится.'),
  ('store_output', 'id', 'Целочисленный identity PK, код OUT-id.'),
  ('store_output', 'production_order_id', 'Заказ на производство, с которого выпускаем.'),
  ('store_output', 'status', 'planned / done / cancelled.'),
  ('store_output', 'created_at', 'Момент создания.'),
  ('store_output', 'done_at', 'Момент проведения Done.'),
  ('store_output', 'cancelled_at', 'Момент отмены.'),
  ('store_output', 'expected_end_on', 'Ожидаемая дата окончания, ставит менеджер вручную.'),

  ('store_output_line', null, 'Строка выпуска. Код OUTL-id не хранится.'),
  ('store_output_line', 'id', 'Целочисленный identity PK.'),
  ('store_output_line', 'output_id', 'Выпуск.'),
  ('store_output_line', 'production_order_line_id', 'Строка PO, с которой списываем производственное наличие.'),
  ('store_output_line', 'product_id', 'Товар.'),
  ('store_output_line', 'quantity', 'Количество. Должно быть > 0.'),

  ('store_output_allocation', null, 'Устаревшая привязка выпуска к строке заказа. Новые выпуски «под заказ» идут через Reservation, не через эту таблицу. Код OUA-id не хранится.'),
  ('store_output_allocation', 'id', 'Целочисленный identity PK.'),
  ('store_output_allocation', 'line_id', 'Строка выпуска.'),
  ('store_output_allocation', 'customer_order_id', 'Заказ.'),
  ('store_output_allocation', 'customer_order_line_id', 'Строка заказа.'),
  ('store_output_allocation', 'quantity', 'Количество. Должно быть > 0.'),

  ('store_return', null, 'Возврат отгрузки на склад. Код RET-id не хранится.'),
  ('store_return', 'id', 'Целочисленный identity PK, код RET-id.'),
  ('store_return', 'shipment_id', 'Отгрузка, которую возвращаем.'),
  ('store_return', 'status', 'draft / posted / cancelled.'),
  ('store_return', 'created_at', 'Момент создания черновика.'),
  ('store_return', 'posted_at', 'Момент проведения.'),
  ('store_return', 'cancelled_at', 'Момент отмены.'),

  ('store_return_line', null, 'Строка возврата. Код RETL-id не хранится.'),
  ('store_return_line', 'id', 'Целочисленный identity PK.'),
  ('store_return_line', 'return_id', 'Возврат.'),
  ('store_return_line', 'shipment_line_id', 'Строка отгрузки.'),
  ('store_return_line', 'quantity', 'Количество. Должно быть > 0.'),

  ('store_stock_transaction', null, 'Неизменяемый журнал товарных движений. Остатки считаются суммой quantity. UI в журнал не пишет — только RPC проведения. Код TXN-id не хранится.'),
  ('store_stock_transaction', 'transaction_id', 'Целочисленный identity PK журнала.'),
  ('store_stock_transaction', 'occurred_at', 'Бизнес-время движения.'),
  ('store_stock_transaction', 'posted_at', 'Время записи в журнал.'),
  ('store_stock_transaction', 'product_id', 'Товар движения.'),
  ('store_stock_transaction', 'unit', 'Единица на момент проводки (копия с товара).'),
  ('store_stock_transaction', 'quantity', 'Знаковое количество: плюс приход на место/состояние, минус расход.'),
  ('store_stock_transaction', 'location_type', 'Тип места: warehouse / production_order_line / transfer / customer_order.'),
  ('store_stock_transaction', 'location_id', 'id места.'),
  ('store_stock_transaction', 'stock_state', 'Состояние остатка: free / reserved / shipped.'),
  ('store_stock_transaction', 'customer_order_id', 'Заказ, если движение в reserved/shipped принадлежит заказу. NULL для свободного.'),
  ('store_stock_transaction', 'customer_order_line_id', 'Строка заказа для claim. NULL для свободного.'),
  ('store_stock_transaction', 'source_type', 'Тип документа-источника: reservation / shipment / shipment_return / production_activation / production_output / production_close / transfer_send / transfer_complete.'),
  ('store_stock_transaction', 'source_id', 'id документа-источника.'),
  ('store_stock_transaction', 'source_line_id', 'id строки источника, если есть.'),
  ('store_stock_transaction', 'operation_id', 'Логическая операция внутри RPC (для трассировки).'),
  ('store_stock_transaction', 'idempotency_key', 'Уникальный ключ. Повторный вызов RPC не создаёт новое движение.'),
  ('store_stock_transaction', 'reverses_transaction_id', 'Сторно: ссылка на исходное движение. Reservation posted не сторнируется.'),

  ('store_stock_balance', null, 'Свёртка журнала: ненулевые остатки по товару, месту, состоянию и заказу. Клиент TS её не читает, считает балансы из журнала.'),
  ('store_stock_balance', 'product_id', 'Товар.'),
  ('store_stock_balance', 'location_type', 'Тип места.'),
  ('store_stock_balance', 'location_id', 'id места.'),
  ('store_stock_balance', 'stock_state', 'free / reserved / shipped.'),
  ('store_stock_balance', 'customer_order_id', 'Заказ claim или NULL для свободного.'),
  ('store_stock_balance', 'customer_order_line_id', 'Строка заказа или NULL.'),
  ('store_stock_balance', 'quantity', 'Сумма журнала. Строки с почти нулём отброшены.');

do $$
declare
  r record;
  is_view boolean;
begin
  for r in select obj, col, descr from store_schema_comments
  loop
    select c.relkind = 'v' into is_view
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = r.obj;

    if r.col is null then
      if is_view then
        execute format('comment on view public.%I is %L', r.obj, r.descr);
      else
        execute format('comment on table public.%I is %L', r.obj, r.descr);
      end if;
    else
      execute format('comment on column public.%I.%I is %L', r.obj, r.col, r.descr);
    end if;
  end loop;
end $$;

do $$
declare
  missing text;
begin
  select string_agg(format('%s', c.relname), ', ' order by c.relname)
  into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_description d on d.objoid = c.oid and d.objsubid = 0
  where n.nspname = 'public'
    and c.relkind in ('r', 'v')
    and c.relname like 'store_%'
    and (d.description is null or length(btrim(d.description)) = 0);

  if missing is not null then
    raise exception 'store objects without comment: %', missing;
  end if;

  select string_agg(format('%s.%s', c.relname, a.attname), ', ' order by c.relname, a.attnum)
  into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  left join pg_description d on d.objoid = c.oid and d.objsubid = a.attnum
  where n.nspname = 'public'
    and c.relkind in ('r', 'v')
    and c.relname like 'store_%'
    and (d.description is null or length(btrim(d.description)) = 0);

  if missing is not null then
    raise exception 'store columns without comment: %', missing;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
