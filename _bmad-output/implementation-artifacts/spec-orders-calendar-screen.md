---
title: 'Экран «Календарь выпусков» в Store Logistics'
type: 'feature'
created: '2026-09-24'
status: 'done'
baseline_commit: 'cf2643b053e43ce5ca203c45abc65e7ab072518d'
route: 'full'
route_source: 'auto'
review: 'thorough'
review_source: 'auto'
lenses_ran: ['blind-hunter', 'edge-case-hunter', 'verification-gap', 'intent-alignment']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-orders-calendar/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-orders-calendar/calculation-rules.md'
  - '{project-root}/_bmad-output/specs/spec-orders-calendar/table-layout.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-oryx-output-calendar-2026-09-24/.working/key-calendar.html'
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/conventions/ui/list-page-toolbar.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Менеджер по планированию не видит по месяцам, что придёт из выпусков и что уже обещано, и не может быстро создать выпуск в нужном месяце.

**Approach:** Новая страница `/store/logistics/calendar` — матрица «товар × месяц» по контракту `SPEC.md` + `calculation-rules.md` + `table-layout.md` (при расхождениях выигрывает контракт; прототип `key-calendar.html` — визуальный и поведенческий референс, его данные вымышлены). Данные — один новый read-RPC, создание — существующие command-RPC.

## Boundaries & Constraints

**Always:**
- Один read-RPC `store_output_calendar_page()` в новой миграции `supabase/migrations/20260924120000_store_output_calendar_page.sql` (по образцу `20260923120000_store_page_read_models.sql`: `language sql stable security definer set search_path = public`, `grant execute` anon/authenticated/service_role, `notify pgrst`). Применить к демо-базе через MCP `oryx-supabase` `apply_migration`.
- Anon: только этот RPC + существующие `store_create_production_order` / `store_create_production_output` (`p_complete=false`). Прямого DML нет.
- Фильтр владельцев — множество `stock_owner_id` (свободно = `store_free_owner_id()`, регион = `store_region.stock_owner_id`, заказ = `store_customer_order.stock_owner_id`; строка выпуска — `coalesce(to_owner_id, free)`). Одно количество считается один раз.
- Каркас: `LogisticsPageShell` (крошка «Календарь выпусков»), белая toolbar-`Card` как `ListToolbar`, без `max-w-*`. Заводы только кодами `PLT-n`, товары — название + `PRD-n`. Все подписи на русском. Количества — `formatQuantity`, пустая ячейка — пусто.
- Панель «Для кого считаем» — встроенная справа (не модальный `Sheet`): таблица остаётся видна и сужается.
- После создания выпуск сразу виден в таблице (локальная вставка, флаг «новый» обходит фильтры владельцев и завода), ячейка подсвечивается; кнопка «Обновить» перечитывает RPC и снимает флаги.
- Любые записи, созданные при проверке в браузере, удалить из демо-базы в той же сессии.
- **Решение (демо-данные):** досеять демо. Блок «календарь» в `scripts/lib/seed-logistics-stories.mjs` по существующим открытым PO сида (без нового спроса): 6–8 открытых выпусков, среди них «В работе» с просрочкой в августе 2026, Force 1100 EFI к ноябрю с резервом региона, выпуск без срока, выпуски на декабрь/январь, разные заводы. Те же вызовы применить к живой базе через MCP (service_role), не перезапуская весь сид. Это демо-данные, а не тестовые записи — они остаются.
- **Решение (объём):** спека целиком, без разделения.

