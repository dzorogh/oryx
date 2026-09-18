# Операционная модель единой Reservation

## Документ

Одна сущность `Reservation`, код `RSV-n`.

| Поле заголовка | Правило |
|---|---|
| `operation` | `reserve` или `release`; на все строки |
| `customer_order_id` | ровно один заказ |
| `location_type` + `location_id` | одно место: warehouse / production_order_line / transfer |
| `status` | `draft` или `posted` |
| `origin` | `manual` или `order_close` |
| `note` | необязательно |

Строка: `customer_order_line_id` + `qty > 0`. Товар выводится из строки заказа.

`reserve`: `free → reserved`. `release`: `reserved → free`. Знак только в журнале.

Posted не редактируется и не сторнируется. Обратное действие = новая Reservation с другим `operation`.

## Ключ остатка

`(product_id, location_type, location_id, stock_state, customer_order_id, customer_order_line_id)`

## Проверки

| Операция | Отказ если |
|---|---|
| reserve | qty > free места или qty > `ordered − shipped − reserved` строки |
| release | qty > reserved `(place, order, line)` |
| post любой | документ уже posted; недопустимое место; строка не принадлежит заказу заголовка |

Закрытие заказа: одна транзакция, по одной posted Reservation(`release`, `origin=order_close`) на каждое место с остатком reserved.

## Миграция

Старые RSV → `operation=reserve`. Старые REL → `operation=release`. Документ с несколькими местами → несколько Reservation. Ledger `source_*` переназначается; балансы не меняются.
