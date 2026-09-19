---
name: Oryx Stock Dashboard
status: final
sources:
  - docs/features/logistics.md
  - src/features/logistics/stock-page.tsx
  - src/features/logistics/logistics-types.ts
  - src/features/logistics/logistics-balances.ts
updated: 2026-09-18
---

# Oryx Stock Dashboard — Experience Spine

Этот документ — поведенческий контракт дашборда: он определяет структуру, состояния, взаимодействия и переходы. При конфликте оба UX-контракта (`DESIGN.md` и `EXPERIENCE.md`) имеют приоритет над макетами и импортированными материалами.

## Foundation

Основная поверхность — настольный веб-интерфейс для менеджера по закупкам и внутреннему обеспечению. В основе интерфейса — таблицы; он работает внутри существующего раздела Store/Logistics на Next.js, shadcn/ui и Tailwind. Все пользовательские подписи и микротексты — только на английском.

Источник фактов — текущий `LogisticsSnapshot`: документы, строки документов, неизменяемый реестр движений и вычисленные из него остатки. Дашборд не редактирует историю и в первой версии не изменяет данные; для действий он ведёт в существующие карточки.

### Канонические правила фактических условий

Автоматической системы риска нет. Интерфейс показывает только следующие независимые, проверяемые правила; их identifiers являются каноническими ссылками для остальных разделов.

| Rule | Label | Нормативное условие и границы применения |
|---|---|---|
| `FC1` | `Zero free with open demand` | `Free(product) = 0` и `Open demand(product) > 0`, где `Open = Ordered − Shipped`. |
| `FC2` | `Uncovered demand` | Для `CustomerOrderLine`: `Ordered − Shipped − Reserved > 0`. |
| `FC3` | `Expected date passed` | `expected_end_on < today` по календарной дате пользователя у незавершённого документа; вывод о причине задержки не делается. Незавершённые состояния: открытый customer order; production order `draft`/`planned`/`in_progress`; output `planned`; transfer `draft`/`sent`. |
| `FC4` | `No expected date` | `expected_end_on IS NULL` в тех же границах незавершённых документов, что `FC3`; не означает `On time`. |
| `FC5` | `Negative balance` | Количество на исходном уровне данных `product + location + state + customer order + order line` `< 0`. |
| `FC6` | `Production not fully activated` | Для `ProductionOrderLine`: `ProductionOrderLine.quantity − activatedQuantity > 0`. |
| `FC7` | `Transfer still in transit` | `Transfer.status = sent`, а не `delivered`. |

### Каноническая интерпретация и границы данных

| Rule | Нормативная граница |
|---|---|
| `R1 · No risk inference` | Нет risk score, severity, traffic-light product health, stockout forecast, composite priority, recommended order quantity, AI-рекомендаций или автоматического решения. |
| `R2 · Independent quantity axes` | Каждый balance одного product и unit одновременно относится к одному `Stock state` (`free`, `reserved`, `shipped`) и одному `Location type` (`warehouse`, `production_order_line`, `transfer`, `customer_order`). Поэтому группы показывают два независимых разложения одного набора количеств: значения внутри подходящей группы можно суммировать в пределах строки, но итог одной группы нельзя прибавлять к итогу другой; разные products или units также не складываются. |
| `R3 · Numeric absence` | `0` всегда показывается как число. `—` означает только N/A. Отсутствующая ожидаемая дата — `No expected date`. |
| `DB1 · Procurement model unavailable` | Нет supplier и purchase order; manufacturer означает завод и подписывается `Plant`. |
| `DB2 · Planning inputs unavailable` | Нет lead time, MOQ, forecast и inventory policy. |
| `DB3 · Date grain unavailable` | Есть только document-level `expected_end_on`; line-level due date отсутствует. |
| `DB4 · Financial data unavailable` | Cost basis отсутствует. |
| `DB5 · Customer prioritization unavailable` | Customer identity и service class отсутствуют. |
| `DB6 · Optional taxonomy unavailable by default` | `Category` и `Family` допустимы только после добавления `store_product.category` и `store_product.family` в logistics snapshot. |

