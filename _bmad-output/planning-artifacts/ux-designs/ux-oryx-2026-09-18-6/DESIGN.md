---
name: Oryx Transfer Detail
description: Визуальный контракт карточки перемещения между складами в Oryx BMS.
status: final
sources:
  - mockups/transfer-detail.html
  - imports/current-transfer-detail.png
  - imports/current-new-transfer-dialog.png
  - docs/features/logistics.md
  - src/features/logistics/transfers-page.tsx
  - src/features/logistics/logistics-types.ts
updated: 2026-09-20
colors: {}
typography: {}
rounded: {}
spacing:
  header-padding: 16px
  section-gap: 12px
  panel-padding-x: 12px
  row-min-height: 32px
  activity-min-width: 280px
components:
  transfer-document-header:
    surface: card
    border: border
    radius: rounded-lg
    padding: '{spacing.header-padding}'
  route-strip:
    divider: border
    current-emphasis: bg-primary/5 border-primary/20 text-primary
  status-badge:
    shape: rounded-full
    palette: inherited Oryx transfer-status variants
  document-actions:
    height: h-8
    gap: gap-2
  product-manifest:
    surface: card
    row-min-height: '{spacing.row-min-height}'
    horizontal-padding: '{spacing.panel-padding-x}'
  grouping-toggle:
    control: shadcn Switch
    focus: ring
  owner-group-header:
    surface: muted/50
    border: border
    horizontal-padding: '{spacing.panel-padding-x}'
  grouped-product-row:
    divider: border
    min-height: '{spacing.row-min-height}'
  ungrouped-product-disclosure:
    surface-open: muted/30
    focus: ring
    min-height: '{spacing.row-min-height}'
  breakdown-row:
    surface: muted/30
    divider: border
  document-activity-timeline:
    surface: card
    min-width: '{spacing.activity-min-width}'
  async-state-panel:
    surface: card
    border: border
    radius: rounded-lg
---

# Oryx Transfer Detail — Design Spine

## Brand & Style

Это внутренняя операционная поверхность Oryx BMS: спокойная, плотная и проверяемая взглядом. Она наследует shadcn/ui, Tailwind и существующие визуальные правила Oryx без новой брендовой темы. Визуальная иерархия отвечает на три вопроса в таком порядке: где находится товар, кому принадлежит каждая owner-корзина и что произошло с документом.

Контракт относится только к карточке существующего перемещения. Список перемещений и диалог создания — явные non-goals; импорт диалога нужен лишь как контекст границы scope. Декоративные summary-карточки, поясняющие баннеры и повтор маршрута не используются.

## Colors

Все цветовые токены наследуются от Oryx/shadcn: `background`, `card`, `foreground`, `muted`, `muted-foreground`, `border`, `primary`, `ring`, `destructive`. Новых hex-токенов нет.

- Основные панели используют `card` на фоне страницы `bg-muted/30`.
- Центральный узел активного перемещения использует `{components.route-strip.current-emphasis}`; это единственная локальная цветовая доминанта.
- Статусы используют существующие варианты Oryx для transfer status. Цвет всегда дублируется текстом: `In transit`, `Delivered`, `Cancelled`.
- Ссылки на `Order` и `Region` используют стандартный `primary`; тип владельца различается также явной подписью.
- Ошибка использует стандартный `destructive`, фокус — стандартный `ring`.

## Typography

Типографика полностью наследуется от Oryx/shadcn. Заголовок документа — существующий sans-serif Oryx, `text-xl`–`text-2xl`, semibold; заголовки панелей — `text-sm` semibold. Маршрут и строки таблицы используют обычный интерфейсный размер, метаданные — `text-xs` и `muted-foreground`.

Коды документов, товаров, заказов и регионов не заменяют читаемые имена: код оформляется как вторичный текст. `tabular-nums` применяется к количествам, датам и другим сопоставляемым числовым значениям; моноширинный шрифт для всего кода не требуется.

## Layout & Spacing

Страница занимает доступную ширину shell без корневого `max-w-*`. Breadcrumb остаётся над контентом. Сначала идёт расширенная `{components.transfer-document-header}`, затем нижняя рабочая область с промежутком `{spacing.section-gap}`.

