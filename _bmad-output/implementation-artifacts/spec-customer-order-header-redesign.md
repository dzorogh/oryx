---
title: 'Редизайн шапки карточки заказа клиента'
type: 'feature'
created: '2026-09-29'
status: 'done'
baseline_commit: 'ff87cc19fa1f019663e05aa57c4146cb174c6c3a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/conventions/ui/place-codes.md'
  - '{project-root}/docs/conventions/ui/russian-labels.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-customer-order-header-2026-09-29/mockups/header-directions.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Шапка `/store/logistics/customer-orders/[id]` — плоская авто-сетка из 13 равноценных полей: значения обрезаются («Демо-пользоват…», «422 665,41 AI»), строки рвутся неровно, связанные факты (сумма и оплата; срок, создан, завершён) разбросаны, а главного — сколько заказа обеспечено и сколько дней до срока — не видно.

**Approach:** Локальная шапка заказа клиента по направлению A «Паспорт с тремя панелями» из прототипа: идентичность и действия, строка контекста (регион, тенант, источник, автор), заметка, три панели «Выполнение», «Оплата», «Сроки» с крупным ключевым значением и полосой прогресса. Прежние правки (сумма, срок, заметка, копия, отмена, закрытие) сохраняются.

**Decisions (29.09.2026):**
- Охват: только заказ клиента — новый локальный `CustomerOrderHeader`; общий `DocumentHeader` и шапки других документов не меняются.
- Размер спеки выше 1600 токенов принят: цель одна, не делим.
- Визуальное направление: A (прототип `mockups/header-directions.html`, раздел A). Прототип — ориентир; на расхождении побеждает эта спека.
- Доставки в шапке нет: ни «Доставка: оплачено X из Y», ни предупреждения о разных владельцах (оно остаётся в карточке перемещения).
- Срок и просрочка платежа — одна неразрывная строка «Срок платежа 25.09.2026 · просрочен», без чипа на отдельной строке.

## Boundaries & Constraints

**Always:** Коды мест по `place-codes.md` (регион — код, источник — `WH-n`/`PLT-n`). Весь текст — на русском. Ширина — вся карточка, без `max-w-*` на корне. Числа — `tabular-nums`. Формулы (выполнение, отсчёт до срока) — чистые функции с unit-тестами. Та же одна загрузка контекста, без новых RPC и миграций.

**Never:** Изменения БД, RPC, `store_document_context`. Изменение полосы этапов `OrderProgressTracker` и вкладок. Названия складов/заводов. Новые зависимости.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Выполнение | Заказано 240, отгружено 60, в резерве 120 | «60 из 240 шт отгружено»; полоса: 25% зелёный, 50% синий, 25% янтарный; «В резерве 120 · Не обеспечено 60 · 6 позиций» | N/A |
| Резерв больше остатка | Отгружено + резерв > заказано | Не обеспечено 0, полоса не выходит за 100% | N/A |
| Закрытый заказ | Статус не открытый | «Не обеспечено» и янтарный сегмент не показываются, отсчёта нет, «Завершён <дата>» | N/A |
| Пустой заказ | 0 строк | «Товаров нет», пустая полоса | N/A |
| Срок | Через 11 / 0 / −9 дней, заказ открыт | «через 11 дней» нейтрально / «срок сегодня» янтарный / «просрочен на 9 дней» красный, дата красная | Срока нет — «Не задан», дата редактируется |
| Оплата | Сумма 48 250, оплачено 19 300, неоплаченный платёж со сроком 25.09 в прошлом | Полоса 40%, «Оплачено 19 300,00 USD · 40%», одной строкой «Срок платежа 25.09.2026 · просрочен» красным | Сумма 0 — 0%; нет денег — «—» |
| Без неоплаченных | Все платежи оплачены / платежей нет | «Оплачен полностью» / «Платежей в графике нет» | N/A |

</frozen-after-approval>

## Code Map

