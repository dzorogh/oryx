---
title: 'Список заказов: новые сверху и смешанный демо-заказ'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '8e991914fc38d4c616953a15b159c9d06feb6436'
context:
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Список заказов клиента идёт по `id` по возрастанию, поэтому свежие демо-истории оказываются внизу. В данных нет одного открытого заказа с многими разными товарами, частью резерва на складах и готовым leftover у поставщиков — не на чем смотреть Allocation Atlas.

**Approach:** Показывать заказы клиента от новых к старым по `created_at`. Добавить воспроизводимую демо-историю OMS-906 на **20 разных SKU**: у 18 строк после выпуска свободного остатка товар зарезервирован на складах заводов; у **2 SKU (~10%)** выпуск кладёт готовое наличие на склад завода, **без резерва** под этот заказ.

**Decisions:** OMS-906 = 20 SKU. «10% у поставщиков» = вариант B: эти SKU только произведены и лежат свободными на складе своего завода, без RSV на OMS-906.

## Boundaries & Constraints

**Always:**
- Сортировка только списка `/store/logistics/customer-orders`; ключ `created_at` desc, при равенстве `id` desc.
- Новый заказ живёт в `seed-logistics-stories.mjs` как OMS-906 (диапазон id 906–999), открытый, без отгрузки.
- Остатки создавать только через существующие RPC (`store_*` post/complete), не прямой insert в журнал.
- Перед резервом на складе сначала выпустить свободный остаток на это место.
- Незакоммиченный Allocation Atlas не трогать.

**Never:**
- Не менять глобальный `selectAll` (он сортирует все таблицы по id).
- Не трогать packing `/store/orders`, формы RSV/SHP dropdown, `logistics-demo.json`.
- Не переводить `customer-orders-page.tsx` на английский.
- Не оставлять одноразовый live-заказ вне seed: следующий `npm run seed:logistics` должен воспроизвести OMS-906.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| List newest first | Смесь OMS-1..70 (2025–2026) и историй 901–906 | Первая строка — самый поздний `created_at` (ожидаемо OMS-906) | N/A |
| Filter still works | Чип «Открыт» / «Закрыт» | Тот же набор статусов, внутри — тоже newest first | N/A |
| Mixed demo order | `npm run seed:logistics` | OMS-906 open, 20 SKU; 18 строк reserved на WH заводов; 2 SKU без RSV, с free наличием на складе своего завода | RPC error → seed падает, без частичного «тихого» заказа |
| Re-seed | Повторный seed | Документы 901–999 сброшены, OMS-906 собирается заново; снимок 1–70 на месте | N/A |
| Empty list | Нет заказов | Пустая таблица как сейчас | N/A |

</frozen-after-approval>

## Code Map

