---
title: 'Вкладка «План» на карточке заказа клиента'
type: 'feature'
created: '2026-09-24'
status: 'done'
baseline_commit: '5af1733ad0b937b4218a649e47c57dae5bfb6690'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-oryx-order-plan-2026-09-24/implementation-prompt.md'
  - '{project-root}/_bmad-output/brainstorming/brainstorm-order-fulfillment-plan-2026-09-24/brainstorm-intent.md'
  - '{project-root}/_bmad-output/brainstorming/brainstorm-order-fulfillment-plan-2026-09-24/output-stock-location.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-oryx-order-plan-2026-09-24/.working/variant-a3-three-blocks.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Менеджер раскладывает заказ клиента по источникам одиночными кнопками этапов; раскладку целиком нельзя собрать, сохранить на пару дней и запустить одной атомарной операцией.

**Approach:** Вкладка «План» (после «Товары») по `implementation-prompt.md` и макету A3: планы заказа с автосохранением действий `reserve` / `produce`, расхождения из живого состояния, запуск одной транзакцией через существующие команды документов. Выпуск получает своё место `production_output`.

## Boundaries & Constraints

**Always:** Приоритет: схема БД > `brainstorm-intent.md` > макет A3. Браузер пишет только через RPC. Одна функция `store_place_available(variant, location, owner)` для чтения, проверки ввода и запуска. Ключ строки = место × владелец. Ввод увеличивает количество только в пределах доступного и непокрытого остатка строки заказа; уменьшает всегда. Запуск — всё или ничего, минус и лишнее откатывают транзакцию. Коды WH/PLT вместо названий, русский текст, интерфейс понятен из формы (без поясняющих подписей).

**Never:** Действия со своим резервом (переместить, отгрузить, снять) в плане; даты готовности, согласования, заметки, автораспределение, сравнение и чужие планы; удаление планов; проводки на месте выпуска; push в `origin`; TEST/dummy-строки в демо-базе.

**Decisions (агент):** `store_order_plan.launched_coverage jsonb` — снимок «заказано / уже есть» по товарам на момент запуска, чтобы запущенный план показывал «Было» (снимок источников не хранится). `store_create_production_output` получает `p_allow_done_order` (по умолчанию `false`): запуск докидывает в закрытый PO, прямые кнопки по-прежнему не выпускают по закрытому. Результаты: резерв склада/пути → RSV; черновик выпуска → этот OUT; незанятый план PO и «докинуть» → один новый OUT на PO; новый PO → PO (с OUT на весь объём). «Уже есть» = отгружено + резерв заказа на складах и в пути + строки заказа в черновиках выпусков. Планы в демо-базе создаются RPC (сид не меняется; `truncate … cascade` их чистит).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|---|---|---|---|
| Ввод в пределах | WH-3 свободно 6, осталось 20, ввод 6 | действие сохранено, «Сохранено · ЧЧ:ММ» | — |
| Ввод сверх | ввод > доступно или > осталось | RPC отклоняет, поле возвращается к серверному значению | ошибка в индикаторе |
| Уменьшение при минусе | берём 6, доступно 2, ввод 4 | принято | — |
| Источник исчез | TR доехало / OUT завершён | строка красная, «−5», чип «доехало»/«завершён», «Запустить» недоступна | — |
| Лишнее | прямой резерв перекрыл строку | янтарный «Осталось −3» | — |
| Запуск | план без проблем, заказ открыт | документы созданы, `launched_at`, `result_document_id` у каждого действия | любой минус → откат, тост с ошибкой |
| Закрытый заказ | status done/cancelled | ввод и запуск недоступны; копия и архив доступны | RPC отклоняет |

</frozen-after-approval>

## Code Map

