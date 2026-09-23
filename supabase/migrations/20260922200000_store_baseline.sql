-- Canonical Store baseline. Replaces the experimental logistics/store migration chain.
-- thank_you_entry is untouched. Russian COMMENT ON is the technical contract.

begin;

-- ---------------------------------------------------------------------------
-- Drop superseded Store objects (safe on empty DB)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  -- Drop views first
  for r in
    select quote_ident(schemaname) || '.' || quote_ident(viewname) as q
    from pg_views
    where schemaname = 'public' and viewname like 'store_%'
  loop
    execute 'drop view if exists ' || r.q || ' cascade';
  end loop;

  -- Drop Store functions
  for r in
    select n.nspname as nsp, p.proname as name,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'store_%'
  loop
    execute format('drop function if exists %I.%I(%s) cascade', r.nsp, r.name, r.args);
  end loop;

  -- Drop Store tables
  for r in
    select quote_ident(schemaname) || '.' || quote_ident(tablename) as q
    from pg_tables
    where schemaname = 'public' and tablename like 'store_%'
  loop
    execute 'drop table if exists ' || r.q || ' cascade';
  end loop;
end $$;

drop table if exists public.app_user cascade;

-- ---------------------------------------------------------------------------
-- Application user catalog (shared author identity)
-- ---------------------------------------------------------------------------
create table public.app_user (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.app_user is
  'Общий демо-каталог актёров приложения Oryx. На него ссылаются store_document.created_by и store_document_history.changed_by. Login/Auth не используется: браузер работает под anon key, текущий автор берётся как id=1.';

comment on column public.app_user.created_at is
  'Момент создания записи каталога (timestamptz, UTC). После вставки не меняется.';

comment on column public.app_user.id is
  'Первичный ключ пользователя. Независимая identity-последовательность; не совпадает с id документов, мест и владельцев остатка.';

comment on column public.app_user.name is
  'Отображаемое русское имя демо-пользователя в UI и истории. Всегда непустое; уникальность не требуется.';

insert into public.app_user (id, name) overriding system value values (1, 'Демо-пользователь');
select setval(pg_get_serial_sequence('public.app_user', 'id'), greatest((select max(id) from public.app_user), 1));

-- ---------------------------------------------------------------------------
-- Document kind registry
-- ---------------------------------------------------------------------------
create table public.store_document_kind (
  code text primary key,
  number_prefix text not null,
  display_name text not null,
  has_lifecycle boolean not null,
  allowed_statuses text[] not null default '{}'
);

comment on table public.store_document_kind is
  'Реестр видов документов Store. Хранит префикс отображаемого номера, русское название и допустимый lifecycle. Смена number_prefix меняет отображение уже существующих номеров без переписи строк store_document.';

comment on column public.store_document_kind.allowed_statuses is
  'Массив допустимых status для вида из словаря draft|in_progress|done|cancelled. Пустой массив, если has_lifecycle=false. Проверяется guard-ами при смене status.';

comment on column public.store_document_kind.code is
  'Стабильный код вида и PK: customer_order | production_order | reservation | shipment | adjustment | transfer | production_output. Является FK-целью для store_document.kind.';

comment on column public.store_document_kind.display_name is
  'Русское название вида для списков и заголовков. Не участвует в бизнес-логике posting.';

comment on column public.store_document_kind.has_lifecycle is
  'true — у вида есть status на store_document и пишется store_document_history; false — status всегда NULL (reservation, shipment, adjustment), история не создаётся.';

comment on column public.store_document_kind.number_prefix is
  'Буквенный префикс отображаемого номера (OMS, PO, RSV, SHP, ADJ, TR, OUT). Не дублируется в строке документа; UI склеивает prefix-sequence_number.';

insert into public.store_document_kind (code, number_prefix, display_name, has_lifecycle, allowed_statuses) values
  ('customer_order', 'OMS', 'Заказ клиента', true, array['draft','in_progress','done','cancelled']),
  ('production_order', 'PO', 'Заказ на производство', true, array['draft','in_progress','done','cancelled']),
  ('reservation', 'RSV', 'Резерв', false, '{}'),
  ('shipment', 'SHP', 'Отгрузка', false, '{}'),
  ('adjustment', 'ADJ', 'Корректировка', false, '{}'),
  ('transfer', 'TR', 'Перемещение', true, array['draft','in_progress','done','cancelled']),
  ('production_output', 'OUT', 'Выпуск', true, array['draft','in_progress','done','cancelled']);

-- ---------------------------------------------------------------------------
-- Stock location and owner registries
-- ---------------------------------------------------------------------------
create table public.store_stock_location (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('warehouse', 'production_order', 'transfer', 'customer_order')),
  created_at timestamptz not null default now()
);

comment on table public.store_stock_location is
  'Реестр складских мест остатка. Warehouse, production_order, transfer и customer_order получают независимый id здесь; операционные таблицы ссылаются одним location_id FK без polymorphic type/id.';

comment on column public.store_stock_location.created_at is
  'Момент создания записи реестра (UTC). Неизменяем после вставки.';

comment on column public.store_stock_location.id is
  'Первичный ключ места. Отдельная identity-последовательность: не равна id склада/документа. На него ссылаются journal, reservation, shipment и subtype-таблицы.';

comment on column public.store_stock_location.kind is
  'Тип места: warehouse | production_order | transfer | customer_order. Должен соответствовать сущности, владеющей этим id (централизованный assert).';

create table public.store_stock_owner (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('free', 'customer_order', 'region')),
  created_at timestamptz not null default now()
);

comment on table public.store_stock_owner is
  'Реестр владельцев остатка. Свободный остаток — singleton kind=free (обычно id=1); customer_order и region получают независимый owner_id при создании сущности.';

comment on column public.store_stock_owner.created_at is
  'Момент создания записи реестра (UTC). Неизменяем после вставки.';

comment on column public.store_stock_owner.id is
  'Первичный ключ владельца. Отдельная identity-последовательность; обязательный FK во всех фактах журнала и операционных ссылках (NULL больше не означает free).';

comment on column public.store_stock_owner.kind is
  'Тип владельца: free | customer_order | region. Соответствие сущности проверяется централизованно при создании и posting.';

insert into public.store_stock_owner (id, kind) overriding system value values (1, 'free');
select setval(pg_get_serial_sequence('public.store_stock_owner', 'id'), 1);

-- ---------------------------------------------------------------------------
-- Currencies and regions
-- ---------------------------------------------------------------------------
create table public.store_currency (
  id bigint generated always as identity primary key,
  code text not null,
  name text not null,
  numeric_code text,
  minor_units smallint not null default 2 check (minor_units >= 0 and minor_units <= 6),
  deleted_at timestamptz,
  constraint store_currency_active_code_uidx unique (code) -- replaced below by partial
);

comment on table public.store_currency is
  'Справочник валют для каталожных цен и снимков unit_price в строках документов. Soft-delete через deleted_at; физическое удаление запрещено при исторических ссылках.';

comment on column public.store_currency.code is
  'ISO-подобный код (USD, CNY, AED, RUB, …). Уникален среди активных (partial unique WHERE deleted_at IS NULL).';

comment on column public.store_currency.deleted_at is
  'Мягкое удаление: NULL — валюта активна и доступна для новых цен; NOT NULL — скрыта, исторические FK сохраняются. Физический DELETE запрещён триггером.';

comment on column public.store_currency.id is
  'Первичный ключ валюты. На него ссылаются store_product_price.currency_id, default_*_currency_id регионов и store_document_product_line.currency_id.';

comment on column public.store_currency.minor_units is
  'Число знаков после запятой для отображения суммы (обычно 2). amount в ценах хранится numeric(18,4) независимо от этого поля.';

comment on column public.store_currency.name is
  'Русское название валюты для UI справочников. Не влияет на расчёты.';

comment on column public.store_currency.numeric_code is
  'Необязательный числовой код ISO 4217. NULL — не задан; не используется в прототипе для конвертации.';

alter table public.store_currency drop constraint store_currency_active_code_uidx;
create unique index store_currency_code_active_uidx on public.store_currency (code) where deleted_at is null;

create table public.store_region_group (
  id bigint generated always as identity primary key,
  code text not null,
  name text not null,
  sort_order integer not null default 0,
  deleted_at timestamptz
);

comment on table public.store_region_group is
  'Группа регионов для кластеризации в прайс-листах (СНГ, MENA, …). Soft-delete; sort_order задаёт порядок в UI.';

comment on column public.store_region_group.code is
  'Стабильный машинный код группы (cis, mena, …). Уникален среди активных записей.';

comment on column public.store_region_group.deleted_at is
  'Мягкое удаление: NULL — группа активна; NOT NULL — скрыта. Регионы могут продолжать ссылаться на неё.';

comment on column public.store_region_group.id is
  'Первичный ключ группы. Опциональный FK store_region.group_id.';

comment on column public.store_region_group.name is
  'Русское отображаемое название группы в фильтрах и раскрытиях прайс-листа.';

comment on column public.store_region_group.sort_order is
  'Целочисленный порядок сортировки (меньше — выше в списке). Не влияет на бизнес-логику остатков.';

create unique index store_region_group_code_active_uidx on public.store_region_group (code) where deleted_at is null;

create table public.store_region (
  id bigint generated always as identity primary key,
  code text not null,
  name text not null,
  group_id bigint references public.store_region_group (id),
  default_retail_currency_id bigint not null references public.store_currency (id),
  default_dealer_currency_id bigint not null references public.store_currency (id),
  stock_owner_id bigint not null unique references public.store_stock_owner (id),
  active boolean not null default true,
  sort_order integer not null default 0,
  deleted_at timestamptz
);

comment on table public.store_region is
  'Регион продаж. Обязателен у customer_order для фиксации dealer-цены. Имеет собственного stock_owner kind=region и валюты dealer/retail по умолчанию.';

comment on column public.store_region.active is
  'false — регион скрыт в операционных списках и новых заказах, но история и цены сохраняются; true — доступен.';

comment on column public.store_region.code is
  'Стабильный код региона для UI/прайслистов (ae, ru, …). Уникален среди активных; после create может быть обновлён seed-ом.';

comment on column public.store_region.default_dealer_currency_id is
  'FK на store_currency: валюта дилерской цены по умолчанию (часто CNY поставщика). Не запрещает иное currency_id на конкретной цене.';

comment on column public.store_region.default_retail_currency_id is
  'FK на store_currency: валюта розничной цены по умолчанию для региона. Новая retail-цена обычно берёт эту валюту.';

comment on column public.store_region.deleted_at is
  'Мягкое удаление: NULL — запись жива; NOT NULL — скрыта. FK и история сохраняются; физический DELETE запрещён.';

comment on column public.store_region.group_id is
  'FK на store_region_group. NULL — регион без группы (не кластеризуется в прайс-листе).';

comment on column public.store_region.id is
  'Первичный ключ региона. FK-цель для customer_order.region_id, product_price.region_id и product_region_status.region_id.';

comment on column public.store_region.name is
  'Русское название региона. Показывается в справочнике регионов; в остальных экранах чаще используют code.';

comment on column public.store_region.sort_order is
  'Порядок сортировки регионов в UI (меньше — выше).';

comment on column public.store_region.stock_owner_id is
  'FK UNIQUE на store_stock_owner kind=region. Независимая последовательность владельца; используется при региональных резервах.';

create unique index store_region_code_active_uidx on public.store_region (code) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Classification, warehouse, plant, product, variant
-- ---------------------------------------------------------------------------
create table public.store_brand (
  id bigint generated always as identity primary key,
  code text not null,
  name text not null,
  deleted_at timestamptz
);

comment on table public.store_brand is
  'Справочник брендов каталога PIM. Логический товар (store_product) опционально ссылается сюда; soft-delete через deleted_at, код уникален среди активных.';

comment on column public.store_brand.code is
  'Стабильный код бренда для импорта/фильтров. Уникален среди записей с deleted_at IS NULL.';

