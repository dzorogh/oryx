---
title: 'Редизайн шапки карточки заказа клиента'
type: 'feature'
created: '2026-09-29'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/conventions/ui/place-codes.md'
  - '{project-root}/docs/conventions/ui/russian-labels.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Шапка `/store/logistics/customer-orders/[id]` — плоская авто-сетка из 13 равноценных полей: значения обрезаются («Демо-пользоват…», «422 665,41 AI»), строки рвутся неровно, связанные факты (сумма, оплата, доставка; срок, создан, завершён) разбросаны, а главного — сколько заказа обеспечено и сколько дней до срока — не видно.

**Approach:** Локальная шапка заказа клиента из смысловых зон: идентичность и действия, строка контекста (регион, тенант, источник, автор), заметка, три панели показателей «Выполнение», «Оплата», «Сроки» с прогресс-барами и крупными ключевыми числами. Все прежние данные и правки (сумма, срок, заметка, копия, отмена, закрытие) сохраняются.

## Boundaries & Constraints

**Always:** Коды мест по `place-codes.md` (регион — код, источник — `WH-n`/`PLT-n`). Весь текст — на русском. Ширина — вся карточка, без `max-w-*` на корне. Числа — `tabular-nums`. Формулы (выполнение, отсчёт до срока) — чистые функции с unit-тестами. Та же одна загрузка контекста, без новых RPC и миграций.

**Never:** Изменения БД, RPC, `store_document_context`. Изменение полосы этапов `OrderProgressTracker` и вкладок. Названия складов/заводов. Новые зависимости.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Выполнение | Заказано 11, отгружено 3, в резерве 5 | «3 из 11 шт» отгружено; бар: 3 зелёный, 5 синий, 3 янтарный; «В резерве 5 · Не обеспечено 3 · 1 позиция» | N/A |
| Закрытый заказ | Статус не открытый | «Не обеспечено» не показывается, янтарного сегмента нет | N/A |
| Пустой заказ | 0 строк | «Товаров нет», пустой бар | N/A |
| Срок в будущем | Срок через 12 дней, заказ открыт | «через 12 дней» нейтрально | N/A |
| Срок сегодня / прошёл | 0 / −3 дня | «сегодня» янтарный / «просрочен на 3 дня» красный | N/A |
| Нет срока / закрыт | Срок пуст или заказ закрыт | Отсчёта нет; у закрытого — «Завершён <дата>» | N/A |
| Оплата | Сумма 100, оплачено 30 | Бар 30%, «Оплачено 30 из 100», ближайший срок и «просрочен» как сейчас | Нет денег — «—» |
| Доставка | Нет платежей / разные владельцы | «—» / текст «В перемещении товары разных владельцев» под строкой | N/A |

</frozen-after-approval>

## Open Questions

- Охват редизайна — options: только заказ клиента (новый локальный `CustomerOrderHeader`; шапки заказа на производство, перемещений, отгрузок, резервов не меняются — как было с локальной шапкой заказа на производство) / все документы (новый дизайн в общем `DocumentHeader`; меняются 5 экранов, у каждого свой набор полей — работы и проверки втрое больше).

## Code Map

- `src/features/logistics/customer-orders-page.tsx` -- `CustomerOrderDetailPage` (L381+): сейчас `<DocumentHeader … meta=[…]>` (L557–693); все вычисления (moneySummary, paymentsSummary, deliverySummary, deliveryMixedOwners, authorName, completedAt, canAct, cancelGuidance, orderedQty/shippedQty) уже здесь — передать в новую шапку.
- `src/features/logistics/ui/document/document-header.tsx`, `document-meta-field.tsx` -- общий паспорт документа; не менять. Переиспользовать `DocumentMetaDateInput` (ghost-дата; передавать `overdueDays={0}`, отсчёт рисует шапка), `DocumentMetaEmpty`, `overdueDays`, `dayWord`, `pluralPositions`.
- `src/features/logistics/ui/customer-order-oms-fields.tsx` -- `CustomerOrderNote`, `CopyCustomerOrderAction` (кнопка + диалог; сделать диалог управляемым, чтобы открывать из меню), `PaymentsMetaValue`, `DeliveryMetaValue` (могут стать неиспользуемыми — удалить).
- `src/features/logistics/ui/document-cancel-guidance.tsx` -- `DocumentCancelDialog` (управляемый) и `DocumentCancelTrigger`; `DocumentCancelControl` = оба вместе. Для меню — `DocumentCancelDialog` + свой пункт, скрытый при `guidance.mode === "hidden"`.
- `src/features/logistics/ui/order-money-tab.tsx` -- `OrderAmountInput variant="meta"` (ghost-ввод суммы).
- `src/features/logistics/logistics-balances.ts` -- `sumShippedForLine`, `sumReservedForLine` (L161–165).
- `src/features/logistics/customer-order-oms.ts` -- `tenantLabel`, `MIXED_OWNERS_WARNING`; сюда чистые `summarizeOrderFulfillment` и `deadlineCountdown`.
- `src/features/logistics/ui/order-progress-tracker.tsx` -- образец цветов (green-700 / blue-600 / zinc-300) и `logisticsCardClass`-карточки; не менять.
- `src/features/logistics/ui/status-badge.tsx` `CustomerOrderStatusBadge`; `ui/logistics-code-badge.tsx` `LogisticsCodeBadge`; `logistics-lookups.ts` `regionCode`, `warehouseCode`, `plantCode`; `logistics-availability.ts` `hrefForRegion`; `logistics-labels.ts` `formatMetaTimestamp`, `formatQuantity`; `order-money.ts` `formatOrderMoney`; `output-calendar.ts` `formatOutputDate`.
- `src/components/ui/dropdown-menu.tsx` -- меню «Ещё».
- `docs/features/logistics.md` L68, L123 -- описание шапки заказа клиента.

