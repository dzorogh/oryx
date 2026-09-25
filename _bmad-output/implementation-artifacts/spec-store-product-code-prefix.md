---
title: 'Редактируемые префиксы кодов товара и склада'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
baseline_commit: '2a5b6f75aaaa8642709333fc3696b2015e548593'
review_loop_iteration: 0
context:
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** На `/store/settings` можно менять префиксы документов и завода. Коды товара (`PRD-{id варианта}`) и склада (`WH-{id}`) зашиты: `formatLogisticsCode` для `product` и `warehouse` берёт константу и игнорирует сохранённый префикс.

**Approach:** Тот же механизм, что у завода: строки в `store_catalog_code_prefix`, поля в секции «Префиксы справочников», отображение `prefix-id` без переписи вариантов и складов. По умолчанию `PRD` и `WH`.

**Decision:** В этой задаче настраиваются и товары, и склады. Регионы и `TXN` не входят.

## Boundaries & Constraints

**Always:**
- Новая миграция на Oryx demo Supabase (MCP `oryx-supabase`). Файл `20260925120000_store_catalog_code_prefix.sql` не переписывать.
- Код товара не хранится: `prefix` + id варианта (`store_product_variant.id`). Код склада не хранится: `prefix` + id склада. Смена префикса меняет только отображение.
- Правило как у завода: латиница и цифры, верхний регистр, 1–8 символов. Пустое значение не сохраняется.
- Загрузка и сохранение идут через уже существующие `loadLogisticsSettings` / `saveLogisticsCodePrefixes` и RPC `store_update_catalog_code_prefix`.
- Подписи на русском. Примеры при дефолте: товар `PRD-12`, склад `WH-7`.

**Never:**
- Не делать редактируемыми регионы: у `store_region.code` свой сохранённый код (`ae`, `ru`); `REG-{id}` только запасной путь при пустом коде.
- Не выносить в настройки `stockTransaction` / `TXN`: константа нигде не показывается.
- Не возвращать SKU / «Артикул» и не писать префикс в строки вариантов, складов, документов или журнала.
- Не менять префиксы документов и семантику `PLT` завода, кроме общего комментария таблицы, если он перечисляет фиксированные коды.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Дефолт | Строки `product=PRD`, `warehouse=WH` | Вариант 12 — `PRD-12`, склад 7 — `WH-7` | N/A |
| Смена | Сохранили `ART` и `SKL` | После загрузки настроек `ART-12` и `SKL-7` | N/A |
| Мусор | Ввод `арт-` | В поле остаётся `ART` | Сохранение при пустом результате блокируется, как у завода |
| Нет строки | Таблица без `product` или `warehouse` | Остаётся константа `PRD` / `WH` | Ошибка RPC «не найден» только если UI уже шлёт этот code |
| Регион | Любой override `region` | Код региона не становится `prefix-id`, если в строке есть `store_region.code` | N/A |

</frozen-after-approval>

## Code Map

