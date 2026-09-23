# Intent: чистая целевая модель данных Store

## Цель

Спроектировать заново понятную, реляционную и проверяемую Store DB-модель без накопленного экспериментального мусора. Сама схема должна быть самодостаточным источником истины для backend-разработчика: таблицы, колонки, связи, ограничения, индексы, представления, функции, триггеры, права и подробные DB-комментарии должны полностью объяснять структуру и логику без отдельного handoff-документа. Проектирование application API в scope не входит.

Целевая модель остаётся в PostgreSQL-схеме `public`; все объекты Store используют namespace `store_*`. Отдельную схему `store` не вводить.

## Базовый подход

- Подготовить одну чистую squashed baseline-миграцию Store, а не воспроизводить цепочку экспериментальных миграций.
- Не сохранять legacy-совместимость: без aliases, переходных полей, старых названий и устаревших RPC/signatures.
- Отдельно дать карту переноса полезных данных из текущей модели в новую.
- Физически пересоздать затронутые таблицы, чтобы убрать dropped-column tombstones.
- Не создавать отдельную backend-документацию: реализованная схема и её комментарии являются каноническим контрактом.
- Для каждой таблицы и **каждой колонки** `store_*` обязательны подробные `COMMENT ON`: business meaning, единицы и precision, семантика `NULL`, источник или вычисляемость, lifecycle/immutability и допустимые значения. Комментарий не должен просто повторять identifier.

## Документы

Сохранить class-table model:

- `store_document` — общий registry identity, вида, номера, lifecycle, описания и аудита;
- отдельная subtype-таблица для каждого вида документа;
- универсальные files/comments и другие общие отношения ссылаются на `store_document.id`;
- subtype `id` — только PK/FK без собственного identity/default/sequence.

`store_document` содержит как минимум: `id`, `kind` FK на `store_document_kind`, `sequence_number`, `description`, nullable `status`, nullable `expected_end_on`, `created_at`, `created_by`. `series` удалить. Номер уникален по `(kind, sequence_number)`, а отображаемый префикс берётся из `store_document_kind(number_prefix, display_name)`. Изменение префикса меняет отображение старых номеров. Номер выдаётся под row lock соответствующей строки `store_document_kind` через `max(sequence_number)+1` в той же транзакции; отдельный counter не хранить.

Виды: customer order, production order, reservation, shipment, adjustment, transfer, production output. `output` переименовать в `production_output`; `manufacturer` везде заменить на `plant`; `return` удалить из document kinds.

Единый lifecycle vocabulary: `draft`, `in_progress`, `done`, `cancelled`, с допустимым подмножеством по kind. Lifecycle есть у customer order, production order, transfer и production output. Reservation, shipment и adjustment — без status. `planned`, `posted`, `sent`, `delivered`, `closed` и старое `done/closed` раздвоение удалить.

`store_document_history` — анализируемая последовательность полных lifecycle snapshots: `id`, `document_id`, `status`, `expected_end_on`, `changed_at`, `changed_by`. Удалить `document_type` и `event_type`. Историю пишет единственный trigger на lifecycle-полях `store_document`; ручные вставки из RPC запрещены. Документы без lifecycle в history не попадают. Авторские ссылки идут в общий user catalog приложения; `store_user` удалить.

## Строки документов и подтипы

Оставить одну `store_document_product_line`, без line subtype tables. Kind-specific nullable fields и правила количества проверяются в DB по виду документа.

- Все строки и складские факты обязательно ссылаются на `product_variant_id`; physical delete запрещён.
- Исторический snapshot строки реляционный и минимальный: `variant_name` и фактически использованная цена. Не хранить JSON snapshot, SKU, unit, plant identity и наборы региональных цен/statuses.
- Production order фиксирует только plant price; customer order — dealer price региона покупателя; production output цену производства не хранит.
- Каждый customer order имеет обязательный `region_id`.
- Для adjustment quantity — signed delta; один документ может смешивать положительные и отрицательные строки. `operation`, source-поля, subtype status и explanation удалить.
- Общее `description` заменяет customer-order description, reservation note и adjustment explanation.
- Shipment хранит только маршрут через from/to stock locations; `customer_order_id` удалить как выводимый дубль.
- Reservation имеет одного destination owner в header, а source owner остаётся на строках и может различаться. `creation_source`: `manual`, `customer_order_close`, `production_order_close`.

