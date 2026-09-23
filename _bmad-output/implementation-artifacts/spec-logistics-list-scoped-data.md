---
title: 'Страницы логистики загружают только свои данные'
type: 'refactor'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'ca57061444d5674a6460becfd4c15f59e611d381'
context:
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Каждая страница логистики через `useLogisticsStore()` грузит полный `LogisticsSnapshot` — все таблицы Store (раньше ~21 REST-запрос, сейчас временно один RPC `store_logistics_snapshot` ~200 КБ), даже если список показывает одну таблицу документов. Пользователь отклонил «гигазапрос»: каждая страница должна запрашивать свой набор данных.

**Approach:** Каждая страница и каждый диалог создания получают из БД только свои данные одним запросом.

**Decisions (2026-09-23):**
- Списки документов: серверная read-модель на каждый список (RPC), один запрос возвращает готовые строки таблицы; «Занято / Отгружено / Открыто к резерву» и остатки считаются в SQL.
- Диалоги «Создать …» сами догружают свои данные при открытии.
- Детальные страницы переводятся в этой же задаче: серверный RPC на страницу возвращает только этот документ/место/товар, его строки, связанные документы и проводки его товаров; существующая клиентская логика (покрытие, связанные, отмена, доступность) считает по этому срезу.
- Одна спека на всё (без разбиения), риск объёма принят.

## Boundaries & Constraints

**Always:** Числа и подписи на страницах не меняются (коды мест вместо названий по `place-codes.md`). Скелетон `LogisticsLoading` виден до прихода данных — на странице и внутри диалога. Браузер ходит только с anon-ключом; чтение — только read-RPC/`select`, запись — существующие RPC. После действия страница перезагружает только свой набор.

**Never:** Не менять RPC записи и таблицы baseline. Не добавлять кэш-библиотеки. Не оставлять тестовых строк в демо-БД. Не оставлять загрузчика полного снимка.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Список открыт | любой список | 1 запрос к своему RPC; таблица как раньше | ошибка → `LogisticsError` |
| Пустой список | нет документов | пустое состояние `LogisticsTableCard` | — |
| Заказ без строк | order без lines | Товары «—», Занято/Отгружено/Открыто = 0 | — |
| Детальная по номеру или id | `/customer-orders/12` | RPC находит по `sequence_number` или `id` | не найден → «… не найден.» |
| Диалог открыт | клик «Новый …» | 1 запрос `store_form_context`, скелетон в диалоге | ошибка → `LogisticsError` в диалоге |
| После создания | успешный RPC записи | перезагрузка списка (1 запрос) | toast как сейчас |

</frozen-after-approval>

## Code Map

