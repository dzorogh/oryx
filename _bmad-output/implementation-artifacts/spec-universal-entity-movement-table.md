---
title: 'Универсальная таблица движений и факты журнала'
type: 'feature'
created: '2026-09-21'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '03c0bb40b9f48a25ebd7e25eebd48b1da0b8cae7'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/ui/english-labels.md'
  - '{project-root}/_bmad-output/brainstorming/brainstorm-universal-entity-movement-table-2026-09-20/brainstorm-intent.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiate">

## Intent

**Problem:** Карточная таблица движений режет историю 16 строками и показывает технические колонки (состояние, source_type, сторно), из-за которых нельзя быстро понять, сколько товара изменилось, где, за кем закреплено и каким документом. Журнал дублирует поля родителей, а отмена проведённых документов пишет сторно.

**Approach:** Журнал хранит только факты изменения остатков. Документы держат текущие `status`/`expected_end_on` и пишут снимки в общую `document_history`. Универсальная таблица показывает Time / Change / Product / Location / Assigned to / Document, скрывает колонку родителя, стартует с последних 20 строк и даёт явный total с пагинацией.

## Boundaries & Constraints

**Always:**
- Строка журнала: `id`, `created_at`, `product_id`, знаковое `quantity ≠ 0`, `location_type` (`warehouse|production_order|transfer|customer_order`) + `location_id`, `assigned_to_type` (`order|region`) + `assigned_to_id` (оба null = свободно, иначе оба заданы), `document_type` (`reservation|shipment|return|transfer|production_order|output`) + `document_id`.
- Для `location_type=customer_order` всегда `assigned_to_type=order` и тот же заказ.
- Одна транзакция = один товар. Направление только знаком `quantity`.
- Журнал и проведённые складские документы неизменяемы. Исправление — новый предметный документ, не правка и не сторно.
- Дубли товара в строках заказа на производство допустимы. Место журнала — сам `production_order`; одинаковые товары внутри PO дают одну позицию остатка.
- Есть demo-справочник пользователей; `created_by` документа и `document_history` ссылаются на него и заполняются у существующих и новых записей. Текущий автор — один зашитый demo-пользователь (как сотрудник в Pulse). Логина и переключателя актёра нет.
- Документ хранит текущие `status`, `expected_end_on`, `created_at` и `created_by`. Каждое создание и каждая смена статуса или плановой даты атомарно добавляет снимок в `document_history`: `id`, `document_type`, `document_id`, `event_type`, `status`, `expected_end_on`, `created_at`, `created_by`.
- Основная таблица скрывает уже заданную родителем колонку: Product / Location / Assigned to / Document. Raw type/id и `id` транзакции — только в раскрываемых системных деталях строки.
- На карточке заказа или региона таблица показывает все факты документов, у которых есть хотя бы одна нога с `assigned_to` этой сущности — включая парную Free/другую ногу того же документа.
- Первая страница — последние 20 фактов; виден total; остальные страницы доступны без потери строк.
- UI-тексты таблицы и журнала — English.
- Миграция живых данных: итоговые остатки по товару+месту+назначению совпадают с до-миграционными (без `stock_state`). Live: 157 проводок, 0 сторно, 0 нулевых qty, `occurred_at=posted_at`, нет дублей товара в PO.

