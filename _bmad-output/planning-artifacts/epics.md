---
project: oryx
slug: reservation-unreservation
status: ready
source: ../specs/spec-reservation-unreservation/SPEC.md
---

# Epics — бронирование и снятие брони

## Epic 1 — Сервер запрещает сторно RSV/REL

Posted бронирование и снятие брони нельзя отменить через `logistics_cancel_document` / `logistics_reverse_source`.

### Story 1.1 — RPC reject

- **AC:** `logistics_cancel_document('reservation' | 'reservation_release', id)` поднимает ошибку с понятным текстом.
- **AC:** Posted строки журнала этих источников не получают `reverses_transaction_id`.
- **AC:** Cancel shipment / transfer / return / output не меняется.

### Story 1.2 — Клиентский guard

- **AC:** `cancelDocument('reservation' | 'reservation_release')` не вызывает RPC и бросает ту же ошибку.
- **AC:** Unit-тест фиксирует отказ.

## Epic 2 — UI и документация совпадают с операционной моделью

Единственный путь освободить резерв — провести REL.

### Story 2.1 — Карточки RSV/REL

- **AC:** На posted RSV есть «Снять бронь», нет «Отменить».
- **AC:** На posted REL нет «Отменить» / «Документ сторнирован».
- **AC:** Фильтр архивных `cancelled` может остаться.

### Story 2.2 — Документация модуля

- **AC:** `docs/features/logistics.md` описывает RSV/REL как Draft → Posted; освобождение = REL, не сторно.
