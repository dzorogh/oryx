---
id: SPEC-order-and-region-reservations
companions:
  - operational-model.md
  - brownfield.md
  - ../../planning-artifacts/architecture/architecture-oryx-reservations-2026-09-19/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/ux-designs/ux-oryx-reservations-2026-09-19/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-oryx-reservations-2026-09-19/EXPERIENCE.md
sources:
  - ../../brainstorming/brainstorm-order-and-region-reservations-2026-09-19/brainstorm-intent.md
  - ../../planning-artifacts/briefs/brief-order-and-region-reservations-2026-09-19/brief.md
  - ../../planning-artifacts/prds/prd-order-and-region-reservations-2026-09-19/prd.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Универсальное бронирование по заказу и региону

## Why

**Боль:** Reservation и весь складской ledger привязаны к `customer_order_line_id`. Нельзя зарезервировать количество за регионом и явно перенести его между free, регионом и заказом. Нужна одна модель владельца и один документ source → target.

## Capabilities

- **CAP-1**
  - **intent:** Оператор проводит Reservation с destination owner и source Free и переводит свободное количество в резерв заказа или региона на выбранном месте.
  - **success:** После проведения `free − qty`, `reserved(owner) + qty`; превышение free отклоняется без строк журнала; для target order также отклоняется превышение open quantity товара.
- **CAP-2**
  - **intent:** Оператор проводит Reservation с destination Free и возвращает количество выбранного source owner в обычный свободный остаток.
  - **success:** `reserved(source) − qty`, `free + qty`; исходный региональный резерв не восстанавливается; превышение source отклоняется.
- **CAP-3**
  - **intent:** Оператор проводит Reservation с destination owner и source owner и атомарно перерезервирует количество.
  - **success:** source уменьшается, target увеличивается в одной транзакции; нет промежуточного free; перевод owner в себя и `NULL → NULL` отклоняются.
- **CAP-4**
  - **intent:** Оператор собирает один destination из нескольких source owners, включая повтор одного товара разными строками.
  - **success:** Документ с двумя строками одного `product_id` и разными `from_owner` проводится; уникальность строки учитывает нормализованный source.
- **CAP-5**
  - **intent:** Система сопоставляет спрос, резерв и отгрузку заказа по `order + product`; в заказе товар не повторяется.
  - **success:** Unique `(customer_order_id, product_id)`; shipment и reservation checks используют агрегат, не line id.
- **CAP-6**
  - **intent:** Физическое перемещение сохраняет owner; отгрузка потребляет только order-owned reserve.
  - **success:** Transfer/production move копирует owner; shipment RPC отказывает, если на складе нет достаточного reserved(order, product).
- **CAP-7**
  - **intent:** Весь складской учёт хранит claim как generic `owner_type` + `owner_id`.
  - **success:** В reservation, ledger, balances, transfer/output allocations нет `customer_order_line_id`; `customer_order_id` как claim-поле журнала отсутствует.

## Constraints

- Owner type только `order | region`. Type и id всегда оба NULL или оба заполнены.
- Destination один на документ (заголовок); source на каждой строке.
- Нет поля `operation` и отдельного UX reassign.
- Нет `customer_order_line_id` в Reservation, ledger, balances и связанных stock operations.
- Место Reservation только `warehouse | production_order_line | transfer`.
- Posted Reservation неизменяема; сторно запрещено.
- Закрытие заказа атомарно создаёт posted release-Reservation (destination Free) на каждое место остаточного order reserve.
- Полиморфная целостность — CHECK + trigger, без owner registry table.
- Широкая миграция допустима; балансы `location + product` до/после равны.
- UI новых и переписанных поверхностей — English.

## Non-goals

- Партии и серийные номера.
- Мягкий earmark поверх free.
- Сторно Reservation.
- Плановый лимит региона по товару.
- Новые owner types кроме order/region.
- Объединение PK `store_region` с pricelist demo region ids.
- Сброс демо-данных вместо миграции.

## Success signal

Список Reservations показывает reserve, release и reassign под кодами `RSV-*` без колонки operation. Сценарий «region reserve на WH-1 → Reservation на OMS-n из этого региона → shipment» оставляет shipped у заказа и нулевой региональный остаток по этому qty. Журнал содержит только posted источники без reverse Reservation.

## Assumptions

- `stock_state` остаётся: `free` iff owner NULL; `reserved` iff owner задан на warehouse/PO line/transfer; `shipped` на `customer_order` с owner=order.
- `store_region` — справочник-владелец региона; это не generic owner registry.
- Демо-регионы совпадают по именам со странами прайса, но имеют собственные integer id.