**Never:**
- Не оставлять `transaction_id`, `occurred_at`, `posted_at`, `unit`, `stock_state`, `source_*`, `operation_id`, `idempotency_key`, `reverses_transaction_id`, сторно-RPC/UI/колонку.
- Не создавать справочник `stock_location`.
- Не копировать в журнал название/SKU/единицу товара и бизнес-поля документа.
- Не хранить в журнале автора. Не держать на документе `posted_at`/`sent_at`/`done_at`/`closed_at`/`cancelled_at` и акторов lifecycle.
- Не отменять и не сторнировать проведённые shipment, return, output и sent transfer.
- Не добавлять login/auth. Не писать в Capacity, YNAPB или cloud Supabase.
- Не сбрасывать демо-данные. Не оставлять TEST/dummy строки.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reserve | posted RSV, qty с Free на order | Два факта: −qty `assigned_to=null`, +qty `assigned_to=order`; `document_type=reservation` | Нет проводки при отказе RPC |
| Ship | posted shipment | −qty warehouse reserved, +qty `location=customer_order` + `assigned_to=order`; `document_type=shipment` | Отказ без фактов |
| Posted cancel | Cancel на posted shipment/return/done output/sent transfer | Кнопка и RPC отсутствуют; документ и факты не меняются | Ошибка, если вызвать старый cancel |
| Correction | Ошибка уже проведённого документа | Новый предметный документ с новыми фактами | Старые факты не правятся |
| Card page | >20 фактов на карточке | Страница 1: 20 новейших; total; pager на всю историю | Пустой набор — таблица скрыта |
| Hide column | Карточка товара / склада / заказа / RSV | Нет колонки Product / Location / Assigned to / Document | Остальные колонки на месте |
| Order card legs | RSV-10: −10 Free и +10 OMS-12 | На OMS-12 видны обе строки, колонка Assigned to скрыта | Не фильтровать только `assigned_to=order` |
| Status change | Смена status или `expected_end_on` | Документ и новая `document_history` в одной транзакции | Откат обоих при ошибке |
| History backfill | Существующие документы с lifecycle-датами | Снимки `created` + актуальный status; даты берутся из старых timestamp до drop | Миграция стоп при дыре |
| Balance migrate | 157 живых фактов | Суммы по product+location+assigned_to равны до/после; `production_order_line` → parent PO | Миграция стоп при расхождении |
| Zero qty | Попытка записать 0 | Запись запрещена | CHECK / RPC error |
| Assigned pair | Только type или только id | Запись запрещена | CHECK |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260919010000_store_owner_reservations.sql` -- живые `store_write_tx` / `store_move` / post/cancel/reverse и `store_stock_balance`.
- `supabase/migrations/20260920122000_store_transfer_direct_send.sql` -- `store_create_and_send_transfer` / send.
- Позднейшие `store_*` migrations -- close PO/OMS, activation, output; не читать prefix/integer-id как контракт.
- `src/features/logistics/logistics-types.ts` -- `StockTransaction`, `StockBalance`, `LOCATION_TYPES`, `SOURCE_TYPES`, `OWNER_TYPES`, document timestamps.
- `src/features/logistics/logistics-balances.ts` -- `computeStockBalances` / `balanceKey` сейчас включает `stockState`.
- `src/features/logistics/logistics-api.ts` -- `mapTransaction`, snapshot, `cancelDocument`.
- `src/features/logistics/logistics-rules.ts` -- `assertDocumentCanBeCancelled` / `IRREVERSIBLE_DOCUMENT_KINDS`.
- `src/features/logistics/ui/document-ledger.tsx` -- карточная таблица, `.slice(0, 16)`.
- `src/features/logistics/ledger-page.tsx` -- полный журнал, колонка Сторно, фильтр source_type.
- Call sites `DocumentLedger`: `catalog-pages.tsx` (product/warehouse/manufacturer), `customer-orders-page.tsx`, `regions-page.tsx`, `production-orders-page.tsx`, `reservations-page.tsx`, `flow-documents-pages.tsx` (shipment/return/output). Transfer: `transfers-page.tsx` + `TransferActivity` — добавить ту же таблицу, скрыть Document.
- `src/features/logistics/logistics-labels.ts`, `logistics-lookups.ts`, `ui/location-link.tsx`, `ui/source-link.tsx` -- подписи и ссылки места/документа.
- `src/lib/pagination.ts`, `src/components/ui/pagination.tsx` -- pager как у catalog/thanks.
- `src/features/logistics/logistics-product-matrix.ts`, `allocation-atlas` tests -- `production_order_line` и `stockState`.
- `tests/unit/logistics-balances.test.ts`, `logistics-unified-reservation.test.ts`, `allocation-atlas.test.ts`, `transfer-detail-projection.test.ts`, `transfer-detail-page.test.tsx`, `logistics-related.test.ts`, `stock-product-matrix.test.ts`, `customer-order-lines-table.test.tsx` -- контракт полей журнала и cancel.
- `docs/features/logistics.md` -- канон модели; убрать сторно и `transaction_id`.
- Не менять: line-таблицы документов, stock matrix layout, RelatedDocuments, AvailabilityPanel, кроме полей которые они читают из tx/balance.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260921120000_store_stock_transaction_facts.sql` -- пересобрать журнал и balance view; remap location/document/assigned_to; drop сторно и idempotency в журнале; CHECK + индексы `(product_id, location_type, location_id, assigned_to_type, assigned_to_id)`, `(document_type, document_id)`, `(created_at desc)`; переписать `store_write_tx`/`store_move`/все `store_post_*`/`store_send_transfer`/`store_complete_*`/`store_sync_production_activation`/`store_close_*`; удалить `store_reverse_source` и post-cancel через reverse; идемпотентность = статус документа; Reservation location `production_order`; сверить балансы до/после.
- [x] та же или соседняя migration -- `store_user` + `store_document_history`; хелпер снимка с зашитым current user; backfill авторов и истории из `created_at` + posted/sent/done/closed/cancelled; drop lifecycle timestamp; атомарно обновлять status/expected_end_on вместе со снимком.
- [x] `src/features/logistics/logistics-types.ts` + `logistics-api.ts` + `logistics-balances.ts` + `logistics-rules.ts` -- новые поля; `stock_state` только как derived helper; owner→assigned_to; запрет cancel после проведения.
- [x] `src/features/logistics/ui/document-ledger.tsx` + `ledger-page.tsx` + call sites -- 6 колонок, hide, pager 20, total, English, системные детали; Ledger без сторно, фильтр `document_type`; Transfer detail подключает таблицу.
- [x] `src/features/logistics/logistics-labels.ts` + `location-link.tsx` + `source-link.tsx` + `flow-documents-pages.tsx` + `transfer-detail-header.tsx` -- новые лейблы; убрать Cancel после post; `document` вместо source.
- [x] `tests/unit/*.test.ts(x)` -- матрица I/O, hide/pager, derived state, no reverse, history snapshot, PO location.
- [x] `docs/features/logistics.md` -- факты журнала, assigned_to, document_history, нет сторно.
- [x] Применить migration только к Oryx demo Supabase; сверить балансы; `NOTIFY pgrst`; не оставлять TEST строк.

