---
name: Oryx Production Order Detail
status: final
sources:
  - http://localhost:3000/store/logistics/production-orders/1
  - .memlog.md
  - mockups/production-order-detail.html
  - .working/source-patterns.md
  - imports/current-production-order.png
  - ../../../../src/features/logistics/production-orders-page.tsx
  - ../../../../src/features/logistics/ui/document-ledger.tsx
  - ../../../../src/features/logistics/logistics-cancel-guidance.ts
  - ../../../../src/features/logistics/logistics-labels.ts
  - ../../../../src/features/logistics/logistics-types.ts
  - ../../../../src/features/logistics/logistics-api.ts
  - ../../../../src/features/logistics/logistics-codes.ts
  - ../../../../src/features/logistics/ui/expected-end-field.tsx
  - ../../../../src/features/logistics/ui/logistics-dialog.tsx
  - ../../../../src/features/logistics/ui/logistics-table-card.tsx
  - ../../../../src/features/logistics/ui/logistics-toolbar.tsx
  - ../../../../docs/features/logistics.md
updated: 2026-09-21
---

# Карточка заказа на производство — Experience Spine

## Foundation

Desktop-first responsive web для Oryx BMS с основной рабочей адаптацией на desktop и tablet 768–1023 px. Отдельная mobile feature-оптимизация не входит в продуктовый охват, однако accessibility reflow обязателен до эквивалента 320 CSS px: shell, header, breadcrumbs, section navigation, dialogs, forms и всё нетабличное содержимое работают без потери данных и двухмерного скролла. Для табличных разделов предусмотрено локальное представление в виде семантических списков, поэтому исключение WCAG 2.2 SC 1.4.10 не заявляется.

Реализация наследует Next.js App Router, React, Tailwind и shadcn/ui. `DESIGN.md` определяет визуальную идентичность; этот документ — IA, поведение, состояния, взаимодействия и accessibility. Карточка объединяет identity документа, freely editable workflow status, ожидаемое окончание, товарный план с резервами, выпуски и immutable ledger.

Каноническая композиция — [выбранное «Документное рабочее место»](mockups/production-order-detail.html); baseline — [текущая карточка](imports/current-production-order.png). При конфликте визуальных материалов, текущей реализации и spine-документов выигрывают `DESIGN.md` и `EXPERIENCE.md`.

## Information Architecture

| Поверхность | Как открывается | Назначение |
|---|---|---|
| Карточка заказа на производство | Из списка по коду документа | Сверить план, резервы, выпуски, статус, срок и движения |
| `add-product-dialog` | «Добавить товар» в «Товары» | Добавить совместимую с производителем строку плана |
| `reserve-product-dialog` | «Зарезервировать» в строке товара | Создать резерв только за заказом клиента |
| `create-output-dialog` | «Новый выпуск» в «Выпуски» | Сохранить план выпуска или завершить выпуск |
| `close-confirmation-dialog` | «Закрыть заказ» в header | Подтвердить единственный user-triggered terminal transition |

Порядок непрерывного документа: breadcrumbs → `production-order-document-header` → `section-index` → `product-manifest` → `outputs-table` → `movements-ledger`. На desktop и tablet controls — якорные ссылки, никогда не mutually exclusive tabs.

IDs фиксированы: `#products`, `#outputs`, `#movements`. Счётчики означают:

- «Товары» — число строк заказа на производство; reservation details не считаются;
- «Выпуски» — число документов выпуска; output lines не считаются;
- «Движения» — все ledger facts, соответствующие production-order scope, до пагинации. UI-фильтров движений нет.

`product-manifest` хранит итоги в parent row. Disclosure существует только у товара с reservation assignments и открывает `reservation-detail-row`: один labelled details container со строками назначений. У товара без резервов нет disclosure/details row; свободное количество остаётся только в parent-итоге «Свободно». Поддерживаются владельцы «Заказ клиента» и «Регион»; canonical region code — `REG-n`. Эта страница создаёт только customer-order reservations. Region-owned reservations display-only и могут появиться из других logistics flows.

`outputs-table` хранит одну строку на документ выпуска. Заголовок — «Товары». Каждая product line — единый labelled nested list item/group, который программно объединяет название, `product-code-badge`, количество и единицу; разные единицы не суммируются и связь не строится на параллельной позиции двух списков. `movements-ledger` сохраняет «Время», «Изменение», «Товар», «Место», «Закреплено за», «Документ».

## Voice and Tone

