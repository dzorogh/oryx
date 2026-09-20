---
name: Oryx Transfer Dialog
description: Поведенческий контракт Dense Ledger для адаптивного создания складского перемещения в Oryx.
status: draft
sources:
  - imports/current-transfer-dialog.png
  - src/features/logistics/transfers-page.tsx
  - src/features/logistics/order-action-forms.tsx
  - docs/features/logistics.md
  - ../../architecture/architecture-oryx-2026-09-17/ARCHITECTURE-SPINE.md
updated: 2026-09-18
---

## Foundation

Область контракта — единый responsive-web паттерн создания transfer на desktop и mobile. Desktop — основной рабочий формат; mobile используется реже, но поддерживает полный поток без функциональных сокращений. Реализация наследует Next.js, Tailwind и shadcn/ui Oryx; `DESIGN.md` определяет визуальную идентичность и токены, этот документ — поведение.

Выбранное направление — **Dense Ledger**. Route First и Guided Table отброшены и не являются требованиями. Оба entry context создают документ в статусе Draft и после успеха ведут на detail нового transfer; отправка transfer и сам detail находятся вне области этого контракта. Архитектурное правило сохраняется: transfer переносит исходный stock state и связь с customer order, а Draft сам по себе не проводит движение.

Композиционные ссылки: [исходный диалог](imports/current-transfer-dialog.png) и [выбранное desktop/mobile направление](.working/direction-dense-ledger.html). Их роль и приоритет относительно spine-контрактов зафиксированы в `DESIGN.md`.

## Information Architecture

| Surface | Вход | Назначение | Journey |
|---|---|---|---|
| Transfers list | `/store/logistics/transfers` | Показывает launcher `New transfer` для generic-варианта | Flow 1 |
| Customer order detail | Action customer order, например OMS-120 | Запускает order-context вариант для уже выделенных этому заказу quantities | Flow 2 |
| `TransferDialog` desktop | Launcher на любом entry surface при viewport `≥ md` | Маршрут, строки Dense Ledger, inline validation, summary и создание Draft | Flow 1, Flow 2 |
| `TransferDialog` mobile | Тот же launcher при viewport `< md` | Тот же полный поток в compact stacked lines без горизонтальной таблицы | Flow 1, Flow 2 |
| Transfer detail | Успешное создание Draft | Точка назначения и подтверждение созданного документа; внутреннее устройство вне scope | Flow 1, Flow 2 |

Один modal layer: `TransferDialog` открывается поверх entry surface; внутри не открывается второй Dialog. Product chooser может быть shadcn Popover/Select, но не отдельным modal.

### Потребность → surface → journey

| Зафиксированная потребность | Где обеспечивается | Где проверяется |
|---|---|---|
| Переместить только free stock из списка | Transfers list → generic `TransferDialog` | Flow 1, шаги 1–8 |
| Выбрать order lines и quantities с сохранением allocation | Customer order detail → order-context `TransferDialog` | Flow 2, шаги 1–8 |
| Указать разные `From warehouse` / `To warehouse` и optional `Expected end` | `RouteFields` в обоих responsive-вариантах | Оба flow, шаги 2–3 |
| Добавить 4–10 product lines без повторов | `AddProductAction` + `ProductLedger` | Flow 1, шаг 4; Flow 2, шаг 4 |
| Сверить `On hand`, `Available` и `Move` до создания | `ProductLine` + `InlineAvailabilityError` | Оба flow, climax |
| Проверить состав, маршрут, дату и issue count | `TransferSummary` в `DialogFooter` | Оба flow, шаг 7 |
| Создать Draft и перейти к нему | Primary action → Transfer detail | Оба flow, шаг 8 |

## Voice and Tone

Текст короткий, операционный и объясняет последствия до действия. Brand voice живёт в `DESIGN.md`; здесь фиксируется microcopy.

| Контекст | Использовать | Не использовать |
|---|---|---|
| Заголовок | `Create transfer` | `New stock movement` |
| Generic intro | `Move free stock between warehouses and save it as a Draft.` | Обещание отправки или доставки |
| Generic context | `Free stock only` / `Customer-order reserved stock is excluded from availability.` | Термин allocation без пояснения |
| Order intro | `Customer order OMS-120` / `Select order lines and quantities. The transfer will be saved as a Draft.` | `Move all reserved stock` |
| Order context | `Selected stock stays allocated to OMS-120 during transfer.` | Success-формулировка уже выполненного действия |
| Ошибка quantity | `6 over available` рядом со строкой | Только `Invalid quantity` или только toast |
| Действия | `Add product`, `Cancel`, `Create draft transfer`; в order-context допустимо `Create draft for OMS-120` | `Send`, `Complete` или `Save` без указания Draft |

## Component Patterns

Визуальные правила находятся в `DESIGN.md.Components`; имена ниже являются общим словарём двух spine-документов.