Справочный текст и последующие stories ссылаются на identifiers `FC*`, `R*`, `DB*`; расширять их смысл в других разделах нельзя.

## Information Architecture

Одна поверхность `/store/logistics/stock` содержит белую карточку панели инструментов и пять представлений:

Авторитетный визуальный референс для всех пяти представлений: [stock-dashboard.html](mockups/stock-dashboard.html). Он показывает настольную компоновку панели инструментов, карточки таблицы, открытой панели спроса и адаптивные переходы.

| Представление | Назначение | Единица строки |
|---|---|---|
| `Products` | Состояние одного товара сразу по двум независимым осям | один product |
| `Locations` | Где именно находится количество | одна пара product × конкретное место |
| `Customer demand` | Покрытие строки заказа клиента | одна `CustomerOrderLine` |
| `Production & transfers` | Строки производственных заказов, запланированных выпусков и перемещений как три отдельных типа процесса | одна `ProductionOrderLine`, `ProductionOutputLine` или `TransferLine`; типы не объединяются |
| `Ledger` | Аудит каждого движения | одна `StockTransaction` |

Переключатель представлений находится внутри панели инструментов. Breadcrumb остаётся снаружи. Правая панель деталей открывается для выбранной строки, но на настольном экране не заменяет таблицу. Закрытие панели возвращает фокус на исходную строку; позиция прокрутки, фильтры, сортировка и страница сохраняются.

На настольном экране заголовок панели инструментов показывает справа компактную метку `Snapshot · <timestamp>`; ниже `1280px` она переносится в доступное описание состояния, а не исчезает. Нормативное поведение актуальности, `Stale snapshot` и `Offline` задано в State Patterns. Каждое представление заключено в одну карточку таблицы: верхняя строка содержит имя представления, видимое количество строк и короткое пояснение, а нижняя — `Showing <visible> of <total> …` и компактную пагинацию. При нехватке ширины строки вкладок и фильтров прокручиваются горизонтально.

### Products

- **Единица строки:** один `store_product`; все количества относятся к единице этого товара, указанной в `Unit`, и не смешиваются с другими товарами или единицами.
- **Сортировка по умолчанию:** `Product` A–Z, затем `SKU` A–Z. Условия не влияют на порядок автоматически.
- **Основные колонки:** `Product`, `SKU`, `Unit`, опционально `Category`, `Family`, `Plant`; группа `Stock state` (`Free`, `Reserved`, `Shipped`); отдельная группа `Location type` (`Warehouses`, `Production`, `Transfers`, `Customer`); `Factual conditions`.
- **Детализация:** строка открывает панель с формулами условий, разложением по конкретному месту, состоянию остатка и связанному заказу. `Open product` ведёт в существующую карточку товара.
- **Фильтры:** `Search products`, `Category`, `Family`, `Plant`, `Stock state`, `Location type`, `Location`, `Customer order`, семь независимых `Factual conditions`. `Stock state` и `Location type` соединяются через AND; выбор одного не заменяет другой.

### Locations

- **Единица строки:** один product × одно конкретное место (`warehouse id`, `production order line id`, `transfer id` или `customer order id`). Это более детальный уровень, чем строка `Products`; разложение резерва по заказам остаётся внутри панели.
- **Сортировка по умолчанию:** `Location type`, затем натуральный порядок по коду места, затем `Product` A–Z.
- **Основные колонки:** `Location type`, `Location`, `Product`, `SKU`, `Unit`, `Free`, `Reserved`, `Shipped`, `Total`, `Factual conditions`. `Total` допустим только внутри этой строки и `Unit`.
- **Детализация:** панель показывает исходный уровень balance, распределение по заказам и ссылки `Open location`, `Open product`, `Open in Ledger`. Для завода показывается код связанного warehouse; сам `Plant` не подменяет склад.
- **Фильтры:** `Location type`, `Location`, `Stock state`, `Product`, `Category`, `Family`, `Plant`, `Customer order`, `Negative balance`, `Search locations`.

