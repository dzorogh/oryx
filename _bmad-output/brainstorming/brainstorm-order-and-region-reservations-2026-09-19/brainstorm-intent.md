# Intent: универсальное бронирование по заказу и региону

## Цель

Переделать складскую модель так, чтобы количество товара в конкретном location можно было бронировать как за заказом, так и за регионом, а также явно и атомарно переносить между свободным остатком и этими владельцами.

## Итоговая концепция

`Reservation` — универсальный документ переноса права на количество по схеме **source → target**:

- `NULL → owner` — резервирование свободного остатка;
- `owner → NULL` — освобождение в обычный free;
- `owner → owner` — перерезервирование.

Отдельное поле `operation` и отдельное пользовательское действие reassignment не нужны. Destination един для документа и хранится в заголовке; source выбирается для каждой строки. Один документ может собирать количество из free и нескольких существующих резервов, но всегда направляет его одному destination owner.

## Минимальная модель

### Reservation

- `id`
- `location_type`, `location_id`
- `to_owner_type` nullable
- `to_owner_id` nullable
- `status`
- служебные поля: `origin`, `note`, `created_at`, `posted_at`

### ReservationLine

- `id`
- `reservation_id`
- `product_id`
- `quantity`
- `from_owner_type` nullable
- `from_owner_id` nullable

Один `product_id` может повторяться в документе, если количество набирается из разных source owners.

## Owner semantics

- `owner_type = order` — жёсткий резерв конкретного заказа;
- `owner_type = region` — региональный резерв без планового лимита по товару;
- пара `owner_type = NULL`, `owner_id = NULL` — свободный остаток.

Тип и ID владельца всегда заполняются вместе либо оба отсутствуют. Полиморфная целостность обеспечивается `CHECK` и trigger, без отдельной owner registry table.

## Ledger и balances

- Во всём складском учёте customer-order-specific claim fields заменяются на generic `owner_type` + `owner_id`.
- Балансы и проводки учитываются по `location + product + owner`; free представлен отсутствующим owner.
- `customer_order_line_id` удаляется из Reservation, ledger, balances и связанных stock operations.
- Спрос, резерв и отгрузка заказа сопоставляются агрегированно по `order + product`.
- В `customer_order` действует уникальность товара: не более одной строки на пару `customer_order_id + product_id`.
- Owner сохраняется при физическом перемещении товара между warehouse, transfer и production location.

## Posting и проверки

Posting атомарно уменьшает каждый source balance и увеличивает target balance:

- проверяет доступность количества у source по `location + product + owner`;
- для target order не позволяет превысить открытое количество заказа по товару;
- для target region ограничивается только фактически доступным количеством выбранных sources;
- release заказа всегда возвращает количество в free и не восстанавливает прежний региональный резерв;
- Shipment потребляет только order-owned reserve; региональный резерв сначала должен быть явно переведён на заказ через Reservation.

Обязательные ограничения:

- `owner_type` допускает только `order | region`;
- type/id каждой owner-пары либо оба `NULL`, либо оба заполнены;
- запрещены переходы `NULL → NULL`;
- запрещён перенос owner в самого себя;
- уникальность строки учитывает `reservation_id + product_id + normalized from_owner`, не запрещая один товар из разных sources.

## Последствия миграции

Миграция широкая и намеренно ориентирована на чистую итоговую модель: необходимо заменить привязки к `customer_order_line_id` и order-specific claims во всех reservations, ledger, balances, stock operations и связанных документах. Обычный FK для полиморфного owner недоступен, поэтому корректность ссылок должна поддерживаться trigger-проверками.
