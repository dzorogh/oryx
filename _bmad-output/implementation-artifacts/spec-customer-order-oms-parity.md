---
title: 'Карточка заказа клиента: паритет с прод-заказом OMS'
type: 'feature'
created: '2026-09-29'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '8c66fddf1a133fec9e82c7251e9ab79d3cdc9a05'
context:
  - '{project-root}/_bmad-output/specs/spec-customer-order-oms-parity/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-customer-order-oms-parity/prod-parity-decisions.md'
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Карточке заказа клиента (`/store/logistics/customer-orders/[id]`) не хватает того, чем менеджер пользуется в прод-заказе OMS каждый день: тенанта, региона и автора в шапке, сводок оплаты и доставки, цены и суммы строк, вместимости контейнера и калькулятора загрузки, копии заказа, заметки, файлов, комментариев и номера в учётной системе.

**Approach:** Реализовать CAP-1…CAP-12 из `_bmad-output/specs/spec-customer-order-oms-parity/SPEC.md` целиком (пользователь: «реализовывай полностью»): новые таблицы и command RPC в демо-Supabase, расширение `store_document_context`, новые блоки карточки заказа клиента и деньги перемещения; удалить песочницу `/store/orders` и `ORDER_PRESETS`.

**Decisions (29.09.2026):**
- Объём: вся спека одним заходом, без разбиения.
- Файлы (CAP-10): поднять Supabase Storage в Dokploy-компоузе `supabase` (`oryx-supabase-bb1dnn`): сервис `storage` (`supabase/storage-api`, файловый бэкенд, том `../files/volumes/storage`, без imgproxy); приватный бакет `store-documents` с лимитом файла; объекты пишет и читает браузер через Storage API с anon-ключом (RLS-политики `storage.objects` только для этого бакета), метаданные — таблица `store_document_file` через command RPC.
- Регион тенанта (CAP-1): страница «Тенанты» в `/settings/tenants` (сейчас заглушка) — список тенантов с логотипом и выбором региона, сохранение сразу командой RPC.

## Boundaries & Constraints

**Always:**
- Контракт — SPEC.md и `prod-parity-decisions.md` (capabilities, constraints, non-goals, assumptions).
- Браузер пишет только command RPC (`security definer`), anon — SELECT на таблицах (единственное исключение — объекты бакета `store-documents` через Storage API); новые read-данные приходят в `store_document_context` (одна загрузка на страницу). Серверные функции не ходят в интернет.
- Коды мест по `place-codes.md` (регион — `store_region.code`, без названий складов и заводов). Весь текст UI на русском.
- Миграции применяются на Oryx-инстанс через MCP `oryx-supabase` `apply_migration`; сид `npm run seed:logistics` после `truncate … cascade` должен засевать тенантов заново.
- После диагностических записей в живую базу — удалить их в той же сессии.

**Never:**
- Статусы прода, архив, маршруты, трекинг, права, роли, плательщик платежа, интеграция с учётной системой (см. Non-goals SPEC.md).
- Поле тенанта у заказа; ручной статус оплаты; платежи у отгрузок; доли платежей перемещения.
- Изменение поведения модуля комментариев на странице новостей (всё новое — опциональные props).
- Push в `origin` и PR.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Тенант региона | Регион заказа указан у 0 / 1 / 2 тенантов | «—» / имя / имена через запятую | N/A |
| Оплата заказа | Сумма 100, платежи 30 оплачен + 70 запланирован со сроком вчера | «Оплачено 30 из 100», срок вчера, метка «просрочен» | Нет денег — «—» |
| Доставка | 2 перемещения заказа в USD и EUR, снимок заказа в CNY | X и Y пересчитаны в CNY по снимку заказа; валюты нет в снимке — платёж пропущен | Нет платежей — «—» |
| Разные владельцы | В перемещении свободный товар и товар заказа | Предупреждение «В перемещении товары разных владельцев» в карточке перемещения и у сводки доставки | N/A |
| Копия | Заказ с удалённым вариантом в строках | Черновик с тем же регионом, источником, строками (кол-во, цена, валюта цены) без удалённых; открывается новая карточка | Все варианты удалены — ошибка «Нет строк для копии» |
| Цена строки | Строка без `unit_price` | «Цена» и «Сумма» — «—» | N/A |
| Ссылка учёта | `ftp://x`, `example.com` | Не сохраняется, тост «Ссылка должна начинаться с http:// или https://» | Пустая строка очищает поле |
| Файл | Файл больше лимита | Отказ до загрузки с текстом лимита | Ошибка сервера — тост |

</frozen-after-approval>