На desktop (`≥ 1024px`) нижняя область использует двухколоночный grid `minmax(0, 2fr) minmax({spacing.activity-min-width}, 1fr)`: слева `{components.product-manifest}`, справа `{components.document-activity-timeline}`. Таблица остаётся компактной и пригодной минимум для 15 товарных строк; пустой средней колонки нет.

При ширине `768–1023px` нижние панели складываются в одну колонку: manifest перед activity; route остаётся горизонтальным, пока помещается без сжатия данных. При ширине `< 768px` actions переносятся, route становится вертикальным, стрелки меняют направление. `Product` и `Quantity` не скрываются, а горизонтальный scroll не становится основным способом чтения.

Трёхузловой маршрут занимает одну строку в header на desktop: `Origin` → `Current location` → `Destination`. Композиционная опора и пропорции зафиксированы в [chosen Transfer detail mock](mockups/transfer-detail.html). При любом расхождении DESIGN.md и EXPERIENCE.md имеют приоритет над mockup, импортами и текущей реализацией.

## Elevation & Depth

Иерархия строится фоном, границами и отступами, а не тенями. Header, manifest и activity — белые `card`-поверхности с однопиксельной `border`. Вложенные owner headers и раскрытая owner-разбивка отделяются тональным `muted`, но не превращаются в дополнительные карточки.

Тени не применяются внутри страницы. Допустима только стандартная тень уже существующего Dialog/Popover, если действие открывает такую системную поверхность.

## Shapes

Радиусы наследуются от Oryx/shadcn: крупные панели — `rounded-lg`, кнопки и небольшие controls — их стандартные варианты, статус — `rounded-full`. Вложенные строки не получают самостоятельных скруглений: таблица должна читаться как единый manifest.

## Components

- **Transfer document header** — `{components.transfer-document-header.surface}`, граница и padding `{spacing.header-padding}`. Верхняя строка объединяет identity, metadata и `{components.document-actions}`; route strip отделён divider.
- **Route strip** — три узла с подписями `Origin`, `Current location`, `Destination` и стрелками между ними. Активный узел получает `{components.route-strip.current-emphasis}`, остальные остаются нейтральными.
- **Status badge** — компактный pill с текстом статуса; не содержит иконку вместо текста.
- **Document actions** — компактная группа кнопок высотой `{components.document-actions.height}` и gap `{components.document-actions.gap}`. Не более одного основного действия; вторичные и destructive actions используют стандартные shadcn-варианты.
- **Product manifest** — единая bordered panel с header `Products and reservations`, колонками `Product` и `Quantity` и строками высотой не меньше `{spacing.row-min-height}`. Количество выровнено вправо.
- **Grouping toggle** — shadcn `Switch` с подписью `Group by reservation`; visible focus использует `{components.grouping-toggle.focus}`.
- **Owner group header** — тональная строка `{components.owner-group-header.surface}` с названием owner-корзины слева и её суммой справа.
- **Grouped product row** — имя товара и вторичный SKU/code слева, quantity owner-корзины справа; самостоятельного disclosure нет.
- **Ungrouped product disclosure** — chevron, имя + SKU/code и total quantity. Open-состояние использует `{components.ungrouped-product-disclosure.surface-open}`.
- **Breakdown row** — плоская вложенная строка с owner label слева и quantity справа на `{components.breakdown-row.surface}`.
- **Document activity timeline** — panel с title `Document activity`; дата/время, marker, событие и опциональная ссылка-код образуют одну строку timeline.
- **Async state panel** — `{components.async-state-panel.surface}` с геометрией целевой panel; skeleton повторяет её каркас, error и empty не используют иллюстрации.

## Do's and Don'ts

| Делать | Не делать |
|---|---|
| Показывать маршрут один раз и выделять текущий этап | Повторять маршрут в summary cards или тексте |
| В grouped mode визуально разделять owner-корзины | Вкладывать дополнительные карточки в каждую группу |
| В ungrouped mode отделять owner-разбивку тональным фоном | Смешивать total продукта с количеством одной owner-корзины |
| Держать плотность, пригодную для 15+ строк | Раздувать строки, добавлять поясняющие карточки |
| Использовать стандартные Oryx/shadcn tokens | Создавать новую палитру, градиенты или декоративные тени |
