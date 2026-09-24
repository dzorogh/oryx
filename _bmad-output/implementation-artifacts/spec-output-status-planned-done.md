---
title: 'Статусы выпуска «Запланирован → Готов» и редактируемые строки заказов'
type: 'feature'
created: '2026-09-24'
status: 'done'
baseline_commit: '457a2b01eeca5089a430e08e5d0f73fded1f73e9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (1) У выпуска цепочка «Черновик → В работе → Готов» (+ «Отменён»). «В работе» лишний: команды перевода нет, такие выпуски есть только в сиде и застревают. «Черновик» неверен по смыслу: выпуск `draft` — плановый приход, держит резервы. (2) Строки заказа на производство и заказа клиента нельзя изменить или удалить, тот же товар повторно не добавить — открытый заказ не увеличить.

**Approach:** (1) У `production_output` коды `draft / done / cancelled`, `draft` показывается «Запланирован»; код не переименовывать; `in_progress` выпуска убрать из словаря, данных, сида, SQL и фронтенда; тексты «черновик выпуска» → «запланированный выпуск». (2) Одна команда «задать количество товара в заказе» для заказа клиента и заказа на производство: добавить, изменить, удалить; интерфейс на вкладках «Товары» обоих заказов.

**Decisions (human):** одна спецификация; редактируются оба вида заказов; менять можно всегда, в том числе после закрытия и отмены; план заказа на производство может стать меньше неотменённых выпусков (перевыпуск допустим); заказ клиента не ниже отгруженного, резервы сверх новой потребности остаются и подсвечиваются.

## Boundaries & Constraints

**Always:** Подпись статуса зависит от вида: выпуск `draft` = «Запланирован» везде (шапка, список, группировка, календарь, трекер, связанные документы, активность товара, история); другие виды — прежние подписи. База принимает новый статус только из `allowed_statuses` вида. Демо-история 4 выпусков выглядит так, будто они всегда были `draft`. Товар в заказе — одна строка; повторное добавление увеличивает её. Цена строки — снимок при первом добавлении.