## Code Map

- Dokploy compose `supabase` (raw, `composeId` в `~/.config/oryx/dokploy-state.json`; API через `scripts/oryx_supabase.py` `dokploy()`) -- сервисы kong/auth/rest/functions/db/supavisor, `storage` нет; Kong уже маршрутизирует `/storage/v1/` → `http://storage:5000/` (сейчас 503). Env уже содержит `GLOBAL_S3_BUCKET`, `REGION`, `STORAGE_TENANT_ID`, `S3_PROTOCOL_*`. Схема `storage` в БД есть (10 таблиц). Образец сервиса — официальный `supabase/docker/docker-compose.yml` (`storage-api:v1.74.0`).
- `app/settings/tenants/page.tsx` -- заглушка `ModulePlaceholderPage`; сюда страница «Тенанты». Навигация — `src/features/settings/settings-nav.ts` («Tenants» → «Тенанты»).

- `src/features/logistics/customer-orders-page.tsx` -- `CustomerOrderDetailPage` (L362+): шапка `DocumentHeader` meta (L549–615), вкладки (L620–742), этап «Перемещения» через `relatedTransfersForOrder`. Сюда — новые meta, действия, вкладки.
- `src/features/logistics/ui/document/document-header.tsx`, `document-meta-field.tsx` -- мета-сетка и ghost-контролы (`DocumentMetaDateInput` — образец для текстового/ссылочного ghost-поля).
- `src/features/logistics/ui/customer-order-lines-table.tsx` -- таблица «Товары» (колонки «Заказано», «Поток», склады, «Отгружено»); цена берётся из `snapshot.documentProductLines` (`unitPrice`, `currencyId`) по `documentId + productVariantId`.
- `src/features/logistics/order-money.ts` -- `convert`, `isPaymentOverdue`, `summarizeOrderMoney`, `mapOrderMoneyContext`, `formatOrderMoney`; сюда чистые функции сводок оплаты и доставки (unit-тесты).
- `src/features/logistics/ui/order-money-tab.tsx` -- `OrderMoneyTab` (валюта, курсы, сумма, платежи); переиспользовать для перемещения через `variant="transfer"` (без расчётной/суммы/«Не распределено», подписи «перемещения»).
- `src/features/logistics/transfers-page.tsx` -- `TransferDetailPage` (L253+), вкладки L441–498; `useLogisticsStore` уже отдаёт `orderMoney`.
- `src/features/logistics/transfer-detail-projection.ts` -- `projectTransferDetail(...).groups` — владельцы товара перемещения; `groups.length > 1` = разные владельцы.
- `src/features/logistics/logistics-related.ts` -- `relatedTransfersForOrder` — перемещения заказа.
- `src/features/logistics/logistics-api.ts` -- `LogisticsPayload`/`MappedLogistics` (L170–206), `mapLogisticsPayload` (L234–821), RPC-обёртки (L1290–1560). Сюда — новые ключи контекста и команды.
- `src/features/logistics/use-logistics-store.ts` -- состояние контекста документа; добавить новые поля.
- `src/features/logistics/document-timeline.ts` -- `buildDocumentTimeline`, `userName`; источник системных сообщений ленты.
- `src/features/store/checkout/store-checkout-page.tsx` -- `PlantPackingSection` (L80–205) + сборка `MixedPackItem` (L323–351): вынести в общий компонент калькулятора.
- `src/domain/packing/mixed-containers.ts`, `src/features/packing-visualization/components/multi-container-scene.tsx`, `src/features/store/cart/cart-catalog.ts` (`StoreContainerTypeRow`) -- движок и 3D; не менять.
- Песочница к удалению: `app/store/orders/**`, `src/components/store/orders/*`, `src/domain/packing/constants.ts` (`ORDER_PRESETS`, `getOrderPresetById`, `DEFAULT_ORDER_ID`), `src/components/store/pim/pim-order-nav.tsx`, `pim-aside.tsx`, `app/pim/layout.tsx` (aside), `app/pim/orders/[orderId]/page.tsx`, поисковая запись `src/components/layout/global-search-modal.tsx` L29, `src/features/comments/comment-entities.ts` L27/33, README; плюс модули движка, используемые только песочницей (проверить импорт-граф перед удалением).
- `src/features/comments/comments-panel.tsx`, `use-comments-state.ts`, `comments-storage.ts`, `comments-types.ts` -- панель; `initialItems` читается один раз, лента не сохраняется. Добавить опциональные `systemNotices` (живые) и сохранение ленты в localStorage по scope.
- `src/lib/demo-tenants.ts` -- `DEMO_TENANTS` (id, label, logo); id тенанта в БД = этот id.
- SQL: `20260925190000_store_order_money.sql` (`store_order_money`/`store_order_payment`, команды, `store_order_money_payload`, `store_document_context` L584–658 — последняя версия), `20260928144812_store_cart_checkout.sql` (`store_order_money_init`, `store_product_variant_logistics`, `store_container_type`), `20260928165138_store_code_prefix_registry.sql` (`store_context_payload`, `store_checkout_customer_order` — образец создания черновика), `20260925150000_…` (`store_insert_line`).
- `scripts/seed-logistics.mjs` -- wipe `truncate … store_region … cascade` (L109–138); добавить засев тенантов.
- `docs/features/logistics.md`, `docs/features/store-cart-checkout.md`, `docs/features/comments-module.md`, `docs/conventions/backend/supabase.md` -- обновить.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_store_customer_order_oms_parity.sql` -- `store_tenant(id text pk, name, region_id → store_region null, sort_order)` + засев 13 тенантов (Sharmax BY/KZ/MX/OM/UZ/AE → by/kz/mx/om/uz/ae, Globaldrive → ru, остальные без региона); `store_customer_order.accounting_number`, `accounting_url` (check http/https); `store_order_payment_event` (payment_id, document_id, status, amount, due_on, changed_at) + trigger при смене статуса; деньги перемещения: `store_order_money_init` и trigger на `store_transfer` (валюта — валюта производств), backfill существующих перемещений; команды `store_set_tenant_region`, `store_copy_customer_order`, `store_set_document_description` (заказ клиента), `store_set_customer_order_accounting`; файлы: `store_document_file` (id, document_id, storage_path, name, size_bytes, mime_type, created_at) + `store_add_document_file` / `store_delete_document_file`, бакет `store-documents` (private, лимит 10 МБ) и политики `storage.objects` для anon только в этом бакете; чтение тенантов — `store_tenant` SELECT для anon; `store_document_context`: для заказа клиента — `tenants`, `variant_logistics`, `container_types`, `transfer_money` (деньги+платежи перемещений из контекста), `order_payment_events`, `document_files`, accounting-поля в строке заказа; для перемещения — `store_order_money_payload`. Гранты как у существующих команд. -- данные всех CAP.
- [x] `src/features/logistics/order-money.ts` (+ новый `customer-order-oms.ts` при необходимости) -- `summarizePayments` (оплачено/итого/ближайший срок/просрочка), `summarizeDelivery` (перемещения → валюта заказа по снимку заказа), `validateAccountingUrl`, `lineAmount`; `tests/unit/*.test.ts` на матрицу. -- формулы вне UI.
- [x] `src/features/logistics/logistics-api.ts`, `use-logistics-store.ts`, `logistics-types.ts` -- маппинг новых ключей контекста, команды RPC.
- [x] `src/features/logistics/ui/customer-order-lines-table.tsx` -- колонки «Цена», «Сумма», «Макс. в конт.» (title-подсказка).
- [x] `src/features/store/packing/container-load-calculator.tsx` (новый) + `store-checkout-page.tsx` -- общий калькулятор; checkout использует его без изменения поведения.
- [x] `src/features/logistics/customer-orders-page.tsx` + новые `ui/customer-order-*.tsx` -- meta «Регион», «Тенант», «Автор», «Оплачено», «Доставка», «Номер в учётной системе», «Ссылка в учётной системе»; редактируемая заметка; «Создать копию»; вкладки «Контейнеры», «Файлы», «Комментарии».
- [x] `src/features/logistics/transfers-page.tsx` -- вкладка «Деньги» (`OrderMoneyTab variant="transfer"`), предупреждение о разных владельцах.
- [x] `src/features/comments/*` -- опциональные `systemNotices` и `persist` без изменения поведения новостей.
- [x] Dokploy compose `supabase` -- добавить сервис `storage` (storage-api, `STORAGE_BACKEND=file`, `ENABLE_IMAGE_TRANSFORMATION=false`, `mem_limit`), задеплоить, проверить `GET /storage/v1/bucket` → 200; остальные сервисы не менять. Затем бакет и политики миграцией.
- [x] `app/settings/tenants/page.tsx` + `src/features/settings/tenants/*` -- «Тенанты»: логотип, название, выбор региона (код; «Без региона»), сохранение `store_set_tenant_region`.
- [x] Удаление песочницы `/store/orders`, `ORDER_PRESETS`, редирект `/pim/orders/[id]` → `/store/logistics/customer-orders/[id]`.
- [x] `scripts/seed-logistics.mjs` -- засев тенантов после wipe.
- [x] Документация: `logistics.md` (раздел «Карточка заказа клиента», деньги перемещения, таблицы/RPC), `store-cart-checkout.md`, `comments-module.md`, `supabase.md` (Storage теперь запущен, бакет `store-documents`), README.

**Acceptance Criteria:**
- Given заказ клиента с хаба, when открыта карточка, then шапка показывает регион (код), тенант(ов) или «—», автора (как в списке и первой записи «Истории»), «Оплачено X из Y» и «Доставка: оплачено X из Y» или «—».
- Given тенант переведён в другой регион, when перезагружена карточка заказа прежнего региона, then тенант в шапке исчез без правки заказа.
- Given «Создать копию», when подтверждено, then открыт новый черновик с теми же регионом, источником и строками; исходный заказ не изменился; описание, платежи, файлы, комментарии, учётные поля пусты.
- Given вкладка «Товары», when сложить «Сумма» по снимку курсов, then равно «Расчётной стоимости» во вкладке «Деньги».
- Given вкладка «Контейнеры», when изменено количество строки, then укладка пересчитана; товары без габаритов перечислены; `/store/orders` отдаёт 404, `/pim/orders/1` не ведёт на песочницу.
- Given правка заметки, учётных полей, загрузка файла, комментарий, when страница перезагружена, then всё на месте; смена статуса заказа видна в «Истории» и системным сообщением в ленте комментариев.
- Given перемещение, when добавлен/изменён/удалён платёж в любой валюте, then сводка доставки заказа меняется после перезагрузки; в календаре производства платежи перемещений не появляются.

## Implementation Notes

- 29.09.2026, родительский агент: задача Dokploy выполнена. В compose `supabase` добавлен сервис `storage` (`supabase/storage-api:v1.74.0`, `mem_limit: 384m`, файловый бэкенд, `ENABLE_IMAGE_TRANSFORMATION=false`), задеплоен (`done`). `GET /storage/v1/bucket` → 200 `[]`, `/rest/v1` → 200. Резервная копия прежнего compose — `~/.config/oryx/supabase-compose-backup-20260929.yml`. Бакет и политики ещё не созданы — это часть миграции. Повторно compose не трогать.

## Spec Change Log

## Review Triage Log

| # | Источник | Находка | Вердикт | Обоснование | Маршрут |
|---|---|---|---|---|---|
| 1 | blind | Отменённые перемещения входят в сводку доставки и флаг «разные владельцы» | medium | `relatedTransfersForOrder` не фильтрует статус; отменённое перемещение не везёт товар заказа, а платежи попадут в «Доставку» | patch |
| 2 | blind, edge (claim) | Платежи без курса в снимке заказа молча пропускаются, `skipped` не показан | low | Снимок содержит все валюты справочника на момент создания; пропуск возможен только для валюты, добавленной позже. Редко, фикс — новая UI-ветка | reject |
| 3 | blind | В шапке заказа предупреждение о разных владельцах — только иконка с `title`/`sr-only` | medium | CAP-5 требует показать текст предупреждения у сводки доставки; на тач-экране текста не видно | patch |
| 4 | blind | Учётные поля и файлы редактируемы у закрытого заказа | false | Спека не требует только чтения для этих полей; заметку блокирует существующий `store_document_header_guard`, учётные поля и файлы после закрытия — нормальный сценарий | reject |
| 5 | blind | Платёж, созданный сразу «Оплачен», и удаление не дают события ленты | false | По дизайну (Design Notes): событие — только смена статуса, не создание | reject |
| 6 | blind | `buildOrderSystemNotices` различает изменения по подписи «Статус», возможна коллизия id | low | В `document-timeline` у записи только два вида изменений (статус, дата) — коллизии нет; хрупкость без названного вреда | reject |
| 7 | blind, edge | Номер и ссылка учёта перезаписывают друг друга при сохранении во время загрузки | low | Нужно сохранить второе поле раньше, чем закончится перезагрузка первого (<1 с); фикс требует смены RPC | reject |
| 8 | blind | Невалидная ссылка стирает введённый текст | low | Реально: `AccountingUrlInput` сбрасывает черновик и выходит из режима правки; фикс прямой — оставить черновик | patch |
| 9 | blind, edge | Ошибка `storage.remove` не проверяется, объект может остаться; anon может удалять объекты напрямую | low | Осиротевший объект невидим пользователю; доступ anon к бакету — решение пользователя (Decisions) | reject |
| 10 | blind, edge | Backfill денег перемещений без запасной USD, если нет `store_setting` | false | Строка `store_setting` создана миграцией денег и не очищается сидом; backfill уже выполнен успешно | reject |
| 11 | blind | Укладка на главном потоке, воркер удалён | false | Удалённый воркер обслуживал движок песочницы; `packMixedContainers` и в checkout считается синхронно; вкладка рендерится только выбранной | reject |
| 12 | blind | Контекст заказа вырос из-за вариантов перемещений | false | Замер: OMS-906 — 382 КБ, 907 — 324 КБ, 921 — 293 КБ; тот же порядок, что и прежний контекст со всеми заказами | reject |
| 13 | blind | Тенанты продублированы в миграции, сиде и `DEMO_TENANTS` | low | Расхождение даст только отсутствие логотипа; редко, фикс — новый тест/общий источник | reject |
| 14 | blind | Перевод модуля комментариев и удаление песочницы — посторонние изменения | false | Удаление песочницы — задача спеки (CAP-8); перевод — обязательное правило русских подписей для вкладки «Комментарии» | reject |
| 15 | blind, edge | Строка с `currency_id`, отсутствующим в `currencies`: в таблице «—», а в расчётной учитывается | low | Возможно только для мягко удалённой валюты; в демо нет | reject |
| 16 | blind | Нет теста на `mapTransferMoney` c USD по умолчанию | low | Покрыто находкой 21 (тест маппера) | patch (в 21) |
| 17 | edge | Две строки одного варианта в заказе дают дубли `MixedPackItem` | false | `store_set_order_line_quantity` сливает строки по товару; в демо-базе дублей 0 | reject |
| 18 | edge | Смена scope без перемонтирования пишет комментарии в чужой ключ | false | `CustomerOrderCommentsTab` монтирует `CommentsPanel` с `key={orderId}` | reject |
| 19 | edge | `store_set_document_description` не проверяет закрытый заказ | false | Триггер `store_document_header_guard` на `store_document` запрещает правку завершённых документов | reject |
| 20 | edge | Настройки тенантов: удалённый регион, параллельные сохранения; сид-очистка бакета >1000 объектов | low | Редкие сценарии демо без названного пользовательского вреда | reject |
| 21 | verification-gap | Маппер `mapCustomerOrderOmsContext` (tenants, transfer_money, events, files) не тестируется на SQL-форме | medium | Ошибка ключа обнулит шапку/ленту/файлы при зелёных тестах | patch |
| 22 | verification-gap | Учётные поля в `mapLogisticsPayload` не проверены тестом | medium | Опечатка ключа — поля пусты после перезагрузки, тесты зелёные | patch |
| 23 | verification-gap | Нет автоматической проверки RPC копии и триггера событий | medium (unverified) | В репозитории нет тестового стенда БД; копия проверена SQL-пробой с откатом | defer |
| 24 | edge | README упоминает удалённые пресеты `src/domain/packing/constants.ts` | low | Прямое удаление устаревшей строки | patch |

## Design Notes

- Деньги перемещения — те же `store_order_money` / `store_order_payment` (FK уже на `store_document`): команды `store_set_order_*` и `store_save_order_payment` работают без изменений; календарь фильтрует `kind in (production_order, customer_order)`, поэтому платежи перемещений туда не попадают.
- Итог перемещения для сводки доставки — сумма всех его платежей (у перемещения нет расчётной стоимости); X — оплаченные. Конвертация `convert(amount, transferCurrency, orderCurrency, orderRates)`.
- Копия: валюта денег копии = валюта исходного заказа, снимок курсов — текущий справочник, сумма пустая (равна расчётной); цена строки копируется вместе с `currency_id`.
- Системные сообщения ленты: «Заказ создан» (`createdAt`), смена статуса и плановой даты (`store_document_history`), смена статуса платежа (`store_order_payment_event`, только изменения статуса, не создание). Не сохраняются в localStorage — пересобираются из контекста.
- Разные владельцы — `projectTransferDetail(...).groups.length > 1` (то же разбиение, что видно во вкладке «Товары и резервы» перемещения).

## Verification

**Commands:**
- `npm run lint` -- без ошибок
- `npm run typecheck` -- без ошибок
- `npm test` -- новые тесты сводок проходят
- `npm run build` -- успешно
- `npm run check:deps && npm run check:docs && npm run check:static-images` -- успешно

**Manual checks (if no CLI):**
- Браузер: карточка OMS-921 (хаб) — шапка, «Товары», «Контейнеры», «Файлы», «Комментарии», копия, перезагрузка; карточка перемещения этого заказа — «Деньги», предупреждение; `/store/checkout` — калькулятор как раньше; `/store/orders` — 404.