**Never:** спрос/заказы клиента как спрос, суммы и итоги в группах, накопительные суммы, разбивка остатка по складам, редактирование выпусков в ячейке, экспорт; названия заводов/складов; новые command-RPC; правка чужих файлов ради старых lint-ошибок; пуш в `origin`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Приход | OUT-A `in_progress` срок 15.11, OUT-B `done` | «Ноябрь» = OUT-A; OUT-B только в «Остатке» (если на складе) | — |
| Без срока | выпуск `draft`, `expected_end_on` null | количество в «Без срока» | — |
| Просрочка | выпуск со сроком в прошлом месяце | диапазон начинается с этого месяца; непустая ячейка красная; «+» нет | — |
| Повтор категории | товар в «ATV» и «ATV → 4x4» | строка в обеих группах, без пометок | — |
| Без категории | нет привязок | группа «Без категории» последней | — |
| Двойной путь владельца | заказ выбран и сам, и через регион с переключателем | учтён один раз | — |
| Завод | фильтр PLT-3 | в месяцах только выпуски PLT-3, в списке только товары с ними; «Остаток» общий; «Считаем: … · PLT-3» | — |
| Выпуск по PO | «+» в «Ноябрь», PO с остатком 5 | диалог: товар, PO-N, кол-во 5 (макс. 5), дата 30.11 | ошибка RPC → toast с переводом `translateLogisticsError` |
| Новый PO | «+», «Новый заказ на производство…» | завод по умолчанию = `plant_id` варианта (пусто, если нет — обязателен выбор); создаёт PO (план = кол-во, срок = дата) и черновик выпуска | PO создан, выпуск нет → toast с номером созданного PO |
| Нет данных | Supabase не настроен / ошибка | `LogisticsError` | — |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260923120000_store_page_read_models.sql` -- образец RPC; views `store_stock_balance_ref` (`location_kind`, `owner_id`), `store_owner_ref`; helper `store_doc_number(kind, seq)` для `PO-n`/`OUT-n`.
- `supabase/migrations/20260923200000_store_reservations_in_outputs.sql` -- `store_po_output_qty` (сумма невыменённых выпусков) — «осталось разложить» = `store_po_plan_qty − store_po_output_qty`, как валидирует `store_create_production_output`.
- `supabase/migrations/20260922200000_store_baseline.sql:313-435` -- `store_category(parent_id, deleted_at)`, `store_product_category`, `store_product_variant(plant_id)`; у товара ровно один вариант, `variant.id == product.id` в демо.
- `src/features/logistics/logistics-api.ts` -- `rpcJson`, `createProductionOrder`, `createProductionOutput`, `ProductionForOrderOutputError` (образец обработки частичного сбоя в `createProductionForOrder`).
- `src/features/logistics/logistics-nav.ts`, `logistics-paths.ts` -- добавить путь и пункт меню (иконка `CalendarDays`) в `LOGISTICS_PRODUCTION_NAV_ITEMS` после «Выпуски».
- `src/features/logistics/stock-page.tsx` + `ui/stock-products-matrix.tsx` -- образец страницы-матрицы (Suspense, `LogisticsLoading/Error`, sticky-колонка, классы ячеек).
- `src/features/logistics/ui/list/list-toolbar.tsx` -- стиль toolbar-карточки; `ui/logistics-dialog.tsx`, `ui/quantity-field.tsx`, `ui/expected-end-field.tsx`, `ui/run-action.ts` (`translateLogisticsError`, `toast`).
- `src/components/ui/checkbox.tsx` -- base-ui; индикатор всегда `CheckIcon`, для промежуточного состояния главной галочки показывать `MinusIcon` (обёртка в фиче, файл `ui/` не менять). `switch.tsx`, `dropdown-menu.tsx`, `select.tsx` — готовые.
- `app/store/logistics/stock/page.tsx` -- образец route-файла с `metadata`.
- `scripts/lib/seed-logistics-stories.mjs:360-560` -- открытые PO сида: 901–903 (draft: Enduro 250 ×5, Cross 180 ×4, Power Max 250/320), 904–907 (in_progress, частично выпущены: Force 1100 план 6/выпущено 3, Cruiser, Hummer, Dayun mix), 920 (GP 401/881 без выпуска); `patch()` через service_role разрешён guard-триггером для незавершённых документов.
- `docs/features/logistics.md` -- таблицы «Маршруты», «Загрузка данных», список меню, «Миграции».

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260924120000_store_output_calendar_page.sql` -- RPC `store_output_calendar_page()` → jsonb: `freeOwnerId`; `categories` [id, parentId, name] (активные); `products` [id=variant id, name, unit, plantId, categoryIds]; `plants` [id] активные; `regions` [id, name, ownerId]; `customerOrders` [id, number, regionId, ownerId] — открытые или владеющие количеством ниже; `stock` [productId, ownerId, quantity] — сумма по `location_kind in ('warehouse','transfer')`, `<> 0`; `outputLines` [outputId, outputNumber, status, expectedEndOn, productionOrderId, productionOrderNumber, plantId, productId, ownerId, quantity] для `draft`/`in_progress`; `openOrders` [productionOrderId, number, plantId, productId, remaining>0] для PO не `done`/`cancelled` -- один запрос страницы.
- [x] `src/features/logistics/output-calendar.ts` -- типы payload, маппер, чистые функции: W из состояния фильтра, остаток, приход по месяцу/«Без срока», коды заводов товара, диапазон месяцев, дерево групп (вложенное, счёт — прямые товары группы, пустые ветки скрыты), текст «Считаем: …» -- логика отдельно от UI.
- [x] `tests/unit/output-calendar.test.ts` -- `node:test` по образцу соседних файлов: по тесту на каждую строку I/O-матрицы, которую покрывает `output-calendar.ts` (приход/готовый выпуск, без срока, просрочка и диапазон месяцев, повтор категории, «Без категории», двойной путь владельца, фильтр завода и «Считаем», «осталось разложить» и дата последнего дня месяца, флаг «новый» обходит фильтры) -- проверка расчётов.
- [x] `src/features/logistics/logistics-api.ts` -- `loadOutputCalendarPage()`; `createProductionOrderWithDraftOutput({plantId, productId, quantity, expectedEndOn})` на существующих функциях -- создание.
- [x] `src/features/logistics/output-calendar-page.tsx` + `ui/output-calendar-*.tsx` -- страница, toolbar (кнопка «Для кого считаем» с числом снятых пунктов, `Select` «Завод» с «Все» + коды из открытых выпусков, «Обновить», строка «Считаем»), матрица (sticky «Товар», свёртка групп кликом, подсветка текущего месяца и прошлых непустых ячеек, «+» по наведению от текущего месяца, поповер состава ячейки — OUT/PO/PLT/дата/статус/шт), панель, меню «+», диалог -- UI.
- [x] `app/store/logistics/calendar/page.tsx` -- route с `metadata` «Календарь выпусков | Логистика магазина | Oryx BMS».
- [x] `logistics-paths.ts`, `logistics-nav.ts` -- путь `calendar` и пункт «Календарь выпусков».
- [x] `docs/features/logistics.md` -- маршрут, меню «Производство», строка RPC в «Загрузка данных», миграция в «Бэкенд».
- [x] `scripts/lib/seed-logistics-stories.mjs` -- блок «календарь»: `store_create_production_output` с `p_complete:false`, `p_expected_end_on`, `allocation_owner_id` региона для части количества, `p_sequence_number` 930+ (в живой базе заняты OUT-917…921); «В работе» — `patch store_document.status`. План PO не превышать (`store_po_output_qty`). Затем те же вызовы — в живую базу по `sequence_number` PO -- демо для просрочки и прихода.