comment on column public.store_brand.deleted_at is
  'Мягкое удаление: NULL — бренд активен; NOT NULL — скрыт из выбора, но товары могут сохранять ссылку. Физический DELETE запрещён.';

comment on column public.store_brand.id is
  'Первичный ключ бренда. Опциональный FK store_product.brand_id.';

comment on column public.store_brand.name is
  'Отображаемое название бренда в каталоге и фильтрах.';

create unique index store_brand_code_active_uidx on public.store_brand (code) where deleted_at is null;

create table public.store_product_family (
  id bigint generated always as identity primary key,
  code text not null,
  name text not null,
  deleted_at timestamptz
);

comment on table public.store_product_family is
  'Семейство/линейка товаров (Force, Enduro, …). Опциональная классификация store_product; soft-delete.';

comment on column public.store_product_family.code is
  'Стабильный код семейства. Уникален среди активных записей.';

comment on column public.store_product_family.deleted_at is
  'Мягкое удаление: NULL — активно; NOT NULL — скрыто. Исторические ссылки товаров сохраняются.';

comment on column public.store_product_family.id is
  'Первичный ключ семейства. Опциональный FK store_product.family_id.';

comment on column public.store_product_family.name is
  'Отображаемое название семейства в каталоге и фильтрах прайс-листа.';

create unique index store_product_family_code_active_uidx on public.store_product_family (code) where deleted_at is null;

create table public.store_category (
  id bigint generated always as identity primary key,
  code text not null,
  name text not null,
  parent_id bigint references public.store_category (id),
  deleted_at timestamptz
);

comment on table public.store_category is
  'Категория каталога с деревом через parent_id. Связь с товарами — M2M store_product_category.';

comment on column public.store_category.code is
  'Стабильный код категории. Уникален среди активных.';

comment on column public.store_category.deleted_at is
  'Мягкое удаление: NULL — категория активна; NOT NULL — скрыта. Дочерние узлы и M2M могут сохраняться.';

comment on column public.store_category.id is
  'Первичный ключ категории. FK-цель для parent_id и store_product_category.category_id.';

comment on column public.store_category.name is
  'Отображаемое название категории в дереве фильтров каталога.';

comment on column public.store_category.parent_id is
  'FK на родительскую категорию. NULL — корневой узел дерева.';

create unique index store_category_code_active_uidx on public.store_category (code) where deleted_at is null;

create table public.store_warehouse (
  id bigint generated always as identity primary key,
  name text not null,
  stock_location_id bigint not null unique references public.store_stock_location (id),
  deleted_at timestamptz
);

comment on table public.store_warehouse is
  'Склад. Юридическое/операционное имя видно только в справочнике складов; везде снаружи UI показывает код WH-{id}. Имеет ровно одно stock_location kind=warehouse.';

comment on column public.store_warehouse.deleted_at is
  'Мягкое удаление: NULL — склад активен; NOT NULL — скрыт. Физический DELETE запрещён при ссылках.';

comment on column public.store_warehouse.id is
  'Первичный ключ склада. Код UI: WH-{id}. На него ссылается store_plant.warehouse_id и transfer from/to.';

comment on column public.store_warehouse.name is
  'Полное название склада. Показывать только на страницах справочника складов, не в операционных списках.';

comment on column public.store_warehouse.stock_location_id is
  'FK UNIQUE на store_stock_location kind=warehouse. Все факты остатка на складе идут через этот location_id.';

create table public.store_plant (
  id bigint generated always as identity primary key,
  name text not null,
  warehouse_id bigint not null unique references public.store_warehouse (id),
  deleted_at timestamptz
);

comment on table public.store_plant is
  'Завод (plant). Связь со складом односторонняя: warehouse_id NOT NULL UNIQUE (один склад на завод, обратной warehouse.plant_id нет). Имя только в справочнике заводов; снаружи — PLT-{id}.';

comment on column public.store_plant.deleted_at is
  'Мягкое удаление: NULL — завод активен; NOT NULL — скрыт. Варианты и заказы могут сохранять FK.';

comment on column public.store_plant.id is
  'Первичный ключ завода. Код UI: PLT-{id}. FK-цель для store_product_variant.plant_id и store_production_order.plant_id.';

comment on column public.store_plant.name is
  'Название завода. Показывать только в справочнике /store/logistics/plants; в прочих экранах — код PLT-{id}.';

comment on column public.store_plant.warehouse_id is
  'FK UNIQUE NOT NULL на store_warehouse: единственный склад завода, куда ложится выпуск. Обратной ссылки у склада нет.';

create table public.store_product (
  id bigint generated always as identity primary key,
  name text not null,
  brand_id bigint references public.store_brand (id),
  family_id bigint references public.store_product_family (id),
  deleted_at timestamptz
);

comment on table public.store_product is
  'Логический товар каталога. SKU, единица, завод, фото и цены живут на store_product_variant; документы и журнал ссылаются на вариант, не сюда.';

comment on column public.store_product.brand_id is
  'Опциональный FK на store_brand. NULL — бренд не задан.';

comment on column public.store_product.deleted_at is
  'Мягкое удаление: NULL — товар активен; NOT NULL — скрыт. Физический DELETE запрещён при наличии вариантов/истории.';

comment on column public.store_product.family_id is
  'Опциональный FK на store_product_family. NULL — семейство не задано.';

comment on column public.store_product.id is
  'Первичный ключ товара. FK-цель для store_product_variant.product_id и store_product_category.product_id.';

comment on column public.store_product.name is
  'Отображаемое название логического товара. Вариант может иметь своё name; при создании варианта часто копируется отсюда.';

create table public.store_product_category (
  product_id bigint not null references public.store_product (id),
  category_id bigint not null references public.store_category (id),
  primary key (product_id, category_id)
);

comment on table public.store_product_category is
  'Связь many-to-many между логическим товаром и категорией каталога. Составной PK без собственной identity.';

comment on column public.store_product_category.category_id is
  'FK на store_category.id — категория в дереве каталога. Часть составного PK; один товар может иметь несколько категорий.';

comment on column public.store_product_category.product_id is
  'FK на store_product.id — товар, которому назначена категория. Часть составного PK.';

create table public.store_product_variant (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.store_product (id),
  sku text not null,
  name text not null,
  unit text not null default 'шт',
  plant_id bigint references public.store_plant (id),
  image_url text,
  deleted_at timestamptz
);

comment on table public.store_product_variant is
  'Вариант товара: операционная единица каталога. SKU, unit, plant, image; строки документов, цены и факты журнала ссылаются только сюда. Физическое удаление запрещено триггером.';

comment on column public.store_product_variant.deleted_at is
  'Мягкое удаление: NULL — вариант активен для новых документов; NOT NULL — скрыт. Исторические FK в линиях/журнале сохраняются; hard DELETE запрещён.';

comment on column public.store_product_variant.id is
  'Первичный ключ варианта. Используется как product_variant_id во всех линиях, ценах, статусах и store_stock_transaction.';

comment on column public.store_product_variant.image_url is
  'URL фото варианта. NULL — изображения нет. Обычно Корпортал Spatie conversion URL.';

comment on column public.store_product_variant.name is
  'Название варианта (часто совпадает с товаром). Снимается в store_document_product_line.variant_name при добавлении строки.';

comment on column public.store_product_variant.plant_id is
  'Опциональный FK на store_plant — завод-изготовитель. NULL — завод не зафиксирован; тогда production order может выбрать любой завод.';

comment on column public.store_product_variant.product_id is
  'FK NOT NULL на store_product — родительский логический товар. Несколько вариантов могут делить один product_id.';

comment on column public.store_product_variant.sku is
  'Артикул варианта. Уникален среди активных (partial unique WHERE deleted_at IS NULL).';

comment on column public.store_product_variant.unit is
  'Единица измерения количества (шт, кг, …). По умолчанию «шт»; не snapshot-ится в строку документа отдельно от name.';

create unique index store_product_variant_sku_active_uidx on public.store_product_variant (sku) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Pricing
-- ---------------------------------------------------------------------------
create table public.store_product_price (
  id bigint generated always as identity primary key,
  product_variant_id bigint not null references public.store_product_variant (id),
  price_kind text not null check (price_kind in ('purchase', 'dealer', 'retail')),
  region_id bigint references public.store_region (id),
  currency_id bigint not null references public.store_currency (id),
  amount numeric(18, 4) not null check (amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (price_kind = 'purchase' and region_id is null)
    or (price_kind in ('dealer', 'retail') and region_id is not null)
  )
);

comment on table public.store_product_price is
  'Актуальные каталожные цены варианта. purchase — глобальная (region_id NULL); dealer/retail — региональные. История прайса не ведётся: использованная цена фиксируется в document line. active=false выводит цену из выбора без удаления строки.';

comment on column public.store_product_price.active is
  'true — цена участвует в выборе для новых документов/UI; false — запись сохранена, но не используется. Partial unique индексы учитывают только active.';

comment on column public.store_product_price.amount is
  'Сумма numeric(18,4), >= 0. Точность до 4 знаков; отображение опирается на currency.minor_units.';

comment on column public.store_product_price.created_at is
  'Момент создания записи цены (UTC). Обновление суммы делается новой логикой приложения/seed; отдельной истории версий нет.';

comment on column public.store_product_price.currency_id is
  'FK NOT NULL на store_currency — валюта суммы amount. Может отличаться от default_*_currency региона, если цена задана явно в другой валюте.';

comment on column public.store_product_price.id is
  'Первичный ключ записи цены. Не используется как внешний ключ операционных таблиц.';

comment on column public.store_product_price.price_kind is
  'Тип цены: purchase (закупка/plant, глобальная) | dealer (дилерская, региональная) | retail (розничная, региональная). CHECK ограничивает допустимые значения.';

comment on column public.store_product_price.product_variant_id is
  'FK NOT NULL на store_product_variant — вариант, к которому относится цена.';

comment on column public.store_product_price.region_id is
  'FK на store_region. NULL допустим только для purchase; для dealer/retail обязателен (CHECK). Определяет, для какого региона действует цена.';

create unique index store_product_price_purchase_uidx
  on public.store_product_price (product_variant_id)
  where price_kind = 'purchase' and active and region_id is null;
create unique index store_product_price_regional_uidx
  on public.store_product_price (product_variant_id, price_kind, region_id)
  where price_kind in ('dealer', 'retail') and active and region_id is not null;

create table public.store_product_region_status (
  id bigint generated always as identity primary key,
  product_variant_id bigint not null references public.store_product_variant (id),
  region_id bigint not null references public.store_region (id),
  dealer_status text not null default 'available' check (dealer_status in ('available', 'unavailable')),
  retail_status text not null default 'draft' check (retail_status in (
    'draft', 'available', 'preorder', 'temporarily_unavailable', 'discontinued',
    'banned', 'hidden', 'pending_approval', 'archived'
  )),
  unique (product_variant_id, region_id)
);

comment on table public.store_product_region_status is
  'Региональные статусы доступности dealer/retail для варианта. Отделены от сумм цен: одна строка на пару (variant, region).';

comment on column public.store_product_region_status.dealer_status is
  'Статус дилерского предложения: available | unavailable. В прайс-листе supplier/dealer управляет попаданием товара в региональный список.';

comment on column public.store_product_region_status.id is
  'Первичный ключ строки региональных статусов dealer/retail для пары (product_variant_id, region_id). Не используется как внешний ключ других таблиц.';

comment on column public.store_product_region_status.product_variant_id is
  'FK NOT NULL на store_product_variant — вариант, для которого заданы региональные статусы.';

comment on column public.store_product_region_status.region_id is
  'FK NOT NULL на store_region — регион, в котором действуют dealer_status и retail_status. UNIQUE вместе с product_variant_id.';