**Acceptance Criteria:**
- Given живой журнал, when migration applied, then каждая позиция product+location+assigned_to имеет ту же сумму, что до миграции, и `location_type` больше не содержит `production_order_line`.
- Given карточная история, when фактов больше 20, then видны 20 последних, total и переход на любую страницу без потери строк.
- Given карточка товара, склада, заказа/региона или документа, when таблица рендерится, then колонка родителя скрыта; на OMS/region видны и парные ноги того же документа.
- Given новый документ, when он создаётся без login, then `created_by` = зашитый demo-пользователь.
- Given posted shipment или sent transfer, when пользователь ищет Cancel, then действия нет и факты не меняются.
- Given смена status или `expected_end_on`, when RPC успешен, then текущие поля документа и новая строка `document_history` записаны вместе.
- Given UI журнала, when страница открыта, then нет колонок State/Source/Reversal и нет русского заголовка таблицы.

## Implementation Notes

- Маппинг `source_type` → `document_type`: reservation→reservation; shipment→shipment; shipment_return→return; transfer_send|transfer_complete→transfer; production_activation|production_close→production_order; production_output→output.
- `created_at` факта = бывший `posted_at`. `id` = бывший `transaction_id`. `assigned_to_*` = бывшие `owner_*`.
- `production_order_line.location_id` → `store_production_order_line.order_id`.
- Derived state только для старых читателей матрицы: null assigned_to → free; assigned_to задан и location≠customer_order → reserved; location=customer_order → shipped.
- CHECK на enum-типы; полиморфных FK/trigger-крепости нет (прототип). Журнал по-прежнему пишет только RPC.
- Системные детали — раскрываемая строка: raw type/id и `id` факта.
- Transfer detail: таблица с скрытым Document, `TransferActivity` оставить.
- `event_type`: `created` | `status_changed` | `expected_end_changed`.
- History documents: reservation, shipment, return, transfer, production_order, output, customer_order.
- Pager: `buildPaginationItems` + существующий pagination footer pattern.
- PO: UNIQUE по товару не добавлять; две строки одного товара — один bucket `production_order` + product + assigned_to.
- Пользователи: `store_user` без auth; current user зашит константой и тем же id уходит в RPC; backfill существующих документов этим пользователем.
- Карточка order/region: фильтр = все `document_id`, у которых есть факт с `assigned_to` этой сущности.
- Live после migration: 157 фактов; места warehouse 87 / production_order 58 / transfer 6 / customer_order 6; 0 `production_order_line`; `store_reverse_source` нет; журнал только id/created_at/product/qty/location/assigned_to/document; shipment без posted_at/cancelled_at; 201 history, 5 store_user.
- Матрица I/O закрыта `tests/unit/stock-journal-facts.test.tsx` + cancel-кейсы в `logistics-balances.test.ts` / `transfer-detail-page.test.tsx`.

