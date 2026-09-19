# Операционная модель generic owner

## Reservation

Код `RSV-n`. Поля заголовка:

| Поле | Правило |
|---|---|
| `location_type` + `location_id` | одно место: warehouse / production_order_line / transfer |
| `to_owner_type` + `to_owner_id` | destination; оба NULL = release в Free |
| `status` | `draft` или `posted` |
| `origin` | `manual` или `order_close` |
| `note` | необязательно |

Строка: `product_id` + `qty > 0` + `from_owner_type` + `from_owner_id` (оба NULL = брать из Free).

Выводимое направление:

| from | to | direction |
|---|---|---|
| NULL | owner | reserve |
| owner | NULL | release |
| owner A | owner B | reassign |
| NULL | NULL | forbidden |
| owner A | owner A | forbidden |

Posted не редактируется и не сторнируется.

## Owner

- `order` → `store_customer_order.id`
- `region` → `store_region.id`
- NULL / NULL → Free

Trigger отвергает неизвестный id и частично заполненную пару.

## Ключ остатка

`(product_id, location_type, location_id, stock_state, owner_type, owner_id)`

`stock_state` согласован с owner (см. SPEC assumptions).

## Проверки posting

| Target | Отказ если |
|---|---|
| любой | source qty > balance `(place, product, from_owner)` |
| order | qty > `ordered − shipped − reserved(order, product)` |
| region | только source availability |
| Free | source qty недостаточно |
| любой | self-transfer, NULL→NULL, type/id mismatch, unknown owner |

## Соседние документы

| Документ | Owner rule |
|---|---|
| Transfer send/complete | копирует owner каждой снимаемой/кладущейся qty |
| Transfer allocation | `owner_type` + `owner_id` вместо order line |
| Shipment | только `owner_type=order` и `owner_id` = заказ отгрузки |
| Output allocation | generic owner; сахар «под заказ» создаёт Reservation на order, затем выпуск |
| Order close | posted Reservation destination Free per location с остатком reserved(order) |
| Production close | сначала release order-owned reserve места, затем списание уже free |

## Уникальность строки Reservation

`unique (reservation_id, product_id, coalesce(from_owner_type, ''), coalesce(from_owner_id, 0))`
