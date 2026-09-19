---
title: Универсальное бронирование по заказу и региону
status: final
created: 2026-09-19
updated: 2026-09-19
---

# PRD: универсальное бронирование по заказу и региону

## 0. Document Purpose

Контракт для реализации в Store Logistics. Строит на [brainstorm-intent](../../../brainstorming/brainstorm-order-and-region-reservations-2026-09-19/brainstorm-intent.md) и brief. Downstream: spec, UX, architecture, epics. Не дублирует visual tokens — они в UX spines.

## 1. Vision

Менеджер явно переклассифицирует количество между свободным остатком, региональным резервом и резервом заказа одним документом Reservation. Reservation больше не документ статуса заказа, а направленный перенос права на количество.

## 2. Target User

### 2.1 Jobs To Be Done

- Защитить количество под конкретный заказ, чтобы отгрузка не забрала чужой free.
- Отложить количество за регионом без планового лимита по товару.
- Собрать один destination из free и нескольких существующих резервов.
- Освободить резерв в обычный free, не восстанавливая прежний регион.
- Отгрузить только то, что уже принадлежит заказу.

### 2.2 Non-Users (v1)

Клиент, дилер, региональный директор с отдельным порталом. Pricelist-редактор, который работает с demo-регионами прайса.

### 2.3 Key User Journeys

- **UJ-1. Reserve free to order.** Anna открывает Reservations, destination = order OMS-12, location = WH-1, строка из Free. После Post free уменьшается, reserved(order) растёт, открытое количество заказа падает.
- **UJ-2. Reserve free to region.** Anna ставит destination = region Russia, те же строки из Free. Региональный резерв растёт; открытое количество заказов не меняется.
- **UJ-3. Convert region to order.** Anna создаёт Reservation на OMS-12 и на строке выбирает source = Regional reserve / Russia. Количество атомарно уходит с региона на заказ.
- **UJ-4. Fan-in mixed sources.** На один товар Anna добавляет две строки: 3 из Free и 2 из OMS-9. Документ проводит оба source в один destination.
- **UJ-5. Release to free.** Destination = Free, source = order или region. Количество становится unassigned free; исходный регион не восстанавливается.
- **UJ-6. Ship only from order.** Anna отгружает OMS-12 со склада. RPC берёт только order-owned reserve. Региональный остаток на том же складе недоступен, пока не переведён Reservation.

## 3. Glossary

- **Owner** — пара `owner_type` + `owner_id`. Типы: `order`, `region`. Оба NULL = **Free**.
- **Reservation** — документ переноса количества source → target на одном месте.
- **ReservationLine** — строка: product, quantity, source owner. Один product может повторяться с разными source.
- **Destination** — единственный target owner документа (заголовок).
- **Source** — owner, с которого строка забирает количество.
- **Region** — запись `store_region`, владелец регионального резерва.
- **Open quantity** — для заказа и товара: `ordered − shipped − reserved(order, product)`.
- **Derived direction** — reserve (`NULL → owner`), release (`owner → NULL`), reassign (`owner → owner`). Не хранится.

## 4. Features

### 4.1 Reservation as source→target

**Description:** Одна форма создаёт документ с destination в шапке и source на строках. Realizes UJ-1…UJ-5.

**Functional Requirements:**

#### FR-1: Create and post Reservation

Оператор создаёт draft или сразу проводит Reservation. Проведение атомарно уменьшает каждый source balance и увеличивает target.

**Consequences:**
- Отказ без строк журнала, если source qty недостаточно на `location + product + owner`.
- Target order не превышает open quantity товара.
- Target region ограничен только доступными sources.
- Posted неизменяема; сторно запрещено.

#### FR-2: Destination in header, source on line

Заголовок хранит одно место и один destination owner. Строка хранит `product_id`, `quantity`, source owner.

**Consequences:**
- Нет поля `operation`.
- `NULL → NULL` и перевод owner в себя отклоняются.
- Уникальность строки: `reservation_id + product_id + normalized from_owner`.

#### FR-3: Derived list filter

Список Reservations фильтруется по вычисленному направлению All / Reserve / Release / Reassign.

### 4.2 Generic stock owner

**Description:** Ledger, balances, transfer allocations, output allocations и связанные stock operations используют `owner_type` + `owner_id` вместо `customer_order_id` / `customer_order_line_id`. Realizes UJ-6.

#### FR-4: Balance key

Остаток учитывается по `location + product + owner`. Free = отсутствующий owner.

#### FR-5: Owner survives physical move

Transfer и движение через production location сохраняют owner. Shipment потребляет только order-owned reserve.

#### FR-6: Order claims by product

В заказе не более одной строки на `product_id`. Спрос, резерв и отгрузка агрегируются по `order + product`.

#### FR-7: Region catalog

Оператор видит и выбирает регионы из `store_region` (список / карточка по образцу складов). `[ASSUMPTION: демо-регионы совпадают по именам со странами прайса, но это другой PK.]`

### 4.3 Automated releases

#### FR-8: Order close and production close

Закрытие заказа клиента и закрытие production order атомарно создают posted Reservation с destination Free на каждый остаточный order-owned reserve соответствующего места. Origin `order_close` / существующий production-close путь.

## 5. Non-Goals (Explicit)

- Партии, серийные номера, сроки годности.
- Мягкий earmark, который не уменьшает free.
- Отдельный UX «Reassign».
- Сторно posted Reservation.
- Объединение `store_region` с клиентскими pricelist region ids.
- Плановый лимит регионального резерва по товару.
- Новые owner types кроме `order` и `region`.
- Сброс демо-данных вместо миграции.

## 6. MVP Scope

### 6.1 In Scope

Схема, RPC, UI Reservations/Stock/Orders/Shipments/Transfers/Production/Outputs/Ledger, справочник Regions, seed, тесты, `docs/features/logistics.md`, live demo Supabase.

### 6.2 Out of Scope for MVP

Связка прайс-регион ↔ складской регион. Приоритеты между заказами одного региона. Автоконверсия региона в заказ при отгрузке.

## 7. Success Metrics

**Primary**
- **SM-1**: Сценарий UJ-1…UJ-6 проходит в UI и на live RPC без ручных SQL. Validates FR-1…FR-5.
- **SM-2**: После миграции сумма остатков по каждому `location + product` равна домиграционной; order-owned qty совпадает с прежним reserved по заказу+товару. Validates FR-4, FR-6.

**Counter-metrics**
- **SM-C1**: Не оптимизировать «меньше документов» за счёт нескольких destination в одном Reservation.

## 8. Open Questions

Нет блокирующих. Регион как `store_region` принят как assumption.

## 9. Assumptions Index

- `store_region` — новый справочник, не pricelist demo ids.
- `stock_state` сохраняется и согласован с owner (см. architecture).
- Широкая миграция допустима.
- Headless: пользователь поручил не спрашивать подтверждений.