### Customer demand

- **Единица строки:** одна `CustomerOrderLine`; даты на уровне строки нет, поэтому `Expected end` показывает `expected_end_on` документа заказа.
- **Сортировка по умолчанию:** `Expected end` по возрастанию, значения `No expected date` после дат, затем `Customer order` и line id. Это детерминированная сортировка, а не приоритет.
- **Основные колонки:** `Customer order`, `Order status`, `Expected end`, `Product`, `SKU`, `Unit`, `Ordered`, `Reserved`, `Shipped`, `Open`, `Uncovered`, `Free now`, `Factual conditions`.
- **Детализация:** панель показывает `Open = Ordered − Shipped` и `Uncovered = Ordered − Shipped − Reserved` с конкретными числами, текущие резервы по location и ссылки `Open customer order`, `Open product`, `Open in Locations`.
- **Фильтры:** `Customer order`, `Order status`, `Product`, `Category`, `Family`, `Plant`, `Location type`, `Location`, `Zero free with open demand`, `Uncovered demand`, `Expected date passed`, `No expected date`, `Search demand`.

### Production & transfers

- **Единица строки:** одна `ProductionOrderLine`, `ProductionOutputLine` или `TransferLine`; каждая строка относится к одному product и unit. Строки разных типов не объединяются, даже если относятся к одному production order.
- **Тип процесса:** точные значения `Production order`, `Output`, `Transfer`. `Output` со статусом `planned` описывает только запланированный выпуск: указанное количество не является свидетельством фактического поступления.
- **Сортировка по умолчанию:** `Expected end` по возрастанию, `No expected date` после дат, затем `Document` в натуральном порядке по коду и line id. Условия не меняют порядок автоматически.
- **Общие колонки:** `Process type`, `Document`, `Status`, `Expected end`, `Plant`, `From`, `To`, `Product`, `SKU`, `Unit`, `Quantity`, `Done quantity`, `Activated`, `Remaining activation`, `Factual conditions`.
- **Семантика Production order:** `Document` и `Status` берутся из `ProductionOrder`; `Expected end` — его дата на уровне документа; `Quantity` — `ProductionOrderLine.quantity`; `Done quantity` — сумма quantity связанных `ProductionOutputLine`, чьи документы output имеют статус `done`; `Activated` — `activatedQuantity`; `Remaining activation` следует `FC6`. `From` — N/A, `To` — warehouse завода.
- **Семантика Output:** `Document`, `Status` и `Expected end` берутся из `ProductionOutput`; `Quantity` показывает запланированное `ProductionOutputLine.quantity`, а `Done quantity` равно количеству строки только при статусе `done`, иначе `0`. Пока `Output` имеет статус `planned`, его дата участвует в `FC3`/`FC4`, но само количество остаётся плановым. `Plant`, `From`, `Activated` и `Remaining activation` — N/A; `To` — warehouse связанного production order, если он доступен, иначе N/A.
- **Семантика Transfer:** `Document`, `Status` и `Expected end` берутся из `Transfer`; `Quantity` — `TransferLine.quantity`; `From`/`To` — склады маршрута. `Done quantity`, `Plant`, `Activated` и `Remaining activation` — N/A.
- **N/A:** для всех неприменимых полей показывается `—` по `R3`; отсутствие даты никогда не показывается тире.
- **Детализация:** панель production order показывает `FC6`, разложение завершённых output и текущий balance строки; панель output показывает родительский production order, status, planned quantity, done quantity, expected date и allocations; панель transfer показывает route, status, sent date, balances в пути и allocations. Ссылки: `Open production order` / `Open output` / `Open transfer`, `Open product`, `Open in Ledger`.
- **Фильтры:** `Process type` (`Production order`/`Output`/`Transfer`), допустимый для типа `Status`, `Product`, `Category`, `Family`, `Plant`, `From warehouse`, `To warehouse`, `FC6`, `FC7`, `FC3`, `FC4`, `Search processes`. Выбор process type ограничивает `Status` значениями этого типа документа; `All process types` показывает разнородные статусы без их переименования.