| Компонент | Где | Поведенческий контракт |
|---|---|---|
| `TransferDialog` | Оба entry context | Сохраняет единый form state при responsive-перестроении; блокирует взаимодействие с фоном; закрывается через `Cancel`, close control или `Esc` согласно Open Question 1. |
| `RouteFields` | Верх body/header | `From warehouse` и `To warehouse` обязательны и не могут совпадать; `Expected end` optional в обоих context. Смена `From warehouse` немедленно пересчитывает availability всех строк. |
| `ContextNote` | Между route и lines | Generic-вариант явно сообщает free-only правило; order-context показывает номер заказа и не предлагает отдельный allocation control. |
| `ProductLedger` | Основной body | Desktop показывает колонки `Product`, `On hand`, `Available`, `Move` и row removal. Mobile рендерит те же данные как compact stacked lines без horizontal scroll. |
| `ProductLine` | Внутри `ProductLedger` | Generic chooser содержит товары с free stock на source warehouse; order-context chooser содержит eligible customer-order lines с положительным allocated quantity на source. Один product/order line нельзя добавить дважды. |
| `QuantityControl` | Каждая выбранная строка | Принимает положительное quantity в unit товара. Generic max = free quantity на source; order-context max = quantity этой order line, уже allocated на source. В order-context всё выбранное `Move` неявно сохраняет allocation этой line. |
| `AddProductAction` | Под строками | `Add product` вставляет новую editable row после последней и переводит focus в её product chooser. Недоступно, когда eligible products/order lines закончились. |
| `TransferSummary` | В `DialogFooter` | Реактивно показывает line count, total units только когда units совместимы, route, optional date и issue count. Не заменяет inline errors. |
| `DialogFooter` | Отдельно от scrollable body | Содержит `TransferSummary`, `Cancel` и context-aware primary action. Primary disabled при incomplete route, отсутствии valid lines, duplicate или любой availability error; при submit показывает pending state и не допускает повторный запрос. |
| `InlineAvailabilityError` | Рядом с конкретным `QuantityControl` | Возникает сразу после ввода сверх max или после пересчёта source; содержит величину превышения, связан с input через description/error semantics и снимается без toast после исправления. |

## State Patterns

| Surface / состояние | Поведение |
|---|---|
| Transfers list — loading/empty/error | Наследует контракт списка Oryx; `New transfer` не должен открывать форму, пока required logistics snapshot недоступен. Empty list не запрещает generic creation. |
| Customer order detail — no eligible allocated stock | Entry action не ведёт в пустой ledger: показывает inherited disabled/empty treatment с текстом `No allocated stock is available to transfer from this order.` |
| `TransferDialog` — initial generic | Пустые `RouteFields`, optional date пуст, первая product row может быть пустой; `ContextNote` сообщает free-only; primary disabled. |
| `TransferDialog` — initial order-context | Номер заказа видим; allocation control отсутствует; до выбора source product choices не считаются eligible; primary disabled. |
| `TransferDialog` — route incomplete | Lines могут сохраняться, но availability показывается только после source; одинаковые warehouses получают inline field error `Choose two different warehouses.` |
| `ProductLedger` — no eligible products | Вместо новой строки показывается `No products are available at this warehouse.`; существующие valid rows не удаляются автоматически. |
| `ProductLine` — availability invalid | Строка и input получают `InlineAvailabilityError`; `TransferSummary` увеличивает issue count; primary disabled. |
| `TransferDialog` — submitting | Все mutation controls и primary disabled; введённые values остаются видимыми; primary показывает inherited pending indicator. |
| `TransferDialog` — request error/offline | Dialog остаётся открыт, значения сохраняются, общий request error показывается через inherited Oryx error/toast; field errors остаются inline. Автономное создание не поддерживается. |
| `TransferDialog` — success | Закрывает dialog только после полученного id Draft и навигирует на `/store/logistics/transfers/:id`. |
| Transfer detail — load/error | Наследует существующий detail contract; этот spine гарантирует только navigation target и Draft status. |

## Interaction Primitives

- Основные действия доступны одинаково click, tap и keyboard; hover не несёт уникальных команд.
- При открытии focus переходит к первому незаполненному обязательному control в `RouteFields`; focus trap и возврат на исходный launcher наследуются от shadcn Dialog/Sheet.
- `Tab` следует DOM/reading order: route → lines слева направо/сверху вниз → `AddProductAction` → footer actions. `Shift+Tab` идёт обратно.
- `Esc` закрывает только верхний popover, затем `TransferDialog`; поведение dirty close остаётся Open Question 1. Пользовательский submit-shortcut не вводится.
- `Add product` вставляет row без scroll jump, прокручивает её в видимую область при необходимости и ставит focus на chooser.
- После row removal focus переходит в chooser следующей строки; если следующей нет — в `AddProductAction`, а если добавить больше нельзя — в primary action.
- На попытке submit с ошибками focus переводится в первый invalid `QuantityControl`; summary issue count объявляется как вспомогательный итог, но не заменяет переход к ошибке.
- `On hand`, `Available` и итоговые quantities используют tabular numbers; единица измерения читается вместе с числом.

