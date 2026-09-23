---
title: 'Резерв под производство только в выпусках'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'bb91b3d1d347173a24db8124161d28da7d655c05'
context:
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Сейчас резерв под заказ клиента можно держать и в заказе на производство (документ резерва на месте PO), и в выпуске (строка выпуска «Под заказ клиента»). Оба документа могут долго висеть отложенными — два параллельных плановых резерва конфликтуют и непонятны.

**Approach:** Резерв под производство держит только выпуск: строка выпуска в статусе `draft`/`in_progress` с владельцем «заказ клиента» — это «резерв в выпуске»; при завершении выпуска он, как и сейчас, становится складским резервом. Резервы на месте заказа на производство запрещены. Все сценарии «создать заказ на производство под заказ клиента» остаются, но дополнительно сразу создают черновик выпуска на весь объём с резервом и заранее предупреждают об этом. Резерв «в существующем заказе на производство» превращается в выбор: новый черновик выпуска или свободное количество в имеющемся черновике выпуска.

## Boundaries & Constraints

**Always:**
- Бэкенд отклоняет резерв (и черновик, и проведение) на месте вида `production_order` понятной русской ошибкой.
- «Резерв в выпуске» меняется только у выпуска в `draft`; строки выпуска после старта неизменны (существующий guard).
- Выпуск не может в сумме (все неотменённые выпуски заказа) превысить план заказа на производство по варианту.
- Частичный резерв строки выпуска хранится как две строки одного варианта: занятая (владелец — заказ клиента) и свободная. Сейчас `allocation.quantity` теряется — исправить.
- Лимит резерва под заказ клиента в формах = остаток к резерву минус уже зарезервированное в активных выпусках; нельзя зарезервировать одно и то же дважды.
- Предупреждение до отправки (видимый блок в диалоге, не мелкая подпись) + тост после.
- Весь текст UI — на русском; склады и заводы — кодами (`place-codes.md`).
- Решение (закрытие/отмена PO): закрытие или отмена заказа на производство автоматически отменяет его выпуски в `draft`/`in_progress`; их резервы исчезают вместе с ними. Завершённые выпуски не трогаются. Диалоги закрытия и отмены PO об этом предупреждают.

