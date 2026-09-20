---
id: SPEC-transfer-detail-reservation-groups
companions:
  - brownfield.md
  - ../../planning-artifacts/ux-designs/ux-oryx-2026-09-18-6/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-oryx-2026-09-18-6/EXPERIENCE.md
sources: []
---

> **Canonical contract.** Этот SPEC и файлы из `companions:` образуют полный контракт реализации и проверки.

# Карточка перемещения с группировкой резервов

## Why

Менеджер по логистике не может быстро понять, где находится товар, кому принадлежат его части и как связаны перемещение, заказы и регионы. Текущая широкая таблица использует неоднозначные колонки, отделяет owner-контекст от товара и оставляет пустое пространство вместо полезной информации.

## Capabilities

- **CAP-1**
  - **intent:** Менеджер видит один понятный header документа с номером, статусом, сроком, действиями и маршрутом origin → current location → destination.
  - **success:** Для каждого lifecycle state маршрут и текущая физическая location считываются без повторяющих summary-блоков.

- **CAP-2**
  - **intent:** Менеджер по умолчанию просматривает количества по owner-группам `Free`, каждому `Order` и каждому `Region`.
  - **success:** Товар, разделённый между owner-корзинами, повторяется во всех положительных группах с точным количеством; сумма строк равна total группы.

- **CAP-3**
  - **intent:** Менеджер отключает grouping и видит каждый товар один раз с раскрываемой owner-разбивкой.
  - **success:** Раскрытие показывает `Free`, номера заказов, коды и названия регионов; сумма breakdown равна total товара.

- **CAP-4**
  - **intent:** Менеджер одновременно просматривает product manifest и хронологический document activity без широкой пустой середины.
  - **success:** На desktop используется полезная двухколоночная композиция, на узких viewport панели складываются; 15 и более товаров остаются плотными и читаемыми.

- **CAP-5**
  - **intent:** Менеджер запускает стандартное резервирование свободного товара в пути из одной page-level action.
  - **success:** Существующий `Reservation` создаётся для location текущего Transfer; после reload обновляются owner-группы и activity без optimistic split.

- **CAP-6**
  - **intent:** Менеджер безопасно использует карточку во всех актуальных lifecycle, async, empty и accessibility states.
  - **success:** Поведение `In transit`, `Delivered`, `Cancelled`, loading, error, not found и empty соответствует контракту и покрыто автоматизированными проверками.

## Constraints

- Использовать существующие order/region owners, balances, immutable transactions, `ReservationForm`, Oryx shadcn/Tailwind shell и текущие lifecycle mutations; новый backend schema и скрытые allocations запрещены.
- Все user-facing labels — на английском; корень страницы остаётся full-width.
- Маршрут и status показываются один раз. Запрещены helper cards, поясняющий reservation prose, sparse quantity columns и per-row reserve actions.
- Текущая direct-send модель без Transfer Draft является baseline; Draft UI и line editing нельзя восстанавливать. Lifecycle actions должны сохраниться.
- Реализация обязана добавить focused unit/component tests и пройти project verification.

## Non-goals

- Список перемещений и диалог создания нового перемещения.
- Partial receiving, новые reservation semantics и database migrations.
- Редизайн других logistics surfaces.

## Success signal

На Transfer с 15+ товарами менеджер за один экран определяет текущее местонахождение, owner каждой части и историю документа, переключает grouped/ungrouped представление без изменения данных и при наличии `Free` запускает существующее резервирование в пути.

## Assumptions

- `Group by reservation` — локальное view state, включённое при каждом новом входе; оно не сохраняется в URL или backend.
