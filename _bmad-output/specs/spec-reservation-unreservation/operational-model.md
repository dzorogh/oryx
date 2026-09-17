# Операционная модель RSV / REL

## Документы

| Документ | Код | Эффект | Ссылки |
|---|---|---|---|
| Бронирование | RSV | `free → reserved` на месте строки | `customer_order_id`; строка: `customer_order_line_id`, место, qty |
| Снятие брони | REL | `reserved → free` на месте строки | `customer_order_id`; строка: место, заказ/строка, qty. **Нет `reservation_id`** |

Posted документ не редактируется, не удаляется, не переводится в `cancelled`. Черновик можно править до проведения.

Бизнес-отмена брони = новый posted REL на фактический reserved, не правка RSV.

## Ключ остатка

`(product_id, location_type, location_id, stock_state, customer_order_id, customer_order_line_id)`

`stock_state`: `free` | `reserved` | `shipped`.

Места: `warehouse` | `production_order_line` | `transfer` | `customer_order`.

## Проверки при проведении

| Операция | Отказ если |
|---|---|
| RSV | qty > free места **или** qty > `ordered − shipped − reserved` строки заказа |
| REL | qty > reserved ключа `(place, order, line)` |
| Transfer | qty выбранного типа > доступного этого типа на источнике |
| Shipment | qty > reserved склада по строке заказа |

## Перемещение

Строка задаёт источник: `free` или `reserved` + заказ/строка. Смешанная строка допустима через allocation reserved + remainder free. Тип и заказ резерва не меняются. Отмена/возврат перемещения (если есть в модуле) не меняет статус RSV и не пишет REL.

## Отгрузка

`warehouse / reserved / order` → `customer_order / shipped / order`. REL после этого видит только оставшийся складской reserved. `shipped` REL не трогает.