Весь UI-текст — на русском, нейтральный и предметный. Коды (`PO-1`, `PRD-75`, `OMS-12`, `REG-1`) не переводятся. Вне каталогов складов и производителей показываются только коды мест и производителя.

| Использовать | Не использовать |
|---|---|
| «В резерве», «Зарезервировать» | «Распределение», `allocation` |
| «Ожидаемое окончание» | Смешивать «Срок», ETA и Deadline |
| «Закрыть заказ» | «Отменить», «Другие действия» |
| «Товары» для строк выпуска | Единственное «Товар» |
| «Показано N из M» | Необъяснимые сокращения |

Точные empty-state тексты:

- товары: «В заказе пока нет товаров.»;
- выпуски: «Выпусков пока нет.»;
- движения: «Движений пока нет.»;
- add dialog: «Для этого производителя нет доступных товаров.»;
- reserve dialog: «Нет открытых заказов клиента с незарезервированным количеством этого товара.»;
- output dialog: «Нет строк с оставшимся количеством для выпуска.».

Точный close text: «Закрытие снимет резервы и спишет весь оставшийся незавершённый остаток; история движений сохранится. Завершённые выпуски и связанные документы не отменяются.»

## Component Patterns

Визуальные контракты — в `DESIGN.md.Components`.

| Компонент | Где | Поведенческий контракт |
|---|---|---|
| `production-order-document-header` | Верх карточки | Локальный `ProductionOrderDocumentHeader`, не shared list toolbar. Показывает номер, code-only manufacturer, статус, дату и только «Закрыть заказ». В terminal-состоянии статус доступен только для чтения, а источник редактирования ожидаемой даты `ExpectedEndField` остаётся доступен согласно declared source behavior. |
| `section-index` | Между header и sections | Named nav из трёх anchor links. Обновляет hash и активный раздел, не скрывает sections. |
| `product-manifest` | «Товары» | Disclosure button есть только при наличии резервов. «Зарезервировать» относится к строке и появляется только при свободном количестве в non-terminal, включая `done`. «Свободно» не создаёт synthetic details row. |
| `reservation-detail-row` | После parent product row с резервами | Parent button имеет `aria-expanded`, `aria-controls` и имя с product name/code. Следующая details row имеет одну spanning cell; внутри labelled nested table/list «Резервы для {товар}, {код}» с полями «Тип владельца», «Код», «В резерве». При collapse container unmounts или получает native `hidden` атомарно с `aria-expanded=false`; при expand восстанавливается тот же ID/relationship. |
| `outputs-table` | «Выпуски» | Document link, customer-order links, status, expected end и nested output-line list. Каждый line item/group содержит собственные product name/code/quantity/unit. Все линии видимы desktop/tablet/reflow. |
| `movements-ledger` | «Движения» | Локальное представление заказа на производство использует экспортируемые `documentLedgerRows` / `paginateLedgerRows` напрямую либо общий model hook и самостоятельно управляет desktop-таблицей, tablet-списком, состоянием страницы и empty state. Текущий `DocumentLedger` component не оборачивается и не меняется. Сортировка newest-first, page size 20, фильтров нет. |
| `product-code-badge` | Все product contexts | Наследует `LogisticsCodeBadge`; всегда рядом с доступным product name. |
| `add-product-dialog` | Добавление строки | Поля: «Товар» (только manufacturer-compatible) и «Количество» (>0). No-compatible blocks Select и submit, но dialog остаётся закрываемым. Во время pending блокируются Select товара, поле количества, «Добавить», «Отмена» и закрытие диалога; повторная отправка невозможна. Field errors inline. После успешного обновления данных dialog закрывается и поля очищаются. Request failure keeps dialog, focus and both values. |
| `reserve-product-dialog` | Резерв строки | Context: product + free quantity. Поля: «Заказ клиента», «Количество» limited by free and open order quantity. No eligible orders blocks both fields/submit with exact empty copy. Creates only owner type `order`. Во время pending блокируются Select заказа клиента, поле количества, «Зарезервировать», «Отмена» и закрытие диалога; повторная отправка невозможна. После успешного обновления данных dialog закрывается; failure keeps inputs and dialog. |
| `create-output-dialog` | Новый выпуск | Fields in order: production line, availability, quantity, optional customer order, conditional allocated quantity, expected completion. Only lines with remaining plan are eligible. Two submit intents: «Сохранить план» and «Завершить выпуск»; во время pending блокируются все поля, оба submit-действия, «Отмена» и закрытие диалога, а live text сообщает «Создаём выпуск…». Downstream requirement: one atomic/idempotent domain command writes optional reservation/allocation, output header, all lines and optional completion together using a stable idempotency key. The key is retained for retry of the unchanged intent and replaced only after success, cancellation, or input change. После успешного обновления данных dialog закрывается и поля очищаются. Failure presents no partial write, preserves inputs and says «Выпуск не создан. Ничего не сохранено. Можно повторить.»; retry uses the same key. This is required future behavior, not a claim about current `createProductionOutput`. |
| `close-confirmation-dialog` | Закрытие | Renders `CancelGuidance.closeEffects`; its single canonical source is `CANCEL_GUIDANCE_PRODUCTION_CLOSE`, which downstream implementation must update to the exact approved wording. No second wording constant/copy. Calls only `closeProductionOrder`; never `cancelDocument` or status update. Safe action «Вернуться» receives initial focus. Во время pending блокируются «Вернуться», повторное подтверждение и закрытие диалога. Failure keeps dialog open and announces associated error. После успешного обновления данных dialog закрывается, focus переходит к обновлённому статусу и объявляется завершение. |