**Never:**
- Не удалять вид места `production_order`, `store_production_order.stock_location_id` и старые документы резерва — только запретить новые и перестать их учитывать.
- Не считать резерв в выпуске складским резервом: «Не обеспечено» в списке заказов клиента и `remainingToReserveForLine` остаются по складскому остатку.
- Не делать снятие резерва внутри выпуска (отдельная задача); сейчас резерв из черновика снимается отменой выпуска.
- Не добавлять production-сложность: без backfill-машинерии, флагов совместимости.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| PO из заказа клиента | CO, завод, 3 товара по N | PO `draft` + выпуск `draft` с 3 строками, владелец — CO, количества = N | Ошибка второго шага: PO уже создан — тост с текстом и ссылкой на PO, без отката |
| Резерв в новый выпуск | PO: план 10, в выпусках 4 | Доступно 6; создаётся черновик выпуска с занятой строкой | qty > 6 → ошибка «больше плана» |
| Резерв в имеющийся черновик | Выпуск draft: свободно 5 варианта | Свободная строка −k, занятая строка +k (или создаётся) | k > 5 → ошибка; выпуск не draft → ошибка |
| Старый путь резерва на PO | RPC с местом `production_order` | Отказ | «Резервируйте в выпуске заказа на производство» |
| Частичный резерв при создании выпуска | строка 10, занято 4 | Две строки: 4 под CO, 6 свободно | — |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260922200000_store_baseline.sql` -- канон записи: `store_create_and_post_reservation` L1879, `store_create_reservation_draft` L1947, `store_post_reservation` L1991 (пропускают ledger для `production_order`); `store_close_production_order` L1830 (создаёт RSV `production_order_close`); `store_create_production_output` L2258 (проверка плана только по `done`, `allocation_owner_id` на всю строку); `store_cancel_document` L2446; line guard L2481 (owner-поля строк не UPDATE-ятся, draft-строки выпуска можно менять/удалять); unique `(document, variant, from, to)` L847. Не править файл — только новая миграция.
- новая миграция `supabase/migrations/20260923200000_store_reservations_in_outputs.sql` -- все SQL-изменения + конверсия данных.
- Живые данные: 2 проведённых RSV на местах PO (id 149, 151; PO 148/150 `draft`, владелец CO owner 87, по 1 шт вариантов 44/34), 1 черновик выпуска, строк выпусков с владельцем ≠ free — 0.
- `src/features/logistics/logistics-api.ts` -- `buildCreateProductionOutputRpcArgs` L1079, `createProductionOutput` L1106, `createProductionForOrder` L1127 (PO + RSV на PO → заменить на PO + черновик выпуска); новый клиент для RPC резерва в выпуске.
- `src/features/logistics/order-action-forms.tsx` -- `ProductionFromOrderForm` (~L150–380, подпись L363 «зарезервируется автоматически», колонка «в производстве» L314); `ReserveOnProductionForm` L382–518 → переделать в «Зарезервировать в выпуске»; `OutputFromOrderForm` L521 читает мёртвые балансы места PO (всегда 0) — перевести на остаток плана.
- `src/features/logistics/production-orders-page.tsx` -- диалог «Зарезервировать» L946–1066 (+ `reserveFree` L460 из пустых балансов, `onReserve` L758) → выбор цели: новый/имеющийся черновик выпуска этого PO.
- `src/features/logistics/customer-orders-page.tsx` -- кнопки этапа «Производство» L542–607, подключение форм L821–830, `releasePlace` L817.
- `src/features/logistics/logistics-forms.tsx` -- `ReservationForm` L324–533: места `production_order` L387–400 убрать.
- `src/features/logistics/logistics-availability.ts` -- `productionDemandAssigned` L375 и `productionLineReservationBreakdown` L437 → считать по строкам активных выпусков PO; сюда же хелперы «зарезервировано в активных выпусках для строки CO», «свободно в черновике выпуска», «план PO без выпусков».
- `src/features/logistics/allocation-atlas.ts` -- `lineLocationAllocations.inProduction` L39–65 → из активных выпусков.
- `src/features/logistics/order-document-coverage.ts` -- L143 PO-резервы → покрытие этапов «Производство» (по PO выпуска) и «Выпуски» из активных выпусков с владельцем CO.
- `src/features/logistics/logistics-related.ts` L181, L307; `logistics-cancel-guidance.ts` L33 текст закрытия PO; `ui/production-order-close-dialog.tsx`.
- `src/features/logistics/ui/production-output-lines-fields.tsx` -- поля «Под заказ клиента»/«Занятое количество» — переиспользовать.
- `tests/unit/logistics-output-lines.test.ts`, `universal-document-lines.test.ts` -- обновить под новую модель (`npm test`).
- `docs/features/logistics.md` -- правило резервов.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260923200000_store_reservations_in_outputs.sql` -- (1) запрет места `production_order` в трёх RPC резерва; (2) `store_create_production_output`: план по неотменённым выпускам, строка может нести `allocation_quantity` → split на занятую+свободную; (3) новый `store_reserve_in_production_output(p_output_id, p_owner_id, p_lines)` для draft; (4) `store_po_assigned_qty` = занятое в активных выпусках; (5) `store_close_production_order` и `store_cancel_document('production_order')` отменяют выпуски PO в `draft`/`in_progress`, без RSV `production_order_close`; (6) конверсия RSV 149/151 в черновики выпусков + компенсирующие RSV снятия; grants, `notify pgrst`. Применить через MCP `oryx-supabase`.
- [x] `src/features/logistics/logistics-api.ts` -- split-аргументы, `reserveInProductionOutput`, `createProductionForOrder` = PO + черновик выпуска.
- [x] `src/features/logistics/logistics-availability.ts`, `allocation-atlas.ts`, `order-document-coverage.ts`, `logistics-related.ts` -- перевести чтение «в производстве» на активные выпуски.
- [x] `src/features/logistics/order-action-forms.tsx` -- предупреждение в «Запустить производство»; «Зарезервировать в выпуске» с целями «Новый выпуск в PO-N · можно X» и «OUT-M · PO-N · свободно Y»; `OutputFromOrderForm` по остатку плана.
- [x] `src/features/logistics/production-orders-page.tsx` -- диалог резерва с выбором цели внутри этого PO.
- [x] `src/features/logistics/logistics-forms.tsx`, `customer-orders-page.tsx` -- убрать места PO из резерва/снятия, переименовать действие этапа.
- [x] `src/features/logistics/logistics-cancel-guidance.ts` -- текст закрытия/отмены PO.
- [x] `tests/unit/*` -- кейсы матрицы: split, лимиты, inProduction из выпусков.
- [x] `docs/features/logistics.md` -- раздел «Резерв под производство».