- `src/features/logistics/customer-orders-page.tsx` -- `CustomerOrderDetailPage` (L381+): сейчас `<DocumentHeader … meta=[…]>` (L557–693); moneySummary, paymentsSummary, authorName, completedAt, canAct, cancelGuidance уже считаются здесь. `deliverySummary`, `deliveryMixedOwners`, `orderTransferIds` (L453–468) после удаления доставки из шапки — убрать вместе с неиспользуемыми импортами (`summarizeDelivery`, `deliveryTransferIds`, `transferHasMixedOwners`, `MIXED_OWNERS_WARNING` и т. п.; `orderTransfers` нужен этапу «Перемещения»).
- `src/features/logistics/ui/document/document-header.tsx`, `document-meta-field.tsx` -- общий паспорт; не менять. Переиспользовать `DocumentMetaDateInput` (ghost-дата; `overdueDays={0}`, отсчёт рисует панель), `DocumentMetaEmpty`, `dayWord`, `pluralPositions`.
- `src/features/logistics/ui/customer-order-oms-fields.tsx` -- `CustomerOrderNote`, `CopyCustomerOrderAction` (кнопка + диалог → управляемый диалог для меню), `PaymentsMetaValue`, `DeliveryMetaValue` (удалить неиспользуемые).
- `src/features/logistics/ui/document-cancel-guidance.tsx` -- управляемый `DocumentCancelDialog`; пункт меню скрыт при `guidance.mode === "hidden"`.
- `src/features/logistics/ui/order-money-tab.tsx` -- `OrderAmountInput variant="meta"` (ghost-ввод суммы; для панели допустим проп размера шрифта).
- `src/features/logistics/logistics-balances.ts` -- `sumShippedForLine`, `sumReservedForLine` (L161–165).
- `src/features/logistics/customer-order-oms.ts` -- `tenantLabel`; сюда `summarizeOrderFulfillment` и `deadlineCountdown`.
- `src/features/logistics/ui/status-badge.tsx` `CustomerOrderStatusBadge`; `ui/logistics-code-badge.tsx` `LogisticsCodeBadge`; `logistics-lookups.ts` `regionCode`, `warehouseCode`, `plantCode`; `logistics-availability.ts` `hrefForRegion`; `logistics-labels.ts` `formatMetaTimestamp`, `formatQuantity`; `order-money.ts` `formatOrderMoney`; `output-calendar.ts` `formatOutputDate`; `ui/logistics-panel.tsx` `logisticsCardClass`.
- `src/components/ui/dropdown-menu.tsx` -- меню «Ещё».
- `docs/features/logistics.md` L68, L123 -- описание шапки заказа клиента (убрать доставку из шапки).

## Tasks & Acceptance

**Execution:**
- [x] `src/features/logistics/customer-order-oms.ts` -- `summarizeOrderFulfillment(lines, balances, open)` → `{ positions, ordered, shipped, reserved, uncovered }` (по строке резерв ограничен остатком заказано − отгружено; uncovered = Σ остаток − резерв, 0 у неоткрытого); `deadlineCountdown(expectedEndOn, open, today)` → `null | { kind: "left" | "today" | "overdue", days }`.
- [x] `tests/unit/customer-order-header.test.ts` -- матрица выполнения и отсчёта (пустой, закрытый, перебор резерва, сегодня, без срока, переход месяца).
- [x] `src/features/logistics/ui/customer-order-header.tsx` (новый) -- `CustomerOrderHeader` по Design Notes.
- [x] `src/features/logistics/ui/customer-order-oms-fields.tsx` -- `CopyCustomerOrderDialog` (управляемый), удалить неиспользуемое.
- [x] `src/features/logistics/customer-orders-page.tsx` -- заменить `DocumentHeader` на `CustomerOrderHeader`, убрать вычисления доставки и лишние импорты.
- [x] `_bmad-output/planning-artifacts/ux-designs/ux-customer-order-header-2026-09-29/mockups/header-directions.html` -- прототип (перенесён из `.working/`).
- [x] `docs/features/logistics.md` -- описание новой шапки заказа клиента, без доставки.

**Acceptance Criteria:**
- Given открытый заказ на ширине контента 1240 px, when открыта карточка, then значения не обрезаны многоточием, три панели стоят в ряд.
- Given меню «Ещё», when выбрано «Создать копию» / «Отменить заказ», then открывается прежний диалог и действие работает как раньше.
- Given правка суммы, срока или заметки в шапке, when сохранено, then значение обновилось после перезагрузки контекста.
- Given ширина 375 px, when открыта карточка, then нет горизонтального скролла, панели идут в одну колонку.