- `src/features/logistics/logistics-codes.ts` — `CATALOG_PREFIX_FIELDS` сейчас только `plant`; `FIXED_CODE_KINDS` = `product`, `warehouse`, `region`. `formatLogisticsCode` для fixed берёт `LOGISTICS_CODE_PREFIXES`, не active. Убрать `product` и `warehouse` из fixed. Поля: «Товары» `catalogCode: "product"` `exampleId: "12"`; «Склады» `catalogCode: "warehouse"` `exampleId: "7"`. `region` остаётся fixed.
- `src/features/store/store-settings-page.tsx` — секции собираются из `DOCUMENT_PREFIX_FIELDS` и `CATALOG_PREFIX_FIELDS`. Отдельный UI не нужен.
- `src/features/logistics/logistics-api.ts` — `fetchCatalogPrefixes` / `saveLogisticsCodePrefixes` уже ходят в `store_catalog_code_prefix` по `CATALOG_PREFIX_FIELDS`. Код варианта ~462, код склада ~374, регион ~385 (`row.code`, иначе `REG`).
- `supabase/migrations/20260925120000_store_catalog_code_prefix.sql` — CHECK `code in ('plant')`, RPC `store_update_catalog_code_prefix`, комментарий «склады, товары и регионы фиксированы».
- `tests/unit/store-clean-model.test.ts` — завод уважает override, склад нет. Товар и склад должны уважать override; регион остаётся `REG`, если код не передан иначе.
- `docs/features/logistics.md`, `docs/features/store-pim-catalog.md`, `docs/conventions/ui/place-codes.md` — товар и склад названы фиксированными.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_store_product_warehouse_code_prefix.sql` -- CHECK принимает `product` и `warehouse`, insert `PRD` и `WH`, комментарии; применить на демо-БД -- живой контракт как у завода
- [x] `src/features/logistics/logistics-codes.ts` -- товар и склад в `CATALOG_PREFIX_FIELDS`, не в `FIXED_CODE_KINDS` -- настройки начинают влиять на код
- [x] `tests/unit/store-clean-model.test.ts` -- override товара и склада меняет код, пустой override остаётся `PRD`/`WH`, регион не следует override -- регрессия форматтера
- [x] `docs/features/logistics.md` + `docs/features/store-pim-catalog.md` + `docs/conventions/ui/place-codes.md` -- товар и склад настраиваются, регион фиксирован своим кодом -- дока = поведение

**Acceptance Criteria:**
- Given `/store/settings`, when открыта секция справочников, then есть «Товары» и «Склады» с примером текущего префикса и id
- Given сохранённые префиксы, when экран заново читает настройки и рисует код варианта или склада, then префикс тот, что в `store_catalog_code_prefix`
- Given ввод без букв и цифр, when сохранение, then кнопка недоступна и строка в БД не меняется

## Implementation Notes

- Миграция `supabase/migrations/20260925140000_store_product_warehouse_code_prefix.sql` расширяет CHECK и добавляет `product=PRD`, `warehouse=WH`. На демо-базе строки есть.
- `store_location_code` раньше собирал склад как `WH-` в текстах ошибок плана. `supabase/migrations/20260925102022_store_location_code_warehouse_prefix.sql` читает префикс из `store_catalog_code_prefix`, иначе `WH`. Проверка: первые склады — `WH-1`, `WH-2`, `WH-3`.
- Префикс завода в демо-базе уже был `SH`. Его не менял.
- Юнит-тест `tests/unit/store-clean-model.test.ts`: 8/8. На `/store/settings` поля «Товары» (`PRD`, пример `PRD-12`) и «Склады» (`WH`, пример `WH-7`).

## Spec Change Log

## Review Triage Log

- blind/migration-order — `high` — `20260925102022` идёт раньше `20260925120000`, который создаёт `store_catalog_code_prefix`. Postgres 17.6, `check_function_bodies=on`: `CREATE FUNCTION ... language sql` падает, если таблицы ещё нет (проверено пробным `CREATE FUNCTION` на отсутствующую таблицу, откат).
- edge/migration-order — `high` — тот же дефект, та же проверка.
- blind/insert-conflict — `false` — файл уже применён один раз; повторный прогон миграций не входит в путь установки.
- blind/docs-migration-list — `low` — `logistics.md` ссылается на `store_location_code`, а в списке миграций файла `20260925102022` нет.
- blind/place-codes-examples — `false` — `WH-7` и `PLT-6` в `place-codes.md` — примеры «только код, без имени»; первый абзац уже говорит, что префиксы настраиваемые.
- blind/region-whitespace — `low` — `regionCatalogCode` считает пробелы непустым кодом (`storedCode ? String(storedCode)`), на экране пустая строка вместо `REG-{id}`.
- edge/region-whitespace — `low` — то же место, строка 120.
- blind/garbage-input — `false` — `арт-` не содержит латиницы и цифр, поле очищается и сохранение блокируется; это то же правило, что у завода. `ARTарт-` остаётся `ART`, это покрыто тестом.
- blind/stale-code-map — `low` — карта в спеке описывает код до правки. Отвергнуто: правка была бы правкой спеки.
- blind/brainstorm-memlog — `false` — несвязанный неотслеживаемый черновик, он был в дереве до этой задачи.
- verification/location-code-untested — `medium` — нет теста на SQL `store_location_code`; юнит-тест форматтера проходит и при старом `WH-`. Disposition слоя: defer. Сьюта с БД нет.
- verification/catalog-fields-untested — `medium` — `store-clean-model.test.ts` не проверяет `CATALOG_CODE_TO_PREFIX_FIELD`, поэтому удаление `product`/`warehouse` из полей настроек тест не ловит. Disposition слоя: patch.

## Verification

**Commands:**
- `node --import tsx --test tests/unit/store-clean-model.test.ts` -- expected: pass, товар и склад следуют override
- `npm run check:docs` -- expected: pass

**Manual checks (if no CLI):**
- `/store/settings`: поля «Товары» и «Склады», смена, сохранение, пример обновился; после перезагрузки значения те же. Код варианта и код склада на экранах логистики показывают новые префиксы.
