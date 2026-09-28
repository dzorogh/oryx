---
title: 'Регион в каталоге, запасы «Готово · Всего» и карточка товара с вариантами'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
baseline_commit: '8d7fceb18388532da53d5021306bc6ee43ae28cb'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/brainstorming/brainstorm-catalog-region-prices-variant-switcher-2026-09-28/brainstorm-intent.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
  - '{project-root}/docs/conventions/ui/list-page-toolbar.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Менеджер продаж не может посмотреть цены, статусы и запасы другого региона: `loadDbCatalogItems` игнорирует `region_id` (цена случайного региона), статусы захардкожены, остаток всегда 0. На карточке товара из БД нет переключения вариантов.

**Approach:** Общий контекст региона (одно значение в localStorage) и два общих компонента — поиск-переключатель региона и блок «Готово · Всего» с поповером детализации. Потребители: каталог, новая карточка товара (раскладка как на бою, список вариантов, `?variant=`) и прайс-листы (только переключатель). Полное намерение — `brainstorm-intent.md` из `context`; оно обязательно к исполнению целиком.

## Boundaries & Constraints

**Always:**
- Один регион за раз. Без выбранного региона цены (и дилерская, и розничная) не показываются: в ячейках цен и на карточке — заглушка «Выберите регион» с кнопкой, открывающей переключатель. Понятия «мой регион» нет.
- Валюта — из самой цены, в каждой ячейке, без пересчёта.
- Готово = свободно + резерв под выбранный регион на хабе этого региона. Всего = всё на складах хабов и заводов (все владельцы) + в производстве + в пути. Числа нейтральные.
- Детализация: строки — хаб региона (всегда первой), склады заводов, другие хабы (только ненулевые); колонки — Свободно, Резерв под регион, Резерв всего, В производстве, В пути. Только коды мест (`WH-n`).
- Хаб региона — поле региона (`store_region.hub_warehouse_id` → склад `kind = 'hub'`), один хаб на несколько регионов, редактируется в диалоге региона.
- Весь текст интерфейса на русском.
- Решение: нынешнее логистическое содержимое карточки (остатки по местам, связанные документы, журнал, «Новый заказ на производство») переезжает во вкладку «Логистика» правой панели выбранного варианта.
- Решение: вкладки показывают только реальные поля из БД; вкладка без данных — «Нет данных». Демо-наполнения не выдумываем.

**Never:** оформление заказа из детализации; сортировка/фильтр по цене; сравнение регионов; пересчёт валют; бейдж «чужой регион»; подсветка «Готово» и подсказка о поступлении; запасы в прайс-листах; обратный выбор региона; переключатель в шапке раздела или у блока цен; удаление поиска вариантов; изменение демо-карточки `bike-*`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Регион не выбран | localStorage пуст | Ячейки цен и цены карточки — «Выберите регион»; «Готово · Всего» тоже заглушка | N/A |
| Регион выбран | `kz` | Цены kz с валютой в ячейке, статусы kz, Готово по хабу kz | N/A |
| У региона нет хаба | `hub_warehouse_id` null | Готово «—», в детализации нет строки хаба, пометка «У региона не задан хаб» | N/A |
| Нет цены в регионе | нет строки `store_product_price` | «—», без выдуманной цены | N/A |
| Сохранён несуществующий код | `xx` | Считается «не выбран» | N/A |
| Прайс-лист без региона | `scopeHasRegion` = false | Переключатель скрыт, значение не сбрасывается | N/A |
| Неизвестный `?variant=` | id не из товара | Выбирается первый активный вариант, URL исправляется `replace` | N/A |
| Один вариант | 90% товаров | Список из одной строки, экран тот же | N/A |

</frozen-after-approval>

## Code Map

