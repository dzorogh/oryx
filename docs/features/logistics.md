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
- Миграция: `20260922200000_store_baseline.sql` (+ `thank_you_entry`)
- Seed: `scripts/seed-logistics.mjs` + `scripts/lib/seed-logistics-stories.mjs`

Подробности инстанса: [supabase.md](../conventions/backend/supabase.md). Коды мест: [place-codes.md](../conventions/ui/place-codes.md).
