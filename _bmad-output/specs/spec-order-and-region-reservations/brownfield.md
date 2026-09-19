# Brownfield — что уже есть

## Живая модель (до этой работы)

- Единая `store_reservation` + `store_reservation_line` после `20260918100000` и rename `20260918120000`.
- Заголовок: обязательный `customer_order_id`, `operation reserve|release`, одно место.
- Строка: `customer_order_line_id` + qty; `product_id` не хранится.
- Ledger / `store_stock_balance`: `customer_order_id` + `customer_order_line_id`.
- Transfer allocation и output allocation ссылаются на order line.
- Shipment line хранит и line id, и `product_id`.
- Posted Reservation уже неизменяема; `store_cancel_document('reservation')` отвергается.
- Закрытие заказа создаёт posted release-Reservation per location.
- Региона как складского owner нет. `PRICELIST_REGIONS` — клиентский demo-справочник прайсов со строковыми id (`ae`, `ru`).

## Что заменить

Все claim-поля `customer_order_id` / `customer_order_line_id` в журнале, балансах, Reservation и allocations → `owner_type` / `owner_id`.

`operation` удаляется. Product uniqueness на строке заказа добавляется.

Существующие reserved строки мигрируют в `owner_type='order'`, `owner_id=customer_order_id`. Line-level различие сворачивается в агрегат `order + product`; если в одном заказе сейчас два line одного товара, миграция должна слить строки заказа и суммировать qty **или** прерваться, если такие дубли есть. Seed/demo не должны содержать дубли.

## Не трогать

- Сторно shipment / transfer / return / output.
- Каталог `store_product`, заводы, склады как сущности.
- Клиентские pricelist region ids.
- Политика «нет логина, anon + open RLS, только Oryx demo Supabase».