comment on column public.store_product_region_status.retail_status is
  'Маркетинговый статус розницы: draft | available | preorder | temporarily_unavailable | discontinued | banned | hidden | pending_approval | archived. Не заменяет dealer_status для фильтрации списка.';

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
create table public.store_document (
  id bigint generated always as identity primary key,
  kind text not null references public.store_document_kind (code),
  sequence_number bigint not null check (sequence_number > 0),
  description text not null default '',
  status text,
  expected_end_on date,
  created_at timestamptz not null default now(),
  created_by bigint not null references public.app_user (id),
  unique (kind, sequence_number)
);

comment on table public.store_document is
  'Общий реестр документов: identity, вид, номер, lifecycle, описание, аудит. Номер уникален по (kind, sequence_number); префикс берётся из store_document_kind. Подтип обязан соответствовать kind.';

comment on column public.store_document.created_at is
  'Момент создания документа (UTC). Неизменяем.';

comment on column public.store_document.created_by is
  'FK на app_user.id — автор создания. В демо обычно id=1.';

comment on column public.store_document.description is
  'Общее текстовое описание/примечание документа. Заменяет бывшие note резерва и explanation корректировки. Пустая строка допустима.';

comment on column public.store_document.expected_end_on is
  'Плановая дата окончания (date). NULL — не задана. Типична для заказов, выпуска и перемещения; изменение пишет снимок в history.';

comment on column public.store_document.id is
  'Первичный ключ документа. На него ссылаются subtype-таблицы (тот же id без своей sequence), линии, история и journal.document_id.';

comment on column public.store_document.kind is
  'FK на store_document_kind.code. Определяет subtype-таблицу, префикс номера и допустимый lifecycle. Менять после создания нельзя.';

comment on column public.store_document.sequence_number is
  'Порядковый номер внутри вида (>0). Выдаётся max(sequence_number)+1 под row lock строки kind; отображается как prefix-sequence.';

comment on column public.store_document.status is
  'Lifecycle: draft | in_progress | done | cancelled. NULL для видов без lifecycle. Переходы валидируются; финальные done/cancelled ограничивают мутации.';

create index store_document_kind_idx on public.store_document (kind);
create index store_document_created_at_idx on public.store_document (created_at desc);
create index store_document_created_by_idx on public.store_document (created_by);

create table public.store_document_history (
  id bigint generated always as identity primary key,
  document_id bigint not null references public.store_document (id),
  status text,
  expected_end_on date,
  changed_at timestamptz not null default now(),
  changed_by bigint not null references public.app_user (id)
);

comment on table public.store_document_history is
  'Анализируемая последовательность полных lifecycle-снимков (status + expected_end_on). Пишет единственный trigger на store_document; ручные INSERT из RPC запрещены. Документы без lifecycle сюда не попадают.';

comment on column public.store_document_history.changed_at is
  'Момент фиксации снимка (UTC). Задаётся при INSERT trigger-ом; далее неизменяем.';

comment on column public.store_document_history.changed_by is
  'FK на app_user.id — кто инициировал изменение lifecycle-полей.';

comment on column public.store_document_history.document_id is
  'FK NOT NULL на store_document.id — документ, чей lifecycle-снимок зафиксирован. Индексирован вместе с changed_at для ленты истории.';

comment on column public.store_document_history.expected_end_on is
  'Снимок store_document.expected_end_on после изменения (включая NULL, если дату сняли).';

comment on column public.store_document_history.id is
  'Первичный ключ записи истории. Append-only: UPDATE/DELETE запрещены триггером immutability.';

comment on column public.store_document_history.status is
  'Снимок store_document.status после изменения. Для видов без lifecycle строки не создаются, поэтому NULL здесь не ожидается в нормальных данных.';

create index store_document_history_document_id_idx on public.store_document_history (document_id, changed_at);

-- Subtypes: id is PK/FK only, NO identity/default/sequence
create table public.store_customer_order (
  id bigint primary key references public.store_document (id),
  region_id bigint not null references public.store_region (id),
  stock_location_id bigint not null unique references public.store_stock_location (id),
  stock_owner_id bigint not null unique references public.store_stock_owner (id)
);

comment on table public.store_customer_order is
  'Подтип заказа клиента. id = store_document.id без собственной sequence. Обязательный region_id; собственные stock_location и stock_owner для отгруженного/зарезервированного остатка.';

comment on column public.store_customer_order.id is
  'PK/FK на store_document.id (kind=customer_order). Без DEFAULT/identity — id выдаёт общий registry.';

comment on column public.store_customer_order.region_id is
  'FK NOT NULL на store_region — регион покупателя. Определяет, какая dealer-цена фиксируется в строках.';

comment on column public.store_customer_order.stock_location_id is
  'FK UNIQUE на store_stock_location kind=customer_order — место отгруженного остатка заказа.';

comment on column public.store_customer_order.stock_owner_id is
  'FK UNIQUE на store_stock_owner kind=customer_order — владелец резерва/отгрузки под этот заказ.';

create table public.store_production_order (
  id bigint primary key references public.store_document (id),
  plant_id bigint not null references public.store_plant (id),
  stock_location_id bigint not null unique references public.store_stock_location (id)
);

comment on table public.store_production_order is
  'Подтип заказа на производство: план потребности, не складской WIP. Место kind=production_order используется для назначений резерва без фактов журнала на этом месте.';

comment on column public.store_production_order.id is
  'PK/FK на store_document.id (kind=production_order). Без собственной sequence.';

comment on column public.store_production_order.plant_id is
  'FK NOT NULL на store_plant — завод исполнения плана и склад выпуска (через plant.warehouse_id).';

comment on column public.store_production_order.stock_location_id is
  'FK UNIQUE на store_stock_location kind=production_order — место для нескладских назначений резерва.';

create table public.store_reservation (
  id bigint primary key references public.store_document (id),
  location_id bigint not null references public.store_stock_location (id),
  owner_id bigint not null references public.store_stock_owner (id),
  creation_source text not null default 'manual'
    check (creation_source in ('manual', 'customer_order_close', 'production_order_close'))
);

comment on table public.store_reservation is
  'Подтип резерва. Без lifecycle status на document: posted_at NULL = черновик без проводок, NOT NULL = проведён и неизменяем. Destination owner один на header; source owners — на строках.';

comment on column public.store_reservation.creation_source is
  'Происхождение: manual | customer_order_close | production_order_close. Не влияет на posting, нужно для аналитики/UX.';

comment on column public.store_reservation.id is
  'PK/FK на store_document.id (kind=reservation). Без собственной sequence.';

comment on column public.store_reservation.location_id is
  'FK на store_stock_location — место резерва (обычно warehouse; также PO/transfer in-transit).';

comment on column public.store_reservation.owner_id is
  'FK на store_stock_owner — единственный destination owner документа (free / customer_order / region).';

comment on column public.store_reservation.posted_at is
  'NULL — черновик без ledger; timestamptz — момент проводки. После posting header/lines immutable.';

create index store_reservation_location_id_idx on public.store_reservation (location_id);
create index store_reservation_owner_id_idx on public.store_reservation (owner_id);

-- Draft reservations need a way to exist before posting.
-- Spec: reservation has no status. So how do drafts work?
-- Looking at brainstorm again: "Reservation, shipment и adjustment — без status"
-- And "Immediate/final документы immutable"
-- So reservation is create-and-post only? But current app has draft RSV.
-- Spec I/O matrix mentions lifecycle for kinds with status.
-- For reservation without status, draft could be: store_document with kind=reservation but no subtype row until post?
-- Or: allow draft as document without ledger, and "posting" creates the reservation subtype.
-- Simpler approach matching "existence = posted": drafts are store_document + store_reservation rows that haven't written ledger yet.
-- But without status how do we know draft vs posted?
-- Re-read: "Lifecycle есть у customer order, production order, transfer и production output. Reservation, shipment и adjustment — без status."
-- Current model had draft/posted on reservation. Spec removes it.
-- Practical interpretation: reservation and adjustment and shipment are always immediate (create-and-post). Draft reservation UI can be removed OR draft is client-only.
-- But Code Map / tasks say "единые статусы" and tests cover cancel of planned output.
-- I'll keep reservation as always-posted on insert (create_and_post), and create_reservation_draft can still insert document+lines without ledger, using a flag...
-- Actually: use store_document.status NULL for posted-immediate kinds, and for draft reservation use a temporary approach:
-- Looking at Design Notes and frozen intent carefully...
-- "Immediate/final документы immutable" — shipment and adjustment are immediate.
-- For reservation, the old draft existed. Spec says no status. I'll implement reservation as create-and-post only (no draft RPC), and map createReservationDraft in the app to create_and_post OR keep an internal `posted` boolean on reservation table.
-- Better: add `posted_at timestamptz` on reservation - NULL = draft, NOT NULL = posted. That's not a "status" vocabulary.
-- Spec says "без status" specifically about the lifecycle vocabulary. A posted_at is fine for draft gate.

alter table public.store_reservation add column posted_at timestamptz;

create table public.store_shipment (
  id bigint primary key references public.store_document (id),
  from_location_id bigint not null references public.store_stock_location (id),
  to_location_id bigint not null references public.store_stock_location (id),
  check (from_location_id <> to_location_id)
);

comment on table public.store_shipment is
  'Подтип отгрузки/возврата. Без status: существование = проведённый факт. Маршрут только from/to stock locations; customer_order_id не хранится (выводится из kinds мест).';

comment on column public.store_shipment.from_location_id is
  'FK на store_stock_location — исходное место. warehouse→customer_order = отгрузка; customer_order→warehouse = возврат.';

comment on column public.store_shipment.id is
  'PK/FK на store_document.id (kind=shipment). Без собственной sequence.';

comment on column public.store_shipment.to_location_id is
  'FK на store_stock_location — целевое место. Должно образовывать допустимую пару направлений с from_location_id.';

create index store_shipment_from_location_id_idx on public.store_shipment (from_location_id);
create index store_shipment_to_location_id_idx on public.store_shipment (to_location_id);

create table public.store_adjustment (
  id bigint primary key references public.store_document (id),
  location_id bigint not null references public.store_stock_location (id)
);

comment on table public.store_adjustment is
  'Подтип корректировки свободного остатка. Без status: create-and-post. Количество со знаком на строках; один документ может смешивать + и −.';

comment on column public.store_adjustment.id is
  'PK/FK на store_document.id (kind=adjustment). Без собственной sequence.';

comment on column public.store_adjustment.location_id is
  'FK на store_stock_location — место корректировки (обычно warehouse). Owner фактов — singleton free.';

create index store_adjustment_location_id_idx on public.store_adjustment (location_id);

create table public.store_transfer (
  id bigint primary key references public.store_document (id),
  from_warehouse_id bigint not null references public.store_warehouse (id),
  to_warehouse_id bigint not null references public.store_warehouse (id),
  stock_location_id bigint not null unique references public.store_stock_location (id),
  check (from_warehouse_id <> to_warehouse_id)
);

comment on table public.store_transfer is
  'Подтип перемещения между складами. Lifecycle на store_document (draft/in_progress/done/cancelled). stock_location kind=transfer держит остаток «в пути».';

comment on column public.store_transfer.from_warehouse_id is
  'FK на store_warehouse — склад отправления.';

comment on column public.store_transfer.id is
  'PK/FK на store_document.id (kind=transfer). Без собственной sequence.';

comment on column public.store_transfer.stock_location_id is
  'FK UNIQUE на store_stock_location kind=transfer — место остатка в пути между складами.';

comment on column public.store_transfer.to_warehouse_id is
  'FK на store_warehouse — склад назначения. Не должен совпадать с from при создании.';

create table public.store_production_output (
  id bigint primary key references public.store_document (id),
  production_order_id bigint not null references public.store_production_order (id)
);

comment on table public.store_production_output is
  'Подтип выпуска по заказу на производство. Кладет товар на склад завода; цену производства в строках не хранит. Lifecycle на store_document.';

comment on column public.store_production_output.id is
  'PK/FK на store_document.id (kind=production_output). Без собственной sequence.';

comment on column public.store_production_output.production_order_id is
  'FK на store_production_order.id — заказ, по которому выполняется выпуск. Ограничивает допустимые варианты и количества планом.';