**Acceptance Criteria:**
- Given демо-база, when открыт `/store/logistics/calendar`, then колонки «Товар · Код завода · Остаток · месяцы · Без срока», группы по дереву категорий, текущий месяц подсвечен, по умолчанию «Считаем: всё — свободно и все резервы · Завод: все».
- Given снята «Свободно» и выбран один регион, when включён переключатель «С заказами клиентов региона», then «Остаток» и месяцы равны сумме резервов региона и его заказов; главная галочка «Все регионы» в промежуточном состоянии.
- Given клик по строке группы, then её товары и подгруппы скрываются/показываются.
- Given создание выпуска из ячейки «Декабрь» с датой 31.12, then количество появляется в декабре без перезагрузки и ячейка подсвечена; после «Обновить» выпуск подчиняется фильтрам.

## Design Notes

Состояние фильтра: `free`, `regionIds`, `withRegionOrders`, `orderIds` (все выбраны при первой загрузке). W = {free?} ∪ owners(regions) ∪ owners(заказы выбранных регионов, если переключатель) ∪ owners(orders). Товары показываются все (даже без остатка и выпусков); при фильтре завода — только товары с открытыми выпусками этого завода (или «новыми»). Сегодняшний месяц — по дате браузера.

## Verification

**Commands:**
- `npm test` -- expected: все тесты, включая новые, проходят
- `npm run typecheck`, `npm run build`, `npm run check:docs`, `npm run check:static-images` -- expected: успех
- `npx eslint <новые и изменённые файлы>` -- expected: 0 ошибок

**Manual checks:**
- Браузер на демо-базе: фильтры владельцев и завода, сворачивание групп, создание выпуска по PO и нового PO из ячейки; затем удалить созданные документы (строки, история, подтипы, `store_document`, место PO) через MCP с временным отключением guard-триггеров, как в `20260924090000_store_drop_legacy_po_reservations.sql`, и подтвердить, что их нет.

## Implementation Notes