- `src/features/store/store-catalog-from-logistics.ts` -- `loadDbCatalogItems`: добавить `region_id`, `currency_id` в выборку цен, статусы из `store_product_region_status`, `product_id` варианта; цены держать по региону (`Map<regionCode, …>`), чтобы переключение не перезагружало.
- `src/features/store/store-pricelists-from-db.ts` -- образец чтения регионов/валют/статусов по `region_id`; источник списка регионов.
- `src/components/store/pim/products/store-catalog-demo-data.ts` -- `StoreCatalogItem`, `DealerStatus`/`RetailStatus` (демо-словарь «Available for purchase»…); перевести на словарь БД из `pricelists-helpers.ts` (`available|unavailable`, `draft|available|preorder|…`), демо-данные — механической заменой.
- `src/components/store/pim/products/catalog/catalog-helpers.ts` -- `formatCatalogPrice` (добавить валюту), `statusBadgeClassMap`, `getPurchaseBlockReason`, `CATALOG_*_STATUS_LABELS` → подписи из `pricelists-helpers.ts`.
- `src/components/store/pim/products/catalog/catalog-table.tsx`, `catalog-columns.ts` -- ячейки цен/статусов по региону, колонка `stock` → «Готово · Всего» (видима по умолчанию).
- `src/components/store/pim/products/catalog/catalog-toolbar.tsx`, `store-catalog-page.tsx` -- место переключателя региона.
- `src/components/store/pim/pricelists/pricelists-toolbar.tsx` (+ контроллер, где живёт `regionId` / `REGION_QUERY_PARAM`) -- заменить Select на общий переключатель; URL `?region=` сохранить.
- `src/features/logistics/stock-product-matrix.ts`, `allocation-atlas.ts` -- существующие определения: «в производстве» = строки выпусков в `draft`, «в пути» = остатки на местах `transfer`; легаси-остатки на местах `production_order` не считаются.
- `src/components/store/pim/products/detail/*` -- демо-карточка: образцы `VariantCard`, `VariantAttributes`, `ProductBasicInfo`, `VariantMenu`; не менять, переиспользовать разметку/подкомпоненты.
- `app/store/pim/products/[productId]/page.tsx` -- ветвление demo/logistics; logistics-ветку заменить новой карточкой по `store_product.id`.
- `src/features/logistics/catalog-pages.tsx` (`ProductDetailPage`), `logistics-availability.ts` (`hrefForProduct` → `hrefForStoreProduct(variantId)`) -- все ссылки на товар идут с id варианта.
- `src/features/logistics/regions-page.tsx`, `logistics-api.ts` (`updateRegion`) -- диалог региона: добавить выбор хаба.
- `src/components/ui/popover.tsx` -- база для комбобокса (готового Command/Combobox нет).
- `supabase/migrations/` -- новые миграции через MCP `oryx-supabase` `apply_migration`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_store_region_hub_and_variant_stock.sql` -- колонка `store_region.hub_warehouse_id` (FK, проверка `kind = 'hub'` триггером), `store_update_region(p_id, p_name, p_hub_warehouse_id)`; read-RPC `store_variant_stock_facts()` → плоские строки `{variantId, warehouseId, bucket: free|region|order|production|transit, regionId|null, quantity}` (склады hub/plant по `store_stock_balance_ref`; путь — по `store_transfer.to_warehouse_id`; производство — строки `draft`-выпусков → завод PO → его склад), grant anon.
- [x] `supabase/migrations/<ts>_store_demo_hubs_variants_stock.sql` -- демо-сид через штатные RPC: ещё 3 хаба и привязка всех 10 регионов (Dubai Hub — ae, om, in); ~12 товаров получают 2–6 вариантов (цвет/комплектация) с ценами и статусами по всем регионам, 1–2 архивных (`deleted_at`); корректировки прихода на хабы и заводы, резервы под регионы, 1–2 перемещения в пути, запланированные выпуски — чтобы у многих вариантов были ненулевые Готово/Всего.
- [x] `src/features/store/variant-stock.ts` -- чистая функция `computeVariantRegionStock(facts, variantId, region)` → `{ready, total, rows[]}`; единственный расчёт для каталога и карточки. Загрузчик фактов.
- [x] `tests/unit/variant-stock.test.ts` -- матрица: нет хаба, резерв другого региона, путь/производство, чужой хаб, нули скрыты.
- [x] `src/features/store/region-context.ts(x)` -- хук `useSelectedRegion()` (localStorage `store-selected-region`, код региона, валидация по списку, синхронизация между вкладками) + загрузчик регионов с валютами и кодом хаба.
- [x] `src/components/store/region/region-switcher.tsx` -- поиск-комбобокс на Popover: строка `KZ · CNY/KZT · WH-3` + название; управляемое открытие (для кнопки заглушки).
- [x] `src/components/store/stock/variant-stock-summary.tsx` -- кнопка «Готово N · Всего M» + поповер-таблица детализации.
- [x] Каталог (файлы из Code Map) -- переключатель в тулбаре, цены/статусы/запасы по региону, заглушки.
- [x] Прайс-листы -- общий переключатель вместо Select, общее значение с `?region=`; без сохранённого значения — прежний регион по умолчанию, в localStorage не пишется до выбора пользователем.
- [x] `src/features/store/product-card/*` + `app/store/pim/products/[productId]/page.tsx` + `app/store/pim/variants/[variantId]/page.tsx` -- новая карточка по `store_product.id` c `?variant=`; маршрут варианта редиректит на карточку товара; `hrefForStoreProduct(variantId)` ведёт на маршрут варианта; каталог ссылается сразу на `/store/pim/products/{productId}?variant={id}`. Левая колонка: шапка, вкладки Info/Description/Meta/Docs, «Варианты N» (добавить через `store_create_product_variant(p_product_id)`, «Показать архивные», поиск, двухстрочные строки). Правая панель — выбранный вариант (фото, название, статусы, код `PRD-n`, единица, цены, «Готово · Всего», вкладки). Переключатель региона — в строке с хлебными крошками.
- [x] `src/features/logistics/regions-page.tsx`, `logistics-api.ts` -- выбор хаба (коды) в диалоге региона, колонка «Хаб» в списке.
- [x] `docs/features/` (каталог/logistics) -- описать контекст региона, Готово/Всего, карточку.

**Acceptance Criteria:**
- Given выбран регион в каталоге, when открыть карточку товара и прайс-листы, then там выбран тот же регион, и наоборот.
- Given товар с 4 вариантами, when кликнуть вторую строку списка, then меняются вся правая панель и `?variant=`, а открытие этой ссылки в новой вкладке показывает тот же вариант.
- Given клик по «Готово · Всего» в строке каталога, when открылся поповер, then переход на карточку не происходит, а сумма «Свободно + Резерв всего + В производстве + В пути» по строкам равна «Всего».
- Given регион с хабом WH-n, when открыть детализацию, then первая строка — WH-n, названий складов нет нигде.

## Design Notes

Факты запасов не зависят от региона — грузятся один раз, регион применяется на клиенте; переключение региона мгновенное. Цены и статусы тоже грузятся по всем регионам сразу (207+ вариантов × 10 регионов — приемлемо для демо).

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images && npm test` -- expected: всё зелёное.

**Manual checks (if no CLI):**
- Браузер: каталог без региона → заглушки; выбор KZ → цены с валютами и Готово/Всего; поповер детализации; карточка многовариантного товара, переключение, `?variant=`, архивные, диалог добавления варианта (проверять до отправки; если отправлен — только осмысленный демо-вариант, никаких TEST); прайс-листы Global/Supplier.

## Implementation Notes

- Миграции применены к демо-БД через MCP `oryx-supabase`: `20260928122941_store_region_hub_and_variant_stock.sql`, `20260928123053_store_demo_hubs_variants_stock.sql`. Хабы: WH-1 (ae, in, om), WH-44 (ru, kz, by, uz), WH-45 (mx, us), WH-46 (de). 12 товаров с 2–6 вариантами, 2 архивных.
- PostgREST стенда отдаёт не больше 1000 строк (`content-range: 0-999/4956` у цен). Добавлен `src/lib/supabase/fetch-all-rows.ts`; через него читаются цены и статусы (`loadRegionPricing`, общий для каталога и карточки), прайс-листы и факты запасов. Прежний загрузчик прайс-листов тоже терял строки — исправлен заодно.
- Выбранный регион читается через `useSyncExternalStore` (серверный снимок `null`), без чтения localStorage в инициализаторе `useState`.
- Прайс-листы: `?region=` открытой ссылки главнее общего значения при первой синхронизации; `RegionSwitcher` управляемый (`value`/`onValueChange`), чтобы показывать регион таблицы и сбрасывать страницу.
- Карточка: строка варианта — `div` со скрытой кнопкой выбора и отдельной кнопкой «Готово · Всего» поверх (без вложенных `<button>`); выбранный вариант берётся из всех вариантов, поиск только фильтрует список; архивный вариант из ссылки виден в списке. Без региона — одна заглушка в правой панели и одна над списком. Вкладка «Инфо» — бренд, семейство, категории из БД.
- Редиректы `/store/logistics/products/[id]` и `/logistics/products/:id` ведут на `/store/pim/variants/[id]` (параметр — id варианта).
- Чистые функции для матрицы: `resolveCatalogItemForRegion` (`catalog-region.ts`), `resolveSelectedRegionCode` (`region-selection.ts`), `resolveSelectedVariant` (`product-card/variant-selection.ts`); тесты — `tests/unit/store-region-context.test.ts`.
- Проверки: typecheck, build, check:docs, check:static-images зелёные; lint (4 ошибки в tracker/comments), check:deps (устаревшие пакеты) и тест `document-timeline` падают и на базовом коммите `8d7fceb` — не связаны с задачей.
- Браузер (localhost:3100): заглушки без региона; KZ → цены с валютой, статусы, «Готово 13 · Всего 85» у PRD-1 совпадает с фактами БД; поповер не уводит на карточку, сумма колонок = Всего, WH-44 первой строкой; карточка товара 4 — переключение на PRD-215 меняет панель и `?variant=`; архивные; поиск не меняет выбор; `/store/pim/variants/4` → `/store/pim/products/4?variant=4`; прайс-листы: `?region=ae` при сохранённом kz показывает AE, выбор DE пишет `de` и в URL, на Global переключатель скрыт; регионы — колонка «Хаб», диалог показывает WH-44. Диалог добавления варианта не отправлялся — записей в БД не создано.
- Матрица: строка «Прайс-лист без региона» — чистое условие `scopeHasRegion` в тулбаре, проверена в браузере (модуль `pricelists-demo-data` тянет статические картинки и не грузится в `node:test`).

## Spec Change Log

## Review Triage Log

Проход 1 (blind-hunter, edge-case-hunter, verification-gap).

| # | Находка | Вердикт | Доказательство | Маршрут |
|---|---------|---------|----------------|---------|
| 1 | Фильтры и опции статусов каталога берут заглушки `unavailable`/`draft`, а не статусы региона (все три слоя) | medium | `use-catalog-controller.ts:95-129` фильтрует `sourceItems` до `resolveCatalogItemForRegion`, которое вызывается только в `CatalogTable` | patch |
| 2 | Ошибка RPC фактов запасов опустошает весь каталог / карточку | medium | `Promise.all([loadDbCatalogItems(), loadVariantStockFacts()])` → `catch` → `setDbItems([])`; в карточке — экран ошибки | patch |
| 3 | Сбой загрузки регионов (или Supabase не настроен) стирает сохранённый регион из localStorage | medium | эффект в `region-context.tsx` пишет `null`, когда код не в пустом `validCodes` | patch |
| 4 | Пока регионы грузятся, «Готово —» и «У региона не задан хаб» у регионов с хабом | low | `catalog-table.tsx`: при `regionId = null` вызывается `computeVariantRegionStock(..., null)` → `missingHub`; бывает на каждой загрузке, исправление прямое | patch |
| 5 | `popstate` в прайс-листах пишет регион из URL в общее значение, хотя URL мог получить регион по умолчанию | low | `pricelists-page.tsx`: `syncUrl` кладёт регион по умолчанию в URL, `handlePopState` вызывает `setSelectedRegionCode(fromUrl)`; расходится со спекой «не пишется до выбора» | patch |
| 6 | Диалог региона: сохранение до загрузки хабов или при ошибке их чтения стирает хаб | medium | `loadRegionHubMap` игнорирует `error`; `hubWarehouseId` = "" до загрузки → `updateRegion(null)`; сеть стенда отвечала 30–85 с | patch |
| 7 | `store_update_region` без `p_hub_warehouse_id` обнуляет хаб | low | единственный вызов (`updateRegion`) передаёт хаб; двухаргументных вызовов нет — закрывается пунктом 6 | reject |
| 8 | Хаб можно удалить/сменить ему `kind`, регион останется на нём | low | нет guard на `store_warehouse`; в UI смена типа хаба редка, исправление — новый триггер | reject |
| 9 | Демо-сид не идемпотентен, жёсткие id, затенение `v_i` | low | миграция выполняется один раз; данные проверены SQL (12 товаров, 2 архивных, привязки) | reject |
| 10 | `limit N` после `jsonb_agg` в сиде не действует | low | верно, резервов и перемещений больше задуманного; данные демо корректны, миграция уже применена | reject |
| 11 | `LogisticsRegion.hubWarehouseId` добавлен, но не заполняется | low | поле нигде не читается; прямое удаление | patch |
| 12 | `statusBadgeClassMap` расширен до `Record<string,string>` — пропуск статуса не ловится компилятором | low | прямая правка типа | patch |
| 13 | Нет теста `fetchAllRows` (граница 1000, ошибка на 2-й странице) | gap | подтверждено поиском в `tests/` | patch |
| 14 | Нет тестов ссылок `hrefForStoreProduct` / `redirectLegacyLogisticsPath` | gap | подтверждено; `logistics-paths.ts` без импортов — тестируется в `node:test` | patch |
| 15 | Маппинг `loadRegionPricing` не покрыт | gap | завязан на клиент Supabase | defer |
| 16 | Приоритет `?region=` в прайс-листах не покрыт тестом | gap | логика в эффектах, стенда компонентных тестов нет; проверено в браузере | defer |
| 17 | Без Supabase каталог без цен | false | без Supabase `loadDbCatalogItems` → `[]`, список пуст и до изменения; демо `bike-*` в каталог не попадают | reject |
| 18 | Прайс-лист показывает цены региона по умолчанию, а каталог — заглушку | false | так решено в спеке (прайс-листы: «прежний регион по умолчанию») | reject |
| 19 | Общий регион, которого нет в `FALLBACK_REGIONS`, сворачивается в `ae` | maybe-false | в БД те же 10 кодов, что в fallback; сработает только для нового региона; было бы low | reject |
| 20 | `RegionProvider` не перечитывает хабы после правки региона | low | смена хаба редка; исправление добавляет API контекста | reject |
| 21 | Ошибка `store_product_category` молча даёт «—» | low | второстепенное поле; падение карточки хуже | reject |
| 22 | Карточка грузит факты запасов всего каталога; пересчёт на каждый рендер | low | ~210 строк фактов, 48 строк на странице — незаметно; исправление добавляет параметр RPC | reject |
| 23 | Общий `switcherOpen` откроет все переключатели; a11y комбобокса | low | на странице один переключатель; стрелочная навигация — доработка, не дефект | reject |
| 24 | Редирект варианта без сообщения; удалённый товар | low | редкий путь, исправление — новое состояние | reject |
| 25 | Гонка `reload` в карточке при смене товара | low | нужен токен запроса; переход между карточками товара редок | reject |
| 26 | Карточка без архивации/переименования; новый вариант без цен | false | вне намерения («как на бою»: добавить, архивные, поиск); цены не выдумываются по спеке | reject |
| 27 | `formatPrice` по умолчанию USD | false | цены из БД всегда с валютой; USD остаётся только у демо `bike-*`, как до изменения | reject |
| 28 | Новая колонка не видна пользователям с сохранёнными колонками | low | смена ключа сбросит все настройки колонок | reject |
| 29 | `useLogisticsStore` дёргается с пустым `variantId` до загрузки | low | один лишний запрос с ошибкой до появления варианта; вкладка показывает данные после загрузки | reject |