## Остатки, места и владельцы

Ввести registry `store_stock_location` и ссылаться на место одним `location_id` FK без polymorphic `location_type/location_id`. Warehouse, production order, transfer и customer order получают независимый `stock_location_id`.

Ввести registry `store_stock_owner` и ссылаться одним обязательным `owner_id` FK без `owner_type/owner_id`. Customer order и region получают независимый `stock_owner_id`; свободный остаток представлен singleton owner `free`. Document id, stock location id и stock owner id используют независимые sequences.

`store_stock_transaction` сохраняет имя и является append-only ledger. Целевая запись: variant, signed quantity с точностью до сотых, location FK, owner FK, document FK, timestamp. Browser имеет только чтение; вставка возможна лишь внутри контролируемой posting-логики; UPDATE/DELETE запрещены на уровне DB. Balance view использует точную сумму и `sum(quantity) <> 0`, без epsilon.

Posting обязан атомарно блокировать canonical `(variant, location, owner)` keys advisory locks в стабильном порядке, повторно проверять доступность под lock и только затем добавлять ledger facts. Это устраняет race, при котором параллельные операции создают отрицательный остаток.

## Каталог и pricing

Разделить `store_product` и `store_product_variant`; SKU, unit, plant, цены, document lines и stock facts относятся к variant. Нормализовать classification: `store_brand`, `store_product_family`, `store_category`, `store_product_category`.

Pricing повторяет предметную production-модель без её legacy-механики:

- общая `store_product_price` для purchase/dealer/retail с currency FK и `active`;
- purchase — global, dealer/retail — regional;
- regional dealer/retail statuses — в отдельной таблице settings;
- `start_date`, `end_date`, legacy currency text, `instance_id` и soft-delete machinery production pricing не переносить;
- отдельная история каталожных цен не нужна: использованная цена фиксируется в document line.

Добавить relational `store_currency` и `store_region_group`; у `store_region` хранить code, default retail/dealer currencies, group, active и sort order.

Store reference catalogs используют `deleted_at`, включая product, variant, brand, family, category, plant, warehouse, region, currency и связанные справочники. Уникальность активных записей обеспечивать partial unique indexes `WHERE deleted_at IS NULL`. Связь plant/warehouse односторонняя: `store_plant.warehouse_id NOT NULL UNIQUE`; `store_warehouse.plant_id` удалить.

## DB-логика, защита и очистка

- Централизованно обеспечивать соответствие `store_document.kind` subtype-таблице и kind registry для stock location/owner.
- Централизованно запрещать прямые browser mutations document headers/lines. Immediate/final документы immutable; изменения draft выполняются только контролируемой DB-логикой.
- Не использовать audit history как источник авторизации или mutability.
- Удалить три request/idempotency tables и не добавлять `request_key`: для прототипа это лишнее.
- Удалить public reset RPC; demo seed/reset вынести во внешнее privileged tooling.
- Текущий слой Store functions/triggers переписать целиком: он зависит от отвергнутых user/status/owner/product/output/request concepts. Удалить orphan и obsolete functions/triggers.
- Явно отозвать у anon/authenticated наследованные DML-права на Store tables и sequences, а у PUBLIC/anon/authenticated — EXECUTE внутренних Store functions. Не менять глобальные defaults других модулей.
- RLS не должна содержать permissive `ALL true`; view `store_stock_balance` должна иметь явный security mode и только необходимый SELECT grant.
- Создать осмысленные индексы для всех FK и реальных query paths.

## Критерии приёмки baseline

Автоматический DB-аудит должен падать, если:

- у anon/authenticated остаётся прямой Store DML;
- PUBLIC может выполнять внутренние Store functions;
- существует open-all RLS;
- subtype table имеет собственную identity sequence;
- остались legacy kinds, поля, aliases, request/reset objects или dropped-column tombstones;
- отсутствует индекс для обязательного FK/query path;
- есть `store_*` таблица или колонка без содержательного DB comment;
- history имеет больше одного механизма записи либо ledger допускает изменение существующих фактов.
