# Warehouse and plant codes

Warehouse names and manufacturer/plant legal names appear **only** on the warehouse catalog and the manufacturer catalog (`/store/logistics/warehouses`, `/store/logistics/manufacturers`), including those lists, details, and create/edit dialogs.

Everywhere else — lists, details, forms, filters, badges, summaries, and tooltips — show the **code only** (`WH-7`, `PLT-6`). Do not append `· {name}` and do not put the name in `title`.

Use `warehouseCode`, `warehouseSelectItems`, `manufacturerCode`, `manufacturerSelectItems`, `WarehouseLink`, and `ManufacturerLink`.