### Ledger

- **Единица строки:** одна неизменяемая `StockTransaction`, идентификатор — `transactionId`.
- **Сортировка по умолчанию:** `Posted at` по убыванию, затем `Transaction` по убыванию.
- **Основные колонки:** `Posted at`, `Transaction`, `Operation`, `Product`, `SKU`, `Unit`, `Quantity`, `Location type`, `Location`, `Stock state`, `Customer order`, `Source`, `Reverses transaction`.
- **Детализация:** панель показывает полный dimension key, `operationId`, `idempotencyKey`, source document и связь со сторнируемой транзакцией. Ссылки: `Open source`, `Open product`, `Open location`.
- **Фильтры:** `Date from`, `Date to`, `Operation`, `Product`, `Location type`, `Location`, `Stock state`, `Customer order`, `Source document`, `Reversal only`, `Search ledger`.

## Voice and Tone

Микротексты короткие, фактические и проверяемые. Границы применения и формулы здесь не переопределяются: подписи условий следуют `FC1`–`FC7`, интерпретация чисел — `R1`–`R3`, заявления о недоступных данных — `DB1`–`DB6`.

| Наблюдаемые данные | UI copy | Запрещённая трансформация |
|---|---|---|
| `FC2` с результатом 12 pcs | `Uncovered demand: 12 pcs` | `High risk — order now` |
| `FC3` с датой Sep 12 | `Expected date passed: Sep 12, 2026` | `Likely delayed` |
| `FC4` | `No expected date` | `On time` |
| Числовой ноль | `0 pcs` | `—` |
| Filtered result count 0 | `No matching rows. Clear filters.` | `Nothing to worry about` |
| Вопрос вне модели | `Not covered because this data is unavailable.` плюс identifier `DB*` в help | Догадка или обещание ответа |

Не используются восклицания, gamification, urgency language и фразы от имени AI.

## Component Patterns

| Компонент | Где | Поведение |
|---|---|---|
| `StockToolbar` | Общая поверхность | Координирует `ViewSwitcher` и `FilterBar` и сообщает время последней успешной загрузки. Поведение актуальности и обновления задано в State Patterns. |
| `ViewSwitcher` | `StockToolbar` | Содержит ровно пять вкладок; меняет `view`, сохраняет отдельное состояние остальных представлений и остаётся доступен в состояниях `Stale snapshot` и `Offline` по State Patterns. |
| `FilterBar` | `StockToolbar` | Показывает элементы управления и активные фильтры текущего представления; `Reset filters` не меняет `view`. Доступность элементов при `Stale snapshot` и `Offline` задана в State Patterns. |
| `FactualConditionChip` | `FilterBar`, строка, панель | Работает как независимый переключатель или подпись одного `FC*`; описание ссылается на каноническое условие, выбранное состояние доступно вспомогательным технологиям, уровень важности не вычисляется. |
| `DataTableFrame` | Все представления | Координирует количество строк и пагинацию. При ошибке, устаревшем снимке или отсутствии сети следует State Patterns. |
| `DataTable` | Все представления | Создаёт одну строку на заявленную единицу данных, применяет явную сортировку и открывает `RightDetailPanel` при активации строки. Сортировка и пагинация работают локально без скрытого переупорядочивания. |
| `GroupedQuantityHeader` | `Products` | Семантически связывает групповые заголовки `Stock state` и `Location type` с их колонками и сообщает правило `R2`. |
| `QuantityCell` | Все представления | Показывает значение со знаком в единице строки, следует `R3` и даёт доступную подпись для N/A. |
| `ExpectedDateCell` | Demand/process | Показывает дату документа либо `No expected date`; применяет `FC3`/`FC4` только в заданных для них границах и не создаёт дату на уровне строки. |
| `RightDetailPanel` | Все представления | Хранит исходную строку, URL и состояние таблицы; `Close` возвращает фокус. Доступность ссылок и локальных данных без сети задана в State Patterns. |
| `FormulaBlock` | `RightDetailPanel` | Показывает имя `FC*`, формулу, подстановку чисел и результат; исходные поля связываются с доступным разложением. |
| `StockStateSet` | `Products`, `Locations`, панель | Представляет `free`/`reserved`/`shipped` как отдельные значения одного product и unit, сохраняет границу `R2` и не выводит общий статус состояния. |