create index store_production_output_po_id_idx on public.store_production_output (production_order_id);

-- ---------------------------------------------------------------------------
-- Document lines and stock ledger
-- ---------------------------------------------------------------------------
create table public.store_document_product_line (
  id bigint generated always as identity primary key,
  document_id bigint not null references public.store_document (id) on delete cascade,
  product_variant_id bigint not null references public.store_product_variant (id),
  quantity numeric(18, 2) not null,
  from_owner_id bigint references public.store_stock_owner (id),
  to_owner_id bigint references public.store_stock_owner (id),
  variant_name text not null,
  unit_price numeric(18, 4),
  currency_id bigint references public.store_currency (id),
  check (quantity <> 0)
);

comment on table public.store_document_product_line is
  'Универсальные товарные строки всех видов документов. Обязательная ссылка на product_variant_id; snapshot — variant_name + использованная цена. Kind-specific правила количества/цены проверяются в DB.';

comment on column public.store_document_product_line.currency_id is
  'FK на store_currency для unit_price. NULL, если цена не применялась (например выпуск).';

comment on column public.store_document_product_line.document_id is
  'FK на store_document.id — документ-владелец строки. Каскадная целостность через document registry.';

comment on column public.store_document_product_line.from_owner_id is
  'FK на store_stock_owner — source owner на строке (резерв может брать из разных owners). NULL — свободно/не применимо для вида.';

comment on column public.store_document_product_line.id is
  'Первичный ключ строки. Identity-последовательность.';

comment on column public.store_document_product_line.product_variant_id is
  'FK NOT NULL на store_product_variant. Hard DELETE варианта запрещён; строка сохраняет историческую ссылку даже после soft-delete варианта.';

comment on column public.store_document_product_line.quantity is
  'Количество numeric до сотых. Для большинства видов > 0; для adjustment — знаковое <> 0 (в одном документе допустима смесь знаков).';

comment on column public.store_document_product_line.to_owner_id is
  'FK на store_stock_owner — destination на строке, если вид хранит dest на линии. У reservation dest задаётся в header, здесь обычно NULL.';

comment on column public.store_document_product_line.unit_price is
  'Фактически использованная цена. Customer order — dealer региона заказа; production order — plant/purchase; production_output — NULL; прочие — по правилам вида.';

comment on column public.store_document_product_line.variant_name is
  'Снимок названия варианта на момент добавления строки. Историческое отображение не зависит от последующих правок каталога.';

create index store_document_product_line_document_id_idx on public.store_document_product_line (document_id);
create index store_document_product_line_variant_id_idx on public.store_document_product_line (product_variant_id);
create index store_document_product_line_from_owner_id_idx on public.store_document_product_line (from_owner_id);
create index store_document_product_line_to_owner_id_idx on public.store_document_product_line (to_owner_id);
create unique index store_document_product_line_uidx on public.store_document_product_line (
  document_id,
  product_variant_id,
  coalesce(from_owner_id, 0),
  coalesce(to_owner_id, 0)
);

create table public.store_stock_transaction (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  product_variant_id bigint not null references public.store_product_variant (id),
  quantity numeric(18, 2) not null check (quantity <> 0),
  location_id bigint not null references public.store_stock_location (id),
  owner_id bigint not null references public.store_stock_owner (id),
  document_id bigint not null references public.store_document (id)
);

comment on table public.store_stock_transaction is
  'Append-only ledger складских фактов. Browser — только SELECT; INSERT только внутри posting-логики под advisory locks; UPDATE/DELETE запрещены триггером. Balance — sum(quantity) <> 0.';

comment on column public.store_stock_transaction.created_at is
  'Момент проводки (UTC). Задаётся при INSERT; далее неизменяем.';

comment on column public.store_stock_transaction.document_id is
  'FK NOT NULL на store_document.id — документ-источник проводки (reservation, shipment, adjustment, transfer, production_output, …).';

comment on column public.store_stock_transaction.id is
  'Первичный ключ факта. Неизменяем после вставки.';

comment on column public.store_stock_transaction.location_id is
  'FK NOT NULL на store_stock_location — место факта. Вместе с variant и owner образует ключ, сериализуемый advisory lock при posting.';

comment on column public.store_stock_transaction.owner_id is
  'FK NOT NULL на store_stock_owner — владелец факта, включая singleton free. NULL больше не используется как «свободно».';

comment on column public.store_stock_transaction.product_variant_id is
  'FK NOT NULL на store_product_variant — какой вариант остатка изменился. Часть ключа остатка вместе с location_id и owner_id.';

comment on column public.store_stock_transaction.quantity is
  'Знаковое изменение остатка numeric до сотых, <> 0. Плюс — приход, минус — расход. Точная сумма без epsilon.';

create index store_stock_transaction_variant_id_idx on public.store_stock_transaction (product_variant_id);
create index store_stock_transaction_location_id_idx on public.store_stock_transaction (location_id);
create index store_stock_transaction_owner_id_idx on public.store_stock_transaction (owner_id);
create index store_stock_transaction_document_id_idx on public.store_stock_transaction (document_id);
create index store_stock_transaction_created_at_idx on public.store_stock_transaction (created_at desc);
create index store_stock_transaction_balance_idx on public.store_stock_transaction (product_variant_id, location_id, owner_id);

create view public.store_stock_balance
with (security_invoker = true)
as
select
  product_variant_id,
  location_id,
  owner_id,
  sum(quantity) as quantity
from public.store_stock_transaction
group by product_variant_id, location_id, owner_id
having sum(quantity) <> 0;

comment on view public.store_stock_balance is
  'Текущие ненулевые остатки: точная sum(quantity) по (product_variant_id, location_id, owner_id) из ledger. security_invoker; только SELECT grant. Zero-строки отфильтрованы HAVING.';

comment on column public.store_stock_balance.location_id is
  'Идентификатор места остатка (store_stock_location.id), по которому агрегирован ledger; вместе с variant и owner образует ключ баланса.';

comment on column public.store_stock_balance.owner_id is
  'Идентификатор владельца остатка (store_stock_owner.id), включая singleton free; NULL в балансе не бывает.';

comment on column public.store_stock_balance.product_variant_id is
  'Идентификатор варианта (store_product_variant.id), по которому агрегирован ledger в этой строке баланса.';

comment on column public.store_stock_balance.quantity is
  'Точная сумма signed quantity до сотых по ключу (variant, location, owner). Строки с суммой 0 отфильтрованы HAVING.';

-- ---------------------------------------------------------------------------
-- Soft-delete protection for catalogs
-- ---------------------------------------------------------------------------
create or replace function public.store_forbid_hard_delete()
returns trigger
language plpgsql
as $f$
begin
  raise exception 'Физическое удаление справочника Store запрещено; используйте deleted_at';
end;
$f$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'store_currency','store_region_group','store_region','store_brand','store_product_family',
    'store_category','store_warehouse','store_plant','store_product','store_product_variant'
  ]
  loop
    execute format(
      'create trigger %I before delete on public.%I for each row execute function public.store_forbid_hard_delete()',
      t || '_no_hard_delete', t
    );
  end loop;
end $$;

create or replace function public.store_forbid_variant_hard_delete()
returns trigger
language plpgsql
as $f$
begin
  raise exception 'Физическое удаление варианта запрещено';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Current demo user
-- ---------------------------------------------------------------------------
create or replace function public.store_current_user_id()
returns bigint
language sql
stable
as $f$
  select 1::bigint;
$f$;

-- ---------------------------------------------------------------------------
-- Allocate document number under kind row lock
-- ---------------------------------------------------------------------------
create or replace function public.store_next_sequence(p_kind text)
returns bigint
language plpgsql
as $f$
declare
  v_seq bigint;
begin
  perform 1 from public.store_document_kind where code = p_kind for update;
  if not found then
    raise exception 'Неизвестный вид документа %', p_kind;
  end if;
  select coalesce(max(sequence_number), 0) + 1 into v_seq
  from public.store_document
  where kind = p_kind;
  return v_seq;
end;
$f$;

create or replace function public.store_create_document(
  p_kind text,
  p_description text default '',
  p_status text default null,
  p_expected_end_on date default null,
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null,
  p_created_by bigint default null
)
returns bigint
language plpgsql
as $f$
declare
  v_id bigint;
  v_seq bigint;
  v_has_lifecycle boolean;
  v_allowed text[];
begin
  select has_lifecycle, allowed_statuses into v_has_lifecycle, v_allowed
  from public.store_document_kind where code = p_kind;
  if not found then
    raise exception 'Неизвестный вид документа %', p_kind;
  end if;

  if v_has_lifecycle then
    if p_status is null then
      raise exception 'Для вида % нужен status', p_kind;
    end if;
    if not (p_status = any (v_allowed)) then
      raise exception 'Статус % недопустим для вида %', p_status, p_kind;
    end if;
  else
    if p_status is not null then
      raise exception 'Вид % не имеет lifecycle status', p_kind;
    end if;
  end if;

  v_seq := coalesce(p_sequence_number, public.store_next_sequence(p_kind));
  if p_id is null then
    insert into public.store_document (kind, sequence_number, description, status, expected_end_on, created_at, created_by)
    values (
      p_kind, v_seq, coalesce(p_description, ''), p_status, p_expected_end_on,
      coalesce(p_created_at, now()), coalesce(p_created_by, public.store_current_user_id())
    )
    returning id into v_id;
  else
    insert into public.store_document (id, kind, sequence_number, description, status, expected_end_on, created_at, created_by)
    overriding system value
    values (
      p_id, p_kind, v_seq, coalesce(p_description, ''), p_status, p_expected_end_on,
      coalesce(p_created_at, now()), coalesce(p_created_by, public.store_current_user_id())
    );
    v_id := p_id;
    perform setval(pg_get_serial_sequence('public.store_document', 'id'),
      greatest((select max(id) from public.store_document), 1));
  end if;
  return v_id;
end;
$f$;

-- ---------------------------------------------------------------------------
-- History: single trigger author
-- ---------------------------------------------------------------------------
create or replace function public.store_document_history_writer()
returns trigger
language plpgsql
as $f$
declare
  v_has boolean;
begin
  select has_lifecycle into v_has from public.store_document_kind where code = new.kind;
  if not coalesce(v_has, false) then
    return new;
  end if;
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.expected_end_on is distinct from old.expected_end_on then
    insert into public.store_document_history (document_id, status, expected_end_on, changed_at, changed_by)
    values (new.id, new.status, new.expected_end_on, now(), public.store_current_user_id());
  end if;
  return new;
end;
$f$;

create trigger store_document_history_trg
  after insert or update of status, expected_end_on on public.store_document
  for each row execute function public.store_document_history_writer();

create or replace function public.store_document_history_immutable()
returns trigger
language plpgsql
as $f$
begin
  raise exception 'Историю документа нельзя изменять или удалять';
end;
$f$;

create trigger store_document_history_no_update
  before update or delete on public.store_document_history
  for each row execute function public.store_document_history_immutable();

-- ---------------------------------------------------------------------------
-- Ledger immutability
-- ---------------------------------------------------------------------------
create or replace function public.store_stock_transaction_immutable()
returns trigger
language plpgsql
as $f$
begin
  raise exception 'Факты журнала остатков нельзя изменять или удалять';
end;
$f$;

create trigger store_stock_transaction_no_update
  before update or delete on public.store_stock_transaction
  for each row execute function public.store_stock_transaction_immutable();

-- ---------------------------------------------------------------------------
-- Kind ↔ subtype correspondence
-- ---------------------------------------------------------------------------
create or replace function public.store_assert_subtype_kind(p_id bigint, p_kind text)
returns void
language plpgsql
as $f$
declare
  v_kind text;
begin
  select kind into v_kind from public.store_document where id = p_id;
  if v_kind is distinct from p_kind then
    raise exception 'Документ % имеет вид %, ожидался %', p_id, v_kind, p_kind;
  end if;
end;
$f$;