Source aliases:

| Source name | Spine name / relation |
|---|---|
| `LogisticsToolbar` | Not reused as contract; replaced locally by `production-order-document-header` without global mutation |
| `LogisticsTableCard` | Shared component remains unchanged; local desktop/list renderers wrap or replace it on this page only |
| `documentLedgerRows`, `paginateLedgerRows` | Model seam used directly by local `movements-ledger`; a future shared model hook is equivalent |
| `DocumentLedger` | Existing shared view remains unchanged and is not wrapped on this page |
| `LogisticsCodeBadge` | `product-code-badge`, unchanged |
| Existing three `LogisticsDialog` instances | `add-product-dialog`, `reserve-product-dialog`, `create-output-dialog` |
| `ExpectedEndField` | Source-компонент редактирования ожидаемой даты, включая terminal-состояния; локально получает pending/error behavior |
| `LogisticsLoading`, `LogisticsError` | Inherited unchanged |

## State Patterns

| State | Contract |
|---|---|
| Cold load | `LogisticsLoading`; mutation controls absent. |
| Load error / not found | `LogisticsError`; no partial document presented as current. |
| Non-terminal status | `draft`, `planned`, `in_progress`, `done` are freely editable workflow labels. Backward and skipped changes are allowed; no transition matrix. `done` remains operationally active until explicit close. |
| Terminal | `closed` and existing `cancelled` records remain visible. Page exposes no transition to `cancelled`. Status is read-only; expected date remains editable because the source contract permits change at any time. Add/reserve/output/close controls are removed, not disabled. Nearby status text explains «Документ закрыт: операции с товарами недоступны.» or «Документ отменён: операции с товарами недоступны.». |
| Empty products | Section/count `0`, exact empty copy, «Добавить товар» remains for non-terminal orders. |
| Empty outputs | Section/count `0`, exact empty copy, «Новый выпуск» remains when eligible. |
| Empty movements | Section/count `0` and «Движений пока нет.» always remain rendered. |
| Status pending | Status Select блокируется, его контейнер получает `aria-busy=true`, повторная смена статуса невозможна до завершения запроса. |
| Date pending | `ExpectedEndField` блокируется, его контейнер получает `aria-busy=true`, повторное сохранение даты невозможно до завершения запроса. |
| Status/date success | Confirmed value remains, `role=status` / polite live message: «Статус сохранён.» or «Ожидаемое окончание сохранено.». |
| Status/date failure | Attempted value remains in control; persisted data is not presented as confirmed. Visible error remains associated with control; focus stays/returns there. No auto-retry. |
| Dialog validation | Submit blocked; visible field error with retained input. |
| Dialog request failure | Exact entered values retained; visible request error and announced summary; toast may supplement, never replace inline error. For output creation, the atomic command guarantees that no reservation, output header, line or completion is presented as partially saved; exact summary is «Выпуск не создан. Ничего не сохранено. Можно повторить.», and retry reuses the same stable idempotency key. |
| Dialog success | Dialog закрывается и локальные поля сбрасываются только после подтверждённого запроса и успешного обновления данных. |
| Offline | Prototype has no offline writes; failed request uses the same retained-input request-error state. |
| Permission denied | Prototype has no auth/role model. A server denial uses load/request error behavior and never invents partial editability. |

## Interaction Primitives

