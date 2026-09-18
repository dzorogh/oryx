---
id: SPEC-reservation-unreservation
companions:
  - operational-model.md
  - brownfield.md
  - ../../planning-artifacts/architecture/architecture-oryx-2026-09-17/ARCHITECTURE-SPINE.md
sources:
  - ../../brainstorming/brainstorm-booking-cancellation-storno-2026-09-17/brainstorm-intent.md
  - ../../brainstorming/brainstorm-unified-reservation-sign-2026-09-18/brainstorm-intent.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Единая Reservation

## Why

**Боль:** RSV и REL — почти идентичные документы с разными таблицами, кодами, формами и RPC. Это дублирует модель и скрывает, что меняется только направление `free ↔ reserved`. Нужна одна читаемая сущность со знаком операции.

## Capabilities

- **CAP-1**
  - **intent:** Оператор проводит Reservation с `operation=reserve` и переводит свободное количество в резерв заказа на выбранном месте.
  - **success:** После проведения `free − qty`, `reserved(order, line) + qty`; превышение free или открытой потребности отклоняется без строк журнала.
- **CAP-2**
  - **intent:** Оператор проводит Reservation с `operation=release` и возвращает фактический резерв того же заказа и места в свободный остаток.
  - **success:** `reserved − qty`, `free + qty`; превышение текущего резерва ключа отклоняется; отдельного типа REL нет.
- **CAP-3**
  - **intent:** Оператор перемещает свободный и/или зарезервированный товар; тип остатка и заказ резерва сохраняются.
  - **success:** Строка перемещения указывает источник (`free` или `reserved` + заказ/строка); Reservation не меняет статус и не сторнируется.
- **CAP-4**
  - **intent:** Оператор отгружает зарезервированный товар; последующий release трогает только оставшийся складской резерв.
  - **success:** Отгрузка уменьшает warehouse `reserved` и увеличивает `shipped` на месте заказа; release не трогает `shipped`.
- **CAP-5**
  - **intent:** Оператор освобождает резерв только новой posted Reservation(`release`); posted документы неизменяемы.
  - **success:** Нет кнопки сторно; `logistics_cancel_document('reservation')` ошибка; журнал исходной Reservation не реверсируется.
- **CAP-6**
  - **intent:** Система и UI используют одну сущность Reservation для обоих направлений.
  - **success:** Одна пара таблиц, один код `RSV-n`, один список с фильтром All/Reserve/Release, один posting RPC; раздел Releases и префикс REL отсутствуют.

## Constraints

- Учёт только количества SKU.
- Заголовок: один `customer_order_id`, одно место, одна `operation`, `status draft|posted`, `origin manual|order_close`, необязательный `note`.
- Строка: только `customer_order_line_id` + положительный `qty`. `product_id` не хранится.
- Место только `warehouse` | `production_order_line` | `transfer`.
- Нельзя reserve больше free места или `ordered − shipped − reserved` строки.
- Нельзя release больше reserved ключа `(place, order, line)`.
- Закрытие заказа атомарно создаёт по одной posted Reservation(`release`, `origin=order_close`) на каждое место с остатком резерва.
- Posted Reservation неизменяема; статуса `cancelled` нет.
- Существующие RSV/REL мигрируются (split по местам, remap журнала, балансы неизменны); старые ID и коды могут стать новыми `RSV-n`.

## Non-goals

- Партии, серийные номера.
- Отдельный тип/режим «полное снятие».
- Сторно как undo Reservation.
- Снятие сторно с отгрузки, возврата, выпуска, перемещения.
- Производственное потребление сырья.
- Сброс демо-данных вместо миграции.

## Success signal

Один список Reservations показывает и reserve, и release под кодами `RSV-*`. Сценарий «reserve на месте A → перемещение reserved на B → release на B» оставляет товар на B как `free`; журнал содержит три posted источника без reverse Reservation. Закрытие заказа с резервом на двух местах создаёт две posted release-Reservation в одной транзакции.

## Assumptions

- Журнал `logistics_stock_transaction` и `logistics_move` остаются источником остатков; signed qty живёт только там.
- Сторно shipment / transfer / return / output не удаляется этой работой.