create or replace function public.store_assert_location_kind(p_location_id bigint, p_kind text)
returns void
language plpgsql
as $f$
declare
  v_kind text;
begin
  select kind into v_kind from public.store_stock_location where id = p_location_id;
  if v_kind is distinct from p_kind then
    raise exception 'Место % имеет kind %, ожидался %', p_location_id, v_kind, p_kind;
  end if;
end;
$f$;

create or replace function public.store_assert_owner_kind(p_owner_id bigint, p_kind text)
returns void
language plpgsql
as $f$
declare
  v_kind text;
begin
  select kind into v_kind from public.store_stock_owner where id = p_owner_id;
  if v_kind is distinct from p_kind then
    raise exception 'Владелец % имеет kind %, ожидался %', p_owner_id, v_kind, p_kind;
  end if;
end;
$f$;

create or replace function public.store_free_owner_id()
returns bigint
language sql
stable
as $f$
  select id from public.store_stock_owner where kind = 'free' order by id limit 1;
$f$;

create or replace function public.store_new_stock_location(p_kind text)
returns bigint
language plpgsql
as $f$
declare
  v_id bigint;
begin
  insert into public.store_stock_location (kind) values (p_kind) returning id into v_id;
  return v_id;
end;
$f$;

create or replace function public.store_new_stock_owner(p_kind text)
returns bigint
language plpgsql
as $f$
declare
  v_id bigint;
begin
  if p_kind = 'free' then
    return public.store_free_owner_id();
  end if;
  insert into public.store_stock_owner (kind) values (p_kind) returning id into v_id;
  return v_id;
end;
$f$;

-- ---------------------------------------------------------------------------
-- Balance, advisory locks, ledger write
-- ---------------------------------------------------------------------------
create or replace function public.store_qty(
  p_variant_id bigint,
  p_location_id bigint,
  p_owner_id bigint
)
returns numeric
language sql
stable
as $f$
  select coalesce(sum(quantity), 0)
  from public.store_stock_transaction
  where product_variant_id = p_variant_id
    and location_id = p_location_id
    and owner_id = p_owner_id;
$f$;

create or replace function public.store_lock_stock_keys(p_keys jsonb)
returns void
language plpgsql
as $f$
declare
  r record;
begin
  -- p_keys: [{v, l, o}, ...] — lock in stable order
  for r in
    select (e->>'v')::bigint as v, (e->>'l')::bigint as l, (e->>'o')::bigint as o
    from jsonb_array_elements(p_keys) e
    order by 1, 2, 3
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(format('%s:%s:%s', r.v, r.l, r.o), 0)
    );
  end loop;
end;
$f$;

create or replace function public.store_write_tx(
  p_variant_id bigint,
  p_quantity numeric,
  p_location_id bigint,
  p_owner_id bigint,
  p_document_id bigint
)
returns void
language plpgsql
as $f$
begin
  if p_quantity = 0 then
    raise exception 'Количество факта не может быть нулевым';
  end if;
  insert into public.store_stock_transaction (
    product_variant_id, quantity, location_id, owner_id, document_id
  ) values (
    p_variant_id, round(p_quantity, 2), p_location_id, p_owner_id, p_document_id
  );
end;
$f$;

create or replace function public.store_move(
  p_variant_id bigint,
  p_quantity numeric,
  p_from_location_id bigint,
  p_from_owner_id bigint,
  p_to_location_id bigint,
  p_to_owner_id bigint,
  p_document_id bigint
)
returns void
language plpgsql
as $f$
declare
  v_avail numeric;
begin
  if p_quantity <= 0 then
    raise exception 'Количество перемещения должно быть больше нуля';
  end if;
  perform public.store_lock_stock_keys(jsonb_build_array(
    jsonb_build_object('v', p_variant_id, 'l', p_from_location_id, 'o', p_from_owner_id),
    jsonb_build_object('v', p_variant_id, 'l', p_to_location_id, 'o', p_to_owner_id)
  ));
  v_avail := public.store_qty(p_variant_id, p_from_location_id, p_from_owner_id);
  if v_avail < p_quantity then
    raise exception 'Недостаточно остатка (доступно %, нужно %)', v_avail, p_quantity;
  end if;
  perform public.store_write_tx(p_variant_id, -p_quantity, p_from_location_id, p_from_owner_id, p_document_id);
  perform public.store_write_tx(p_variant_id, p_quantity, p_to_location_id, p_to_owner_id, p_document_id);
end;
$f$;

create or replace function public.store_line_snapshot(p_variant_id bigint)
returns table (variant_name text, unit text, plant_id bigint)
language sql
stable
as $f$
  select v.name, v.unit, v.plant_id
  from public.store_product_variant v
  where v.id = p_variant_id and v.deleted_at is null;
$f$;

create or replace function public.store_resolve_line_price(
  p_kind text,
  p_variant_id bigint,
  p_region_id bigint
)
returns table (unit_price numeric, currency_id bigint)
language plpgsql
stable
as $f$
begin
  if p_kind = 'customer_order' then
    return query
      select pr.amount, pr.currency_id
      from public.store_product_price pr
      where pr.product_variant_id = p_variant_id
        and pr.price_kind = 'dealer'
        and pr.region_id = p_region_id
        and pr.active
      order by pr.id desc
      limit 1;
  elsif p_kind = 'production_order' then
    return query
      select pr.amount, pr.currency_id
      from public.store_product_price pr
      where pr.product_variant_id = p_variant_id
        and pr.price_kind = 'purchase'
        and pr.region_id is null
        and pr.active
      order by pr.id desc
      limit 1;
  else
    return query select null::numeric, null::bigint;
  end if;
end;
$f$;

-- ---------------------------------------------------------------------------
-- Production demand helpers
-- ---------------------------------------------------------------------------
create or replace function public.store_po_plan_qty(p_po_id bigint, p_variant_id bigint)
returns numeric language sql stable as $f$
  select coalesce(sum(quantity), 0)
  from public.store_document_product_line
  where document_id = p_po_id and product_variant_id = p_variant_id;
$f$;

create or replace function public.store_po_produced_qty(p_po_id bigint, p_variant_id bigint)
returns numeric language sql stable as $f$
  select coalesce(sum(l.quantity), 0)
  from public.store_document_product_line l
  join public.store_production_output o on o.id = l.document_id
  join public.store_document d on d.id = o.id
  where o.production_order_id = p_po_id
    and d.status = 'done'
    and l.product_variant_id = p_variant_id;
$f$;

create or replace function public.store_po_assigned_qty(
  p_po_id bigint,
  p_variant_id bigint,
  p_owner_id bigint default null
)
returns numeric language sql stable as $f$
  select coalesce(sum(
    case
      when r.owner_id <> public.store_free_owner_id()
           and coalesce(l.from_owner_id, public.store_free_owner_id()) = public.store_free_owner_id()
        then l.quantity
      when r.owner_id = public.store_free_owner_id()
           and coalesce(l.from_owner_id, public.store_free_owner_id()) <> public.store_free_owner_id()
        then -l.quantity
      else 0
    end
  ), 0)
  from public.store_reservation r
  join public.store_production_order po on po.stock_location_id = r.location_id
  join public.store_document_product_line l on l.document_id = r.id
  where po.id = p_po_id
    and r.posted_at is not null
    and l.product_variant_id = p_variant_id
    and (
      p_owner_id is null
      or r.owner_id = p_owner_id
      or l.from_owner_id = p_owner_id
    );
$f$;

create or replace function public.store_po_free_demand(p_po_id bigint, p_variant_id bigint)
returns numeric language sql stable as $f$
  select greatest(
    public.store_po_plan_qty(p_po_id, p_variant_id)
      - public.store_po_assigned_qty(p_po_id, p_variant_id)
      - public.store_po_produced_qty(p_po_id, p_variant_id),
    0
  );
$f$;

-- ---------------------------------------------------------------------------
-- Insert line helper
-- ---------------------------------------------------------------------------
create or replace function public.store_insert_line(
  p_document_id bigint,
  p_variant_id bigint,
  p_quantity numeric,
  p_from_owner_id bigint default null,
  p_to_owner_id bigint default null
)
returns bigint
language plpgsql
as $f$
declare
  v_kind text;
  v_name text;
  v_price numeric;
  v_currency bigint;
  v_region bigint;
  v_line_id bigint;
begin
  select kind into v_kind from public.store_document where id = p_document_id;
  select name into v_name from public.store_product_variant
    where id = p_variant_id and deleted_at is null;
  if v_name is null then
    raise exception 'Вариант % не найден или удалён', p_variant_id;
  end if;

  if v_kind = 'adjustment' then
    if p_quantity = 0 then
      raise exception 'Количество корректировки не может быть нулевым';
    end if;
  else
    if p_quantity <= 0 then
      raise exception 'Количество должно быть больше нуля';
    end if;
  end if;

  v_region := null;
  if v_kind = 'customer_order' then
    select region_id into v_region from public.store_customer_order where id = p_document_id;
  end if;
  select unit_price, currency_id into v_price, v_currency
  from public.store_resolve_line_price(v_kind, p_variant_id, v_region);

  insert into public.store_document_product_line (
    document_id, product_variant_id, quantity, from_owner_id, to_owner_id,
    variant_name, unit_price, currency_id
  ) values (
    p_document_id, p_variant_id, round(p_quantity, 2), p_from_owner_id, p_to_owner_id,
    v_name, v_price, v_currency
  ) returning id into v_line_id;
  return v_line_id;
end;
$f$;

-- ---------------------------------------------------------------------------
-- Catalog create helpers (controlled mutations)
-- ---------------------------------------------------------------------------
create or replace function public.store_create_warehouse(p_name text)
returns bigint
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_loc bigint;
  v_id bigint;
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Название склада обязательно';
  end if;
  v_loc := public.store_new_stock_location('warehouse');
  insert into public.store_warehouse (name, stock_location_id)
  values (trim(p_name), v_loc) returning id into v_id;
  return v_id;
end;
$f$;

