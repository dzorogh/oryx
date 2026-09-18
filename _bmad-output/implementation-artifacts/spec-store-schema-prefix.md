---
title: 'Префикс store и упрощение схемы'
type: 'refactor'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'b4c383473ef4955f328d0bb323c916e9665bef90'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
  - '{project-root}/docs/features/logistics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Живые таблицы Store всё ещё называются `logistics_*`, связь товар–завод формально M:N, а мёртвая колонка `production_activation_status` продолжает жить в setting и клиенте.

**Approach:** Переименовать живые `logistics_*` таблицы и view в `store_*` одной миграцией, перенести завод на `store_product.manufacturer_id` и удалить junction `product_manufacturer`, удалить `production_activation_status`, повесить русские `COMMENT` на каждую store-таблицу/view/колонку. Переименовать RPC в `store_*`.

## Boundaries & Constraints

**Always:**
- Новая миграция на Oryx demo Supabase через MCP `oryx-supabase` `apply_migration`. Старые файлы `supabase/migrations/20260916*`–`20260918100000_*` не переписывать.
- Все живые таблицы кроме junction и view `stock_balance` получают префикс `store_`. Таблица `product_manufacturer` удаляется.
- PK, FK, CHECK, RLS, identity и данные сохраняются. Коды документов по-прежнему `PREFIX-id`, не хранятся.
- У товара один необязательный завод: `store_product.manufacturer_id` → `store_manufacturer`, nullable. Живые 176 связей копируются в колонку, 31 товар без завода остаётся NULL (PO на любом заводе).
- Kind/prefix `productManufacturer` / `PM` уходит вместе с таблицей.
- Все публичные SQL-функции `logistics_*` переименовываются в `store_*` (`ALTER FUNCTION` + grant + клиентский `rpc()` / seed).
- `store_assert_product_manufactured_at` читает `store_product.manufacturer_id`: если задан и не совпал — ошибка; если NULL — любой завод.
- `production_activation_status` исчезает из таблицы, seed, типов и select. Активация стока при создании PO не меняется.
- Клиентские `.from(...)`, `rpc()` и seed переходят на `store_*`.
- Тела SQL-функций читают новые имена таблиц.
- У каждой `store_*` таблицы, view и колонки есть непустой `COMMENT` на русском с бизнес-логикой: зачем сущность, инварианты, допустимые значения статусов/типов. Сейчас комментариев нет.

**Never:**
- Не сбрасывать демо-данные и не трогать Capacity/YNAPB.
- Не оставлять таблицу `product_manufacturer` / `store_product_manufacturer` и не сохранять M:N.
- Не менять маршруты `/store/logistics/*`, префиксы кодов и семантику документов.
- Не переименовывать папку `src/features/logistics` и TS-типы `Logistics*` в этой работе.
- Не экспонировать редактор связи товар–завод, если его не было.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rename live | Существующие строки и журнал | Таблицы `store_*`, те же id и балансы | Откат миграции при ошибке rename |
| Один завод | Товар с `manufacturer_id` | Значение на `store_product`; assert пускает только этот завод | Ошибка, если PO на другой завод |
| Без завода | `manufacturer_id` IS NULL | PO на любом заводе | Как сейчас |
| Второй завод | Некуда писать вторую связь | Только смена `manufacturer_id` | Нет junction insert |
| Setting | Чтение/запись prefixes | Только `id` + `code_prefixes` | Колонки activation нет |
| Каталог | `/store/pim/products` | Товары из `store_product` | Как сейчас при пустом env |
| Комментарии | После миграции | Все `store_*` таблицы, view и колонки с непустым `obj_description` / `col_description` | Нет безымянных колонок |

</frozen-after-approval>

## Code Map