## State Patterns

Актуальность определяется последней успешной загрузкой `LogisticsSnapshot`. Метка `Stale snapshot` появляется только тогда, когда обновление завершилось ошибкой после хотя бы одной успешной загрузки; один лишь прошедший срок не делает снимок устаревшим, и интерфейс не придумывает порог давности. `Offline` означает отсутствие сети. Любой показанный timestamp — время последней успешной загрузки; данные с меткой `Stale snapshot` или `Offline` нельзя считать текущими. Ни одно состояние не запускает автоматическое обновление и не меняет порядок строк.

| Состояние | Представление | Поведение |
|---|---|---|
| Начальная загрузка | Все | `Skeleton` повторяет заголовок и 8–10 строк таблицы; панель инструментов остаётся доступной, но элементы управления недоступны. |
| Нет данных вообще | Все | Одна строка `No stock records yet.` и ссылка `Open Ledger`; без hero и иллюстрации. |
| Фильтры дали 0 строк | Все | `No matching rows. Clear filters.`; кнопка очищает только активное представление. |
| Ошибка загрузки без снимка | Все | Если успешной загрузки ещё не было, встроенное уведомление `Couldn’t load stock data. Retry.` заменяет строки; URL, представление, фильтры, сортировка, страница и запрошенный panel id сохраняются. |
| Stale snapshot | Все | После ошибки обновления при наличии ранее успешного снимка `StockToolbar` показывает `Snapshot · <timestamp> · Stale snapshot` и `Retry`. Последние строки и открытая панель остаются видимыми и явно устаревшими; локальные фильтры, сортировка и пагинация продолжают работать. `Retry` повторяет загрузку без изменения URL, сортировки, страницы, порядка строк или панели; только успешный ответ заменяет снимок и убирает метку `Stale snapshot`. |
| Offline with snapshot | Все | `StockToolbar` показывает `Snapshot · <timestamp> · Offline`; последние строки, локальные фильтры, сортировка, пагинация и панель остаются читаемыми и явно не текущими. `Retry` доступен, но до восстановления сети не очищает данные. `Open full page`, `Open in …` и другие действия, требующие навигации или загрузки данных, недоступны с пояснением `Unavailable while offline`; локальные действия закрытия, смены представления, фильтрации и сортировки остаются доступны. |
| Offline without snapshot | Все | Показывается `Offline. No stock snapshot is available.` и `Retry`; состояние URL сохраняется, элементы управления данными и навигационные действия недоступны. |
| Нулевое количество | Любая таблица | Показывать `0`; количество интерпретируется вместе с `Unit` той же строки, даже если единица находится в отдельной колонке. |
| N/A | Process/table | Показывать `—` только если поле не применимо к типу строки. |
| Нет ожидаемой даты | Demand/process | Если `expected_end_on IS NULL` у документа в границах `FC4`, показывать `No expected date`. Это отдельное условие, а не вариант просрочки `FC3` и не значение N/A. |
| Несколько условий | Любая строка | Показывать каждое отдельно; не выбирать главное и не вычислять severity. |
| Отрицательный исходный balance внутри агрегата | `Products`/`Locations` | Показывать `Negative balance`; панель обязана раскрыть исходную комбинацию `product + location + state + customer order + order line` с отрицательным количеством, даже если агрегированный `Total` не отрицателен. |
| Устаревший detail id | Панель | Закрыть панель, сохранить таблицу, показать ненавязчивое уведомление `This record is no longer available.` |

