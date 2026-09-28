---
title: 'Универсальный реестр префиксов кодов'
type: 'refactor'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
baseline_commit: 'd0582daf244780e6192041c6953f6eea0ab532ff'
review_loop_iteration: 0
context:
  - '{project-root}/docs/conventions/ui/place-codes.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Префиксы кодов живут в двух местах: `store_document_kind.number_prefix` (документы) и `store_catalog_code_prefix` (справочники), с двумя RPC, двумя списками полей, картами соответствий camelCase↔snake_case и алиасом `output`. Модуль лежит в `logistics`, хотя им пользуются каталог, корзина и карточка товара. Добавить новую сущность с кодом — правка в нескольких несвязанных местах.

**Approach:** Один реестр сущностей в общем модуле `src/lib/entity-codes.ts` и одна таблица `store_code_prefix(entity, number_prefix)` с одним RPC. Новая сущность = одна запись в реестре кода; строка в БД не обязательна (нет строки → префикс по умолчанию из реестра).

**Decisions (от пользователя):** Новых сущностей с кодами сейчас не добавлять. Добавление в будущем должно быть системно простым. Механизм вынести из `logistics` в общий модуль с общими именами. Чужие незакоммиченные файлы каталога не трогать.

## Boundaries & Constraints

**Always:**
- Отображение для пользователя не меняется: те же коды, та же страница `/store/settings` с секциями «Префиксы документов» и «Префиксы справочников», те же подписи и примеры.
- Текущие значения переносятся как есть (в демо-БД у завода `SH`).
- Ключ сущности везде один — snake_case как в БД (`customer_order`, `production_output`, `plant`). Без карт соответствий и алиасов.
- Правило префикса прежнее: латиница и цифры, верхний регистр, 1–8 символов; пустое не сохраняется.
- Регион и проводки остаются нередактируемыми: флаг в реестре, а не отдельный список. Сохранённый `store_region.code` важнее `REG-{id}`.
- Новая миграция через MCP `oryx-supabase`; старые миграции не переписывать.