**Acceptance Criteria:**
- Given открытый CO, when «Запустить производство», then до отправки виден блок «Вместе с заказом на производство создадим черновик выпуска на весь объём — резерв будет в выпуске», после — PO и выпуск видны в этапах CO, а у строк CO «В производстве» = объём.
- Given PO без черновиков, when «Зарезервировать» на странице PO, then доступен только «Новый выпуск»; given черновик со свободным остатком, then доступны оба варианта.
- Given после миграции, when открыть CO owner 87, then старые резервы на PO 148/150 не учитываются в «В производстве», а видны как резерв в новых черновиках выпусков.
- Given PO с черновиком выпуска под CO, when закрыть или отменить PO, then черновик становится «Отменён», у строк CO «В производстве» уменьшается, а диалог заранее сказал об отмене незавершённых выпусков.

## Implementation Notes

- Миграция применена к Oryx demo Supabase; RSV 149/151 → черновики выпусков 157/159 (PO 148/150) + компенсирующие RSV 158/160.
- Проверка в родительской сессии нашла и исправила: на странице PO `params.orderId` — номер документа, а не id → остаток плана и новый выпуск шли не в тот PO (заменено на `order.id`); в «Выпустить под заказ клиента» лимит прибавлял уже занятое в черновиках (двойной резерв) — теперь лимит = остаток к резерву без учёта черновиков; ошибка второго шага `createProductionForOrder` вела по неверной ссылке и не переводилась — ссылка на список заказов на производство, текст через `translateLogisticsError`.
- SQL-строки матрицы проверены на живой базе в транзакции с `rollback`: превышение плана, split 3→2 свободно + 1 под CO, резерв в черновике до исчерпания свободного, отказ при нехватке, отказ RSV на месте PO, отмена черновиков при закрытии и отмене PO.
- `npm run lint`: в `order-action-forms.tsx` и `transfer-create-dialog.tsx` остались ошибки `set-state-in-effect`, существовавшие до изменения (в базовой версии их больше). `check:deps` — только дрейф версий пакетов, не связан.

## Spec Change Log

## Review Triage Log

