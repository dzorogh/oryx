# Brownfield: Store Logistics

Модуль уже содержит пару RSV/REL без взаимных ссылок, qty-only SKU и журнал. Перемещение reserved сохраняет тип. Разрыв спецификации — сторно posted RSV/REL.

## Что оставить

- Таблицы `logistics_reservation`, `logistics_reservation_line`, `logistics_reservation_release`, `logistics_reservation_release_line`
- Журнал `logistics_stock_transaction` и `logistics_move` / `logistics_write_tx`
- RPC `logistics_post_reservation`, `logistics_post_release`
- UI списков `/store/logistics/reservations`, `/releases`, хаб заказа
- Формулы `remainingToReserve`, `reservationCap`, `computeStockBalances`

## Что убрать / запретить для RSV и REL

- `logistics_cancel_document('reservation' | 'reservation_release')` → ошибка
- `logistics_reverse_source` по источнику RSV/REL
- Кнопки «Отменить» / тексты «Бронирование сторнировано» на карточках RSV/REL
- Фильтр «Отменён» как рабочий путь можно оставить только для архивных строк

## Не трогать в этой работе

- Cancel/сторно transfer, shipment, return, output
- Production close, output claim через RSV
- Схему integer id и коды `RSV-n` / `REL-n`

## Расхождение docs

`docs/features/logistics.md` пишет «Draft → Check → Posted → Cancelled» и «отмена пишет сторно». Для RSV/REL это больше неверно: Draft → Posted; освобождение = REL.
