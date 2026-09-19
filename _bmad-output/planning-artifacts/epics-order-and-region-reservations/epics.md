---
project: oryx
slug: order-and-region-reservations
status: ready
source: ../../specs/spec-order-and-region-reservations/SPEC.md
stepsCompleted: [validate, draft, final]
---

# Epics — универсальное бронирование по заказу и региону

## Epic 1 — Схема и posting RPC

Generic owner в таблицах и один `store_post_reservation` без `operation`. Миграция существующих reserved → `owner_type=order`.

### Story 1.1 — store_region и owner constraints

- **AC:** Таблица `store_region` с sequential id; код `REG-n` через `store_code`.
- **AC:** CHECK: type ∈ {order, region}; type/id оба NULL или оба заполнены.
- **AC:** Trigger отвергает неизвестный order/region id.
- **AC:** Unique `(order_id, product_id)` на `store_customer_order_line`; миграция прерывается, если в live данных есть дубли.

### Story 1.2 — Reservation и ledger без line claims

- **AC:** `store_reservation` хранит `to_owner_*`, не `customer_order_id` / `operation`.
- **AC:** `store_reservation_line` хранит `product_id` + `from_owner_*`; unique включает нормализованный source.
- **AC:** Ledger/balance view/allocations без `customer_order_line_id` и claim `customer_order_id`.
- **AC:** До/после миграции суммы qty по `location + product` равны; бывший reserved заказа стал `owner=order`.

### Story 1.3 — Posting, close, ship, move

- **AC:** `store_post_reservation` атомарно двигает source→target; отказ без journal rows при нехватке или self/NULL→NULL.
- **AC:** Target order не превышает open qty `order+product`.
- **AC:** Order close создаёт posted destination-Free Reservation per location.
- **AC:** Transfer сохраняет owner; shipment потребляет только order owner.

## Epic 2 — Клиентская модель

### Story 2.1 — Types, snapshot, API

- **AC:** Types используют `ownerType` / `ownerId`; `operation` отсутствует у документа.
- **AC:** Snapshot грузит `regions` и новые колонки.
- **AC:** create/post reservation отправляет header destination + line sources.

### Story 2.2 — Balances, availability, rules

- **AC:** Хелперы считают reserved/free/open по owner+product.
- **AC:** Unit-тесты фиксируют caps, fan-in unique key, shipment-only-order.

## Epic 3 — Reservation UI и справочник регионов

### Story 3.1 — Форма и список Reservation

- **AC:** Форма: destination в шапке, source на строке, нет operation field.
- **AC:** Один product может повториться с другим source.
- **AC:** Список фильтр All / Reserve / Release / Reassign по derived direction; `?operation=release` → Release.
- **AC:** English labels на переписанных поверхностях.

### Story 3.2 — Regions catalog

- **AC:** Список и карточка `REG-n` по паттерну warehouses.
- **AC:** Пункт Regions в Store aside рядом со складами.

## Epic 4 — Остальные поверхности

### Story 4.1 — Stock, ledger, product/warehouse cards

- **AC:** Reserved раскладывается по owner; Free без owner.
- **AC:** Ledger показывает owner, не order line.

### Story 4.2 — Orders, shipments, transfers, production

- **AC:** Allocation Atlas и overflow Reserve/Release используют generic owner.
- **AC:** Shipment picker не даёт взять region reserve.
- **AC:** Transfer/output allocations несут owner pair.
- **AC:** Related documents резолвят Reservation без `customerOrderId` колонки — через destination/source owner.

## Epic 5 — Seed, docs, live, verification

### Story 5.1 — Seed и документация

- **AC:** `seed-logistics` создаёт регионы и хотя бы одну региональную Reservation в demo stories.
- **AC:** `docs/features/logistics.md` описывает owner model и отсутствие operation.

### Story 5.2 — Live apply и проверки

- **AC:** Миграция применена только к Oryx demo Supabase; тестовых строк не осталось.
- **AC:** `typecheck`, `test`, `check:ui-english`, `check:static-images` зелёные на затронутом.
- **AC:** Браузер: reserve to region, reassign to order, release to free, shipment refuse region.