- Explicit links/buttons only; data rows are not implicit click targets.
- Anchor activation updates the URL hash. Keyboard activation moves programmatic focus to the destination `h2` (`tabindex=-1`); pointer activation may scroll without stealing focus. Initial hash scrolls and focuses after content load. Scroll-spy sets `aria-current="location"` on the topmost section crossing the sticky offset; at document bottom it instead marks the last visible section current, including a short/empty «Движения». Neither rule moves focus. Section headings use `scroll-margin-top` equal to sticky chrome plus 16 px; focus ring must remain unobscured. Dialog opening does not change active section.
- Status Select commits immediately on a new valid selection. Expected date uses native `input type="date"`, machine value `YYYY-MM-DD`, visible label and format hint; keyboard text entry and clearing are supported in every status, including terminal. A natively valid change/clear commits immediately; invalid native input does not submit. No additional date range is defined.
- Product disclosure works with Enter/Space. Collapse atomically sets `aria-expanded=false` and unmounts the details container or applies native `hidden`; expand restores both relationship and content together.
- Dialog Escape/«Отмена» closes without write unless pending; no nested dialogs.
- Close is available only in non-terminal states and always opens confirmation. Terminal guard проверяется при открытии подтверждения, непосредственно перед submit и внутри domain command.
- Pagination is a named nav «Страницы движений». Controls are «Предыдущая страница», «Страница N», «Следующая страница»; current page has `aria-current="page"`, unavailable controls are native disabled. After load, focus remains on the activated control only if it stays enabled. If it becomes disabled, focus moves to the current-page control; if that control or pagination disappears because results shrink to one page, focus moves to the «Движения» heading. A polite message always announces «Показаны движения X–Y из M».
- `0` is zero; `—` only means not applicable/missing. Signed ledger changes use `+` or Unicode `−`.
- No movement filters, infinite scroll, hover-only actions, drag-and-drop, modal stacks, or physical direction inferred from fact sign.

## Accessibility Floor

- WCAG 2.2 AA, including 320 CSS px equivalent reflow and 200% text.
- Breadcrumbs: `nav` named «Хлебные крошки», ordered list, ancestor links, current document with `aria-current="page"`.
- Heading order is `h1` document number then `h2` section headings. Section nav/focus behavior is normative as above.
- Desktop uses valid table semantics. Tablet/reflow uses a semantic list: each list item has its own heading and explicit `dl` term/value pairs; table roles are not mixed with invalid card descendants. Every output line is a nested labelled list item/group containing product name, code, quantity and unit together in the accessibility tree.
- Reservation details use the explicit `aria-controls` + labelled nested list/table model; fake dash cells are not announced.
- Every field has a visible label. Field errors use `aria-invalid` and `aria-describedby` or `aria-errormessage`; request summaries are `role=alert`. Toast alone is insufficient.
- Status/date pending, success and error live behavior follows State Patterns.
- `close-confirmation-dialog` binds title/description via `aria-labelledby`/`aria-describedby`, traps focus, starts on «Вернуться», prevents duplicate confirmation, retains focus/error on failure, and on success focuses the stable updated status (`tabindex=-1`) before announcing «Заказ закрыт. Резервы сняты, остаток списан.»
- In terminal records, status and product-operation controls are removed while expected-date editing remains available. If successful close removes its trigger, focus relocation above is mandatory.
- Target sizes: at least 24×24 CSS px or the SC 2.5.8 spacing exception at every viewport; 44×44 px on tablet/reflow for disclosure, section links, pagination, icon buttons and linked badges. Visual height may remain compact inside a larger hit area.
- Under `prefers-reduced-motion: reduce`, anchor navigation is instant, disclosure and active-state transitions are removed, and content visibility is never delayed by animation.

## Responsive & Platform

| Range | Normative behavior |
|---|---|
| `≥1024 px` | Dedicated header grid; sticky left anchor index; all sections continuous; valid desktop tables. |
| `768–1023 px` | Header wraps; horizontal anchor nav; all sections remain sequential. Product, output and movement records use local semantic lists whose items have headings and explicit field/value pairs. |
| `320–767 px` equivalent | Accessibility reflow only, not mobile feature optimization. One-column shell/header/forms/nav wrapping; the same semantic lists retain every field and action. |

Normative output item order: item heading → Номер → Статус → «Товары и количество» nested list, where each line item/group contains product name → code → quantity → unit → Под заказ клиента → Ожидаемое окончание. Lines wrap; links remain on their codes; absent values are `—`. Desktop may visually align products and quantities in separate columns only if the accessibility tree still exposes each line as one group.

