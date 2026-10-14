---
title: 'Полные названия заводов и складов во внутренних экранах'
type: 'feature'
created: '2026-10-13'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/conventions/ui/place-codes.md'
  - '{project-root}/docs/conventions/data/entity-codes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Проблема.** Вне справочников заводы и склады показаны только кодом (`PLT-6`, `WH-7`): менеджеру приходится открывать справочник, чтобы понять, что это за площадка, а в селектах нельзя найти завод по названию.

**Подход.** Везде, где не видит заказчик, показывать полное название завода или склада (`store_plant.name`, `store_warehouse.name`) и рядом бейдж кода. Селекты заводов и складов показывают то же и ищут по названию и коду. Заказчику — как сейчас, только код. Конвенцию `place-codes.md` переписать под новое правило.

## Boundaries & Constraints

**Always:** код остаётся бейджем `LogisticsCodeBadge` рядом с названием (бейдж-ссылка там, где была ссылка); длинное название обрезается многоточием, полное — в `title`; одна точка правды — хелперы в `logistics-lookups.ts` и `PlantLink` / `WarehouseLink`; хаб без завода по-прежнему «Общий / РЦ» там, где так было.

**Never:** миграции и правки данных; показ названий заказчику; изменение формата кодов и префиксов; новые компоненты вне `src/features/logistics/ui/` и `src/components/ui/`.

## I/O & Edge-Case Matrix

| Сценарий | Вход | Ожидание |
|---|---|---|
| Менеджер, список перемещений | склад `WH-7` с именем | «ZHEJIANG APOLLO…» + бейдж `WH-7` |
| Селект завода, поиск | ввод «taotao» | остаётся `PLT-4 · ZHEJIANG TAOTAO…` |
| Селект, поиск по коду | ввод «plt-4» | находится тот же завод |
| Имя пустое | `name = ""` | только бейдж кода |
| Заказчик в каталоге/чекауте | роль customer | только коды, как сейчас |

</frozen-after-approval>

## Open Questions

- Общие экраны (каталог, карточка товара, чекаут, заказы клиента, переключатель региона) видят и менеджер, и заказчик. Варианты: **по роли** (менеджер видит названия + код, заказчик — только код; больше мест с названиями, но вид экрана зависит от роли) / **по экрану** (на этих экранах всегда только код у обоих; проще, менеджер на них названий не видит).

## Code Map

- `src/features/logistics/logistics-lookups.ts` -- `plantCode`, `warehouseCode`, `plantSelectItems`, `warehouseSelectItems` (label = код), `warehouseOwnerLabel`, `locationIdentity` (title/hint = коды), `locationLabel`. Добавить `plantName`/`warehouseName`, имя в select items, поле для поиска.
- `src/features/logistics/logistics-types.ts` 161–178 -- `LogisticsPlant.name`, `LogisticsWarehouse.name` уже есть; строки документов имеют `plantName`.
- `src/features/logistics/ui/plant-link.tsx`, `warehouse-link.tsx`, `logistics-code-badge.tsx` -- сейчас только бейдж; добавить вариант «бейдж + название».
- `src/features/logistics/ui/field-select.tsx` -- Base UI `Select` без поиска; используется в 12 диалогах. `src/components/ui/combobox.tsx` -- примитивы Base UI Combobox (нет single-input), единственное использование `async-multi-combobox.tsx`.
- Экраны менеджера с кодами: `ui/list/list-helpers.tsx` (`listPlantColumn`), `ui/list/document-list-configs.tsx`, `ui/list/catalog-list-configs.tsx`, `ui/list/list-filter-defs.ts` (`placeCodeFilter`), `ui/list/ledger-list-configs.tsx`, `transfers-page.tsx`, `flow-documents-pages.tsx`, `production-orders-page.tsx`, `reservations-page.tsx`, `ui/reservation-hold-list.tsx`, `ui/product-balances-table.tsx`, `ui/document-ledger.tsx`, `ui/production-order-movements.tsx`, `ui/stock-products-matrix.tsx`, `ui/stock-filters-panel.tsx`, `ui/output-calendar-matrix.tsx`, `ui/output-calendar-toolbar.tsx`, `output-calendar.ts` (`plantCodesForProduct`), `ui/output-calendar-create-dialog.tsx`, `order-plan/order-plan-detail.tsx`, `order-plan/order-plan-model.ts`, `order-plan/order-plan-products.tsx`, `ui/product-activity-card.tsx`, `catalog-pages.tsx` (кнопка завода `warehouseOwnerLabel`), `regions-page.tsx` (код хаба), диалоги `customer-order-catalog-dialog.tsx`, `production-order-catalog-dialog.tsx`, `order-action-forms.tsx`, `transfer-create-dialog.tsx`, `shipment-catalog-dialog.tsx`, `adjustment-catalog-dialog.tsx`, `reservation-catalog-dialog.tsx`, прайс-листы `pricelists-columns.ts` / `pricelists-table.tsx`.
- Экраны заказчика (не менять или по роли — см. вопрос): `store-catalog-from-logistics.ts` (`catalogProductionSite`), `catalog-table.tsx`, `catalog-filters*.tsx`, `variant-stock-summary.tsx`, `region-switcher.tsx` / `region-context.tsx` (`hubCode`), `store-checkout-page.tsx`, `checkout-model.ts`, `cart-catalog.ts`, `customer-orders-page.tsx` (колонка «Источник»), `customer-order-list-filters.ts`, `customer-order-header.tsx`, `customer-order-lines-table.tsx`.
- Роль: `useHydratedViewRole` (`use-view-role.ts`), `ViewRole` (`order-view-role.ts`).

## Tasks & Acceptance

**Execution:**
- [ ] `logistics-lookups.ts` -- `plantName`, `warehouseName`; select items `{ value, label: name || code, code, keywords: "code name" }`; `locationIdentity` отдаёт и имя -- одна точка правды
- [ ] `ui/plant-link.tsx`, `ui/warehouse-link.tsx` -- проп `withName` (по умолчанию да): бейдж кода + обрезаемое название с `title`; `codeOnly` для экранов заказчика
- [ ] `src/components/ui/combobox.tsx` + `ui/field-select.tsx` -- `FieldSelect` с поиском (проп `searchable`, фильтр по `label` и `code`, «Ничего не найдено»); в строке и триггере бейдж кода + название
- [ ] экраны и диалоги менеджера из Code Map -- перейти на название + бейдж; фильтры и группировки списков — то же
- [ ] `tests/unit/` -- хелперы имён, items и фильтр поиска (имя, код, регистр, пустое имя)
- [ ] `docs/conventions/ui/place-codes.md`, `.cursor/rules/place-codes.mdc` (описание), `docs/features/logistics.md` -- новое правило

**Acceptance Criteria:**
- Given менеджер, when открывает любой экран логистики, then рядом с каждым кодом завода/склада видно его полное название.
- Given диалог с выбором завода или склада, when пользователь вводит часть названия или кода, then список сужается до совпадений.
- Given роль заказчика, when он открывает свои экраны, then названий заводов и складов нет.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- без ошибок
- `npm run check:deps && npm run check:docs && npm run check:static-images` -- без ошибок

**Manual checks:**
- Браузер: перемещения, отгрузки, остатки, календарь выпусков, план заказа, диалоги создания — название + код; поиск в селекте завода и склада; под ролью заказчика каталог и чекаут без названий.
