# Addendum — order and region reservations

## Rejected alternatives

- Мягкий earmark поверх `stock_state=free` с отдельной осью назначения.
- Отдельное пользовательское действие reassign / поле `operation`.
- Conditional product vs `customer_order_line_id` в строке Reservation.
- Три bucket type включая `free` как тип владельца.
- Общая owner registry table.

## Technical notes

- Полиморфная целостность: `CHECK` + trigger к `store_customer_order` и `store_region`.
- `store_region` — first-class справочник Store (bigint identity, код `REG-n`). Клиентские `PRICELIST_REGIONS` остаются отдельным demo-слоем прайсов.
- `stock_state` сохраняется: `free` iff owner NULL; `reserved` iff owner задан на warehouse / production / transfer; `shipped` на месте `customer_order` с owner=order.
- Широкая миграция допустима: приоритет чистой модели, не совместимости колонок.

## Personas (overflow)

Один оператор Store Logistics. Отдельные роли склада / продаж / регионального директора в v1 не моделируются.