## Interaction Primitives

- Щелчок по строке или `Enter` на сфокусированной строке открывает правую панель. Внутренние ссылки не должны одновременно открывать панель.
- `Esc` закрывает панель или всплывающий элемент; фокус возвращается на строку. Browser Back закрывает панель или возвращает предыдущее состояние URL.
- `/` фокусирует `Search…`, если пользователь не редактирует поле. `Ctrl+F`/`⌘F` остаётся браузерным поиском.
- Заголовок колонки переключает сортировку по возрастанию и убыванию; `aria-sort` отражает состояние. Автоматической скрытой сортировки по условиям нет.
- При горизонтальной прокрутке идентифицирующая колонка остаётся закреплённой. Вертикальная прокрутка остаётся у страницы, а не у нескольких вложенных таблиц.
- `Open in …` переносит совместимые фильтры (product, order, location) в целевое представление и сохраняет исходное состояние для Back.
- Дашборд не предлагает действий заказа или пополнения. Операционные изменения выполняются только на существующих страницах деталей.
- Запрещены действия, доступные только при наведении, перетаскивание для изменения порядка, бесконечная прокрутка и вложенные цепочки модальных окон. Обновление снимка и сохранение текущих строк следуют State Patterns.

## Filter semantics и URL persistence

- Между разными фильтрами действует AND. Внутри одного фильтра множественного выбора — OR. Несколько фактических условий также соединяются через AND и никогда не сворачиваются в общий уровень.
- Перед поиском `q` удаляются пробелы в начале и конце, а сравнение выполняется без учёта регистра. Поиск ограничен применимыми к текущему представлению полями из канонического набора: product name/SKU/code, location/document codes, order number, transaction/source id. Он не охватывает скрытые описания, поля вне этого набора или другие представления.
- Значение `All` означает отсутствие соответствующего параметра запроса. `Reset filters` сбрасывает только текущее представление. Неизвестные значения URL игнорируются и нормализуются при следующем изменении.
- Все изменения фильтра и сортировки используют `router.replace(..., { scroll: false })`; переход между представлениями, открытие полной страницы и Browser Back остаются навигационными действиями.
- Общие параметры: `view`, `q`, `product`, `category`, `family`, `plant`, `order`, `detail`.
- Состояние каждого представления хранится отдельными параметрами, чтобы возврат к вкладке восстанавливал её: `productsState`, `productsLocation`, `productsFacts`, `productsSort`; `locationsType`, `locationsId`, `locationsState`, `locationsFacts`, `locationsSort`; `demandStatus`, `demandFacts`, `demandSort`; `processType`, `processStatus`, `processFrom`, `processTo`, `processFacts`, `processSort`; `ledgerSource`, `ledgerState`, `ledgerFrom`, `ledgerTo`, `ledgerReversal`, `ledgerSort`.
- Пагинация также разделена по представлениям: `productsPage`, `locationsPage`, `demandPage`, `processPage`, `ledgerPage`. Изменение любого фильтра сбрасывает страницу активного представления на 1.
- Панель кодируется как `detail=<entity>:<id>`, например `detail=product:12` или `detail=transaction:481`. Невалидная или удалённая сущность закрывает панель и показывает ненавязчивое уведомление `This record is no longer available.`

## Accessibility Floor

