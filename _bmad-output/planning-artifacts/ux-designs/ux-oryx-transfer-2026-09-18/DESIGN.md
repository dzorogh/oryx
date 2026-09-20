---
name: Oryx Transfer Dialog
description: Визуальный контракт Dense Ledger для адаптивного создания складского перемещения в Oryx.
status: draft
sources:
  - imports/current-transfer-dialog.png
  - src/features/logistics/transfers-page.tsx
  - src/features/logistics/order-action-forms.tsx
  - docs/features/logistics.md
  - ../../architecture/architecture-oryx-2026-09-17/ARCHITECTURE-SPINE.md
updated: 2026-09-18
colors:
  ledger-header-surface: '#F8FAFC'
  availability-error-surface: '#FEF2F2'
  availability-error-border: '#FECACA'
  availability-error-foreground: '#B91C1C'
  allocation-note-surface: '#F0FDF4'
  allocation-note-foreground: '#166534'
typography:
  ledger-header:
    fontSize: 10px
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  ledger-value:
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
  line-meta:
    fontSize: 10px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  ledger: 8px
  ledger-control: 6px
spacing:
  dialog-gutter: 20px
  dialog-section: 12px
  ledger-cell-x: 10px
  ledger-cell-y: 8px
  mobile-gutter: 16px
components:
  transfer-dialog:
    maxWidth: 56rem
    maxHeight: 85vh
    gutter: '{spacing.dialog-gutter}'
  route-fields:
    gap: '{spacing.dialog-section}'
  context-note:
    radius: '{rounded.ledger-control}'
    allocationBackground: '{colors.allocation-note-surface}'
    allocationForeground: '{colors.allocation-note-foreground}'
  product-ledger:
    headerBackground: '{colors.ledger-header-surface}'
    radius: '{rounded.ledger}'
  product-line:
    paddingX: '{spacing.ledger-cell-x}'
    paddingY: '{spacing.ledger-cell-y}'
  quantity-control:
    radius: '{rounded.ledger-control}'
    errorBorder: '{colors.availability-error-foreground}'
  add-product-action:
    radius: '{rounded.ledger-control}'
  transfer-summary:
    gap: '{spacing.dialog-section}'
  dialog-footer:
    gutter: '{spacing.dialog-gutter}'
  inline-availability-error:
    background: '{colors.availability-error-surface}'
    border: '{colors.availability-error-border}'
    foreground: '{colors.availability-error-foreground}'
---

## Brand & Style

Oryx Transfer Dialog — рабочий инструмент координатора логистики, а не отдельный брендовый слой. Выбранное направление **Dense Ledger** строится на плотном сравнении товара, остатка и перемещаемого количества: маршрут читается первым, строки — одним сканированием, итог — перед подтверждением. Визуальный приоритет — уверенность в доступности, а не декоративность.

Контракт наследует светлую тему, типографику, нейтральную палитру, focus ring, кнопки, поля, Dialog/Sheet, границы и тени из текущих shadcn/ui + Tailwind Oryx. Здесь зафиксированы только расширения для плотного реестра и семантики доступности. Направления Route First и Guided Table отброшены и не являются контрактом.

## Colors

Нейтральные `background`, `foreground`, `muted`, `muted-foreground`, `card`, `border`, `input`, `ring`, `primary` и `destructive` наследуются без переопределений.

- `{colors.ledger-header-surface}` отделяет заголовок реестра от строк без нового уровня карточности.
- `{colors.availability-error-surface}`, `{colors.availability-error-border}` и `{colors.availability-error-foreground}` образуют единственную специальную ошибочную комбинацию: фон строки, мягкий контур и текст превышения доступности.
- `{colors.allocation-note-surface}` и `{colors.allocation-note-foreground}` выделяют сохранение привязки к заказу клиента как контекстную справку, а не как success-состояние операции.
- Текст `{colors.availability-error-foreground}` на `{colors.availability-error-surface}` и `{colors.allocation-note-foreground}` на `{colors.allocation-note-surface}` должен сохранять контраст не ниже WCAG AA для обычного текста. Цвет никогда не является единственным носителем ошибки или контекста.

## Typography

Основная гарнитура и шкала заголовков, подписей, body и button text наследуются из Oryx/shadcn. Табличное расширение ограничено тремя ролями:

- `{typography.ledger-header}` — короткие заголовки `Product`, `On hand`, `Available`, `Move`; регистр uppercase допустим только здесь.
- `{typography.ledger-value}` — числовые значения с `font-variant-numeric: tabular-nums`.
- `{typography.line-meta}` — SKU, единица измерения и вторичная расшифровка доступности.

