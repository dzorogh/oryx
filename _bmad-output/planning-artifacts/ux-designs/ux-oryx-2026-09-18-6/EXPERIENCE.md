---
name: Oryx Transfer Detail
description: Поведенческий контракт карточки перемещения между складами в Oryx BMS.
status: final
sources:
  - mockups/transfer-detail.html
  - imports/current-transfer-detail.png
  - imports/current-new-transfer-dialog.png
  - docs/features/logistics.md
  - src/features/logistics/transfers-page.tsx
  - src/features/logistics/logistics-types.ts
updated: 2026-09-20
---

# Oryx Transfer Detail — Experience Spine

## Foundation

Одна responsive web-поверхность внутри существующего Oryx BMS: Next.js, React, shadcn/ui и Tailwind. Основной контекст — desktop/laptop внутреннего менеджера по логистике; на узких viewport чтение и базовые действия остаются доступными. `DESIGN.md` задаёт визуальную идентичность и tokens, этот документ — структуру, поведение и состояния.

Scope — только карточка существующего Transfer. Список Transfer и диалог создания не перерабатываются и остаются явными non-goals. Резервирование товара в пути оформляется стандартным auditable Reservation с location type `transfer`; скрытых allocation и нового доменного типа нет.

Главная героиня — Ирина, менеджер по логистике. Её основной сценарий информационный: быстро подтвердить текущее местонахождение, направление и owner-разбивку. Дополнительный сценарий — при необходимости зарезервировать свободный товар в пути.

## Information Architecture

| Область Transfer detail | Назначение |
|---|---|
| Breadcrumb | Возврат в существующий раздел Transfer без изменения списка |
| Transfer document header | Номер, один status, один `Expected`, действия и единственный маршрут |
| Product manifest | Товарные количества и owner-корзины; grouping включён по умолчанию |
| Document activity | Хронология фактических операций документа и связанных Reservation |

Порядок чтения: identity/status → route/current location → actions → owner-корзины товаров → activity.

Page-level `Reserve in transit` открывает существующий поток Reservation с текущим Transfer в качестве location. После успешного проведения Ирина остаётся или возвращается на ту же карточку; отдельного механизма резервирования внутри Transfer detail нет.

## Voice and Tone

Микрокопия короткая, операционная, без обучающих карточек. Все user-facing labels — на английском.

| Контекст | Использовать |
|---|---|
| Status | `In transit`, `Delivered`, `Cancelled` |
| Date | `Expected` |
| Route | `Origin`, `Current location`, `Destination` |
| Main panels | `Products and reservations`, `Document activity` |
| Grouping | `Group by reservation` |
| Owners | `Free`, `Order OMS-901`, `Region REG-1 · North` |
| Actions | `Reserve in transit`, `Mark delivered`, `Cancel transfer` |
| Loading/error | `Loading transfer…`, `Transfer could not be loaded.`, `Retry`, `Transfer not found.` |
| Empty | `No products in this transfer.`, `No activity yet.` |

Не добавлять отдельный поясняющий текст о доступном количестве или модели резервирования: доступность должна быть понятна из строки `Free` и значений `Quantity`.

## Component Patterns

Визуальные спецификации всех компонентов находятся в `DESIGN.md.Components`.