- WCAG 2.2 AA; визуальный контраст наследуется из Oryx/shadcn и `DESIGN.md`.
- Настоящие `<table>`, `<thead>`, `<tbody>`; групповые заголовки используют `scope="colgroup"`, колонки — `scope="col"`, идентификатор строки — `scope="row"`.
- Каждая кнопка сортировки имеет accessible name вида `Sort by Product, ascending`; factual condition сообщает selected state и полную формулу в description.
- Цвет никогда не является единственным носителем состояния. `Negative balance`, `Expected date passed` и другие условия присутствуют текстом.
- Порядок перехода по `Tab`: breadcrumb → панель инструментов → заголовки таблицы → строки → панель. При открытии панели вспомогательные технологии объявляют её заголовок, а ссылка на исходную строку сохраняется.
- Правая панель имеет landmark и доступное имя, видимую кнопку `Close` и не блокирует для screen reader доступ к таблице на настольном экране; `Sheet` на узком экране управляет фокусом как модальное окно.
- Каждое количество читается вместе с `Unit` той же строки, даже если единица находится в отдельной колонке; знак минус — Unicode minus. `0` озвучивается как zero, `—` получает accessible label `Not applicable`.
- При 200% zoom функциональность сохраняется; sticky columns не перекрывают focus ring.

## Responsive & Platform

| Диапазон | Поведение |
|---|---|
| `≥ 1280px` | Полная композиция панели инструментов, таблица и немодальная панель рядом; корень полноширинный. |
| `768–1279px` | Фильтры переносятся на несколько строк; панель становится наложенным `Sheet`, состояние таблицы сохраняется. |
| `< 768px` | Основной сценарий — чтение и расследование: вкладки и фильтры прокручиваются горизонтально, таблица сохраняет закреплённый идентификатор строки и горизонтальную прокрутку, детали открываются в полноэкранном `Sheet`. |

Настольный компьютер и ноутбук — целевые платформы. Мобильная версия не получает отдельную карточную интерпретацию данных: единицы строк, формулы и подписи остаются теми же. Печать и экспорт не входят в этот контракт.

## Inspiration & Anti-patterns

- **Уникальное вдохновение:** плотные ERP/WMS-таблицы, где любое число раскладывается до документа и `StockTransaction`, а URL воспроизводит состояние расследования.
- **Канонические запреты:** следовать `R1`–`R3`; не создавать визуальные или текстовые сокращения, меняющие их смысл.
- **Границы данных:** не обещать ответы за пределами `DB1`–`DB6`; расширение модели должно сначала изменить Foundation.

## Вопросы менеджера и покрытия

| Практический вопрос | Основное представление | Как получается ответ |
|---|---|---|
| У каких товаров свободный остаток равен нулю при открытом спросе? | `Products` | `FC1`; панель показывает канонические исходные данные. |
| Какие строки заказов ещё не покрыты резервом и отгрузкой? | `Customer demand` | `FC2`; `FormulaBlock` показывает подстановку. |
| Где сейчас находится или движется количество конкретного товара? | `Locations` | Фильтр по product и правило `R2`. |
| Как количество в выбранном месте распределено между `Free`, `Reserved` и `Shipped`? | `Locations` | `StockStateSet` по `R2`. |
| Как резерв строки заказа распределён по складам и перемещениям? | `Customer demand` → панель | Разложение показывает зарезервированное количество по конкретным warehouse и transfer. |
| По каким незавершённым документам ожидаемая дата уже прошла? | `Customer demand`, `Production & transfers` | `FC3`, включая `Output` со статусом `planned`. |
| У каких незавершённых документов ожидаемая дата не задана? | `Customer demand`, `Production & transfers` | `FC4`, включая `Output` со статусом `planned`. |
| Где возник отрицательный остаток? | `Locations` | `FC5`, затем `Open in Ledger`. |
| Почему изменился итог по товару? | `Ledger` | Фильтр по product; каждая signed transaction ведёт к source и reversal. |
| Какая операция исправила ошибочное движение? | `Ledger` | `Reversal only` и `Reverses transaction` связывают сторно с исходной transaction. |
| Какой объём производства ещё не активирован? | `Production & transfers` | `FC6` и колонка `Remaining activation`. |
| Какие выпуски запланированы, какое количество и какая дата указаны в плане? | `Production & transfers` | `Process type=Output`; `Quantity` остаётся плановым, а `FC3`/`FC4` описывают только ожидаемую дату. |
| Какие перемещения отправлены, но не доставлены? | `Production & transfers` | `FC7`. |
| Какие факты относятся к одному customer order? | `Customer demand`, затем `Products`/`Locations` | Общий фильтр `Customer order` переносится между представлениями. |
| Какие товары относятся к категории или семейству? | Условно | Не покрывается, пока действует `DB6`. |
| У какого поставщика покупать? Есть ли purchase order? | Не покрывается | Граница данных `DB1`. |
| Сколько и когда заказать или когда закончится запас? | Не покрывается | Граница данных `DB2`; также действует `R1`. |
| Какова стоимость дефицита или остатка? | Не покрывается | Граница данных `DB4`. |
| Какой клиент или service class важнее? | Не покрывается | Граница данных `DB5`; также действует `R1`. |
| Какой срок у конкретной строки заказа? | Не покрывается | Граница данных `DB3`. |