- `src/features/logistics/customer-orders-page.tsx:72` — `rows` сейчас только `filter` по статусу; сортировку делать здесь (или вынести comparator в маленький helper рядом).
- `src/features/logistics/logistics-api.ts:290-298,355` — `selectAll(..., "id")` ascending; **не менять**.
- `scripts/lib/seed-logistics-stories.mjs` — `STORY_LO/HI` 901–999; `STORY_ORDERS` 901–905; `insertCustomerOrder` одна строка с `line.id = order.id`; расширить до нескольких линий с отдельными id; `resetStories` чистит документы `901–999`, но транзакции по `customer_order_id` только `901–905` — расширить до `STORY_HI`.
- `scripts/seed-logistics.mjs:102` — вызывает stories после upsert снимка; счётчик `story_orders` сейчас `id<=905`.
- Растения/склады: `PLANT` + Dubai `11`; 176 SKU с `manufacturer_id`; резерв: один RSV = один заказ + одно место, несколько `reservation_line` на разные COL.
- Не трогать: `src/components/store/orders/store-orders-page.tsx`, `allocation-atlas.ts`, `customer-order-lines-table.tsx`.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/logistics/customer-orders-page.tsx` (+ helper/тест при выносе comparator) -- сортировать видимые строки newest first -- список больше не следует id asc.
- [x] `scripts/lib/seed-logistics-stories.mjs` -- OMS-906: 20 SKU, выпуск на склады заводов, RSV на 18 строк, 2 SKU только free на заводе; починить reset `customer_order_id` до `STORY_HI` -- воспроизводимый демо-заказ.
- [x] `scripts/seed-logistics.mjs` -- счётчик stories не резать по 905 -- лог seed отражает 906.
- [x] `docs/features/logistics.md` -- одна фраза: список newest first; в seed есть смешанный OMS-906 -- док совпадает с UI/данными.
- [x] Live: `npm run seed:logistics` на demo Supabase -- заказ и остатки есть в инстансе.

**Acceptance Criteria:**
- Given смесь старых снимковых OMS и историй, when открыт список заказов клиента, then сверху самый новый по `created_at`.
- Given повторный `seed:logistics`, when смотрим OMS-906, then 20 разных товаров, 18 строк reserved на складах заводов, 2 SKU без резерва и со свободным готовым наличием на складе своего завода.
- Given фильтр статуса, when переключаем чипы, then порядок внутри фильтра остаётся newest first.

## Implementation Notes

- Сортировка: `src/features/logistics/customer-orders-sort.ts` (`created_at` desc, затем numeric `id` desc); страница списка только фильтрует через `visibleCustomerOrders`. `selectAll` не менялся.
- OMS-906: 20 SKU на 4 заводах (Qianjiang WH-41, Taotao WH-40, Koolcnchet WH-3, Dayun WH-9). 18 строк — posted RSV на склад завода; leftover GP 1100 Ultra / Cross 130 — выпуск на завод, без RSV. Заказ не отгружался.
- Posted RSV нельзя удалить через REST, поэтому seed вызывает `store_reset_logistics_stories(901,999)` (security definer, только этот диапазон). Миграции `20260918142929` + qualify-ids `20260918143019`.
- Release в истории 904 перенесён на id 934, чтобы не конфликтовать с PK.
- `scripts/seed-logistics.mjs` уже логировал `story_orders=${stories.orders}`; режет 905 только stories-модуль — исправлено на `STORY_HI`.
- Проверка: 13 unit-тестов сортировки/seed-shape; live SQL 70 snapshot + 6 stories; браузер — OMS-906 первый в «Все» и «Открыт», карточка 20 строк / 18 WH-резервов / 2 без RSV.
- Patch review: `seedMixedDemoOrder` экспортирован; тест гоняет его на фейковом client и требует leftover COL 913/918 (SKU 44/50) на output и не на RSV, ровно 18 reservation lines.
## Spec Change Log

## Review Triage Log

- false — Code Map спеки устарел и не называет новые файлы: правка спеки этой сборки запрещена как фикс; карта была планом до кода, актуальный след в Implementation Notes.
- false — RPC error оставляет частичный OMS-906: seed бросает ошибку (не «тихий» успех); следующий `store_reset_logistics_stories(901,999)` сносит недособранный 906. Тот же последовательный RPC-цикл уже был у 901–905.
- low — нет occupancy map id 906–925 / RSV-934: разработчик следующей истории может столкнуться с PK; в повседневном UI не видно. Фикс комментарием/таблицей в seed больше прямой правки бага — отклонено.
- medium — unit-тесты не исполняют `seedMixedDemoOrder`: достаточно поменять `reserved = group.lines`, и `npm run test` всё ещё зелёный, а leftover SKU уедут в RSV. Закрывается мок-клиентом на реальном seed-цикле.
- false — docs/features/logistics.md «прячет» детали: frozen intent просил одну фразу; выносить leftover SKU, tie-break и dropdown id-asc в этот абзац intent не требовал.
- false — фикстура OMS-70 с timestamp OMS-48: тесты сортируют синтетические даты, не снимок; порядок newest-first всё равно ломается, если comparator вернётся к id-asc.
- false — пустые Spec Change Log / status в диффе: фикс — правка спеки; на диске уже `in-review`, чеклист выполнения отмечен после step-03.
- false — Verification без вписанных результатов прогона: это процесс спеки, не дефект продукта.
- false — первая миграция с ambiguous `id` и anon execute reset: вторая миграция квалифицирует id; live seed дважды прошёл. Anon+security definer ограничен 901–999 и заменяет прежний REST-wipe историй тем же anon-ключом seed.
- false — «Создан» показывает только дату, sort — полный ISO: ячейка даты не менялась; внутри дня порядок задаёт `created_at`, как в intent.
- medium — `seedMixedDemoOrder` не экспортирован и проверяется grep-ом имени: тот же корневой дефект, что unit не гоняет цикл выпуска/RSV.
- medium — verification-gap: `seedMixedDemoOrder` 18/2 никогда не выполняется; leftover COL 913/918 не проверяются на output vs reservation insert. Disposition слоя: patch.
- medium — verification-gap: reset-through-999 только по тексту JS, SQL-тело RPC не гоняется из Vitest. Disposition слоя: defer. Live повторный seed уже оставил 70 snapshot + 6 stories; закрытие — только Postgres-харнесс, которого в `npm run test` нет.
## Design Notes

Сортировку держать на странице списка, не в `selectAll`: иначе поедут склады, журнал и документы. Для OMS-906 группировать выпуск/резерв по складу завода (один PO+output и один RSV на место). 18 SKU: выпустить ровно заказанное и зарезервировать на WH завода. 2 SKU: выпустить заказанное на WH завода и **не** проводить RSV. Заказ не отгружать. Atlas-файлы из грязного дерева не входят в этот дифф.

## Verification

**Commands:**
- `npm run lint` -- без новых ошибок
- `npm run typecheck` -- чисто
- `npm run test` -- сортировка списка покрыта; seed не гоняется из Vitest
- `npm run check:ui-english` -- ignore-file страницы заказов по-прежнему ок
- `npm run seed:logistics` -- `story_orders` включает 906; без RPC-ошибки

**Manual checks:**
- `/store/logistics/customer-orders` — OMS-906 первая строка; в карточке 18 строк с резервом WH, 2 строки без резерва при free наличии на складе завода.
