---
title: 'Магазин: Logistics → OMS, справочники — в магазин'
type: 'refactor'
created: '2026-10-15'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '5c36fd15ea473bc7be645cd58310b4bc86550fcc'
context:
  - '{project-root}/docs/conventions/code/store-module-layers.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Поменялась концепция модуля store: заказы, производство и склад — это OMS (Order Management System), а не «логистика». Справочники (Склады, Регионы, Заводы) к OMS не относятся — это справочники самого магазина. Сейчас всё лежит под `/store/logistics/*`, `src/features/logistics`, а в БД OMS и справочники смешаны под `store_*`.

**Approach:** OMS-разделы переезжают на `/store/oms/*`, справочники — на `/store/warehouses`, `/store/regions`, `/store/plants`. В БД OMS-сущности получают префикс `store_oms_*`, справочники и PIM остаются `store_*`. Код, тесты, сиды и доки переименовываются следом.

**Решения пользователя (2026-10-15):**
- URL `/store/oms/*`; группы меню «Продажи», «Производство», «Склад» и их подписи не меняются.
- Справочники: `/store/warehouses`, `/store/regions`, `/store/plants` (+ `/[id]`); группа «Справочники» в меню магазина сразу после «Каталог».
- БД: OMS-таблицы, view и функции → `store_oms_*`; справочники, PIM, настройки → `store_*`.
- Код: `src/features/logistics` → `src/features/oms`, `Logistics*` → `Oms*`; страницы справочников → `src/features/store/directories`; доки, тесты, сиды (`npm run seed:oms`). Старые `/store/logistics/*` и `/logistics/*` редиректят на новые адреса.

## Boundaries & Constraints

**Always:**
- Одна новая миграция `supabase/migrations/<ts>_store_oms_prefix.sql`, применяется на Oryx demo через MCP `oryx-supabase` `apply_migration` в одной транзакции. Данные, id, FK, RLS, гранты, триггеры сохраняются.
- Вместе с таблицами переименовываются их последовательности, индексы, ограничения, триггеры и политики, если имя начинается со старого имени таблицы. Тела всех функций `public` пересобираются с новыми именами. В конце `notify pgrst, 'reload schema'`.
- Русские `COMMENT` сохраняются; упоминания старых имён и «логистики» в них заменяются.
- Клиентские `.from()`/`rpc()`, сиды (`scripts/*`, `supabase/seed/*.sql`) и тесты используют новые имена.
- Зависимости по `store-module-layers.md`: `features/oms` импортирует только базовый слой store. Пути справочников и товаров для ссылок из OMS живут в базовом слое (`features/store/store-paths.ts`). ESLint-правила и дока слоёв обновляются.
- Метаданные страниц: `… | OMS | Oryx BMS` для OMS, `… | Магазин | Oryx BMS` для справочников.

**Never:**
- Не переписывать уже применённые миграции и `_bmad-output`/`docs/superpowers` (история).
- Не трогать «логистику» варианта (габариты и упаковка в PIM): `store_product_variant_logistics`, `variant_logistics`, `VariantLogistics`, `CartVariantLogistics`, вкладку и ключ видимости `tab.logistics`, `logisticsOpened`, `logisticsRows`/`logisticsByVariant` в корзине.
- Не пересевать живую БД; коды документов (`OMS-…`, `PO-…`) и их семантика не меняются.
- Не менять поведение экранов, кроме адресов и места справочников в меню.

## I/O & Edge-Case Matrix

| Сценарий | Вход | Ожидание |
|---|---|---|
| OMS-раздел | `/store/oms/customer-orders/123` | та же карточка заказа |
| Корень OMS | `/store/oms` | редирект на `/store/oms/stock` |
| Справочник | `/store/warehouses/5`, `/store/regions`, `/store/plants/2` | те же экраны, пункт «Справочники» активен |
| Старый адрес OMS | `/store/logistics/transfers/7`, `/logistics/transfers/7` | редирект на `/store/oms/transfers/7` |
| Старый адрес справочника | `/store/logistics/plants/2`, `/logistics/regions` | редирект на `/store/plants/2`, `/store/regions` |
| Старые releases/products | `/store/logistics/releases`, `/store/logistics/products/9` | `/store/oms/reservations?operation=release`, `/store/pim/variants/9` |
| Каталог и корзина | `/store/pim/products`, оформление | работают, заказ создаётся через `store_oms_*` |
| Создание склада | диалог в `/store/warehouses` | `store_create_warehouse` вызывает `store_oms_new_stock_location` |

</frozen-after-approval>

## Code Map