| # | Источник | Находка | Вердикт | Доказательство / маршрут |
|---|----------|---------|---------|--------------------------|
| 1 | blind, verif | Компенсирующие RSV без `store_move` → двойной резерв | false | RSV на месте PO никогда не писали ledger (baseline L1932, L2016), складского баланса на месте PO нет; `sumReservedForOwner` его не видит |
| 2 | blind, edge | Конверсия: жёсткие id 149/151, нет неттинга релизов, неидемпотентна | low | Фильтр по `kind='production_order'` безопасен; у 149/151 релизов нет (проверено SQL); миграции не перезапускаются — reject |
| 3 | blind, verif | `planned` в TS vs `draft` в SQL | false | Маппер переводит `planned`→`draft` (`logistics-api.ts` L1267), `OUTPUT_STATUSES` без `planned`; проверки мёртвые, но безвредные |
| 4 | blind, edge | `resetForOpen` не вызывается при открытии родителем; количество не пересчитывается | medium | Родитель открывает через `setState`, Radix не зовёт `onOpenChange(true)` → patch |
| 5 | edge | Смена строки ставит qty = лимит формы без учёта цели | low | Тот же корень, что №4 → patch вместе |
| 6 | edge | `store_cancel_po_active_outputs` исполним PUBLIC | low | Дефолтный EXECUTE для PUBLIC; прямая правка одной строкой → patch |
| 7 | blind, edge | Несколько свободных строк варианта в черновике | false | Уникальный индекс `(document, variant, from, to)` baseline L847 — свободная строка варианта одна |
| 8 | blind, edge | Нет серверного лимита по открытому количеству CO / виду владельца | low | Существующие RPC резерва тоже не проверяют открытое количество CO; лимит в формах по спецификации — reject |
| 9 | edge | `store_po_free_demand` устарел | low | Не вызывается из UI — reject |
| 10 | edge | Несколько строк плана одного товара | false | Тот же уникальный индекс — одна строка варианта в PO |
| 11 | edge | «Выпустить под CO» пуст, когда весь план уже в черновиках | medium | После «Запустить производство» план = черновик → кандидатов нет, подпись «Нет доступного заказа» вводит в заблуждение → patch (подсказка завершить черновик выпуска) |
| 12 | edge | Метка «в выпусках N» при недоступном количестве | low | Тот же корень, что №11 → patch вместе |
| 13 | edge | На странице PO заказы клиента с «осталось 0» (фильтр по складу) | medium | `openOrderLinesForProduct` по `remainingToReserveForLine` без учёта выпусков → patch |
| 14 | edge | Устаревший `reserveTargetKey` → пустой select | low | Прямая правка fallback на первую цель → patch |
| 15 | edge, blind | Тост частичной ошибки ведёт на список, а не на PO (матрица требует ссылку на PO) | medium | Отклонение от матрицы; `store_create_production_order` не возвращает номер → patch: вернуть `sequenceNumber`, ссылка на PO |
| 16 | blind | Покрытие «Производство» теряет завершённые выпуски | medium | `withOrderCoverage(relatedProductionsForOrder, coverage.production)`: PO остаётся в этапе, покрытие падает до 0 после завершения → patch: считать неотменённые выпуски |
| 17 | blind | Двойной подсчёт `quantities.output` через `outputAllocations` | false | `outputAllocations` всегда пуст (маппер) |
| 18 | blind | `lineLocationAllocations` без snapshot считает баланс PO | false | Балансов на месте PO в ledger нет |
| 19 | blind | O(n·m) `find` в циклах | low | Демо-объёмы — reject |
| 20 | blind | Новый выпуск из резерва без `expectedEndOn` | low | Прямая правка: брать ожидаемое окончание PO → patch |
| 21 | blind | Мёртвый код (`store_po_assigned_qty`, `_balances`, дубли списков статусов) | low | Без названного вреда в обычной работе — reject |
| 22 | blind | Закрытие отменяет и выпуски «в работе» | false | Решение пользователя в frozen-блоке |
| 23 | blind, edge | Нет блокировки при проверке плана (гонки) | low | Прототип, один пользователь — reject |
| 24 | verif | Нет тестов `relatedProductionsForOrder`/`relatedOutputsForOrder` | medium | Проверено: вызовов в tests/ нет → patch |
| 25 | verif | Нет тестов покрытия production/output | medium | Фикстура без строк выпусков → patch |
| 26 | verif | Нет теста двух шагов `createProductionForOrder` | medium | Нужен вынос чистого builder'а; нет слоя моков RPC → defer |
| 27 | verif | Нет тестов SQL-поведения | medium | Нет DB-harness → defer; строки матрицы проверены живым probe с rollback (Implementation Notes) |
| 28 | verif | Фильтры статусов в `remainingPlanForProductionProduct`/`productionDemandAssigned` не проверены | medium | Фикстуры без отменённого/завершённого занятого → patch |
| 29 | blind | `creation_source` всё ещё принимает `production_order_close` | low | Нужен для истории старых документов — reject |
| 30 | браузер (родитель) | У OMS-906 этапы и «В производстве» пустые при двух черновиках под заказ | high | Маппер клал в `outputLines.toOwnerId` id владельца склада (87), а не заказа (84); в демо они совпадали случайно → patch в `logistics-api.ts` + регрессионный тест маппера |

Патчи применены; `npm test` 102/102, `typecheck`, `build`, `check:docs`, `check:static-images` зелёные. Проверка в браузере (без записи): OMS-906 показывает PO-925/926 и OUT-919/920, «В производстве» 1; «Запустить производство» с предупреждением и учётом уже зарезервированного в выпуске; «Зарезервировать в выпуске» на CO и на PO-902 с целью «Новый выпуск · можно 4».

## Design Notes

«Активный выпуск» = `draft` или `in_progress`. Резерв в выпуске для CO-строки = Σ строк активных выпусков с `toOwner = CO` по варианту. Свободно в черновике = Σ строк без владельца. «Можно в новый выпуск» по PO = план − Σ строк неотменённых выпусков. `store_reserve_in_production_output`: для каждой позиции уменьшить (или удалить) свободную строку варианта и увеличить (или вставить) строку `to_owner = p_owner_id`; если свободного не хватает — исключение. Черновик выпуска из CO наследует `expectedEndOn` заказа на производство. Если второй шаг `createProductionForOrder` упал, PO остаётся (документы не удаляются) — сообщаем и ведём на PO, где можно зарезервировать повторно.

## Verification

**Commands:**
- `npm test` -- зелёный, включая новые кейсы
- `npm run lint && npm run typecheck && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images` -- без ошибок

**Manual checks:**
- В браузере: CO → «Запустить производство» (блок-предупреждение, PO + черновик выпуска); CO → «Зарезервировать в выпуске» оба варианта; PO → «Зарезервировать»; закрытие PO. Диагностические документы после проверки отменить.
