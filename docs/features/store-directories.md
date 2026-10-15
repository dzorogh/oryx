# Справочники магазина

Склады, регионы и заводы — справочники магазина, не раздел OMS. Коды мест по-прежнему показываются снаружи этих экранов; имена — только здесь. См. [place-codes.md](../conventions/ui/place-codes.md).

## Маршруты

| URL | Назначение |
|-----|------------|
| `/store/warehouses`, `/store/warehouses/[id]` | Склады. Имя видно только здесь; снаружи — `WH-{id}` |
| `/store/regions`, `/store/regions/[id]` | Регионы продаж, хаб и валюта заказов |
| `/store/plants`, `/store/plants/[id]` | Заводы (`store_plant`, код `PLT-{id}`) |

В меню магазина группа **Справочники** стоит сразу после **Каталог**.

Прежние адреса этих справочников редиректят сюда из `next.config.ts`.

## Код

- Страницы: `app/store/(directories)/`
- Экраны: `src/features/store/directories/` (`WarehousesPage`, `PlantsPage`, `RegionsPage` и карточки)
- Ссылки из OMS: `STORE_DIRECTORY_PATHS` и `directoryPath` в `src/features/store/store-paths.ts`
- Создание склада вызывает `store_create_warehouse`, а та — `store_oms_new_stock_location`

Таблицы остаются `store_warehouse`, `store_region`, `store_plant`.

## Диалоги создания и правки

Компактная форма на карточках справочников (`src/features/store/directories/`).

- **Склад.** Поле «Тип склада»: склад завода (`plant`, только чтение, если склад привязан к заводу), склад-хаб (`hub`), склад покупателя (`customer`). Создание — `store_create_warehouse` (внутри вызывает `store_oms_new_stock_location`).
- **Регион.** Хаб (`store_region.hub_warehouse_id`, склад `kind=hub`); в демо — Dubai / CIS / Americas / Europe Hub. Валюта заказов — `store_region.order_currency_id`.
- **Завод.** Имя; код снаружи — `PLT-{id}`.

Создание склада, завода и региона — двумя кнопками, как у документов OMS: «и закрыть» и «и открыть».