## Spec Change Log

## Review Triage Log

- high — DocumentDetail фильтрует только `documentId`: на SHP-1/RSV-1 с одним integer id смешиваются факты. Подтверждено в `flow-documents-pages.tsx`.
- medium — PO Movements скрывает Document при смеси production_order/output/reservation. Подтверждено в `production-orders-page.tsx`.
- false — users/documentHistory не рисуются: таблица движений не должна показывать автора; отдельный history UI в intent нет.
- high — `seed-logistics-stories.mjs` всё ещё пишет `production_order_line`; RPC это отклоняет.
- low — `cancelDocument` без status считает документ posted. UI больше не вызывает cancel после post; helper расходится с RPC.
- medium — `assertDocumentCanBeCancelled` знает `shipment_return`/`production_output`, но не `return`/`output`.
- low — фильтр класса на Ledger без совпадений даёт пустую страницу: `DocumentLedger` возвращает null.
- medium — клик по Product/Location/Document также раскрывает системные детали: `onClick` на всей строке.
- low — раскрытие без клавиатуры/`aria-expanded`. Фикс шире прямой правки.
- false — `locationKindLabel` по-русски: таблица журнала его не использует (`showKind` выключен).
- low — пункт меню «Журнал» при английском заголовке Ledger.
- low — transfer insert draft затем sent даёт history `created=draft`; backfill писал `sent`. Нет UI истории, пользователи не встречают.
- false — открытый RLS у `document_history`: spec явно без trigger-крепости на прототипе.
- medium — `StockBalance` несёт и `owner*` и `assignedTo*`: читатели могут остаться на старой паре.
- low — fallback `line.id` в `productionLineReservationBreakdown`: живые строки имеют `orderId`.
- false — фильтр Ledger не в URL: intent этого не требовал.
- high — edge: тот же documentId-only фильтр на карточке shipment/return.
- medium — edge: cancel kind `return`/`output` не бросает.
- low — edge: пустой класс-фильтр без empty copy.
- low — одинаковый `createdAt` делает порядок newest-20 нестабильным без tie-break по id.
- medium — edge: клик по ссылке и expand вместе.
- false — reconstruction delivered transfer из plus-ног send: это прежний смысл `transfer_send` после маппинга document_type.
- medium — `productionOrderByLine.get(locationId)` раньше совпадения с PO id: integer id строки и заказа сталкиваются.
- low — story reset не берёт `from_owner`; story id 901–999 всё равно чистит `document_id` диапазоном.
- low — `document_id between 901-999` без типа: это контракт story-диапазона, не баг миграции фактов.
- medium — trigger history: смена status и expected_end_on в одном UPDATE пишет только `status_changed`.
- false — related RSV по line id: live уже переписан на `production_order`; остаток только в seed.
- medium — verification: тесты PO-места всё ещё на line id, не на PO id писателей.
- high — verification: shipment/return без documentType в фильтре (тот же дефект).
- medium — verification: `mapTransaction` нигде не исполняется, только `tx()`.
- low — verification: reserve/ship/history тесты — фикстуры и `toContain` SQL; в репозитории нет Postgres harness.
- defer — `parseStockPlace("production_order_line")` без теста; serialize уже пишет `production_order`.
- low — verification other: cancelDocument без status.

## Design Notes

`store_move` по-прежнему две строки: минус и плюс. На карточке документа видны обе; на карточке места — только ноги этого места; на карточке заказа/региона — обе ноги документа, который трогал эту сущность. Позиция остатка = товар + место + назначение, без `stock_state`.

## Verification

**Commands:**
- `npm run typecheck` -- expected: pass
- `npm run test` -- expected: pass, включая новые кейсы журнала/history
- `npm run check:ui-english` -- expected: pass на новых файлах без `english-ui:ignore-file` у таблицы
- `npm run check:static-images` -- expected: pass
- `npm run lint` -- expected: нет новых ошибок в затронутых файлах

**Manual checks (if no CLI):**
- Карточки product, warehouse, OMS, region, RSV, shipment, PO, output, transfer: колонки, hide, pager.
- `/store/logistics/ledger`: 6 колонок, без сторно, фильтр по классу документа.
- Live SQL: 0 `production_order_line`, 0 reverse functions, history rows ≥ document count, балансы совпали.