**Never:** Не трогать `in_progress` у заказов и перемещения. Не переименовывать `draft`. Не чинить общую путаницу подписей других видов (в deferred-work). Не менять цвет бейджа `draft`. Не писать изменения строк в `store_document_history`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|----------|--------------|----------|-------|
| Выпуск `draft` | карточка | «Запланирован», «Завершить», «Отменить» | N/A |
| Вернуть `in_progress` | UPDATE статуса выпуска | отказ | `Статус in_progress недопустим для вида production_output` |
| Увеличить план | PO любой статус, товар есть | количество = новое | N/A |
| План ниже выпусков | PO: 10 план, 8 в выпусках → 5 | сохраняется, «Не распределено» = 0 | N/A |
| Удалить строку PO | товар в неотменённых выпусках | отказ | «Товар есть в выпусках — уменьшите план, но не удаляйте» |
| CO ниже отгруженного | отгружено 4, задать 3 | отказ | «Нельзя меньше отгруженного (4)» |
| Удалить строку CO | есть отгрузка или резерв товара | отказ | «Сначала снимите резерв и верните отгруженное» |
| Добавить имеющийся товар | товар уже в заказе | количество суммируется | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260922200000_store_baseline.sql` -- `allowed_statuses` (98–105); `store_document_header_guard` (2541); триггеры `store_document_history_trg`, `store_document_history_no_update` (1076, 1089); `store_insert_line` (1391); `store_add_production_line` (1784) — заменить; уникальный индекс строк (847).
- `20260923200000_store_reservations_in_outputs.sql` -- `store_po_assigned_qty`, `store_cancel_po_active_outputs`.
- `20260923213000_store_move_in_production_output.sql` -- тексты «черновик».
- `20260924150000_store_reservations_without_drafts.sql` -- последняя `store_document_line_guard` (ветка выпуска `in_progress`; блок `done/cancelled` для CO/PO снять).
- `20260924120000_store_output_calendar_page.sql` -- `output_lines` фильтр.
- `scripts/lib/seed-logistics-stories.mjs` (560–645) -- `calOut` PATCH в `in_progress`.
- `src/features/logistics/logistics-types.ts` (69–70) -- сузить `OUTPUT_STATUSES`: typecheck найдёт сравнения с `planned`/`in_progress`.
- `logistics-labels.ts` -- `OUTPUT_STATUS_LABELS`.
- Слитые карты подписей без вида: `document-timeline.ts` (`statusLabels`), `ui/related-documents.tsx`, `ui/order-progress-tracker.tsx`, `ui/product-activity-card.tsx`; источник — `logistics-related.ts`.
- Проверки выпуска: `order-action-forms.tsx`, `flow-documents-pages.tsx` (134, 1111–1186), `allocation-atlas.ts`, `logistics-availability.ts` (377, 444), `order-document-coverage.ts`, `logistics-related.ts` (163), `logistics-rules.ts` (57), `logistics-cancel-guidance.ts` (34, 265).
- `output-calendar.ts`, `ui/output-calendar-toolbar.tsx`, `output-calendar-page.tsx`, `ui/output-reserve-dialog.tsx`, `ui/output-release-dialog.tsx`, `logistics-api.ts` (1114) -- статусы и тексты.
- Редактирование: `logistics-api.ts` (`addProductionLine` 1325); `production-orders-page.tsx` (385–389, 465, 706–718, 801–905 диалог «Добавить товар», `productsForPlant`); `ui/production-order-product-manifest.tsx` (строка товара, кнопка на hover); `customer-orders-page.tsx` (`CustomerOrderCreateDialog` — выбор товара, 700–750 вкладка); `ui/customer-order-lines-table.tsx` (`LineActionsMenu` только при `canAct`); `logistics-balances.ts` `sumShippedForLine`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260924170000_store_output_status_planned_done.sql` -- `allowed_statuses` выпуска; при отключённых триггерах истории `in_progress`→`draft` в `store_document` и `store_document_history`; header guard проверяет статус по `allowed_statuses`; пересоздать `store_po_assigned_qty`, `store_cancel_po_active_outputs`, `store_output_calendar_page`, `store_move_in_production_output` (тексты). Применить через MCP `apply_migration`.
- [x] `supabase/migrations/20260924171000_store_editable_order_lines.sql` -- `store_set_order_line_quantity(p_document_id, p_product_variant_id, p_quantity)` для `customer_order`/`production_order`, любой статус: 0 → удалить (с проверками матрицы), нет строки → `store_insert_line`, иначе UPDATE; PO — вариант своего завода; `store_document_line_guard`: CO/PO без блокировки по статусу, без ветки выпуска `in_progress`; drop `store_add_production_line`; grant, `notify pgrst`.
- [x] `scripts/lib/seed-logistics-stories.mjs` -- убрать `in_progress` у `calOut`.
- [x] Статусы выпуска во фронтенде -- типы, подписи, `statusLabel?` в `RelatedDocumentItem`/`ProductActivityRow`, история выпуска с `OUTPUT_STATUS_LABELS`, проверки только `draft`, безопасная отмена `draft`, тексты.
- [x] `logistics-api.ts` -- `setOrderLineQuantity`, убрать `addProductionLine`.
- [x] Общий диалог строки заказа (новый `ui/order-line-dialog.tsx`) -- добавить (товар + количество, имеющийся товар суммируется) / изменить / удалить; подсказки: PO «в выпусках N, выпущено M», CO «отгружено N».
- [x] PO карточка и манифест -- «Добавить товар» всегда; на строке «Изменить».
- [x] CO карточка и таблица -- «Добавить товар» всегда; в меню строки «Изменить количество» всегда; подсветка «резерв больше заказа на N».
- [x] `docs/features/logistics.md`, `_bmad-output/brainstorming/brainstorm-order-fulfillment-plan-2026-09-24/requirements.md` (3.4, 3.5, 3.7, C-13, C-14) -- обновить.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- слитые карты подписей других видов; журнал изменений строк заказов.

**Acceptance Criteria:**
- Given демо-база после миграций, then статусы выпусков только `draft/done/cancelled`, у выпусков нет истории `in_progress`.
- Given трекер заказа клиента, then выпуск `draft` — «Запланирован», заказ на производство `draft` — «Черновик».
- Given закрытый заказ на производство, when меняю план, then сохраняется, статус не меняется.
- Given заказ клиента, when добавляю товар, который уже есть, then одна строка с суммой.

## Design Notes