| Компонент | Поведенческий контракт |
|---|---|
| Transfer document header | Всегда показывает номер, ровно один Status badge, одно значение `Expected`, Document actions и Route strip. Не создаёт summary cards. |
| Route strip | Показывает ровно один маршрут origin → current physical location → destination. Current location определяется по фактическим balances/transactions; при `sent` это location `Transfer {number}`. Частичной приёмки нет. |
| Status badge | Отображает один из трёх Transfer statuses и не выступает отдельным действием. |
| Document actions | Набор зависит от status; основных действий одновременно не больше одного. `Reserve in transit` — одна page-level action, не действие строки. |
| Product manifest | По умолчанию grouped. Показывает товары документа и в конечных состояниях, даже когда stock больше не находится на transfer location. |
| Grouping toggle | `Group by reservation` включён при первом входе. Переключает только представление тех же количеств, без запроса и изменения данных. |
| Owner group header | Создаёт отдельную секцию для каждой положительной owner-корзины: `Free`, каждого `Order` и каждого `Region`. Order показывает number; Region — code + name. |
| Grouped product row | Один product повторяется во всех owner-корзинах с положительным quantity. Строка показывает quantity своей корзины; отдельная owner-разбивка не нужна, поскольку owner назван в group header. |
| Ungrouped product disclosure | При выключенной grouping один product показан один раз с total quantity. Disclosure раскрывает owner-разбивку. |
| Breakdown row | Показывает `Free`, Order number либо Region code + name и quantity; сумма owner-разбивки равна total product quantity. |
| Document activity timeline | Показывает поддержанные текущим журналом события в хронологическом порядке от ранних к поздним. Не синтезирует бизнес-события, которых нет в данных. |
| Async state panel | Управляет loading, load error, not found и локальными empty states без изменения shell страницы. |

## State Patterns

### Document lifecycle

| Status | Current-location и данные | Доступные действия |
|---|---|---|
| `In transit` (`sent`) | Current location — `Transfer {number}`. Manifest показывает актуальные owner-корзины в этом location, включая проведённые после отправки Reservation. | `Reserve in transit` при наличии положительного `Free`; `Mark delivered`; `Cancel transfer`. |
| `Delivered` | Маршрут завершён; товары документа и owner-разбивка на момент завершения остаются доступны как read-only история из immutable transactions, а не исчезают вместе с transfer balance. | Lifecycle actions и `Reserve in transit` отсутствуют. |
| `Cancelled` | Документ и сторнирующие операции остаются видимыми; current location определяется по фактическим balances/transactions, а не только по status. | Lifecycle actions и `Reserve in transit` отсутствуют. |

Поле `Expected` остаётся единственным сроком и следует существующему праву редактирования `expected_end_on`; второй срок или derived ETA не добавляется.

### Data and async states

| State | Поведение |
|---|---|
| Initial loading | Breadcrumb и page shell остаются; skeleton повторяет каркас header, manifest и activity. Контейнер помечен busy. |
| Refresh after action | Текущие данные остаются видимыми; action получает pending state и блокируется от повторной отправки. |
| Load error | Async state panel показывает `Transfer could not be loaded.` и `Retry`; старые значения не выдаются за актуальные. |
| Not found | Показывается `Transfer not found.` и ссылка назад к существующему разделу Transfer. |
| No products | Product manifest показывает `No products in this transfer.` без document action. |
| No activity | Activity panel остаётся на месте с `No activity yet.` |
| No positive Free in transit | `Reserve in transit` не показывается; отдельная поясняющая карточка не добавляется. |
| Grouping changed | Перестройка локальная и мгновенная; totals и суммы owner-корзин не меняются. |

## Interaction Primitives

- Основные операции выполняются обычными Button; pending action нельзя запустить повторно.
- Grouping toggle доступен мышью, touch и клавиатурой; его state не меняет backend.
- Ungrouped product disclosure работает по `Enter`, `Space` и pointer; `Esc` не схлопывает строки и остаётся системным закрытием верхней overlay-поверхности.
- Коды Product, Order, Region и документов становятся ссылками только там, где в существующем Oryx есть соответствующий target route.
- `Reserve in transit` запускается только на page level. Per-row reserve buttons, bulk checkboxes и inline allocation запрещены.
- Activity — read-only; сортировка всегда хронологическая, пользовательского переключателя нет.
- После успешной mutation запускается reload logistics store. До его завершения manifest и activity сохраняют прежние данные; затем оба блока обновляются из ответа источника, без предварительного optimistic split.

## Accessibility Floor