- БД, OMS-отношения → `store_oms_<имя без store_>`: таблицы `adjustment, customer_order, customer_order_client_delivery, customer_order_meta, document, document_file, document_history, document_kind, document_product_line, order_money, order_payment, order_payment_event, order_plan, order_plan_action, production_order, production_output, reservation, shipment, stock_location, stock_owner, stock_transaction, transfer`; view `location_ref, owner_ref, stock_balance, stock_balance_ref`.
- БД, остаются `store_*`: `brand, category, code_prefix, container_type, currency, plant, product*, region, region_group, role_visibility, setting, tenant, warehouse`, `app_user`.
- Функции, остаются `store_*`: `catalog_page, create_plant, create_product_variant, create_region, create_warehouse, currency_rates_snapshot, current_user_id, forbid_hard_delete, forbid_variant_hard_delete, region_hub_warehouse_guard, region_status_for_new_region, region_status_for_new_variant, set_code_prefix, set_production_currency, set_tenant_region, update_plant, update_region, update_warehouse, variant_stock_facts`. Остальные ~100 → `store_oms_*`; `store_customer_order_oms_payload` → `store_oms_customer_order_payload`.
- `src/features/logistics/**` (156 файлов) → `src/features/oms/**`; `logistics-*.ts(x)` → `oms-*.ts(x)`, `ui/logistics-*.tsx` → `ui/oms-*.tsx`.
- `src/features/logistics/catalog-pages.tsx` (`WarehousesPage`, `WarehouseDetailPage`, `PlantsPage`, `PlantDetailPage`; `ProductsPage`/`ProductDetailPage` удалить, если не используются), `regions-page.tsx` → `src/features/store/directories/`.
- `src/features/logistics/logistics-paths.ts` → `oms-paths.ts` (`OMS_PATHS`, база `/store/oms`); `STORE_PRODUCTS_PATH`, `hrefForStoreProduct`, `STORE_DIRECTORY_PATHS` → `src/features/store/store-paths.ts` (базовый слой). `redirectLegacyLogisticsPath` удалить.
- `src/features/logistics/logistics-nav.ts` → `oms-nav.ts` без справочников; `src/features/store/store-nav.ts` — группа «Справочники» после «Каталог».
- `src/features/logistics/order-view-role.ts` — пути ролей на `/store/oms` и справочники.
- `src/features/store/store-catalog-from-logistics.ts` → `store-catalog-from-oms.ts`; прочие импорты `@/features/logistics` в `src/features/store`, `src/components/store`.
- `app/store/logistics/**` → `app/store/oms/**` (без `products/`, `releases/`); `app/store/(directories)/{warehouses,regions,plants}` + `layout.tsx` с `force-dynamic` и `Suspense`; удалить `app/logistics/`.
- `next.config.ts` — редиректы из матрицы, без цепочек.
- `eslint.config.mjs` — `no-restricted-imports` с путями `features/oms`.
- `scripts/seed-logistics.mjs` → `seed-oms.mjs`, `scripts/lib/seed-logistics-stories.mjs` → `seed-oms-stories.mjs`, `scripts/data/logistics-demo.json` → `oms-demo.json`; `package.json` `seed:oms`; `supabase/seed/*.sql`.
- `tests/unit/logistics-*.test.ts` → `oms-*.test.ts`; `store-schema-prefix.test.ts` и прочие тесты с именами таблиц/RPC/путей.
- Доки: `docs/features/logistics.md` → `oms.md` (справочники — в `docs/features/store-directories.md`), `docs/features/README.md`, `docs/conventions/**` (place-codes, supabase, store-module-layers, list-page-toolbar, full-width), `README.md`, `AGENTS.md` (строка Logistics).

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261015120000_store_oms_prefix.sql` -- DO-блоки по таблице соответствий: rename отношений, связанных объектов и OMS-функций, пересборка тел функций и COMMENT по границам слов (`\m…\M`), длинные имена первыми; применить через MCP -- схема = концепция
- [x] `src/features/oms/**`, `src/features/store/**`, `src/components/store/**` -- перенос папки, переименования файлов и идентификаторов, новые имена таблиц/RPC, `store-paths.ts`, справочники в `features/store/directories` -- код = концепция
- [x] `app/store/oms/**`, `app/store/(directories)/**`, `next.config.ts`, удалить `app/logistics` -- маршруты и редиректы -- матрица
- [x] `eslint.config.mjs`, `docs/conventions/code/store-module-layers.md` -- слои с `oms` -- lint держит границы
- [x] `scripts/**`, `package.json`, `supabase/seed/*.sql` -- новые имена, `seed:oms` -- сиды совместимы со схемой
- [x] `tests/unit/**` -- переименование, пути, контракт имён; тест на редиректы в `next.config.ts` -- тесты = модель
- [x] доки из Code Map -- адреса, имена, раздел справочников -- дока = код

**Acceptance Criteria:**
- Given живая Oryx БД после миграции, when выборка `pg_class`/`pg_proc` в `public`, then нет OMS-отношений и OMS-функций без `store_oms_`, справочники и PIM с `store_`, нет тела функции со старым OMS-именем
- Given `rg -i logistic src app scripts tests docs supabase/seed` (без `supabase/migrations`, `docs/superpowers`), then остаются только упоминания логистики варианта
- Given страницы из матрицы, when открыть в браузере на демо-бэкенде, then данные грузятся без ошибок PostgREST

## Design Notes

Переименование отношения через `ALTER … RENAME` сохраняет OID: view, политики, defaults и FK продолжат работать. Тела plpgsql/sql — текст, поэтому их пересобирает `create or replace` из `pg_get_functiondef` с заменой токенов. Сначала `alter function … rename` (гранты и триггеры сохраняются), потом пересборка всех функций `public`. Миграция динамическая (цикл по каталогу + таблица соответствий), поэтому воспроизводится на чистой БД после прежних миграций. Замена `\mstore_product\M` не задевает `store_product_lines_json`: в PG `_` — символ слова.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images && npm test` -- expected: зелёное, кроме уже известных сбоев до baseline
- MCP `execute_sql` на `pg_class`/`pg_proc`/`pg_description` -- expected: AC 1

**Manual checks:**
- Браузер: меню магазина, все OMS-разделы, справочники и их карточки, старые адреса, каталог, корзина и оформление.

## Implementation Notes

- Миграция `20261015120000_store_oms_prefix.sql` применена: 26 отношений и 102 функции `store_oms_*`, 19 функций справочников/PIM остались `store_*`; 90 заказов, 197 документов, 328 движений на месте. Комментарий `store_plant.name` (там был адрес `/store/logistics/plants`) поправлен отдельным `comment on` в конце миграции и в живой БД.
- Редиректы — `src/features/store/store-legacy-redirects.ts`, подключены в `next.config.ts`; корень `/store/oms` редиректит `app/store/oms/page.tsx`. CRUD справочников — `src/features/store/directories/directories-api.ts`.
- «Logistics» в демо-контенте главной, Pulse, трекера и комментариев (отдел компании) и шаблон «логистики» варианта в PIM не переименованы — это не модуль.
- Ключ сохранённых колонок списков сменился на `oryx-oms-list`: прежние настройки колонок сбросятся один раз.
- Параллельная сессия закоммитила `ec73b91` (статус доставки клиента) поверх baseline по старым путям; правки перенесены в `src/features/oms/*`, её миграция применена до нашей и переименована вместе с остальными.
- Проверка: `typecheck`, `build`, `check:docs`, `check:static-images` — ок; `npm test` 431 ок, 1 прежний сбой `buildDocumentTimeline`; `eslint` и `check:deps` — те же ошибки, что на baseline. Браузер: 16 экранов OMS, справочников, каталога и оформления грузятся без ошибок; старые адреса редиректят.

## Spec Change Log

## Review Triage Log

Ревью 2026-10-15: Blind Hunter, Edge Case Hunter, Verification Gap. Дифф от baseline включал чужой коммит `ec73b91`.

| Находка | Вердикт | Решение |
| --- | --- | --- |
| Параметр прайс-листа `logistics` → `freight`: сохранённые значения и скрытые колонки теряются; в доке «OMS (USD)» | high | patch: id/slug `logistics`, дока `Logistics (USD)` |
| Генератор сида: `sanitizeOms` и «OMS, containers» про габариты варианта | medium | patch: вернуть имена логистики варианта |
| `/…/logistics/products/9/x` уходит на несуществующий `/store/oms/products/9/x` | low | patch: правило `products/:id/:path*` |
| CRUD справочников в `oms-api.ts` | medium | patch: `directories-api.ts` |
| Нет теста, куда ведут ссылки склада/региона/завода | medium | patch: asserts `hrefFor*` и четыре старых адреса |
| Пересборка тел только для `prokind = 'f'` | low | patch: `('f', 'p')` в файле миграции |
| Переменная `logistics` в `customer-order-oms.test.ts` | low | patch |
| Устаревшие доки: `ProductDetailPage`, порядок меню, «Диалог региона (логистика)», маршруты и миграция в `oms.md`, поведение справочников в `oms.md` | low | patch |
| Переименование БД проверяется только по тексту, без прогона | medium | defer: нет DB-харнесса; живая проверка имён пройдена |
| Ключ `logistics.production` и вкладка «Логистика» карточки товара показывают данные OMS | low | defer: вне `/store/logistics/*`, нужен ответ пользователя |
| `update pg_description` требует суперпользователя | low | reject: на этом стеке `postgres` — суперпользователь, миграция применена |
| Заменяется только «логистики», а не другие падежи | false | после миграции в `prosrc`/`pg_description` нет «логистик» |
| Замена «логистики» в сообщениях любых функций | false | в живой БД ни одна функция этого слова не содержала |
| Новая фича статуса доставки в рефакторинге | false | чужой коммит `ec73b91` |
| Ключ `oryx-oms-list` сбрасывает настройки колонок | low | reject: разовый сброс в прототипе |
| Общие UI-примитивы `Oms*` импортирует PIM | false | так было и с `Logistics*` |
| Пути в `order-view-role.ts` и `store-settings-page.tsx` не из констант | low | reject: работает, тесты ролей зелёные |
| В спеке нет результатов проверки | false | Implementation Notes заполнены |