- Реализация — субагент по спеке; ревью-патчи — тот же субагент. Функция RPC применена к демо-базе; миграция одна (`20260924120000_store_output_calendar_page.sql`), правки ревью внесены в неё же и переприменены `create or replace`.
- Демо: OUT-930…936 в сиде и в живой базе; PO-902 переведён в «В работе: Cross 180», чтобы OUT-930 «В работе» не висел на черновике заказа.
- Локальный новый выпуск подписан «Новый выпуск» до «Обновить»: `store_create_production_output` возвращает только `id`, без `sequence_number`.
- Проверка в браузере (родительская сессия): фильтр владельцев (ОАЭ + переключатель вкл/выкл), завод PLT-4, свёртка «4x2», создание по PO-905 в декабре → «3 шт» сразу, поповер «Новый выпуск». Тестовый OUT-937 удалён; ранее субагент удалил PO-928/OUT-937 своей проверки. Guard-триггеры включены.
- Hydration-предупреждения в dev-оверлее — от атрибута `data-cursor-ref` встроенного браузера, не от кода.

## Spec Change Log

## Review Triage Log

Pass 1 (thorough: blind-hunter, edge-case-hunter, verification-gap, intent-alignment). Verdicts: high 0 · medium 6 · low 13 · false 8 · maybe-false 0. Routes: patch 15, defer 1, reject 11. No intent_gap / bad_spec.

| Finding | Verdict | Route | Evidence / action |
|---|---|---|---|
| Local OUT-n built from document id, not sequence | medium | patch | `store_create_production_output` returns only `id`; label «Новый выпуск» until refresh |
| Soft refresh error not rendered once page loaded | medium | patch | `error` shown only when `!page`; toast added |
| Stale plant filter after refresh empties table | medium | patch | `plantId` reset when not in `plantFilterOptions` |
| Sticky header translucent / corner z-index | medium | patch | `bg-muted/40` on sticky th; opaque bg, z-30/z-20 |
| Products in group follow unordered payload | medium | patch | `jsonb_agg` without ORDER BY; sort by name ru + ordered aggregates |
| «Считаем» does not show stock stays total under plant filter (CAP-4) | medium | patch | appended «PLT-n (остаток по всем заводам)» |
| open_orders remaining per line double-counts same variant | low | patch | aggregated per (po, variant) |
| Soft-deleted regions listed | low | patch | `deleted_at is null` |
| Unknown status coerced to draft | low | patch | SQL filters, mapper now drops non-open rows; test added |
| Fresh cell permanent ring after animation | low | patch | static shadow removed |
| «+» invisible on keyboard focus; group rows mouse-only | low | patch | `focus-visible:opacity-100`; toggle button with aria-expanded |
| Raw unlabeled search input | low | patch | `Input` + aria-label |
| OUT-930 in_progress on draft PO-902 | low | patch | PO-902 set in_progress in seed and live |
| Docs lack behaviour section | low | patch | «Календарь выпусков» section added |
| Unused generic, `?? "1"` owner fallback | low | patch | removed |
| Tests: switch branch, mapper fields, local insert, misnamed overdue test | low | patch | tests added / renamed; `applyLocalOutput` extracted |
| Partial-failure path (PO created, output failed) untested | low | defer | no RPC mocking in `logistics-api` tests; sibling `createProductionForOrder` equally untested |
| One region still counts all selected orders | false | reject | matches contract W formula and prototype `buildW`: selected orders always count |
| isNew bypasses plant filter | false | reject | frozen Always rule: bypass owner and plant filters |
| Group count = direct products only | false | reject | prototype `countVisibleInSubtree` counts direct products; contract silent |
| Category cycle recursion | false | reject | tree data from PIM snapshot; no cycles, parent FK |
| Seed hard-codes free owner 1 | false | reject | existing seed convention (`allocation_owner_id: 1` throughout) |
| Spec unfinished / `npm test` gate | false | reject | workflow in progress; `npm test` exists (116 tests) |
| `english-ui:ignore-file` marker | false | reject | every sibling logistics file carries it |
| «Север» region missing in demo | false | reject | contract example name; demo uses ОАЭ etc. |
| In-flight create + refresh duplicates | low | reject | rare; fix adds guard |
| Soft-deleted parent category / deleted variant rows / deleted default plant | low | reject | none in demo; fixes add guards |
| Fractional qty, «Все заказы» ignores search, hard-coded «шт» subtitle, dynamic import, keyframes style | low | reject | cosmetic or matches prototype/existing patterns |
