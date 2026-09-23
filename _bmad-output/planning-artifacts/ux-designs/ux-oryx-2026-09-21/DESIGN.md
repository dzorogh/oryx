---
name: Oryx Production Order Detail
description: Визуальный контракт карточки заказа на производство в Oryx BMS.
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
colors: {}
typography: {}
rounded: {}
spacing: {}
components:
  production-order-document-header:
    base: 'локальный detail-компонент на shadcn Card, Select, Input и Button'
    delta: 'единая полноширинная полоса документа; не изменяет общий LogisticsToolbar'
  section-index:
    base: 'локальная nav на shadcn Card и якорных ссылках'
    delta: 'липкий индекс на desktop и горизонтальная строка на tablet; всегда навигация по одному документу'
  product-manifest:
    base: 'локальная desktop Table и семантический адаптивный список'
    delta: 'плотный манифест с disclosure и вложенной семантической детализацией резервов'
  reservation-detail-row:
    base: 'details TableRow с labelled nested table/list'
    delta: 'отдельная приглушённая строка-контейнер для назначений выбранного товара'
  outputs-table:
    base: 'локальная desktop Table и семантический адаптивный список'
    delta: 'шестиколоночный список документов с line-aware перечнем товаров и количеств'
  movements-ledger:
    base: 'локальное представление на экспортируемых helpers строк и пагинации ledger'
    delta: 'собственный desktop/tablet/empty rendering без изменения API DocumentLedger'
  product-code-badge:
    base: 'существующий LogisticsCodeBadge'
    delta: 'компактный бейдж идентификатора товара во всех контекстах'
  add-product-dialog:
    base: 'существующий LogisticsDialog, Select, Input и Button'
    delta: 'товар и количество; явные blocked, empty, pending, error и success-состояния'
  reserve-product-dialog:
    base: 'существующий LogisticsDialog, FieldSelect, QuantityField и Button'
    delta: 'контекст, заказ клиента и количество; blocked, empty, pending, error и success-состояния'
  create-output-dialog:
    base: 'существующий LogisticsDialog, Select, QuantityField, ExpectedEndField и Button'
    delta: 'поля плана/завершения выпуска; blocked, empty, pending, error и success-состояния'
  close-confirmation-dialog:
    base: 'shadcn Dialog и Button'
    delta: 'безопасное начальное действие, точный текст последствий и pending/error области'
---

# Карточка заказа на производство — Design Spine

## Brand & Style

Карточка продолжает визуальный язык Oryx: спокойная, плотная и инструментальная рабочая поверхность для логистического документа. «Премиальность» достигается точной геометрией, устойчивой иерархией, аккуратной типографикой и отсутствием визуального шума, а не декоративными эффектами.

Визуальная база полностью наследуется от shadcn/ui, Tailwind и существующих компонентов Oryx. Этот документ задаёт только дельты выбранной композиции. Новая фирменная палитра, шрифтовая гарнитура или отдельная система теней не вводятся.

## Colors

Все цветовые роли наследуются без переопределения: `background`, `foreground`, `card`, `card-foreground`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `primary`, `primary-foreground` и `destructive`.

- Фон страницы — существующий `bg-muted/30`; рабочие панели — существующий `card`.
- Иерархия строится на тексте, границах, приглушённых фонах вложенных строк и отступах.
- Статус, тип владельца и направление движения никогда не передаются только цветом: рядом всегда есть русская текстовая подпись.
- Сочетания текста, интерактивных контролов и фокусного кольца сохраняют контраст не ниже WCAG 2.2 AA; используются проверенные сочетания shadcn/Oryx без локальных цветовых замен.
- Не добавлять градиенты, декоративные акценты, «светофор» состояний и новую бренд-палитру.

## Typography

Шрифтовая гарнитура, размеры и веса наследуются от приложения. Локальные правила:

- номер заказа — единственный заголовок первого уровня;
- заголовки разделов компактные, без hero-масштаба;
- строки таблиц используют основной `text-sm`, вторичные подписи и метаданные — `text-xs` / `muted-foreground`;
- количества, даты и время используют табличные цифры;
- название товара остаётся основным текстом, идентификатор товара — вторичным `product-code-badge`;
- коды документов, заказов, регионов, производителя и мест не переводятся и не раскрываются до названий вне профильных каталогов.

## Layout & Spacing

Страница занимает всю ширину основной области приложения. Корневые `max-w-*` и `mx-auto` не используются.

Композиция desktop:

1. хлебные крошки вне панелей;
2. полноширинный `production-order-document-header`;
3. рабочая область из узкого `section-index` и основного непрерывного полотна;
4. на полотне последовательно расположены `product-manifest`, `outputs-table`, `movements-ledger`.