- `src/features/logistics/logistics-api.ts` `loadLogisticsSnapshot` -- сейчас один RPC + сборка снимка; сборку вынести в чистую `mapLogisticsPayload`. Карты `locEntity` (warehouse/customer_order/production_order/transfer → stock_location_id) и `ownerEntity` (free / customer_order / region) требуют заголовков этих трёх видов документов и справочников; `attachDoc` падает, если у подтипа нет строки `store_document`. `loadLogisticsSettings` оставить (настройки, PIM).
- `src/features/logistics/use-logistics-store.ts` -- хук, `balances = computeStockBalances(transactions)`.
- `logistics-balances.ts` -- формулы: reserved = остаток, где владелец = заказ (location ≠ customer_order); shipped = остаток на location customer_order с владельцем-заказом; `remainingToReserveForLine = max(0, qty − shipped − reserved)`. `derivedStockState` в `logistics-types.ts`: location customer_order → shipped; owner free → free; иначе reserved.
- `logistics-codes.ts` `formatLogisticsCode` -- коды каталогов (PRD/PLT/WH/REG) фиксированы и считаются на клиенте из id; номера документов = `number_prefix-sequence_number` из `store_document_kind`.
- Списки: `customer-orders-page.tsx`, `production-orders-page.tsx`, `transfers-page.tsx`, `flow-documents-pages.tsx` (`ShipmentsPage`, `OutputsPage`, `AdjustmentsPage`, `DocumentList`), `reservations-page.tsx`, `stock-page.tsx`, `ledger-page.tsx`, `catalog-pages.tsx` (`WarehousesPage`, `PlantsPage`), `regions-page.tsx`.
- Ячейки со `snapshot`: `ui/document-product-lines.tsx` (snapshot только для fallback имени/ед.), `ui/reservation-hold-list.tsx` (`OwnerBadge`, `LocationLink`, `ProductIdentity`), `ui/location-link.tsx`, `ui/product-identity.tsx`, `ui/plant-link.tsx`, `ui/warehouse-link.tsx`.
- Диалоги создания: инлайн в `CustomerOrdersPage`, `ProductionOrdersPage`, `OutputsPage`; компоненты `TransferCreateDialog`, `ShipmentForm`, `ReservationForm`, `AdjustmentForm` (`logistics-forms.tsx`, `ui/transfer-create-dialog.tsx`).
- Детальные: `*DetailPage` в тех же файлах + `catalog-pages.tsx` (склад, завод, товар), `regions-page.tsx`; PIM `app/store/pim/products/[productId]/page.tsx` монтирует `ProductDetailPage`.
- `supabase/migrations/20260923110000_store_logistics_snapshot.sql` -- временный RPC, применён в демо-БД; удалить файл, функцию дропнуть.
- Тесты со своим `LogisticsSnapshot`: `logistics-cancel-guidance`, `logistics-unified-shipment`, `universal-document-lines`, `logistics-stock-adjustment` — не ломать.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260923120000_store_page_read_models.sql` -- `drop function if exists store_logistics_snapshot()`; views `store_location_ref`, `store_owner_ref`, `store_stock_balance_ref` (security_invoker, select anon); list RPC `store_{customer_order,production_order,transfer,shipment,output,adjustment,reservation}_list()`, `store_stock_page()`, `store_ledger_page()`; context RPC `store_document_context(p_kind, p_ref)`, `store_place_context(p_kind, p_id)`, `store_product_context(p_variant_id)`, `store_form_context(p_form)` поверх внутреннего `store_context_payload(variant_ids, document_ids)`; grants только на публичные. Применить в демо-БД, `notify pgrst`.
- [x] `supabase/migrations/20260923110000_store_logistics_snapshot.sql` -- удалить.
- [x] `src/features/logistics/logistics-list-types.ts` -- типы строк списков.
- [x] `src/features/logistics/logistics-api.ts` -- `mapLogisticsPayload` (все ключи необязательны, `balances` из payload пробрасываются); загрузчики списков, контекстов, форм, каталогов; удалить `loadLogisticsSnapshot`.
- [x] `src/features/logistics/use-logistics-store.ts` -- `useLogisticsStore(source)` (document / place / product / form + `enabled`, stock, ledger) и `useLogisticsList(loader)`.
- [x] Списки (файлы выше) -- рендер из строк RPC; фильтры/сортировки на клиенте по полям строк.
- [x] Диалоги создания -- данные через `useLogisticsStore({ kind: "form", form, enabled: open })`; инлайн-диалоги вынести в компоненты.
- [x] Детальные страницы и PIM-деталь -- свой контекст по параметру маршрута.
- [x] `ui/document-product-lines.tsx`, `ui/reservation-hold-list.tsx` (+ presentational `LocationLink`/`ProductIdentity`-варианты) -- принимать готовые подписи; вызовы на детальных резолвят их из снимка.
- [x] `tests/unit/logistics-payload-mapper.test.ts` -- маппер: пустой payload, частичный payload, проброс balances, номер документа.
- [x] `docs/features/logistics.md` -- раздел «Загрузка данных»: какой RPC у какой страницы.

**Acceptance Criteria:**
- Given любая страница или диалог логистики, when открыта, then в Network ровно один запрос чтения Supabase, и нигде не грузится полный снимок.
- Given демо-данные, when сравнить до/после, then у всех заказов клиента Занято/Отгружено/Открыто к резерву, у остатков — матрица, у журнала — число фактов совпадают со старым расчётом.
- Given детальная страница, when выполнить действие (резерв, отгрузка, закрытие, отмена), then страница перезагружает свой контекст и показывает результат.

## Implementation Notes

- Публичные read-RPC — `SECURITY DEFINER`: они вызывают внутренние помощники без grant для anon; читают только таблицы, доступные anon через `select`.
- Контекст заказа клиента / на производство / перемещения и склада / региона дополнительно включает документы, привязанные к их месту хранения и владельцу (`store_place_scope`), — иначе терялись резервы на заказ по чужим товарам.
- Списки складов / заводов / регионов: отдельный `store_catalog_page()` (склады, заводы, регионы, префиксы, ~8 КБ) вместо `store_stock_page()` с остатками. Неиспользуемый маршрутами `ProductsPage` перешёл на `store_stock_page()`.
- Фильтры статусов заказов клиента и перемещений сопоставлены с фактическими статусами БД (`in_progress`/`done`); действия на детальной заказа клиента доступны для `in_progress`.
- Известный дефект до изменения сохранён (подписи не менять): строки резерва несут сырой `from_owner_id`, поэтому резерв из свободного остатка показывается как «Переназначение» с источником «1».
- Матрица: UI-строки (1 запрос, скелетон, перезагрузка) проверены в браузере — в репозитории нет DOM-тестов; строки маппинга — `tests/unit/logistics-payload-mapper.test.ts`; SQL-строки (заказ без строк → 0, поиск по номеру и id, не найден) — прямыми запросами к демо-БД.
- `lint`: 8 ошибок — те же, что на baseline, вне затронутого кода. `check:deps` падает только на устаревших установленных пакетах.

## Review Triage Log

| # | Находка | Вердикт | Доказательство | Маршрут |
|---|---------|---------|----------------|---------|
| 1 | Добавление строки и follow-up форма на детальной резерва ограничены товарами контекста | medium | Диалог брал `snapshot` детального контекста; у черновика без строк товаров нет | patch |
| 2 | `store_document_context` / `matchDocumentParam` предпочитают id, ссылки — sequence | low | Коллизий в данных нет, но id общий для всех видов | patch |
| 3 | `useLogisticsList` без защиты от гонки ответов | low | Нет `requestRef`, в отличие от `useLogisticsStore` | patch |
| 4 | Устаревшая ошибка видна вместе со скелетоном в инлайн-диалогах | low | `error` не сбрасывался при новом запросе | patch |
| 5 | «Чистый» маппер меняет глобальные префиксы, сбрасывает их при payload без kinds | low | `setActiveLogisticsCodePrefixes` вызывался всегда | patch |
| 6 | Нет fallback имени товара в `store_product_lines_json` | low | Списки без снимка покажут id при пустом `variant_name` | patch |
| 7 | Маппинг балансов проверен только на свободном владельце | low | Тест с одним free-рядом, `location_entity_id = stock_location_id` | patch |
| 8 | `as never` в сортировке, мёртвый `visibleCustomerOrders` | low | Единственный вызов удалён | patch |
| 9 | Документ не упоминает новую миграцию | low | Раздел «Миграция» — только baseline | patch |
| 10 | Сырой `from_owner_id` в строках резерва и `fromOwnerNumber` по неверному ключу | medium | RSV-905: источник «85» вместо OMS-904; старый маппер давал то же | defer |
| 11 | Проверки `open`/`sent`/`delivered` против `in_progress`/`done` | medium | Пикеры заказов пусты и до задачи; статусы в БД только lifecycle | defer |
| 12 | Уменьшение показывается как списание | low | Тот же вывод по знаку в старом маппере | defer |
| 13 | Нет тестов SQL read-RPC | medium | В репозитории нет харнесса Postgres | defer |
| 14 | `npm test` не в проверках `AGENTS.md` | low | Правка агентских файлов | defer |
| 15 | Фиктивный фильтр статусов корректировок | false | Старый маппер тоже ставил `posted` всем; других статусов нет | reject |
| 16 | `found` проверяется только на двух детальных | false | Остальные показывают «не найден» по отсутствию документа в payload | reject |
| 17 | Три способа загрузки в диалогах, ремаунт перемещения | low | Косметика, заметить сложно | reject |
| 18 | `store_form_context` игнорирует `p_form` | false | Один контекст форм — решение Design Notes | reject |
| 19 | Журнал грузит все факты | false | Журнал по назначению показывает все проводки | reject |
| 20 | Корректировка не на складе → пустой бейдж | false | Корректировки создаются только по складу | reject |
| 21 | `plantId` «null», завод без склада | low | `plant_id`/`warehouse_id` заполнены у всех строк демо; маловероятно | reject |
| 22 | Место резерва `customer_order` | false | Резерв не бывает на локации заказа клиента | reject |
| 23 | Черновики/отменённые заказы вне вкладок | low | В БД только `in_progress`/`done` | reject |
| 24 | Отменённые резервы не фильтруются | false | Список резервов не показывает вкладку «Отменён» | reject |

## Design Notes

Context payload — ключи прежнего снимка (`documents`, `document_kinds`, `product_variants`, `warehouses`, `plants`, `regions`, `stock_locations`, `stock_owners`, заголовки подтипов, `document_product_lines`, `stock_transactions`, `document_history`, `users`) + необязательный `balances` (строки `StockBalance` из `store_stock_balance_ref`). `store_context_payload(P, D0)`: справочники целиком (малы); заголовки customer/production order и transfer целиком (нужны картам); D = D0 ∪ документы со строками по P ∪ документы проводок по P; строки и история — только D; проводки — только по P (полный баланс товаров P); варианты — P ∪ товары строк D. P по страницам: документ — товары его строк; склад — товары проводок на его локации; регион — товары проводок его владельца; завод — `plant_id` + проводки его склада; товар — {id}. `store_form_context`: без проводок, `balances` целиком, строки только открытых заказов клиента и активных заказов на производство с их выпусками.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm run test && npm run build` -- без ошибок
- `npm run check:deps && npm run check:docs && npm run check:static-images` -- без ошибок

**Manual checks:**
- Браузер: все списки, 2–3 детальные, диалоги создания — один запрос, скелетон пульсирует, числа как до изменения. Временный скрипт сравнения (вне репозитория) — старый расчёт по полным таблицам против новых RPC.