- WCAG 2.2 AA для Transfer detail; визуальный contrast наследуется из `DESIGN.md`.
- Heading structure: один `h1` с номером Transfer, затем `h2` для `Products and reservations` и `Document activity`.
- Route strip имеет доступное имя; screen reader объявляет origin, current location и destination в этом порядке, а стрелки пропускает.
- Status badge доступен как текст, а не только цвет.
- Grouping toggle имеет видимую label `Group by reservation`, программный checked state и заметный focus ring `{components.grouping-toggle.focus}`.
- Ungrouped disclosure объявляет product, total quantity и expanded/collapsed state; owner-разбивка связана с control через `aria-controls`.
- Табличные headers связаны с cells; quantities читаются с единицей из текущих product data и визуально используют `tabular-nums`.
- Pending action объявляет занятость, error feedback передаётся через live region, а focus после ошибки остаётся на инициировавшем действии или первом invalid field существующего Reservation flow.
- Все touch targets не меньше 44×44 CSS px на touch viewport; hover-only affordances отсутствуют.

## Responsive & Platform

- На всех viewport сохраняются одинаковые document states, owner-корзины и lifecycle actions; мобильная версия не становится read-only.
- Порядок чтения и keyboard focus остаётся header → manifest → activity независимо от визуальной перестройки из `DESIGN.md`.
- Grouping toggle и ungrouped disclosure работают одинаково для pointer, touch и keyboard.
- На узких viewport все действия доступны без hover; overflow не скрывает единственный путь к основной операции.

## Inspiration & Anti-patterns

- Выбранное направление закрепило table-first density, grouping по owner-корзинам и activity как вторичный контекст.
- Отклонены summary cards и поясняющие блоки, повторявшие маршрут, модель Reservation или доступные quantities.
- Отклонены широкая таблица с пустым центром, per-row reserve actions и повтор owner-разбивки внутри grouped rows.

## Key Flows

### Flow 1 — Informational check (Ирина, менеджер по логистике, проверяет активное перемещение)

1. Ирина открывает существующий Transfer detail по номеру.
2. Expanded header показывает один status `In transit`, одно значение `Expected` и маршрут.
3. В `Current location` она видит `Transfer TR-901`; origin и destination остаются в той же строке.
4. В grouped Product manifest она сканирует `Free`, затем конкретные `Order` и `Region` groups. Один product повторяется между groups только с quantity соответствующей owner-корзины.
5. При необходимости Ирина выключает `Group by reservation`, находит одну строку product с total и раскрывает owner-разбивку.
6. Справа она сверяет `Document activity` от ранних событий к поздним.
7. **Кульминация:** без перехода на другие страницы Ирина подтверждает физическое местонахождение, направление и принадлежность каждой owner-корзины.

Failure: загрузка не удалась → вместо неполных данных показаны `Transfer could not be loaded.` и `Retry`; после успешного retry Ирина возвращается к тому же чтению.

### Flow 2 — Optional in-transit reservation (Ирина, связывает свободный товар в пути с потребностью)

1. На Transfer со status `In transit` Ирина видит положительное quantity в group `Free`.
2. Она выбирает page-level `Reserve in transit`.
3. Существующий Reservation flow открывается с location текущего Transfer; Ирина выбирает destination owner, product и quantity в пределах доступного Free по действующим правилам Reservation.
4. Она подтверждает операцию; создаётся обычный auditable Reservation.
5. После успешного posting запускается reload logistics store; до его завершения карточка сохраняет прежние данные.
6. **Кульминация:** reload возвращает обновлённые owner-корзины: quantity уменьшается в `Free`, соответствующая `Order` либо `Region` group появляется или обновляется, а `Document activity` показывает поддержанное журналом событие проведённого Reservation.

Failure: availability изменилась или posting завершился ошибкой → Reservation не считается созданным, manifest не получает optimistic split, введённые значения сохраняются в существующем flow и показывается его стандартная validation/error feedback.