## Key Flows

### Flow 1 — Ежедневный обзор (Анна, менеджер по закупкам, 09:05)

1. Анна открывает `/store/logistics/stock`; загружается `Products` с сортировкой A–Z, без количественных KPI.
2. Она включает `FC1` и `FC4`. Фильтры записываются в URL; каждая показанная строка должна удовлетворять обоим условиям.
3. Анна открывает товар. Таблица остаётся на месте, справа видны исходные данные этих правил и список незавершённых документов без ожидаемой даты.
4. **Кульминация:** Анна видит проверяемые факты в границах `R1` и переходит по `Open in Customer demand` к конкретным строкам заказа, сохраняя фильтр по product.

Если данных нет, интерфейс показывает `No matching rows. Clear filters.` и не делает вывод `No issues`.

### Flow 2 — Расследование покрытия заказа (Максим, менеджер внутреннего обеспечения, 13:20)

1. Максим открывает `Customer demand` по ссылке из карточки `OMS-42`; `order=42` уже находится в URL.
2. Он включает `FC2`. Каждая строка показывает исходные поля количества и результат.
3. Максим выбирает строку товара. `FormulaBlock` раскрывает подстановку `FC2` и показывает, где находится зарезервированное количество.
4. Он выбирает `Open in Locations`; целевое представление сохраняет product и order, а Browser Back возвращает прежнюю строку и панель.
5. **Кульминация:** Максим точно отделяет уже отгруженное, текущий резерв и непокрытое количество в границах `R1`.

Если ожидаемая дата документа заказа отсутствует, панель применяет `FC4`.

### Flow 3 — Аудит расхождения (Ирина, операционный контролёр, 16:10)

1. Ирина открывает `Locations`, включает `FC5` и выбирает конкретный warehouse.
2. Итог строки товара может быть неотрицательным, но панель всё равно показывает исходную комбинацию `product + location + state + customer order + order line` с отрицательным количеством по `FC5`.
3. Ирина нажимает `Open in Ledger`; product, location и state переносятся в фильтры, а реестр сортируется от новых транзакций к старым.
4. Она открывает transaction и сверяет signed quantity, source document, `operationId`, `idempotencyKey` и `Reverses transaction`.
5. **Кульминация:** Ирина прослеживает расхождение до конкретной transaction и подтверждает объясняющую цепочку к исходному source document или reversal, не редактируя ledger и не теряя контекст исходной таблицы.

Если source удалён или недоступен, transaction остаётся видимой; панель показывает `Source record is unavailable.` без попытки скрыть движение.

Статус обоих UX-контрактов остаётся `draft`.
