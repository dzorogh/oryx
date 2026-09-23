# Logistics (`/store/logistics`)

Демо-модуль **заказов и логистики** внутри раздела **Store**. Каноническая модель — одна baseline-миграция `supabase/migrations/20260922200000_store_baseline.sql` (`public.store_*`). Browser: anon **только SELECT** + command RPC; прямого DML нет. Seed: privileged `npm run seed:logistics` (service_role), без public reset RPC.

## Маршруты

| URL | Назначение |
|-----|------------|
| `/store/pim/products` | Каталог вариантов (`store_product` + `store_product_variant`) |
| `/store/logistics/stock` | Остатки |
| `/store/logistics/ledger` | Журнал `store_stock_transaction` |
| `/store/logistics/customer-orders` | Заказы клиента |
| `/store/logistics/reservations` | Резервы |
| `/store/logistics/regions` | Регионы |
| `/store/logistics/shipments` | Отгрузки и возвраты |
| `/store/logistics/adjustments` | Корректировки (знаковые строки) |
| `/store/logistics/production-orders` | Заказы на производство |
| `/store/logistics/outputs` | Выпуски (`store_production_output`) |
| `/store/logistics/transfers` | Перемещения |
| `/store/logistics/warehouses` | Склады |
| `/store/logistics/plants` | Заводы (`store_plant`; код `PLT-n`) |
| `/store/settings` | Префиксы из `store_document_kind.number_prefix` |

## Lifecycle

Единый словарь: `draft` | `in_progress` | `done` | `cancelled` на `store_document.status` для customer order, production order, transfer, production output. Reservation / shipment / adjustment — без status (reservation: `posted_at`; shipment/adjustment — create-and-post).

История: единственный trigger на `store_document` → `store_document_history`.

## Остатки

Реестры `store_stock_location` и `store_stock_owner` (singleton `free`). Журнал append-only; posting берёт advisory locks по `(variant, location, owner)`. View `store_stock_balance` — точная сумма, `<> 0`.

## Каталог и цены

`store_product` / `store_product_variant`; цены `store_product_price` (purchase global; dealer/retail regional) + `store_currency` / `store_region_group`. Soft-delete `deleted_at` на справочниках.

## Бэкенд

- Клиент: `src/lib/supabase/client.ts`
- API: `src/features/logistics/logistics-api.ts` (RPC only)
- Каталог: `src/features/store/store-catalog-from-logistics.ts`
- Миграции: `20260922200000_store_baseline.sql` (+ `thank_you_entry`); `20260923120000_store_page_read_models.sql` — read-RPC страниц (удаляет временный `store_logistics_snapshot`)
- Seed: `scripts/seed-logistics.mjs` + `scripts/lib/seed-logistics-stories.mjs`

### Загрузка данных

Каждая страница и диалог создания делают **один** read-запрос; полного снимка нет.

| Поверхность | RPC / источник |
|-------------|----------------|
| Заказы клиента (список) | `store_customer_order_list()` |
| Заказы на производство (список) | `store_production_order_list()` |
| Перемещения (список) | `store_transfer_list()` |
| Отгрузки / возвраты (список) | `store_shipment_list()` |
| Выпуски (список) | `store_output_list()` |
| Корректировки (список) | `store_adjustment_list()` |
| Резервы (список) | `store_reservation_list()` |
| Остатки | `store_stock_page()` |
| Журнал | `store_ledger_page()` |
| Склады / заводы / регионы (списки) | `store_catalog_page()` |
| Деталь документа | `store_document_context(kind, ref)` — `ref` = id или `sequence_number` |
| Деталь склада / завода / региона | `store_place_context(kind, id)` |
| Деталь товара (`/store/pim/products/[id]`) | `store_product_context(variant_id)` |
| Диалог «Создать …» на списке | `store_form_context(form)` при открытии |
| Настройки / PIM префиксы | `loadLogisticsSettings` (`store_document_kind` select) |

Детальный контекст — сам документ/место/товар, связанные документы (по товарам, а для заказов, перемещений, складов и регионов — ещё по их месту хранения и владельцу), их строки и история, проводки по этим товарам и остатки `balances`. Справочники и заголовки заказов клиента, заказов на производство и перемещений приходят целиком. Диалоги действий на детальной странице работают на её контексте. После действия страница перезагружает только свой запрос.

Views: `store_location_ref`, `store_owner_ref`, `store_stock_balance_ref`. Публичные read-RPC — `SECURITY DEFINER` (читают только то, что anon и так может `SELECT`). Внутренние помощники без grant anon: `store_context_payload`, `store_place_scope`, `store_doc_number`, `store_balance_json`, `store_product_lines_json`.

Подробности инстанса: [supabase.md](../conventions/backend/supabase.md). Коды мест: [place-codes.md](../conventions/ui/place-codes.md).