## Tasks & Acceptance

**Execution:**
- [ ] `src/features/logistics/customer-order-oms.ts` -- `summarizeOrderFulfillment(lines, balances, open)` → `{ positions, ordered, shipped, reserved, uncovered }` (uncovered = Σ max(0, заказано − отгружено − в резерве) по строкам, 0 у неоткрытого); `deadlineCountdown(expectedEndOn, open, today)` → `null | { kind: "left" | "today" | "overdue", days }`.
- [ ] `tests/unit/customer-order-header.test.ts` -- матрица выполнения и отсчёта (включая пустой заказ, закрытый, сегодня, без срока, переход месяца).
- [ ] `src/features/logistics/ui/customer-order-header.tsx` (новый) -- `CustomerOrderHeader`: зоны из Design Notes; адаптив: панели в колонку ниже `md`, действия переносятся под номер.
- [ ] `src/features/logistics/ui/customer-order-oms-fields.tsx` -- `CopyCustomerOrderDialog` (управляемый `open`/`onOpenChange`), удалить неиспользуемое.
- [ ] `src/features/logistics/customer-orders-page.tsx` -- заменить `DocumentHeader` на `CustomerOrderHeader`, убрать ставшие лишними импорты.
- [ ] `docs/features/logistics.md` -- обновить описание шапки заказа клиента.

**Acceptance Criteria:**
- Given открытый заказ OMS-935 на ширине 1240 px, when открыта карточка, then ни одно значение шапки не обрезано многоточием, а поля сгруппированы в зоны из Design Notes.
- Given меню «Ещё», when выбрано «Создать копию» / «Отменить заказ», then открывается тот же диалог, что и раньше, и действие работает как раньше.
- Given правка суммы, срока или заметки в шапке, when сохранено, then значение обновилось после перезагрузки контекста, как сейчас.
- Given ширина 375 px, when открыта карточка, then нет горизонтального скролла, панели идут друг под другом.

## Design Notes

Порядок в белой карточке (`logisticsCardClass`, `rounded-xl`):

```
[🛒 Заказ клиента]
OMS-935  (Черновик)                          [⋯ Ещё] [Закрыть заказ]
Регион AE · Тенант Sharmax UAE · Источник С хаба WH-1 · Автор Демо-пользователь
┌ 🗒 Оформлено из корзины · Склад региона WH-1        Изменить ┐
├──────────────────┬──────────────────────┬────────────────────┤
│ ВЫПОЛНЕНИЕ       │ ОПЛАТА               │ СРОКИ              │
│ 0 из 11 шт       │ 422 665,41 AED ✎     │ 15.10.2026 ✎       │
│ ▓▓░░░░░░ бар     │ ▓░░░░░ бар           │ через 16 дней      │
│ В резерве 0 ·    │ Оплачено 0 · срок …  │ Создан 28.09, 19:57│
│ Не обеспечено 11 │ Доставка: —          │ Завершён —         │
└──────────────────┴──────────────────────┴────────────────────┘
```

- Подписи в строке контекста — приглушённые, значения — `text-foreground`; значения не обрезаются, строка переносится.
- Заголовки панелей — `text-xs` приглушённые; ключевое число — `text-xl font-semibold tabular-nums`; бары `h-1.5 rounded-full`: отгружено `green-600`, в резерве `blue-500`, не обеспечено `amber-400`, фон `muted`.
- «Закрыть заказ клиента» — единственная тёмная кнопка (только у открытого заказа). «Создать копию» и «Отменить заказ» (красный пункт) — в меню «Ещё», чтобы шапка не была перегружена кнопками разного размера.
- Пустая заметка у открытого заказа — ссылка «Добавить заметку» в строке контекста; у закрытого — ничего.

## Verification

**Commands:**
- `npm test` -- новые тесты проходят
- `npm run lint && npm run typecheck && npm run build` -- без ошибок
- `npm run check:deps && npm run check:docs && npm run check:static-images` -- успешно

**Manual checks:**
- Браузер: OMS-935 (черновик), OMS-906 (доставка с платежами), закрытый заказ, заказ с просрочкой — 1240 px и 375 px; меню «Ещё», правка суммы/срока/заметки.