`product-manifest` — первичный контент; «Выпуски» и «Движения» остаются вторичными, но не скрываются в боковом инспекторе. Разделы не конкурируют как одинаковые декоративные карточки: плотность и последовательность чтения важнее эффекта.

На desktop локальный `production-order-document-header` выстраивает в одну согласованную сетку номер, код производителя, редактируемый статус, редактируемое ожидаемое окончание и одно действие «Закрыть заказ». Поле производителя геометрически и по высоте выровнено с контролами. Это detail-компонент страницы: общий `LogisticsToolbar` списка и общий `LogisticsTableCard` глобально не изменяются.

На tablet заголовок переносится в две строки: идентичность и действие сохраняются сверху, метаданные — ниже. `section-index` становится компактной горизонтальной якорной навигацией, а все три раздела остаются видимы последовательно. Локальные responsive-renderers представляют записи семантическими списками: каждый элемент имеет собственный заголовок и явно подписанные пары «поле — значение». Shared-таблицы при этом не меняются. На эквиваленте 320 CSS px shell, header, навигация, формы и эти списки переходят в одну колонку без потери данных и двухмерного скролла. Product strategy не оптимизирует отдельный мобильный сценарий, но accessibility reflow обязателен.

Выбранная композиция и desktop/tablet reflow показаны в [«Документном рабочем месте»](mockups/production-order-detail.html). Исходная плотность, текущая иерархия и проблемы обрезания таблиц видны на [baseline-снимке карточки](imports/current-production-order.png).

## Elevation & Depth

Наследовать глубину shadcn/Oryx. Белые панели отделяются от `bg-muted/30` тонкой границей и тональным различием. Не использовать тени как самостоятельный уровень иерархии; не вкладывать декоративные карточки друг в друга. Вложенные назначения резерва выделяются приглушённым фоном строки, а не подъёмом или цветной плашкой.

## Shapes

Радиусы наследуются от shadcn/Oryx. Панели, контролы и диалог используют существующие размеры без локальной шкалы. Полное скругление допустимо только у компактных бейджей статуса и кода; рабочие поверхности не становятся pill-shaped.

## Components

| Компонент | Визуальная спецификация |
|---|---|
| `production-order-document-header` | Одна полноширинная белая detail-панель. Номер заказа доминирует типографически. Code-only `ManufacturerLink` находится в control-height read-only shell; статус и дата имеют ту же высоту и базовую линию. Единственная тёмная primary-кнопка — «Закрыть заказ». В terminal-состоянии статус становится статичным текстом, `ExpectedEndField` сохраняет редактирование ожидаемой даты, а add/reserve/output/close controls отсутствуют. |
| `section-index` | Узкая белая панель со ссылками «Товары», «Выпуски», «Движения» и счётчиками. Активный раздел отмечается muted-фоном, весом и `aria-current`, не только цветом. На tablet — компактная горизонтальная строка тех же якорей, не tabs. |
| `product-manifest` | Desktop: таблица «Товар», «План», «Свободно», «В резерве», «Выпущено», действие. Tablet/reflow: семантический список в том же порядке полей; у каждого элемента есть заголовок и подписанные пары «поле — значение». Название и `product-code-badge` собраны в identity-блоке; числа используют табличные цифры. Disclosure показывается только при наличии reservation assignments; для товара без резервов нет disclosure/details row, а свободное количество остаётся только parent-итогом «Свободно». |
| `reservation-detail-row` | Одна details-строка на товар с резервами, её spanning cell содержит приглушённую вложенную таблицу/список «Тип владельца / Код / В резерве». Каждое назначение — отдельная строка; несколько владельцев не упаковываются в одну ячейку. Collapsed container скрывается/удаляется целиком. |
| `outputs-table` | Desktop-колонки остаются «Номер», «Товары», «Количество», «Под заказ клиента», «Статус», «Ожидаемое окончание», но каждая output line семантически является единым nested list item/group: product name, `product-code-badge`, quantity и unit. Визуальное выравнивание по колонкам не может разрывать эту программную пару. Разные единицы не суммируются. Tablet/reflow использует те же line groups. |
| `movements-ledger` | Локальное представление заказа на производство самостоятельно строит полную шестиколоночную desktop-таблицу, семантический tablet-список, empty state и pagination nav на основе экспортируемых `documentLedgerRows` / `paginateLedgerRows` (либо будущего общего model hook). Оно не оборачивает текущий `DocumentLedger` и не требует изменения его API. |
| `product-code-badge` | Компактный нейтральный бейдж идентификатора товара. Один и тот же вид в манифесте, выпусках, движениях и tablet-компоновке. Не конкурирует с названием товара. |
| `add-product-dialog` | Поля вертикально: «Товар» (Select с названием и бейджем кода) → «Количество» (numeric Input) → ошибки → actions. Primary «Добавить», secondary «Отмена». Empty/blocked сохраняет доступную отмену; во время pending блокируются Select товара, Input количества, «Добавить», «Отмена» и закрытие диалога; error остаётся у поля; success закрывает dialog только после успешного обновления данных. |
| `reserve-product-dialog` | Вверху неизменяемый контекст товара и «Свободно N». Затем «Заказ клиента» → «Количество» → ошибки → actions. Primary «Зарезервировать», secondary «Отмена». Регион не входит в options. Во время pending блокируются Select заказа клиента, поле количества, «Зарезервировать», «Отмена» и закрытие диалога. Empty/blocked, pending, inline error и success-close имеют отдельные текстовые состояния без одной лишь цветовой индикации. |
| `create-output-dialog` | Порядок: «Товар» → availability context → «Количество» → «Под заказ клиента» → условное «Занятое количество» → «Ожидаемое окончание» → errors → actions «Сохранить план» и «Завершить выпуск» + «Отмена». Во время pending блокируются все поля, оба submit-действия, «Отмена» и закрытие диалога. No-remaining blocked state, retained-input error и confirmed success визуально различимы текстом и доступностью controls. |
| `close-confirmation-dialog` | Стандартный Dialog с заголовком, связанным описанием последствий и persistent error-region. Безопасное действие «Вернуться» визуально и по initial focus предшествует destructive «Закрыть заказ». Во время pending блокируются «Вернуться», повторное подтверждение и закрытие диалога; геометрия не меняется. Единственный wording source — обновлённый `CANCEL_GUIDANCE_PRODUCTION_CLOSE`, который проецируется в `closeEffects`; отдельная копия текста не хранится. |