Название товара остаётся обычным читаемым текстом интерфейса; плотность нельзя получать уменьшением основного текста ниже унаследованного `text-sm`.

## Layout & Spacing

`TransferDialog` на desktop использует широкий, но ограниченный viewport контейнер `{components.transfer-dialog.maxWidth}`; прокручивается body, а header и `DialogFooter` сохраняют структуру. Между маршрутным блоком, контекстной заметкой, реестром и итогом применяется `{spacing.dialog-section}`. Внутренние горизонтальные поля строки — `{spacing.ledger-cell-x}`, вертикальные — `{spacing.ledger-cell-y}`.

На desktop `ProductLedger` имеет пять зон: гибкий `Product`, числовые `On hand`, `Available`, редактируемый `Move`, затем компактное удаление. На mobile те же данные перестраиваются в вертикальные `ProductLine` с полями и метаданными; горизонтальная прокрутка таблицы запрещена. Боковой отступ mobile — `{spacing.mobile-gutter}`.

Композиционный ориентир Dense Ledger: [desktop и mobile направление](.working/direction-dense-ledger.html). Исходное состояние до редизайна: [текущий диалог](imports/current-transfer-dialog.png). Эти материалы иллюстрируют плотность и адаптацию; при конфликте эта пара spine-документов имеет приоритет.

## Elevation & Depth

Новые уровни elevation не вводятся. `TransferDialog` наследует тень shadcn Dialog/Sheet; внутри иерархию создают границы, `{colors.ledger-header-surface}` и отдельный `DialogFooter`. `ProductLine` не становится самостоятельной карточкой на desktop. Ошибка доступности использует тональный фон, но не дополнительную тень.

## Shapes

Контейнер `ProductLedger` использует `{rounded.ledger}`. Вложенные числовые поля и компактные действия используют `{rounded.ledger-control}`. Радиус самого `TransferDialog`, кнопок и остальных контролов наследуется из shadcn; pill-формы внутри формы не добавляются.

## Components

| Компонент | Визуальный контракт |
|---|---|
| `TransferDialog` | Wide Dialog на desktop и bottom-anchored Sheet на mobile; нейтральная shadcn-поверхность, один header, прокручиваемый body, отдельный `DialogFooter`. |
| `RouteFields` | `From warehouse` → `To warehouse` + необязательный `Expected end`; desktop — компактная сетка, mobile — стек без потери порядка чтения. |
| `ContextNote` | Низкоконтрастная поясняющая полоса. Для заказа клиента использует `{colors.allocation-note-surface}` / `{colors.allocation-note-foreground}`; для свободного остатка — унаследованный muted. |
| `ProductLedger` | Desktop-реестр с `{colors.ledger-header-surface}`, внешней границей и `{rounded.ledger}`; на mobile контейнер становится списком без горизонтального scroll. |
| `ProductLine` | Название + SKU слева, tabular numbers справа на desktop; на mobile название, SKU, `On hand` и `Available` группируются над/рядом с `QuantityControl`. |
| `QuantityControl` | Компактный numeric input с единицей измерения рядом или внутри trailing area; normal/focus наследуются, invalid связывается с `InlineAvailabilityError`. |
| `AddProductAction` | Outline-кнопка `Add product` под строками, визуально вторичная по отношению к созданию Draft. |
| `TransferSummary` | Две текстовые строки: число product lines/units и маршрут + optional date + issue count; без отдельной карточки. |
| `DialogFooter` | Тонально отделённая полоса: `TransferSummary` слева, `Cancel` и primary action справа; на mobile summary сверху, кнопки ниже на полную доступную ширину. |
| `InlineAvailabilityError` | Тональный фон `{colors.availability-error-surface}`, контур `{colors.availability-error-border}`, текст `{colors.availability-error-foreground}` и явная числовая формулировка превышения. |

## Do's and Don'ts

| Делать | Не делать |
|---|---|
| Сохранять выбранный Dense Ledger как плотный рабочий реестр | Возвращать карточку на каждый товар или пошаговый wizard |
| Показывать `On hand`, `Available` и `Move` в одном горизонтальном сканировании на desktop | Прятать доступность в tooltip или отдельную панель |
| Перестраивать строки в компактный stack на mobile | Включать горизонтальную прокрутку таблицы |
| Использовать inherited shadcn tokens везде, где нет зафиксированного delta | Создавать параллельную палитру, типографику или набор теней |
| Показывать error-текст рядом с конкретным `QuantityControl` | Полагаться только на красную рамку или общий toast |
| Оставлять `Add product` вторичным действием, а Draft creation — primary | Делать добавление строки визуально равным созданию документа |