Normative movement item order: item heading → Время → Изменение → Товар (name/code) → Место (kind/code link) → Закреплено за (kind/code link or «Свободно») → Документ (kind/code link). Timestamp may wrap but not truncate; signed quantity remains visually aligned.

## Inspiration & Anti-patterns

- Lifted from the selected document-workspace direction: one passport, anchor index, primary manifest, then full outputs and movements.
- Lifted from current Oryx logistics: compact code badges, immutable ledger, linked entities, existing validation and Russian domain vocabulary.
- Rejected: right inspector and continuous-ledger variants because they demote either the manifest or complete tables.
- Rejected: packed reservation cells/ribbons because ownership must remain separate nested rows.
- Rejected: cancel/generic action labels, movement direction chips, inferred status sequence, mutually exclusive tablet tabs, and single-line output assumptions because sources do not support them.

## Key Flows

### Flow 1 — Утренняя сверка плана (Марина, менеджер логистики)

1. Утром Марина открывает заказ из списка.
2. Сверяет номер, производителя, статус и ожидаемое окончание с информацией китайских производственных партнёров.
3. Сравнивает план, свободно, в резерве и выпущено.
4. Раскрывает товары и проверяет отдельные назначения заказам клиента и регионам.
5. Переходит якорями к выпускам и движениям, не теряя контекст документа.
6. **Climax:** Марина подтверждает, что Oryx отражает нужный план, по одному непрерывному документу.

Failure: load error shows `LogisticsError`; partial quantities are not shown as current.

### Flow 2 — Добавить товар в план (Марина, уточняет утренний план)

1. Марина нажимает «Добавить товар».
2. Выбирает товар, совместимый с производителем, и положительное количество.
3. Подтверждает добавление.
4. **Climax:** новая строка появляется в манифесте с точным планом и product code.

Failure: при отсутствии совместимых товаров dialog показывает exact empty copy и blocks submit. Validation associates error with field. Request failure keeps dialog and both values.

### Flow 3 — Обновить workflow status или дату (Марина, получила уточнение партнёра)

1. Марина выбирает любой non-terminal status, включая backward/skipped change, либо вводит дату.
2. Контрол становится busy и отправляет один request.
3. **Climax:** подтверждённое значение остаётся в header и live message сообщает об успехе.

Failure: attempted value and focus remain; inline associated error explains failure. `done` не закрывает операции.

### Flow 4 — Зарезервировать свободное количество (Марина, связывает план с заказом клиента)

1. Марина нажимает «Зарезервировать» у товара.
2. Видит товар и свободное количество.
3. Выбирает eligible customer order и допустимое количество.
4. Подтверждает.
5. **Climax:** итог «В резерве» растёт, а отдельная details row показывает «Заказ клиента», код и количество.

Failure: no eligible orders blocks form with exact copy; limits show field error; request failure preserves inputs. Region option отсутствует.

### Flow 5 — Создать выпуск и проверить след (Марина, сверяет факт партнёра)

1. Марина открывает «Новый выпуск».
2. Выбирает строку с оставшимся планом, количество, optional customer order/allocation и дату.
3. Выбирает «Сохранить план» или «Завершить выпуск».
4. Проверяет document row: все product lines и их количества/units видимы отдельно.
5. Переходит к движениям и сопоставляет ledger facts.
6. **Climax:** выпуск и его складской след согласуются с сообщением китайского партнёра без суммирования разных единиц.

Failure: no remaining lines blocks submit; over-plan/allocation errors are field-associated. The downstream atomic/idempotent command either commits reservation/allocation + output + lines + optional completion together or commits nothing; request failure retains all inputs and retry reuses the stable key, so no partial write or duplicate reservation is presented.

### Flow 6 — Закрыть заказ (Марина, завершает операционную работу)

1. Марина нажимает единственное terminal action «Закрыть заказ».
2. Dialog opens with focus on «Вернуться» and exact consequence text.
3. Марина подтверждает; duplicate submit blocked while `closeProductionOrder` runs.
4. Dialog remains open on failure or closes only after a successful data refresh.
5. **Climax:** focus lands on read-only status «Закрыт», live message confirms release/write-off, while outputs and history remain and expected date stays editable.

Failure: «Вернуться» closes without change. Request failure keeps dialog open, announces error and allows retry with no page-state loss. Existing `cancelled` records are view-only and never enter this flow.