- `supabase/migrations/` -- последняя `20260924172000_store_order_lines_fixups.sql`; новые миграции после неё, применяются MCP `apply_migration`.
- `store_create_and_post_reservation` -- резерв на `warehouse`/`transfer`; запретить `production_output` тем же текстом.
- `store_create_production_output(po, lines, …, p_complete)` -- черновик выпуска: `allocation_owner_id` на строке; создать место `production_output`.
- `store_move_in_production_output(output, from, to, lines)` -- перевод владельца в черновике; добавить advisory locks обоих ключей.
- `store_set_order_line_quantity(doc, variant, qty)` -- увеличение строки PO («докинуть»), проверяет завод.
- `store_create_production_order(plant, lines, …, status)` -- новый PO «Черновик».
- `store_po_plan_qty`, `store_po_output_qty`, `store_qty`, `store_lock_stock_keys` -- основа `store_place_available`.
- `store_document_context` / `store_context_payload` / view `store_location_ref` -- чтение; добавить `order_plan` и `stock_location_id` выпусков.
- `src/features/logistics/customer-orders-page.tsx` -- `CustomerOrderDetailPage`, `DocumentTabs`, `canAct`, `reload`.
- `src/features/logistics/logistics-api.ts` -- `rpc`, `mapLogisticsPayload`, `loadDocumentContext`.
- `src/features/logistics/logistics-types.ts`, `logistics-labels.ts`, `logistics-lookups.ts`, `logistics-resolve.ts`, `logistics-availability.ts` -- `LOCATION_KINDS` + `production_output` («Выпуск»), `stockLocationId` у выпуска.
- `src/components/ui/{popover,dropdown-menu,alert-dialog,input,button}.tsx` -- shadcn для строки планов, меню, диалога запуска.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260924180000_store_output_stock_location.sql` -- пункты 1–9 «Изменения в базе» `output-stock-location.md` + `p_allow_done_order` -- выпуск как место.
- [x] `supabase/migrations/20260924181000_store_order_plan.sql` -- таблицы (RLS select, без DML), `store_place_available`, команды create/rename/archived/set_action/launch, `store_order_plan_payload` в `store_document_context` заказа клиента, гранты.
- [x] `src/features/logistics/order-plan/*` -- типы и маппинг payload, API-обёртки, чистые расчёты (покрытие, расхождения, группировка плана), компоненты строки планов, трёх блоков, диалога.
- [x] `src/features/logistics/customer-orders-page.tsx` -- вкладка «План».
- [x] `src/features/logistics/logistics-*.ts` -- вид места `production_output`.
- [x] Демо-планы через RPC у 2–3 открытых заказов (черновик, запущенный, архив).
- [x] `docs/features/logistics.md`, `.memlog.md` UX -- раздел «План заказа клиента», место выпуска; событие «реализовано».

**Acceptance Criteria:**
- Given новый план, when разложить товар из склада, пути, черновика выпуска, незанятого плана PO, докинуть в PO и новый PO и перезагрузить страницу, then раскладка на месте.
- Given расхождение после прямого действия, when открыть вкладку, then строки подсвечены в среднем и правом блоках, над «Запустить» «N нехватки · M лишнее», клик ведёт к первой проблеме.
- Given запуск, when подтвердить диалог «Запустить «План N»?», then созданы документы, ссылки-чипы в блоке «План», остатки без минуса, план только для просмотра с «Копировать в новый черновик» и «В архив».

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images` -- без ошибок.

**Manual checks:**
- Браузерный прогон из «Проверка перед сдачей» `implementation-prompt.md` на живом демо-бэкенде; проверочные данные удалить или вернуть.

## Implementation Notes

- Обе миграции применены к `oryx-supabase`. Демо: черновик «План 1» у OMS-26; у OMS-1 запущенный «План 1» (RSV-926, OUT-930, OUT-937, PO-928 с OUT-938) и архивная копия.
- Браузерный прогон: ввод сверх отклонён с откатом поля; раскладка из склада, выпуска, незанятого плана PO, «докинуть» и нового PO пережила перезагрузку; расхождение (смоделировано правкой количества действия, затем исправлено вводом) подсветило строки и заблокировало запуск, серверный запуск отклонён «Не хватает…»; запуск создал документы, минусов в остатках нет; копия, архив и возврат работают. Путь (TR) проверен визуально на OMS-26.
- Правка по прогону: режим просмотра показывает только строки плана.

## Spec Change Log

## Review Triage Log

| # | Слой | Находка | Вердикт | Обоснование | Маршрут |
|---|------|---------|---------|-------------|---------|
| 1 | blind | «Докинуть» в PO другого завода падает при запуске | false | `store_set_order_line_quantity` проверяет завод только для новой строки PO; PO предлагается либо своего завода, либо уже со строкой товара | — |
| 2 | blind | Товар без завода — новый PO на любом заводе | false | baseline: `plant_id` NULL — «PO может выбрать любой завод»; `store_create_production_order` завод строки не проверяет | — |
| 3 | blind | Вкладка не подхватывает свежие данные после запуска | false | `reload` ставит `pending` → карточка показывает загрузку и перемонтирует вкладку, payload читается заново | — |
| 4 | blind+edge | Удалённый из заказа товар оставляет действия, план не запустить и не почистить | medium | удаление строки заказа не трогает действия; `set_action` отвергал даже 0 | patch (182000: чистка действий черновиков, проверка «нет в заказе» только при увеличении) |
| 5 | blind+edge | Планы закрытого заказа не только для просмотра (копия, архив) | false | постановка: у закрытого заказа «архив и копирование доступны» | — |
| 6 | blind+edge | Переименование доступно запущенному, архивному плану и на закрытом заказе | low | таблица жизненного цикла разрешает переименование только черновику | patch (SQL + «⋯» только для черновика открытого заказа) |
| 7 | blind | Меню «⋯» и подвал расходятся по действиям запущенного плана | false | промпт: у запущенного «Копировать» и «В архив» внизу, «не дублировать в ⋯» | — |
| 8 | blind | Поле может отправить то же значение дважды | low | RPC задаёт абсолютное количество — повтор безвреден; правка добавила бы сложность | reject |
| 9 | blind | Ошибка ввода сверх видна только в индикаторе | false | так задано матрицей: поле возвращается, ошибка в индикаторе | — |
| 10 | blind | «Запустить» доступна после ошибки сохранения | false | после ошибки на экране серверное состояние, запускается ровно оно | — |
| 11 | blind | Две «свободные» строки товара в выпуске ломают перевод владельца | false | уникальный индекс `(document, variant, from_owner, to_owner)` не даёт вставить вторую | — |
| 12 | blind | Каждый запуск добавляет новый OUT на PO | false | решение спецификации: один новый OUT на PO на запуск | — |
| 13 | blind | Черновики выпусков отменённого PO считаются покрытием | false | закрытие/отмена PO отменяет его черновики (`store_cancel_po_active_outputs`) | — |
| 14 | blind | Завод в подписи и в фильтре PO из разных полей | false | `line.plantId` маппится из `variant.plant_id` — источник один | — |
| 15 | blind | Имена «План N» и «(копия) (копия)» хрупкие | low | косметика, в обычной работе редко | reject |
| 16 | blind | Английские ошибки обёртки, «отменено», listbox без стрелок, сид без планов | low | тексты «Supabase is not configured» — существующий паттерн; «перемещение отменено» — верный род; сид — решение спецификации | reject |
| 17 | edge | Поздний ответ автосохранения перетирает payload после создания плана | medium | `createPlan`/`runPlanCommand` не ждали очередь `setAction` | patch (общая очередь + fallback на `defaultPlanId`) |
| 18 | edge | Действие с неизвестным видом места скрыто | low | индекс мест строится из всех складов, перемещений, PO и выпусков контекста; не воспроизводится | reject |
| 19 | edge | Удалённые заводы в выборе нового PO | false | удалённых заводов в данных нет, `set_action` отвергает удалённый | — |
| 20 | edge | `create or replace view store_location_ref` сбросил `security_invoker` | medium | живой `reloptions` был null | patch (182000 + файл 180000) |
| 21 | vgap | `npm test` красный: тест ждёт четыре вида мест | medium | подтверждено прогоном | patch |
| 22 | vgap | Нет тестов модели плана | medium | поиск по `tests/` пуст | patch (`order-plan-model.test.ts`) |
| 23 | vgap | Нет тестов новых полей маппера | medium | фикстура выпуска без `stock_location_id` | patch |
| 24 | vgap | SQL-правила плана без автотестов | medium | в репозитории нет тестового стенда БД | defer |
| 25 | vgap | AGENTS.md пишет «тестов нет», а `npm test` есть | low | правка agent-context файла | defer |