Узкий `OutputStatus` — инструмент поиска: typecheck покажет каждое сравнение выпуска с `planned`/`in_progress`. `statusLabel` в элементах связанных документов позволит позже исправить подписи всех видов. Одна команда с семантикой «задать количество» вместо трёх (add/update/remove) держит правила в одном месте.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images` -- всё зелёное.
- MCP `execute_sql` -- статусы выпусков, `allowed_statuses`, история; команда строки на демо-заказе с откатом значения в той же сессии.

**Manual checks:**
- Браузер: список выпусков, OUT-930, календарь, трекер CO; PO — добавить/изменить/удалить товар, закрытый PO; CO — то же, ошибка «ниже отгруженного», подсветка лишнего резерва. Вернуть демо-данные к исходным значениям.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Находка | Вердикт | Доказательство | Маршрут |
|---|---------|---------|----------------|---------|
| B1 | Закрытые и отменённые заказы редактируются | false | Решение человека в frozen: «менять можно всегда, в том числе после закрытия и отмены». | reject |
| B2 | Готовый выпуск навсегда блокирует удаление строки заказа клиента | medium | `v_output_hold` фильтрует `status is distinct from 'cancelled'`, строки `done` неизменяемы; после снятия складского резерва удаление всё равно запрещено вопреки матрице. | patch (A) |
| B3 | Сложение при добавлении на клиенте по устаревшему снимку | low | Реально при параллельной правке, но прототип однопользовательский; исправление добавляет параметр RPC. | reject |
| B4 | «Резерв больше заказа» не учитывает резерв в запланированных выпусках | medium | `reserveExcess` = складской резерв + отгружено − заказано; удержания в `draft`-выпусках не входят. | patch (F) |
| B5 | Нет подсказки, когда план PO меньше выпусков | low | Не требуется намерением; исправление добавляет UI. | reject |
| B6 | Диалог не показывает ограничения заранее, «Удалить» доступна при отказе сервера | low | Сервер возвращает понятную ошибку; исправление добавляет ветки. | reject |
| B7 | Перезапись истории оставила дубли `draft` | medium | В базе у OUT-930/931/933/935 по два одинаковых снимка; лента рисует пустое «Изменён документ». | patch (B) |
| B8 | `requirements.md` §3.5/§3.6 устарели | low | §3.6 «строки выпуска после старта», «завершённый документ не меняется» без оговорки о строках заказов. | patch (J) |
| B9 | «Черновик выпуска» в O-2, C-2, §3.5 | low | Строки 192, 225, 236 `requirements.md`. | patch (J) |
| B10 | Не отмечено, что правки строк не обнаружить по истории | low | C-13 помечен «Закрыто» без оговорки; история строк не пишется. | patch (J) |
| B11 | Логика отправки продублирована на двух страницах | low | Выражение количества повторено в `customer-orders-page.tsx` и `production-orders-page.tsx`. | patch (P2) |
| B12 | Нет тестов нового поведения | medium | См. V1–V3. | patch/defer |
| B13 | «Запланирован» в двух источниках | low | `STATUS_RU` в `output-calendar.ts` дублирует `OUTPUT_STATUS_LABELS`. | patch |
| B14 | Точность ввода и `round(…, 2)` | low | Редкий ввод; исправление добавляет валидацию. | reject |
| B15 | Сохранение без изменений вызывает сервер | low | Безвредно. | reject |
| B16 | Потерян текст «Для этого производителя нет доступных товаров» | low | Завод без товаров маловероятен; исправление добавляет проп. | reject |
| B17 | Устаревшие комментарии схемы | false | Комментарий `allowed_statuses` говорит «из словаря», подмножество остаётся верным; комментарий `store_po_assigned_qty` обновлён. | reject |
| E1 | = B2 | medium | То же. | patch (A) |
| E2 | Количество < 0.005 округляется до 0 и удаляет строку | low | Маловероятный ввод; исправление — новый guard. | reject |
| E3 | Проверка завода мешает менять существующую строку с удалённым вариантом | low | Проверка стоит до поиска строки и срабатывает на UPDATE; исправление — перенос в ветку вставки. | patch |
| E4 | = B3 | low | То же. | reject |
| E5 | = B4 | medium | То же. | patch (F) |
| E6 | `1e999` → Infinity → null | low | Маловероятно; сервер отказывает. | reject |
| E7 | Утверждение «история как будто всегда draft» ложно | medium | = B7. | patch (B) |
| V1 | Нет проверки `statusLabel` «Запланирован» в связанных документах и активности | medium | Тесты проверяют только id. | patch |
| V2 | Нет тестов `store_set_order_line_quantity` | medium | В репозитории нет стенда RPC; проверено вручную SQL с откатом. | defer |
| V3 | Правило сложения количества не вынесено и не протестировано | medium | Инлайн в двух страницах. | patch (P2) |
| V4 | = B2 | medium | То же. | patch (A) |
