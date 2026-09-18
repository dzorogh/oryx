# Brownfield: единая Reservation

Канон схемы после `supabase/migrations/20260918100000_logistics_unified_reservation.sql`.

## Что оставить / считать источником

- `logistics_reservation` + `logistics_reservation_line`
- Журнал `logistics_stock_transaction`, `logistics_move`, `logistics_write_tx`
- Один RPC `logistics_post_reservation`
- UI `/store/logistics/reservations` и `?operation=release`
- Формулы `remainingToReserve`, `reservationCap`, `computeStockBalances`

## Что удалено этой работой

- Таблицы и RPC REL
- UI Releases и префикс REL
- Cancel/сторно Reservation
- `product_id` и место в строке Reservation

## Не трогать

- Cancel/сторно transfer, shipment, return, output
- Production close, output claim
- Integer PK и `formatLogisticsCode` кроме удаления REL-префиксов

## Миграция данных

Существующие RSV/REL и строки журнала переносятся, multi-location документы режутся по месту, балансы сверяются до/после. Reset демо не допускается.