**Never:**
- Не добавлять коды новым сущностям (бренды, категории и т. п.).
- Не оставлять реэкспорт-прослойку `logistics-codes.ts` и старые RPC/таблицу.
- Не менять `store_document_kind` кроме удаления `number_prefix` — это реестр типов документов с lifecycle.
- Не трогать незакоммиченные файлы каталога (`catalog-*.ts(x)`, `store-catalog-page.tsx`, `docs/features/store-pim-catalog.md`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Дефолт | Нет overrides | `customer_order` 12 → `OMS-12`, `plant` 6 → `PLT-6`, `product` 12 → `PRD-12` | N/A |
| Override | `{ plant: "ZAV", customer_order: "DFL" }` | `ZAV-6`, `DFL-2` | N/A |
| Мусор | `{ product: "---", warehouse: "" }` | Остаётся дефолт `PRD`/`WH` | N/A |
| Фиксированная | `{ region: "XXX" }` | `REG-1`; сохранённый код `ae` → `ae`; пробелы → `REG-1` | N/A |
| Нет строки в БД | Сущность есть в реестре, строки нет | Код с префиксом по умолчанию; сохранение создаёт строку (upsert) | N/A |
| Неизвестный ключ | Override с ключом не из реестра | Игнорируется | N/A |
| Сохранение | RPC с некорректным префиксом | Строка не меняется | Ошибка CHECK → toast «Не удалось сохранить префиксы» |

</frozen-after-approval>

## Code Map

- `src/features/logistics/logistics-codes.ts` -- удалить; всё переезжает в `src/lib/entity-codes.ts`.
- `src/features/logistics/logistics-api.ts` ~160–240 -- `fetchCatalogPrefixes`, `ensureCatalogPrefixes`, `prefixesFromKinds`, `loadLogisticsSettings`, `saveLogisticsCodePrefixes`, два цикла RPC. ~312–340 -- payload `document_kinds` → prefixes и `kindPrefix` для `number_prefix` документов. `ensureCatalogPrefixes` вызывается ~910, ~1055, ~1080.
- `src/features/logistics/logistics-types.ts:184` -- `LogisticsSetting.codePrefixes` → тип `EntityCodePrefixes`.
- `src/features/store/store-settings-page.tsx` -- секции из `DOCUMENT_PREFIX_FIELDS`/`CATALOG_PREFIX_FIELDS` → из реестра по `group`, без `fixed`.
- `src/features/store/cart/checkout-api.ts` -- читает `number_prefix` из ответа `store_checkout_customer_order`; `formatLogisticsCode("customerOrder")`.
- Вызовы `formatLogisticsCode` (~30 файлов в `src/features/logistics`, `src/features/store`, `src/components/store`) -- переименовать в `formatEntityCode`; kinds `customerOrder`/`productionOrder`/`productionOutput` → snake_case.
- Тесты: `store-clean-model.test.ts`, `logistics-stock-adjustment.test.ts`, `logistics-payload-mapper.test.ts` (`document_kinds` в фикстурах), `transfer-detail-projection`, `logistics-cancel-guidance`, `logistics-unified-shipment` (`LOGISTICS_CODE_PREFIXES`).
- Живые SQL-функции, читающие префиксы (проверено через `pg_proc`): `store_catalog_page`, `store_context_payload`, `store_ledger_page`, `store_stock_page` — строка `from (select code, number_prefix from store_document_kind) r` под ключом `document_kinds`; `store_doc_number` (coalesce с `upper(p_kind)`); `store_checkout_customer_order` (`join store_document_kind k`, `'number_prefix', k.number_prefix`); `store_location_code` (`store_catalog_code_prefix where code='warehouse'`, иначе `WH`). RPC `store_update_document_kind_prefix`, `store_update_catalog_code_prefix`.
- Документация: `docs/features/logistics.md` (6 упоминаний), `docs/conventions/ui/place-codes.md`, `docs/conventions/README.md`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_store_code_prefix_registry.sql` -- таблица `store_code_prefix` (PK `entity` с CHECK `^[a-z][a-z0-9_]{0,39}$`, `number_prefix` с прежним CHECK), перенос строк из обеих таблиц, RLS/гранты как у `store_catalog_code_prefix`, RPC `store_set_code_prefix(p_entity, p_prefix)` upsert с `upper(trim)`; пересоздать 7 функций из Code Map по их текущим `pg_get_functiondef` (payload-ключ `document_kinds` → `code_prefixes` со строками `entity, number_prefix`); удалить старые RPC, `store_catalog_code_prefix` и `store_document_kind.number_prefix`; применить на демо-БД -- одно хранилище
- [x] `src/lib/entity-codes.ts` -- реестр `ENTITY_CODES` (`defaultPrefix`, `group: "document" | "catalog"`, `label`, `exampleId`, `fixed?`), группы с заголовками, `normalize`/`merge`/`get|set|resetActive`/`formatEntityCode`/`storedEntityCode` -- единый вход
- [x] `src/lib/entity-codes-api.ts` -- `loadEntityCodePrefixes`, `ensureEntityCodePrefixes` (один раз за сессию), `saveEntityCodePrefixes` (RPC по нефиксированным ключам) -- загрузка не зависит от логистики
- [x] `src/features/logistics/logistics-api.ts`, `logistics-types.ts`, `store-settings-page.tsx`, `checkout-api.ts` и все вызовы -- перейти на новый модуль, payload `code_prefixes`, удалить `logistics-codes.ts` -- без прослоек
- [x] `tests/unit/entity-codes.test.ts` + правка перечисленных тестов -- матрица I/O и то, что редактируемые поля = нефиксированные записи реестра
- [x] `docs/conventions/data/entity-codes.md` (+ ссылка в `docs/conventions/README.md`), `place-codes.md`, `docs/features/logistics.md` -- как добавить сущность: одна запись в реестре -- дока = поведение

**Acceptance Criteria:**
- Given `/store/settings`, when страница загружена, then поля и значения те же, что до изменения, и сохранение меняет коды на экранах логистики, в каталоге и корзине.
- Given новая запись в `ENTITY_CODES` без строки в БД, when открыть настройки и сохранить, then поле появилось в своей секции, строка создана, `formatEntityCode` использует её.
- Given `rg "logistics-codes|store_catalog_code_prefix|store_update_.*_prefix|formatLogisticsCode" src tests`, then пусто.

## Implementation Notes

- Миграция `supabase/migrations/20260928165138_store_code_prefix_registry.sql` применена на демо-БД: 10 строк, значения прежние (`plant=SH`). Тела 5 пересозданных функций сверены с предыдущими миграциями построчно — отличаются только блоком префиксов.
- Родитель после субагента: убран запасной разбор `document_kinds` (прослойка против Never); `storedEntityCode(kind, stored, id)` принимает вид сущности вместо зашитого региона; `mapLogisticsPayload` берёт активные префиксы, если в payload нет `code_prefixes`, а префикс номера документа — из них же (карта `kindPrefix` удалена).
- SQL-дефолты (`'OMS'` в checkout, `'WH'` в `store_location_code`, `upper(p_kind)` в `store_doc_number`) дублируют реестр в коде: нужны только при отсутствии строки.
- Параллельно в `main` закоммичена задача каталога (`ee78ce1`, `2b9c654`), поэтому дифф этой задачи — рабочее дерево против `HEAD`, а не против `baseline_commit`.
- Проверки: `npm test` 254/255 (падает `document-timeline` — так же на чистом `HEAD`); typecheck, build, check:docs, check:static-images — OK; `npm run lint` — 4 ошибки в нетронутых файлах трекера/комментариев; `check:deps` — расхождение версий пакетов, не связано. Браузер: `/store/settings` → `ZAV`/`DFL` сохранены, видны на списках заказов на производство, заказов клиента и в каталоге; значения возвращены (`SH`/`OMS`). SQL-строки матрицы (upsert новой сущности, CHECK на мусор) проверены в транзакции с откатом.

## Spec Change Log

## Review Triage Log

- blind+edge+verification/sql-default-mismatch — `medium` — `store_doc_number` без строки даёт `upper(p_kind)`, клиент — дефолт реестра; дока обещает «миграция не нужна». Для видов документов строка `store_document_kind` всё равно ставится миграцией. Route: patch (дока).
- blind/fixed-merge — `low` — `mergeEntityCodePrefixes({region:"XXX"}).region === "XXX"`; `formatEntityCode` игнорирует, но правило «fixed» размазано. Прямая правка. Route: patch.
- blind/fixed-rpc-writable — `false` — RPC намеренно принимает любой ключ (новая сущность без миграции); fixed-сущности SQL не форматирует (`store_doc_number` вызывается только для видов документов).
- blind+edge/non-atomic-save — `low` — последовательные RPC и upsert всех полей были и раньше (`saveLogisticsCodePrefixes`); частичный сбой на практике — только сеть. Отклонено: фикс — новый RPC.
- blind/english-errors — `low` — тот же `caught.message` был до изменения; CHECK недостижим — UI нормализует ввод. Отклонено как существовавшее.
- blind/duplicate-row-mapping — `low` — `prefixesFromRows` (logistics-api) и `rowsToOverrides` (entity-codes-api) дублируют разбор строк: смена формы строки разойдётся. Route: patch (вынести в `entity-codes.ts`).
- blind/screens-without-ensure — `maybe-false` — `region-context`, `regions-page`, карточка товара форматируют без `ensureEntityCodePrefixes`; так было и с `ensureCatalogPrefixes`. Проверить: свежая сессия, кастомный префикс, открыть эти экраны первыми. Route: defer.
- blind/load-settings-wrapper — `low` — `loadLogisticsSettings` бросал и раньше без Supabase; два вызова остаются. Отклонено.
- blind+edge/migration-copy-fail — `false` — миграция применена, 10 строк совпали с исходными значениями.
- blind/migration-no-transaction — `low` — уже применена успешно. Отклонено.
- blind/duplicate-tests, blind/docs-typing — `low` — косметика. Отклонено.
- edge/empty-code-prefixes — `low` — пустой массив `code_prefixes` оставляет старые overrides. Прямая правка условия. Route: patch.
- edge/ensure-save-race — `low` — поздний ensure перезаписывает сохранённое; нужен параллельный список-экран в момент сохранения на странице настроек. Отклонено.
- edge/claim-upper-trim — `false` — все значения были в верхнем регистре, перенос побайтово совпал.
- verification/mapper-default-only — gap, pre-verified — тесты маппера проходят и без чтения `code_prefixes`. Route: patch.
- verification/entity-codes-api-untested — gap, pre-verified — разбор строк не покрыт. Route: patch вместе с выносом чистой функции; кэш/повтор ensure — defer (нет Supabase-моков в unit).

## Design Notes

Реестр в коде — источник списка сущностей, дефолтов и подписей; БД хранит только переопределения. Поэтому миграция для новой сущности не нужна, а SQL-функции, которым нужен префикс, берут `coalesce(... store_code_prefix ..., дефолт)`.

```ts
export const ENTITY_CODES = {
  customer_order: { defaultPrefix: "OMS", group: "document", label: "Заказы клиента", exampleId: "12" },
  plant: { defaultPrefix: "PLT", group: "catalog", label: "Заводы", exampleId: "4" },
  region: { defaultPrefix: "REG", group: "catalog", label: "Регионы", exampleId: "3", fixed: true },
} as const satisfies Record<string, EntityCodeDefinition>;
```

## Verification

**Commands:**
- `npm test` -- pass
- `npm run lint && npm run typecheck && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images` -- pass
- SQL: `select * from store_code_prefix` — 10 строк, значения как до миграции; `select store_doc_number('customer_order', 1)`, `store_location_code` для склада — прежний формат

**Manual checks:**
- `/store/settings`: обе секции, смена префикса завода и заказа клиента, сохранение, перезагрузка; коды на `/store/logistics/*`, в каталоге и корзине. Вернуть исходные значения после проверки.