## Accessibility Floor

- WCAG 2.2 AA для responsive web. Визуальный контраст и error/allocation combinations определены в `DESIGN.md.Colors`.
- `TransferDialog` имеет programmatic title и description; entry context (`Free stock only` или `Customer order OMS-120`) доступен assistive technologies.
- Все controls имеют видимые English labels. Icon-only remove и close получают имена вида `Remove product: Packing Tape` и `Close create transfer`.
- `QuantityControl` сообщает unit, current value и max; `InlineAvailabilityError` связан через `aria-describedby`/`aria-invalid`. Ошибки не кодируются только `{colors.availability-error-foreground}`.
- Desktop `ProductLedger` использует корректную table semantics с headers. Mobile stacked representation использует list/group semantics и не притворяется таблицей без визуальной сетки.
- Focus ring наследует shadcn `ring` и остаётся видимым на error/background поверхностях. Touch target не меньше 44×44 CSS px.
- Изменения availability и issue count объявляются в polite live region; submit failure — assertive только один раз. Анимация не нужна для понимания состояния.

## Responsive & Platform

| Диапазон | Представление и поведение |
|---|---|
| `≥ md` (Tailwind default) | Wide `TransferDialog` до `{components.transfer-dialog.maxWidth}`; `RouteFields` в компактной grid; Dense Ledger в колонках `Product`, `On hand`, `Available`, `Move`, remove; summary и actions в одной footer-строке при наличии места. |
| `< md` | Bottom-anchored responsive `TransferDialog`; route складывается вертикально; каждая `ProductLine` — compact stack с product/SKU, `On hand`, `Available`, `QuantityControl` и remove; body scroll, `DialogFooter` остаётся отдельным; horizontal table scroll запрещён. |

Это один responsive web flow, а не отдельное mobile приложение. Resize/orientation change не сбрасывает введённые значения, inline errors или entry context.

## Open Questions

1. **Dirty close policy — блокирует финальный interaction contract, но не текущий draft.** Не подтверждено, должны ли close control, `Cancel`, backdrop и `Esc` сразу отбрасывать введённые данные или открывать confirmation при изменённой форме. До решения нельзя считать destructive-close поведение утверждённым.

## Key Flows

### Flow 1 — Marina создаёт перемещение свободного остатка из Transfers

1. Marina, координатор логистики, открывает Transfers list на desktop и выбирает `New transfer`.
2. `TransferDialog` открывается в generic context с заметкой `Free stock only`; focus стоит на `From warehouse`.
3. Marina выбирает WH-1 → WH-2 и при необходимости задаёт optional `Expected end`.
4. Через `Add product` она собирает 4–10 строк; каждый вызов добавляет row, а chooser не предлагает уже выбранный product.
5. В каждой строке Marina сопоставляет `On hand`, free-stock `Available` и вводит `Move`.
6. Для Packing Tape она вводит 24 при Available 18. `InlineAvailabilityError` показывает `6 over available`, issue count становится 1, primary блокируется. Marina исправляет quantity на 18.
7. `TransferSummary` подтверждает line count, совместимый total, WH-1 → WH-2 и optional date.
8. **Climax:** Marina выбирает `Create draft transfer`; после ответа с id открывается detail нового transfer в статусе Draft. Она видит, что документ создан, но stock ещё не отправлен.

Failure path: request создания завершается ошибкой или offline — dialog остаётся открыт со всеми rows и route, общий error сообщает о неуспехе, повтор возможен после восстановления связи.

### Flow 2 — Marina создаёт Draft для customer order OMS-120

1. Marina открывает customer order OMS-120 и запускает transfer action.
2. `TransferDialog` показывает `Customer order OMS-120` и объясняет: `Selected stock stays allocated to OMS-120 during transfer.`
3. Marina выбирает WH-1 → WH-2 и при необходимости задаёт optional `Expected end`.
4. Через `Add product` она добавляет нужные order lines; chooser ограничен lines OMS-120 с положительным allocated quantity на WH-1.
5. Marina выбирает quantities. Отдельного allocation control нет: каждый выбранный `Move` сохраняет customer-order allocation соответствующей line.
6. Она вводит quantity выше allocated Available; `InlineAvailabilityError` показывает превышение и блокирует primary. Marina уменьшает quantity до доступного значения.
7. `TransferSummary` показывает выбранные order lines, route, optional date и отсутствие issues.
8. **Climax:** Marina выбирает `Create draft for OMS-120`; приложение создаёт Draft с сохранёнными line allocations и сразу открывает detail нового transfer.

Failure path: если availability изменилось между проверкой и submit, сервер отклоняет mutation; dialog сохраняет ввод, affected lines получают обновлённые max/inline errors после reload, Draft не считается созданным и navigation не происходит.