Обычные Button, Card, Table, Select, Input, Dialog, Badge, Pagination и focus-ring наследуют визуальную спецификацию shadcn/Oryx без переопределения.

### Source aliases and local ownership

| Spine-компонент | Источник / отношение |
|---|---|
| `production-order-document-header` | Новый локальный `ProductionOrderDocumentHeader`; не rename и не global variant `LogisticsToolbar`. |
| `product-manifest`, `outputs-table` | Новые локальные desktop/tablet renderers; `LogisticsTableCard` остаётся без глобальных изменений. |
| `movements-ledger` | Локальный production-order view использует exported `documentLedgerRows` / `paginateLedgerRows` напрямую либо общий model hook; текущий `DocumentLedger` component не оборачивается и его API не меняется. |
| `product-code-badge` | Без изменений наследует `LogisticsCodeBadge`. |
| `add-product-dialog`, `reserve-product-dialog`, `create-output-dialog` | Канонические имена трёх существующих `LogisticsDialog` flows. |
| date control | Наследует `ExpectedEndField`, локально получает terminal, pending и error contract. |
| loading/error | Без визуального переопределения наследуют `LogisticsLoading` и `LogisticsError`. |
| `close-confirmation-dialog` | Специализированный production-order dialog; использует `CancelGuidance.closeEffects`, но не общий cancel trigger. |

## Do's and Don'ts

| Делать | Не делать |
|---|---|
| Показывать идентификатор товара бейджем во всех товарных контекстах | Оставлять код только в части таблиц или прятать его в tooltip |
| Выводить каждое назначение резерва отдельной вложенной строкой | Уплотнять несколько владельцев в одну ячейку или поток текста |
| Сохранять последовательность «Товары → Выпуски → Движения» | Переносить выпуски или движения в боковой инспектор |
| Оставлять полные шесть колонок ведомости движений | Удалять «Закреплено за» или «Документ» ради ширины |
| Использовать коды производителя, склада и владельца вне их каталогов | Показывать названия производителя/завода или склада на этой странице |
| Показывать `0` для нулевого количества и `—` только для неприменимого значения | Подменять ноль прочерком |
| Сохранять все важные поля при tablet-reflow | Обрезать правые колонки или делать горизонтальный скролл главным способом чтения |
| Поддерживать одну primary-команду документа | Добавлять рядом отдельные «Отменить» и «Другие действия» |
| Показывать все линии выпуска с собственным количеством и единицей | Суммировать разные товары или несовместимые единицы в один итог |
| Использовать локальные detail/responsive components | Менять `LogisticsToolbar`, `LogisticsTableCard` или другие shared consumers глобально |
| Оставлять «Выпуски» и «Движения» в tablet-документе | Делать section controls взаимоисключающими tabs |