create or replace function public.store_update_warehouse(p_id bigint, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  update public.store_warehouse set name = trim(p_name)
  where id = p_id and deleted_at is null;
  if not found then raise exception 'Склад % не найден', p_id; end if;
  return 'ok';
end;
$f$;

create or replace function public.store_create_plant(p_name text, p_warehouse_id bigint default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_wh bigint;
  v_id bigint;
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Название завода обязательно';
  end if;
  if p_warehouse_id is null then
    v_wh := public.store_create_warehouse(trim(p_name) || ' — склад');
  else
    if not exists (
      select 1 from public.store_warehouse where id = p_warehouse_id and deleted_at is null
    ) then
      raise exception 'Склад % не найден', p_warehouse_id;
    end if;
    if exists (
      select 1 from public.store_plant
      where warehouse_id = p_warehouse_id and deleted_at is null
    ) then
      raise exception 'Склад % уже привязан к заводу', p_warehouse_id;
    end if;
    v_wh := p_warehouse_id;
  end if;
  insert into public.store_plant (name, warehouse_id) values (trim(p_name), v_wh)
  returning id into v_id;
  return v_id;
end;
$f$;

create or replace function public.store_update_plant(p_id bigint, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  update public.store_plant set name = trim(p_name)
  where id = p_id and deleted_at is null;
  if not found then raise exception 'Завод % не найден', p_id; end if;
  return 'ok';
end;
$f$;

create or replace function public.store_create_region(p_name text, p_code text default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_owner bigint;
  v_cur bigint;
  v_id bigint;
  v_code text;
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Название региона обязательно';
  end if;
  select id into v_cur from public.store_currency where code = 'USD' and deleted_at is null limit 1;
  if v_cur is null then
    insert into public.store_currency (code, name) values ('USD', 'Доллар США') returning id into v_cur;
  end if;
  v_owner := public.store_new_stock_owner('region');
  insert into public.store_region (
    code, name, default_retail_currency_id, default_dealer_currency_id, stock_owner_id
  ) values (
    coalesce(nullif(trim(p_code), ''), 'R'),
    trim(p_name), v_cur, v_cur, v_owner
  ) returning id into v_id;
  -- Prefer code REG-{id}
  update public.store_region set code = 'REG-' || v_id::text where id = v_id;
  return v_id;
end;
$f$;

create or replace function public.store_update_region(p_id bigint, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  update public.store_region set name = trim(p_name)
  where id = p_id and deleted_at is null;
  if not found then raise exception 'Регион % не найден', p_id; end if;
  return 'ok';
end;
$f$;

create or replace function public.store_create_product_variant(
  p_sku text,
  p_name text,
  p_unit text default 'шт',
  p_plant_id bigint default null,
  p_image_url text default null,
  p_product_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_product_id bigint;
  v_variant_id bigint;
begin
  if nullif(trim(p_sku), '') is null or nullif(trim(p_name), '') is null then
    raise exception 'SKU и название обязательны';
  end if;
  if p_product_id is null then
    insert into public.store_product (name) values (trim(p_name)) returning id into v_product_id;
  else
    v_product_id := p_product_id;
  end if;
  insert into public.store_product_variant (product_id, sku, name, unit, plant_id, image_url)
  values (v_product_id, trim(p_sku), trim(p_name), coalesce(nullif(trim(p_unit), ''), 'шт'), p_plant_id, p_image_url)
  returning id into v_variant_id;
  return jsonb_build_object('product_id', v_product_id, 'variant_id', v_variant_id);
end;
$f$;

create or replace function public.store_update_document_kind_prefix(p_kind text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
begin
  update public.store_document_kind set number_prefix = trim(p_prefix) where code = p_kind;
  if not found then raise exception 'Вид % не найден', p_kind; end if;
  return 'ok';
end;
$f$;

create or replace function public.store_update_expected_end(p_id bigint, p_expected_end_on date)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_kind text;
  v_status text;
begin
  select kind, status into v_kind, v_status from public.store_document where id = p_id;
  if not found then raise exception 'Документ % не найден', p_id; end if;
  if v_kind not in ('customer_order', 'production_order', 'transfer', 'production_output') then
    raise exception 'У вида % нет expected_end_on', v_kind;
  end if;
  if v_status in ('done', 'cancelled') then
    raise exception 'Нельзя менять срок завершённого документа';
  end if;
  update public.store_document set expected_end_on = p_expected_end_on where id = p_id;
  return 'ok';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Customer order
-- ---------------------------------------------------------------------------
create or replace function public.store_create_customer_order(
  p_region_id bigint,
  p_description text default '',
  p_expected_end_on date default null,
  p_lines jsonb default '[]'::jsonb,
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
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
begin
  if not exists (select 1 from public.store_region where id = p_region_id and deleted_at is null) then
    raise exception 'Регион % не найден', p_region_id;
  end if;
  v_id := public.store_create_document(
    'customer_order', coalesce(p_description, ''), 'in_progress', p_expected_end_on,
    p_sequence_number, p_id, p_created_at, null
  );
  v_loc := public.store_new_stock_location('customer_order');
  v_owner := public.store_new_stock_owner('customer_order');
  insert into public.store_customer_order (id, region_id, stock_location_id, stock_owner_id)
  values (v_id, p_region_id, v_loc, v_owner);

  for e in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_line_id := public.store_insert_line(
      v_id, (e->>'product_variant_id')::bigint, (e->>'quantity')::numeric
    );
    v_line_ids := v_line_ids || v_line_id;
  end loop;
  return jsonb_build_object('id', v_id, 'lines', to_jsonb(v_line_ids));
end;
$f$;

create or replace function public.store_close_customer_order(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_owner bigint;
  v_loc bigint;
  r record;
  v_rsv bigint;
  v_free bigint := public.store_free_owner_id();
begin
  perform public.store_assert_subtype_kind(p_id, 'customer_order');
  select status into v_status from public.store_document where id = p_id;
  if v_status = 'done' then return 'ok'; end if;
  if v_status = 'cancelled' then
    raise exception 'Отменённый заказ нельзя закрыть';
  end if;
  select stock_owner_id into v_owner from public.store_customer_order where id = p_id;

  -- Release open holds on warehouses/transfers back to free
  for r in
    select b.product_variant_id, b.location_id, b.quantity
    from public.store_stock_balance b
    join public.store_stock_location loc on loc.id = b.location_id
    where b.owner_id = v_owner
      and loc.kind in ('warehouse', 'transfer')
      and b.quantity > 0
  loop
    v_rsv := public.store_create_document(
      'reservation', 'Автоснятие при закрытии заказа', null, null, null, null, null, null
    );
    insert into public.store_reservation (id, location_id, owner_id, creation_source, posted_at)
    values (v_rsv, r.location_id, v_free, 'customer_order_close', now());
    perform public.store_insert_line(v_rsv, r.product_variant_id, r.quantity, v_owner, null);
    perform public.store_move(r.product_variant_id, r.quantity, r.location_id, v_owner, r.location_id, v_free, v_rsv);
  end loop;

  update public.store_document set status = 'done' where id = p_id;
  return 'ok';
end;
$f$;

create or replace function public.store_create_production_order(
  p_plant_id bigint,
  p_lines jsonb default '[]'::jsonb,
  p_description text default '',
  p_expected_end_on date default null,
  p_status text default 'draft',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
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
  for e in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    v_line_id := public.store_insert_line(
      v_id, (e->>'product_variant_id')::bigint, (e->>'quantity')::numeric
    );
    v_line_ids := v_line_ids || v_line_id;
  end loop;
  return jsonb_build_object('id', v_id, 'lines', to_jsonb(v_line_ids));
end;
$f$;

create or replace function public.store_add_production_line(
  p_id bigint, p_product_variant_id bigint, p_quantity numeric
)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
begin
  perform public.store_assert_subtype_kind(p_id, 'production_order');
  select status into v_status from public.store_document where id = p_id;
  if v_status in ('done', 'cancelled') then
    raise exception 'Нельзя менять строки завершённого заказа на производство';
  end if;
  perform public.store_insert_line(p_id, p_product_variant_id, p_quantity);
  return 'ok';
end;
$f$;

create or replace function public.store_set_production_status(p_id bigint, p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
begin
  perform public.store_assert_subtype_kind(p_id, 'production_order');
  select status into v_status from public.store_document where id = p_id;
  if v_status in ('done', 'cancelled') then
    raise exception 'Терминальный статус производства нельзя менять через set_status';
  end if;
  if p_status not in ('draft', 'in_progress', 'done') then
    raise exception 'Недопустимый статус %', p_status;
  end if;
  if p_status = 'done' then
    raise exception 'Используйте store_close_production_order для завершения';
  end if;
  update public.store_document set status = p_status where id = p_id;
  return 'ok';
end;
$f$;

create or replace function public.store_close_production_order(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_loc bigint;
  r record;
  v_rsv bigint;
  v_free bigint := public.store_free_owner_id();
begin
  perform public.store_assert_subtype_kind(p_id, 'production_order');
  select status into v_status from public.store_document where id = p_id;
  if v_status = 'done' then return 'ok'; end if;
  if v_status = 'cancelled' then
    raise exception 'Отменённый заказ на производство нельзя закрыть';
  end if;
  select stock_location_id into v_loc from public.store_production_order where id = p_id;

  -- Release unmet demand assignments (non-ledger RSV on PO location)
  for r in
    select l.product_variant_id,
           sum(case when res.owner_id <> v_free then l.quantity else -l.quantity end) as qty,
           res.owner_id
    from public.store_reservation res
    join public.store_document_product_line l on l.document_id = res.id
    where res.location_id = v_loc and res.posted_at is not null and res.owner_id <> v_free
    group by l.product_variant_id, res.owner_id
    having sum(case when res.owner_id <> v_free then l.quantity else -l.quantity end) > 0
  loop
    v_rsv := public.store_create_document(
      'reservation', 'Автоснятие при закрытии производства', null, null, null, null, null, null
    );
    insert into public.store_reservation (id, location_id, owner_id, creation_source, posted_at)
    values (v_rsv, v_loc, v_free, 'production_order_close', now());
    perform public.store_insert_line(v_rsv, r.product_variant_id, r.qty, r.owner_id, null);
    -- No ledger facts for PO-location reservations
  end loop;

  update public.store_document set status = 'done' where id = p_id;
  return 'ok';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Reservation
-- ---------------------------------------------------------------------------
create or replace function public.store_create_and_post_reservation(
  p_location_id bigint,
  p_owner_id bigint,
  p_lines jsonb,
  p_description text default '',
  p_creation_source text default 'manual',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_loc_kind text;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_from_owner bigint;
  v_free bigint := public.store_free_owner_id();
begin
  select kind into v_loc_kind from public.store_stock_location where id = p_location_id;
  if v_loc_kind is null then raise exception 'Место % не найдено', p_location_id; end if;
  if v_loc_kind not in ('warehouse', 'production_order', 'transfer') then
    raise exception 'Резерв допускает места warehouse, production_order, transfer';
  end if;
  if not exists (select 1 from public.store_stock_owner where id = p_owner_id) then
    raise exception 'Владелец % не найден', p_owner_id;
  end if;
  if p_creation_source not in ('manual', 'customer_order_close', 'production_order_close') then
    raise exception 'Некорректный creation_source';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Нужна хотя бы одна строка резерва';
  end if;

  v_id := public.store_create_document(
    'reservation', coalesce(p_description, ''), null, null,
    p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_reservation (id, location_id, owner_id, creation_source, posted_at)
  values (v_id, p_location_id, p_owner_id, p_creation_source, null);

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    v_from_owner := coalesce((e->>'from_owner_id')::bigint, v_free);
    perform public.store_insert_line(v_id, v_variant, v_qty, v_from_owner, null);

    if v_loc_kind = 'production_order' then
      null;
    else
      perform public.store_move(
        v_variant, v_qty, p_location_id, v_from_owner, p_location_id, p_owner_id, v_id
      );
    end if;
  end loop;

  update public.store_reservation set posted_at = now() where id = v_id;
  return jsonb_build_object('id', v_id);
end;
$f$;

-- Draft reservation: document + lines, posted_at null, no ledger
create or replace function public.store_create_reservation_draft(
  p_location_id bigint,
  p_owner_id bigint,
  p_lines jsonb,
  p_description text default '',
  p_creation_source text default 'manual',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  e jsonb;
  v_free bigint := public.store_free_owner_id();
begin
  if not exists (select 1 from public.store_stock_location where id = p_location_id
                   and kind in ('warehouse', 'production_order', 'transfer')) then
    raise exception 'Некорректное место резерва';
  end if;
  v_id := public.store_create_document(
    'reservation', coalesce(p_description, ''), null, null,
    p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_reservation (id, location_id, owner_id, creation_source, posted_at)
  values (v_id, p_location_id, p_owner_id, coalesce(p_creation_source, 'manual'), null);
  for e in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    perform public.store_insert_line(
      v_id,
      (e->>'product_variant_id')::bigint,
      (e->>'quantity')::numeric,
      coalesce((e->>'from_owner_id')::bigint, v_free),
      null
    );
  end loop;
  return jsonb_build_object('id', v_id);
end;
$f$;

create or replace function public.store_post_reservation(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_loc bigint;
  v_owner bigint;
  v_loc_kind text;
  v_posted timestamptz;
  r record;
  v_from bigint;
begin
  perform public.store_assert_subtype_kind(p_id, 'reservation');
  select location_id, owner_id, posted_at into v_loc, v_owner, v_posted
  from public.store_reservation where id = p_id;
  if v_posted is not null then return 'ok'; end if;
  select kind into v_loc_kind from public.store_stock_location where id = v_loc;

  for r in
    select product_variant_id, quantity, from_owner_id
    from public.store_document_product_line where document_id = p_id
  loop
    v_from := coalesce(r.from_owner_id, public.store_free_owner_id());
    if v_loc_kind <> 'production_order' then
      perform public.store_move(r.product_variant_id, r.quantity, v_loc, v_from, v_loc, v_owner, p_id);
    end if;
  end loop;
  update public.store_reservation set posted_at = now() where id = p_id;
  return 'ok';
end;
$f$;

create or replace function public.store_add_document_product_line(
  p_document_id bigint,
  p_product_variant_id bigint,
  p_quantity numeric,
  p_from_owner_id bigint default null,
  p_to_owner_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_kind text;
  v_status text;
  v_posted timestamptz;
  v_line bigint;
begin
  select kind, status into v_kind, v_status from public.store_document where id = p_document_id;
  if v_kind in ('shipment', 'adjustment') then
    raise exception 'Строки отгрузки и корректировки нельзя добавлять после создания';
  end if;
  if v_kind = 'reservation' then
    select posted_at into v_posted from public.store_reservation where id = p_document_id;
    if v_posted is not null then
      raise exception 'Строки проведённого резерва нельзя изменять';
    end if;
  elsif v_kind in ('customer_order', 'production_order', 'transfer', 'production_output') then
    if v_status in ('done', 'cancelled') then
      raise exception 'Строки завершённого документа нельзя изменять';
    end if;
    if v_kind = 'transfer' and v_status = 'in_progress' then
      raise exception 'Строки отправленного перемещения нельзя изменять';
    end if;
  end if;
  v_line := public.store_insert_line(
    p_document_id, p_product_variant_id, p_quantity, p_from_owner_id, p_to_owner_id
  );
  return v_line;
end;
$f$;

-- ---------------------------------------------------------------------------
-- Shipment
-- ---------------------------------------------------------------------------
create or replace function public.store_create_and_post_shipment(
  p_from_location_id bigint,
  p_to_location_id bigint,
  p_lines jsonb,
  p_description text default '',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_from_kind text;
  v_to_kind text;
  v_id bigint;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_to_owner bigint;
  v_from_owner bigint;
  v_order_owner bigint;
  v_direction text;
  v_free bigint := public.store_free_owner_id();
begin
  select kind into v_from_kind from public.store_stock_location where id = p_from_location_id;
  select kind into v_to_kind from public.store_stock_location where id = p_to_location_id;
  if v_from_kind = 'warehouse' and v_to_kind = 'customer_order' then
    v_direction := 'shipment';
  elsif v_from_kind = 'customer_order' and v_to_kind = 'warehouse' then
    v_direction := 'return';
  else
    raise exception 'Допустимы только маршруты склад → заказ клиента и заказ клиента → склад';
  end if;

  select stock_owner_id into v_order_owner
  from public.store_customer_order
  where stock_location_id = case when v_direction = 'shipment' then p_to_location_id else p_from_location_id end;

  v_id := public.store_create_document(
    'shipment', coalesce(p_description, ''), null, null,
    p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_shipment (id, from_location_id, to_location_id)
  values (v_id, p_from_location_id, p_to_location_id);

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    if v_direction = 'shipment' then
      v_from_owner := v_order_owner;
      v_to_owner := v_order_owner;
      perform public.store_insert_line(v_id, v_variant, v_qty, v_from_owner, v_to_owner);
      perform public.store_move(
        v_variant, v_qty, p_from_location_id, v_from_owner, p_to_location_id, v_to_owner, v_id
      );
    else
      v_from_owner := v_order_owner;
      v_to_owner := coalesce((e->>'to_owner_id')::bigint, v_free);
      perform public.store_insert_line(v_id, v_variant, v_qty, v_from_owner, v_to_owner);
      perform public.store_move(
        v_variant, v_qty, p_from_location_id, v_from_owner, p_to_location_id, v_to_owner, v_id
      );
    end if;
  end loop;

  return jsonb_build_object('id', v_id, 'direction', v_direction);
end;
$f$;

-- ---------------------------------------------------------------------------
-- Transfer
-- ---------------------------------------------------------------------------
create or replace function public.store_create_and_send_transfer(
  p_from_warehouse_id bigint,
  p_to_warehouse_id bigint,
  p_lines jsonb,
  p_expected_end_on date default null,
  p_description text default '',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_loc bigint;
  v_from_loc bigint;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_owner bigint;
  v_free bigint := public.store_free_owner_id();
begin
  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'Склады отправления и назначения должны различаться';
  end if;
  select stock_location_id into v_from_loc from public.store_warehouse
    where id = p_from_warehouse_id and deleted_at is null;
  if v_from_loc is null then raise exception 'Склад отправления не найден'; end if;
  if not exists (select 1 from public.store_warehouse where id = p_to_warehouse_id and deleted_at is null) then
    raise exception 'Склад назначения не найден';
  end if;

  v_id := public.store_create_document(
    'transfer', coalesce(p_description, ''), 'in_progress', p_expected_end_on,
    p_sequence_number, p_id, p_created_at, null
  );
  v_loc := public.store_new_stock_location('transfer');
  insert into public.store_transfer (id, from_warehouse_id, to_warehouse_id, stock_location_id)
  values (v_id, p_from_warehouse_id, p_to_warehouse_id, v_loc);

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    v_owner := coalesce((e->>'owner_id')::bigint, v_free);
    perform public.store_insert_line(v_id, v_variant, v_qty, v_owner, v_owner);
    perform public.store_move(v_variant, v_qty, v_from_loc, v_owner, v_loc, v_owner, v_id);
  end loop;

  return jsonb_build_object('id', v_id, 'status', 'in_progress');
end;
$f$;

create or replace function public.store_complete_transfer(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_to_wh bigint;
  v_to_loc bigint;
  v_tr_loc bigint;
  r record;
begin
  perform public.store_assert_subtype_kind(p_id, 'transfer');
  select status into v_status from public.store_document where id = p_id;
  if v_status = 'done' then return 'ok'; end if;
  if v_status <> 'in_progress' then
    raise exception 'Доставить можно только перемещение in_progress';
  end if;
  select to_warehouse_id, stock_location_id into v_to_wh, v_tr_loc
  from public.store_transfer where id = p_id;
  select stock_location_id into v_to_loc from public.store_warehouse where id = v_to_wh;

  for r in
    select product_variant_id, owner_id, quantity
    from public.store_stock_balance
    where location_id = v_tr_loc and quantity > 0
  loop
    perform public.store_move(r.product_variant_id, r.quantity, v_tr_loc, r.owner_id, v_to_loc, r.owner_id, p_id);
  end loop;

  update public.store_document set status = 'done' where id = p_id;
  return 'ok';
end;
$f$;

-- Keep send_transfer as alias for already in_progress (idempotent ok)
create or replace function public.store_send_transfer(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
begin
  perform public.store_assert_subtype_kind(p_id, 'transfer');
  select status into v_status from public.store_document where id = p_id;
  if v_status in ('in_progress', 'done') then return 'ok'; end if;
  raise exception 'Перемещение создаётся сразу in_progress через store_create_and_send_transfer';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Production output
-- ---------------------------------------------------------------------------
create or replace function public.store_create_production_output(
  p_production_order_id bigint,
  p_lines jsonb,
  p_expected_end_on date default null,
  p_complete boolean default true,
  p_description text default '',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_plant bigint;
  v_wh_loc bigint;
  v_status text;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_alloc_owner bigint;
  v_free bigint := public.store_free_owner_id();
  v_produced numeric;
  v_plan numeric;
begin
  perform public.store_assert_subtype_kind(p_production_order_id, 'production_order');
  select status into v_status from public.store_document where id = p_production_order_id;
  if v_status in ('done', 'cancelled') then
    raise exception 'Нельзя выпускать по завершённому заказу на производство';
  end if;
  select po.plant_id, w.stock_location_id into v_plant, v_wh_loc
  from public.store_production_order po
  join public.store_plant p on p.id = po.plant_id
  join public.store_warehouse w on w.id = p.warehouse_id
  where po.id = p_production_order_id;

  v_id := public.store_create_document(
    'production_output', coalesce(p_description, ''), 'draft',
    p_expected_end_on, p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_production_output (id, production_order_id)
  values (v_id, p_production_order_id);

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := (e->>'quantity')::numeric;
    v_plan := public.store_po_plan_qty(p_production_order_id, v_variant);
    v_produced := public.store_po_produced_qty(p_production_order_id, v_variant);
    if v_produced + v_qty > v_plan then
      raise exception 'Нельзя выпустить больше плана по варианту %', v_variant;
    end if;
    v_alloc_owner := coalesce((e->>'allocation_owner_id')::bigint, v_free);
    perform public.store_insert_line(v_id, v_variant, v_qty, null, v_alloc_owner);

    if p_complete then
      perform public.store_lock_stock_keys(jsonb_build_array(
        jsonb_build_object('v', v_variant, 'l', v_wh_loc, 'o', v_alloc_owner)
      ));
      perform public.store_write_tx(v_variant, v_qty, v_wh_loc, v_alloc_owner, v_id);
    end if;
  end loop;

  if p_complete then
    update public.store_document set status = 'done' where id = v_id;
  end if;
  return jsonb_build_object('id', v_id);
end;
$f$;

create or replace function public.store_complete_production_output(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_status text;
  v_po bigint;
  v_wh_loc bigint;
  r record;
  v_owner bigint;
begin
  perform public.store_assert_subtype_kind(p_id, 'production_output');
  select status into v_status from public.store_document where id = p_id;
  if v_status = 'done' then return 'ok'; end if;
  if v_status = 'cancelled' then
    raise exception 'Отменённый выпуск нельзя завершить';
  end if;
  select production_order_id into v_po from public.store_production_output where id = p_id;
  select w.stock_location_id into v_wh_loc
  from public.store_production_order po
  join public.store_plant p on p.id = po.plant_id
  join public.store_warehouse w on w.id = p.warehouse_id
  where po.id = v_po;

  for r in
    select product_variant_id, quantity, to_owner_id
    from public.store_document_product_line where document_id = p_id
  loop
    v_owner := coalesce(r.to_owner_id, public.store_free_owner_id());
    perform public.store_lock_stock_keys(jsonb_build_array(
      jsonb_build_object('v', r.product_variant_id, 'l', v_wh_loc, 'o', v_owner)
    ));
    perform public.store_write_tx(r.product_variant_id, r.quantity, v_wh_loc, v_owner, p_id);
  end loop;
  update public.store_document set status = 'done' where id = p_id;
  return 'ok';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Adjustment
-- ---------------------------------------------------------------------------
create or replace function public.store_create_and_post_adjustment(
  p_location_id bigint,
  p_lines jsonb,
  p_description text default '',
  p_sequence_number bigint default null,
  p_id bigint default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_id bigint;
  v_kind text;
  e jsonb;
  v_variant bigint;
  v_qty numeric;
  v_free bigint := public.store_free_owner_id();
  v_avail numeric;
begin
  if nullif(trim(p_description), '') is null then
    raise exception 'Описание корректировки обязательно';
  end if;
  select kind into v_kind from public.store_stock_location where id = p_location_id;
  if v_kind is distinct from 'warehouse' then
    raise exception 'Корректировка допускается только на складе';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Нужна хотя бы одна строка корректировки';
  end if;

  v_id := public.store_create_document(
    'adjustment', trim(p_description), null, null,
    p_sequence_number, p_id, p_created_at, null
  );
  insert into public.store_adjustment (id, location_id) values (v_id, p_location_id);

  -- Lock all keys first
  perform public.store_lock_stock_keys((
    select jsonb_agg(jsonb_build_object(
      'v', (e2->>'product_variant_id')::bigint,
      'l', p_location_id,
      'o', v_free
    ) order by (e2->>'product_variant_id')::bigint)
    from jsonb_array_elements(p_lines) e2
  ));

  for e in select * from jsonb_array_elements(p_lines)
  loop
    v_variant := (e->>'product_variant_id')::bigint;
    v_qty := round((e->>'quantity')::numeric, 2);
    if v_qty = 0 then raise exception 'Количество корректировки не может быть нулевым'; end if;
    perform public.store_insert_line(v_id, v_variant, v_qty, null, null);
    if v_qty < 0 then
      v_avail := public.store_qty(v_variant, p_location_id, v_free);
      if v_avail + v_qty < 0 then
        raise exception 'Недостаточно свободного остатка для списания';
      end if;
    end if;
    perform public.store_write_tx(v_variant, v_qty, p_location_id, v_free, v_id);
  end loop;

  return jsonb_build_object('id', v_id);
end;
$f$;

-- ---------------------------------------------------------------------------
-- Cancel (lifecycle only)
-- ---------------------------------------------------------------------------
create or replace function public.store_cancel_document(p_kind text, p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $f$
declare
  v_kind text;
  v_status text;
  v_posted timestamptz;
begin
  select kind, status into v_kind, v_status from public.store_document where id = p_id;
  if v_kind is distinct from p_kind then
    raise exception 'Несоответствие вида документа';
  end if;
  if v_kind in ('reservation', 'shipment', 'adjustment') then
    raise exception 'Проведённый складской документ нельзя отменить. Создайте новый документ.';
  end if;
  if v_kind = 'transfer' and v_status in ('in_progress', 'done') then
    raise exception 'Проведённый складской документ нельзя отменить. Создайте новый документ.';
  end if;
  if v_kind = 'production_output' and v_status = 'done' then
    raise exception 'Проведённый складской документ нельзя отменить. Создайте новый документ.';
  end if;
  if v_status in ('done', 'cancelled') then
    raise exception 'Документ уже завершён';
  end if;
  update public.store_document set status = 'cancelled' where id = p_id;
  return 'ok';
end;
$f$;

-- ---------------------------------------------------------------------------
-- Line / document immutability guards
-- ---------------------------------------------------------------------------
create or replace function public.store_document_line_guard()
returns trigger
language plpgsql
as $f$
declare
  v_kind text;
  v_status text;
  v_posted timestamptz;
begin
  select d.kind, d.status into v_kind, v_status
  from public.store_document d
  where d.id = coalesce(new.document_id, old.document_id);

  if tg_op = 'UPDATE' then
    if new.document_id is distinct from old.document_id
      or new.product_variant_id is distinct from old.product_variant_id
      or new.from_owner_id is distinct from old.from_owner_id
      or new.to_owner_id is distinct from old.to_owner_id
      or new.variant_name is distinct from old.variant_name
      or new.unit_price is distinct from old.unit_price
      or new.currency_id is distinct from old.currency_id
    then
      raise exception 'Поля снимка и владельцев строки нельзя изменять';
    end if;
  end if;

  -- INSERT allowed during create-and-post; freeze on UPDATE/DELETE for final kinds
  if v_kind in ('shipment', 'adjustment') and tg_op in ('UPDATE', 'DELETE') then
    raise exception 'Строки отгрузки и корректировки нельзя изменять';
  elsif v_kind = 'reservation' and tg_op in ('UPDATE', 'DELETE') then
    select posted_at into v_posted from public.store_reservation
      where id = coalesce(new.document_id, old.document_id);
    if v_posted is not null then
      raise exception 'Строки проведённого резерва нельзя изменять';
    end if;
  elsif v_kind in ('customer_order', 'production_order', 'transfer', 'production_output') then
    if v_status in ('done', 'cancelled') and tg_op in ('UPDATE', 'DELETE') then
      raise exception 'Строки завершённого документа нельзя изменять';
    end if;
    if tg_op = 'INSERT' and v_status in ('done', 'cancelled') then
      raise exception 'Строки завершённого документа нельзя изменять';
    end if;
    if v_kind = 'transfer' and v_status = 'in_progress' and tg_op in ('UPDATE', 'DELETE') then
      raise exception 'Строки отправленного перемещения нельзя изменять';
    end if;
    if v_kind = 'production_output' and v_status in ('in_progress', 'done') and tg_op in ('UPDATE', 'DELETE') then
      raise exception 'Строки выпуска нельзя изменять после старта';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$f$;

create trigger store_document_product_line_guard
  before insert or update or delete on public.store_document_product_line
  for each row execute function public.store_document_line_guard();

-- Block direct browser DML on protected tables via revoke (below).
-- Also block UPDATE of final document headers.
create or replace function public.store_document_header_guard()
returns trigger
language plpgsql
as $f$
begin
  if tg_op = 'DELETE' then
    raise exception 'Документы Store нельзя удалять';
  end if;
  if old.kind is distinct from new.kind
     or old.sequence_number is distinct from new.sequence_number
     or old.created_at is distinct from new.created_at
     or old.created_by is distinct from new.created_by then
    raise exception 'Идентичность документа нельзя изменять';
  end if;
  if old.status in ('done', 'cancelled')
     and (
       new.status is distinct from old.status
       or new.description is distinct from old.description
       or new.expected_end_on is distinct from old.expected_end_on
     ) then
    raise exception 'Завершённый документ нельзя изменять';
  end if;
  return new;
end;
$f$;

create trigger store_document_header_guard
  before update or delete on public.store_document
  for each row execute function public.store_document_header_guard();

-- Subtype insert must match kind
create or replace function public.store_subtype_kind_guard()
returns trigger
language plpgsql
as $f$
declare
  v_expected text := tg_argv[0];
begin
  perform public.store_assert_subtype_kind(new.id, v_expected);
  return new;
end;
$f$;

create trigger store_customer_order_kind_guard
  before insert on public.store_customer_order
  for each row execute function public.store_subtype_kind_guard('customer_order');
create trigger store_production_order_kind_guard
  before insert on public.store_production_order
  for each row execute function public.store_subtype_kind_guard('production_order');
create trigger store_reservation_kind_guard
  before insert on public.store_reservation
  for each row execute function public.store_subtype_kind_guard('reservation');
create trigger store_shipment_kind_guard
  before insert on public.store_shipment
  for each row execute function public.store_subtype_kind_guard('shipment');
create trigger store_adjustment_kind_guard
  before insert on public.store_adjustment
  for each row execute function public.store_subtype_kind_guard('adjustment');
create trigger store_transfer_kind_guard
  before insert on public.store_transfer
  for each row execute function public.store_subtype_kind_guard('transfer');
create trigger store_production_output_kind_guard
  before insert on public.store_production_output
  for each row execute function public.store_subtype_kind_guard('production_output');

-- ---------------------------------------------------------------------------
-- RLS: SELECT only for anon/authenticated; no open-all DML policies
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_user',
    'store_document_kind','store_document','store_document_history','store_document_product_line',
    'store_customer_order','store_production_order','store_reservation','store_shipment',
    'store_adjustment','store_transfer','store_production_output',
    'store_stock_location','store_stock_owner','store_stock_transaction',
    'store_currency','store_region_group','store_region',
    'store_brand','store_product_family','store_category','store_product_category',
    'store_warehouse','store_plant','store_product','store_product_variant',
    'store_product_price','store_product_region_status'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists store_select_%I on public.%I', t, t);
    execute format(
      'create policy store_select_%I on public.%I for select to anon, authenticated using (true)',
      t, t
    );
  end loop;
end $$;

-- View grants (revoke defaults first — views inherit ALL for PUBLIC)
revoke all on public.store_stock_balance from public, anon, authenticated;
grant select on public.store_stock_balance to anon, authenticated, service_role;

-- Table grants: SELECT only to anon/authenticated; full to service_role
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_user',
    'store_document_kind','store_document','store_document_history','store_document_product_line',
    'store_customer_order','store_production_order','store_reservation','store_shipment',
    'store_adjustment','store_transfer','store_production_output',
    'store_stock_location','store_stock_owner','store_stock_transaction',
    'store_currency','store_region_group','store_region',
    'store_brand','store_product_family','store_category','store_product_category',
    'store_warehouse','store_plant','store_product','store_product_variant',
    'store_product_price','store_product_region_status'
  ]
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

-- Sequences: no nextval for anon
do $$
declare
  r record;
begin
  for r in
    select sequencename
    from pg_sequences
    where schemaname = 'public'
      and (sequencename like 'store_%' or sequencename like 'app_user_%')
  loop
    execute format('revoke all on sequence public.%I from anon, authenticated', r.sequencename);
    execute format('grant usage, select on sequence public.%I to service_role', r.sequencename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Function grants: public command RPCs only; revoke internals from PUBLIC
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select n.nspname as nsp, p.proname as name,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'store_%'
  loop
    execute format(
      'revoke all on function %I.%I(%s) from public, anon, authenticated',
      r.nsp, r.name, r.args
    );
  end loop;
end $$;

-- Public command RPCs (browser may EXECUTE)
grant execute on function public.store_create_warehouse(text) to anon, authenticated, service_role;
grant execute on function public.store_update_warehouse(bigint, text) to anon, authenticated, service_role;
grant execute on function public.store_create_plant(text, bigint) to anon, authenticated, service_role;
grant execute on function public.store_update_plant(bigint, text) to anon, authenticated, service_role;
grant execute on function public.store_create_region(text, text) to anon, authenticated, service_role;
grant execute on function public.store_update_region(bigint, text) to anon, authenticated, service_role;
grant execute on function public.store_create_product_variant(text, text, text, bigint, text, bigint) to anon, authenticated, service_role;
grant execute on function public.store_update_document_kind_prefix(text, text) to anon, authenticated, service_role;
grant execute on function public.store_update_expected_end(bigint, date) to anon, authenticated, service_role;
grant execute on function public.store_create_customer_order(bigint, text, date, jsonb, bigint, bigint, timestamptz) to anon, authenticated, service_role;
grant execute on function public.store_close_customer_order(bigint) to anon, authenticated, service_role;
grant execute on function public.store_create_production_order(bigint, jsonb, text, date, text, bigint, bigint, timestamptz) to anon, authenticated, service_role;
grant execute on function public.store_add_production_line(bigint, bigint, numeric) to anon, authenticated, service_role;
grant execute on function public.store_set_production_status(bigint, text) to anon, authenticated, service_role;
grant execute on function public.store_close_production_order(bigint) to anon, authenticated, service_role;
grant execute on function public.store_create_and_post_reservation(bigint, bigint, jsonb, text, text, bigint, bigint, timestamptz) to anon, authenticated, service_role;
grant execute on function public.store_create_reservation_draft(bigint, bigint, jsonb, text, text, bigint, bigint, timestamptz) to anon, authenticated, service_role;
grant execute on function public.store_post_reservation(bigint) to anon, authenticated, service_role;
grant execute on function public.store_add_document_product_line(bigint, bigint, numeric, bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.store_create_and_post_shipment(bigint, bigint, jsonb, text, bigint, bigint, timestamptz) to anon, authenticated, service_role;
grant execute on function public.store_create_and_send_transfer(bigint, bigint, jsonb, date, text, bigint, bigint, timestamptz) to anon, authenticated, service_role;
grant execute on function public.store_send_transfer(bigint) to anon, authenticated, service_role;
grant execute on function public.store_complete_transfer(bigint) to anon, authenticated, service_role;
grant execute on function public.store_create_production_output(bigint, jsonb, date, boolean, text, bigint, bigint, timestamptz) to anon, authenticated, service_role;
grant execute on function public.store_complete_production_output(bigint) to anon, authenticated, service_role;
grant execute on function public.store_create_and_post_adjustment(bigint, jsonb, text, bigint, bigint, timestamptz) to anon, authenticated, service_role;
grant execute on function public.store_cancel_document(text, bigint) to anon, authenticated, service_role;

-- Read helpers useful to clients (optional)
grant execute on function public.store_current_user_id() to anon, authenticated, service_role;
grant execute on function public.store_free_owner_id() to anon, authenticated, service_role;
grant execute on function public.store_qty(bigint, bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.store_po_plan_qty(bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.store_po_produced_qty(bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.store_po_assigned_qty(bigint, bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.store_po_free_demand(bigint, bigint) to anon, authenticated, service_role;

-- Seed currency USD
insert into public.store_currency (code, name) values ('USD', 'Доллар США'), ('AED', 'Дирхам ОАЭ'), ('RUB', 'Российский рубль');

commit;
