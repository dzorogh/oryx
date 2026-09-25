# Warehouse and plant codes

Warehouse names and plant legal names appear **only** on the warehouse catalog and the plant catalog (`/store/logistics/warehouses`, `/store/logistics/plants`), including those lists, details, and create/edit dialogs. В БД сущность — `store_plant`; коды вида `PLT-n`; URL справочника — `/plants`. Префиксы завода (`PLT` по умолчанию), склада (`WH` по умолчанию) и товара (`PRD` по умолчанию) задаются в «Магазин → Настройки» и хранятся в `store_catalog_code_prefix`; смена префикса меняет только отображение. Код региона — сохранённый `store_region.code`; `REG-{id}` только если этот код пуст.

Everywhere else — lists, details, forms, filters, badges, summaries, and tooltips — show the **code only** (`WH-7`, `PLT-6`). Do not append `· {name}` and do not put the name in `title`.

Use `warehouseCode`, `warehouseSelectItems`, `plantCode` / plant helpers, `WarehouseLink`, and `PlantLink`.