## Design Notes

Белая карточка `logisticsCardClass`, `rounded-xl`, `overflow-hidden`:

- **Верх** (`px-6 pt-5 pb-4`): строка `text-xs text-muted-foreground` с `ShoppingCart` «Заказ клиента»; номер `text-[28px] font-semibold tracking-tight` + статус. Справа: `Ещё` (outline, `MoreHorizontal` + текст; пункты «Создать копию», разделитель, красный «Отменить заказ») и тёмная «Закрыть заказ клиента» (только у открытого).
- **Контекст** (`mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm`): пары «приглушённая подпись — значение `font-medium`»: Регион (код-бейдж-ссылка), Тенант, Источник, Автор. Без обрезки — строка переносится.
- **Заметка** (`mt-3`): `bg-amber-50/60 ring-1 ring-amber-100 rounded-lg px-3 py-2`, `StickyNote`, «Изменить» справа; пустая у открытого — «Добавить заметку»; редактирование — прежний `CustomerOrderNote`.
- **Панели** (`grid border-t md:grid-cols-3`, разделители `divide-y md:divide-y-0 md:divide-x`, каждая `px-6 py-4`): заголовок `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` с иконкой (`PackageCheck`, `Wallet`, `CalendarClock`); ключевое значение `text-xl font-semibold tabular-nums`; полоса `h-1.5 rounded-full bg-muted`; детали `text-xs`.
  - Выполнение: сегменты отгружено `green-600`, в резерве `blue-500`, не обеспечено `amber-400`; легенда точками.
  - Оплата: сумма (ghost-ввод) + «расчётная», если сумма не задана; полоса оплаты `green-600`; «Оплачено X CUR · N%»; ниже `whitespace-nowrap` строка срока (`AlarmClock` и `text-red-700` при просрочке).
  - Сроки: дата (ghost-ввод), отсчёт под ней, сетка «Создан / Завершён».

## Implementation Notes

- 29.09.2026, родительский агент после сверки diff: подписи и проценты панелей вынесены в чистые `deadlineCountdownLabel`, `fulfillmentSegments`, `paymentProgress` (`customer-order-oms.ts`, склонение — `pluralRu` из `order-plan-model.ts`) и покрыты тестами, чтобы строки матрицы «Оплата», «Без неоплаченных», «Срок», «Выполнение» проверялись не только глазами. `summarizeDelivery` и `deliveryTransferIds` удалены вместе с тестами — после снятия доставки из шапки у них не осталось вызовов. `OrderAmountInput` получил `variant="panel"` (`[field-sizing:content]`, расчётная сумма тёмным, а не серым плейсхолдером) вместо пропа `sizeClass`. Дата в «Сроках» — `text-xl` через `[&_input]`.
- Старые красные проверки, не связанные со спекой (одинаковы на `baseline_commit`): `buildDocumentTimeline › reservation`, 5 ошибок `npm run lint` в трекере и комментариях, расхождение версий в `check:deps`.
- Браузер (dev на `localhost:3001`): OMS-935, OMS-907 (просрочка платежа одной строкой), OMS-4 (закрыт), ширины 1240 и 375 px, меню «Ещё» → диалоги копии и отмены открываются и закрываются «Назад» без записи в базу.

## Review Triage Log