- `src/features/logistics/logistics-api.ts` — все `.from("logistics_*")` и `rpc("logistics_*")`; `mapSetting` читает `production_activation_status`
- `src/features/logistics/customer-orders-page.tsx`, `transfers-page.tsx`, `production-orders-page.tsx`, `flow-documents-pages.tsx` — прямые `.from`
- `src/features/store/store-catalog-from-logistics.ts` — каталог из `store_product` (+ `manufacturer_id`), без junction
- `src/features/logistics/logistics-types.ts`, `use-logistics-store.ts` — `manufacturerId` на продукте; убрать `productManufacturers` и `productionActivationStatus`
- `src/features/logistics/logistics-lookups.ts` — lookups читают `product.manufacturerId`
- `scripts/seed-logistics.mjs`, `scripts/lib/seed-logistics-stories.mjs` — upsert/delete `store_*`; setting без activation; нет upsert junction
- `scripts/data/logistics-demo.json` — `manufacturer_id` на продуктах, ключ `product_manufacturers` удалить
- `src/features/logistics/logistics-codes.ts` — убрать prefix `productManufacturer`
- `docs/features/logistics.md`, `docs/features/store-pim-catalog.md` — имена таблиц
- Живые RPC: `supabase/migrations/20260917230200_logistics_integer_id_rpcs.sql`, reservation — `20260918100000_logistics_unified_reservation.sql`
- View: `logistics_stock_balance` → `store_stock_balance` (TS её не читает)
- Не трогать: уже применённые миграции; Pulse `thank_you_entry`

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_store_schema_prefix.sql` -- rename таблиц/view/RPC в `store_*`, `manufacturer_id` на product, drop junction и activation, русские COMMENT -- живая схема = контракт
- [x] `src/features/logistics/logistics-api.ts` -- `store_*` table и rpc; snapshot без junction; setting без activation -- хаб PostgREST
- [x] `src/features/logistics/customer-orders-page.tsx` + `transfers-page.tsx` + `production-orders-page.tsx` + `flow-documents-pages.tsx` -- прямые `.from` на `store_*` -- обход хаба
- [x] `src/features/store/store-catalog-from-logistics.ts` -- каталог из `store_product.manufacturer_id` -- без junction
- [x] `src/features/logistics/logistics-types.ts` + `use-logistics-store.ts` + `logistics-lookups.ts` + `logistics-codes.ts` -- завод на продукте, убрать junction/activation/PM -- типы = схема
- [x] `scripts/seed-logistics.mjs` + `scripts/lib/seed-logistics-stories.mjs` + `scripts/data/logistics-demo.json` -- `store_*`, `manufacturer_id` в products -- демо сидится
- [x] `docs/features/logistics.md` + `docs/features/store-pim-catalog.md` -- новые имена и завод на товаре -- дока = схема
- [x] `tests/unit/logistics-related.test.ts` + `tests/unit/logistics-manufacturer.test.ts` -- fixtures без junction и activation -- тесты = модель

**Acceptance Criteria:**
- Given живая Oryx БД, when `list_tables` verbose, then в public нет `logistics_*` и нет `*product_manufacturer*`, есть `store_*` с `store_product.manufacturer_id`, view `store_stock_balance`
- Given товар с `manufacturer_id`, when create PO на другом заводе, then assert ошибка
- Given товар с `manufacturer_id` IS NULL, when create PO на любом заводе, then заказ создаётся
- Given `/store/settings`, when load/save prefixes, then колонки activation нет и UI не меняется
- Given каталог `/store/pim/products` с настроенным Supabase, when load, then товары читаются из `store_product`
- Given живая схема, when выборка `pg_description` по `store_%`, then нет таблицы/view/колонки без комментария

## Implementation Notes

- Миграция `supabase/migrations/20260918120000_store_schema_prefix.sql` применена на Oryx demo: 21 таблица + view `store_stock_balance`, RPC `store_*`. 176 заводов скопированы в `store_product.manufacturer_id`, 31 NULL. Junction и `production_activation_status` удалены. 0 пропусков в `pg_description`.
- `store_assert_product_manufactured_at(1, 1)` → ошибка; product 110 (NULL) + любой завод проходит.
- Добавлен `tests/unit/store-schema-prefix.test.ts` на контракт имён, COMMENT в миграции, каталог и отсутствие junction.
- Последовательности reservation оставили суффикс `seq1` после rename. `store_code` ещё знает мёртвый kind `reservation_release` (семантика кодов RSV не менялась).

## Spec Change Log

## Review Triage Log

- blind/seed-order — `medium` — `scripts/seed-logistics.mjs` пишет `store_product.manufacturer_id` до `store_manufacturer`; на пустой БД upsert упрётся в FK.
- blind/multi-plant-guard — `false` — live 0 товаров с >1 заводом; UPDATE не встречает коллизию.
- blind/rpc-rewrite-probe — `false` — `pg_get_functiondef` по `store_%` не содержит `product_manufacturer`.
- blind/rel-kind — `false` для этого стори / pre-existing — `reservation_release` уже был в `logistics_code`; rename сохранил семантику кодов, как требовал Never.
- blind/catalog-plt-label — `false` — лоадер и раньше брал `id,name` и показывал имя завода, не PLT-n.
- blind/catalog-manufacturer-error — `defer` — тот же `data ?? []` без проверки error был до rename.
- blind/tests-grep-subset — `medium` — часть дыр совпадает с verification-gap (каталог/select); закрывается патчем тестов.
- blind/docs-all-store-pk — `low` — формулировка «все таблицы Store» слегка широка; пользователи не упираются.
- blind/docs-store-nav-ia — `defer` — правка IA/releases в доке и `logistics-forms` из незакоммиченного unified-reservation, не из rename.
- blind/release-deep-link — `defer` — удаление ReleaseForm / редирект releases тоже из unified-reservation.
- blind/remap-old-snapshot — `defer` — remap для старого ключа `product_manufacturers` не входит в текущий seed.
- blind/rpc-comments — `false` — intent требовал COMMENT на таблицы/view/колонки, не на RPC.
- blind/spec-verification-list — `false` — правка только спеки, отвергнуто правилом triage.
- blind/manufacturer-id-index — `low` — 207 строк, seq scan не бьёт пользователей; индекс — лишняя сложность.
- blind/korportal-reimport-rule — `defer` — повторный импорт из Корпортала вне этой работы.
- edge/multi-plant — `false` — тот же факт: коллизии в данных нет.
- edge/missing-product-assert — `false` — нет строки товара → `manufacturer_id` NULL, как «нет связи»; insert линии всё равно падает на FK `product_id`.
- edge/catalog-manufacturer-error — `defer` — дубль blind/catalog-manufacturer-error, поведение не новое.
- edge/migration-reapply — `low` — одноразовая applied-миграция; повторный apply не повседневный путь.
- vg/catalog-loader-untested — `medium` — тест кормит mapper готовой строкой и не гоняет `manufacturer_id` → Production site.
- vg/snapshot-select-unpinned — `medium` — `manufacturer_id` в select `store_product` не зафиксирован; дроп колонки не валит тесты.
- vg/assert-rpc-untested — `defer` — `npm test` не бьёт Postgres; live SQL-проба уже в Verification.

## Design Notes

Rename через `ALTER TABLE ... RENAME TO` сохраняет данные, identity и FK. Политики, последовательности и функции переименовать в `store_*` в той же миграции (`ALTER FUNCTION ... RENAME` + grant). Тела — `CREATE OR REPLACE` с новыми именами таблиц. COMMENT — русский текст в той же миграции.

Копировать `manufacturer_id` из junction до `DROP TABLE`. Live 176 связей, 0 товаров с >1 заводом — без коллизий. Seed: поле на продукте, не отдельный upsert.

## Verification

**Commands:**
- `npx vitest run tests/unit/logistics-related.test.ts tests/unit/logistics-manufacturer.test.ts` -- expected: pass
- MCP `list_tables` verbose + `execute_sql` на `store_product.manufacturer_id` и `pg_description` -- expected: нет `logistics_*` и junction, nullable FK, setting без activation, все store объекты с COMMENT
- `npm run typecheck` -- expected: pass

**Manual checks (if no CLI):**
- `/store/pim/products` и `/store/logistics/stock` открываются на демо-данных после миграции