| # | Источник | Находка | Вердикт | Обоснование | Маршрут |
|---|---|---|---|---|---|
| 1 | blind, edge, verification | Диалог копии из меню «Ещё» показывает старую ошибку после неудачной копии | medium | `DialogShell` не вызывает `onOpenChange(true)` при открытии снаружи; прежняя кнопка сбрасывала ошибку в `onClick` — регрессия | patch |
| 2 | blind | Диалог отмены из меню хранит `serverError` прошлой попытки | low | Так же ведёт себя `DocumentCancelControl` на базовом коммите (внешний `setOpen(true)` не сбрасывает ошибку) — не вызвано изменением | defer |
| 3 | blind, edge | `headerPercent` округляет 99,5–99,9% до 100% рядом со строкой «просрочен» | low | `Math.round`; прямая правка — не больше 99, пока часть меньше целого | patch |
| 4 | edge | Ненулевой резерв/недобор меньше 0,5% даёт сегмент нулевой ширины | low | 1 шт из 300 → 0%; в заказах на 100+ шт вероятно; правка — минимум 1% для ненулевой части | patch |
| 5 | blind, edge | «Платежей в графике нет», когда график есть и весь оплачен, но покрывает не всю сумму; сумма 0 при оплате даёт 0% | low | `paymentProgress` не знает о числе платежей; прямая правка — передать число платежей | patch |
| 6 | edge | У закрытого заказа без заметки остаётся пустая обёртка `mt-3` | low | Проверено на OMS-4: `CustomerOrderNote` → `null`, обёртка остаётся | patch |
| 7 | edge | Заметка из одних пробелов рисует пустой янтарный блок | low | `CustomerOrderNote` проверяет `description`, не `trim()` | patch |
| 8 | edge | «Срок не задан» вместо «Не задан» из матрицы | low | Прямое расхождение текста с матрицей | patch |
| 9 | verification | Тесты `summarizeOrderFulfillment` не проверяют чужой и свободный товар | medium | Фикстуры всегда `ownerId: "ord-1"`; снятие фильтра владельца не уронит тесты | patch |
| 10 | blind | Тест «never exceeds 100%» не доходит до ограничения; нет тестов на неверную дату | low | 1/1/1 из 3 → 99, ветка ограничения не выполняется | patch |
| 11 | blind | Документация: формулы без `fulfillmentSegments`/`paymentProgress`, пустая заметка описана как янтарный блок | low | Прямая правка текста | patch |
| 12 | blind, edge, verification | `transferMoney` всё ещё приходит в контексте и маппится, но не читается | low | Удаление из RPC запрещено спекой (без изменений RPC); только TS-маппинг оставит данные в payload | defer |
| 13 | blind, verification | `deadlineCountdown` дублирует `overdueDays` с другим округлением — на переходе на летнее время список и шапка разойдутся на день | low | Реально только в часовых поясах с переводом часов; демо — RU/AE без перевода; правка трогает общий хелпер | reject |
| 14 | blind | `daysLabel`/`pluralRu` дублируют `dayWord`; зависимость от `order-plan-model` | false | `dayWord` живёт в клиентском UI-файле; чистый модуль не должен импортировать UI; конкретного вреда нет | reject |
| 15 | blind, edge | Дата и сумма закрытого заказа редактируемы | false | На `baseline_commit` у этих полей тоже нет `disabled`; поведение не изменилось, спека требует сохранить прежние правки | reject |
| 16 | blind | Полосы без `role="progressbar"`, в легенде нет зелёной точки | false | Полосы — пустые `div`, скринридер их пропускает; значения даны текстом рядом («N из M шт отгружено»); одобренный прототип такой же | reject |
| 17 | blind | Две строки одного товара посчитаются дважды | false | `store_set_order_line_quantity` сливает строки по товару (см. триаж OMS-parity №17) | reject |
| 18 | blind | Повтор `closeCustomerOrder` в `onClose` и `onCancelFollowUp` | false | Тот же повтор был на базовом коммите; не вызвано изменением | reject |
| 19 | blind, edge | `[field-sizing:content]` не поддерживается в Firefox | low | Демо открывают в Chromium; без поддержки поле шириной ~20 символов — сумма помещается; фолбэк добавляет логику | reject |
| 20 | blind | Дата `text-xl` обрежется в `max-w-[11rem]` | false | Проверено в браузере: «20.11.2026» помещается целиком | reject |
| 21 | edge | «19 300,00 $» вместо «USD» из матрицы | false | Пример матрицы; вся карточка и вкладка «Деньги» используют `formatOrderMoney` с символом валюты — правка означала бы правку спеки | reject |
| 22 | blind | `prod-parity-decisions.md` может числить доставку в шапке | false | Поиск «Доставк» в файле пуст | reject |

## Verification

**Commands:**
- `npm test` -- новые тесты проходят
- `npm run lint && npm run typecheck && npm run build` -- без ошибок
- `npm run check:deps && npm run check:docs && npm run check:static-images` -- успешно

**Manual checks:**
- Браузер: OMS-935 (черновик), OMS-906, закрытый заказ, заказ с просрочкой — 1240 px и 375 px; меню «Ещё», правка суммы/срока/заметки.
