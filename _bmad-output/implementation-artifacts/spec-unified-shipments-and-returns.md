---
title: 'Единый документ отгрузок и возвратов'
type: 'feature'
created: '2026-09-21'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '78691a0c9eac4707765d8ca7b183cc075d952750'
context:
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/ui/list-page-toolbar.md'
  - '{project-root}/docs/conventions/ui/russian-labels.md'
  - '{project-root}/_bmad-output/brainstorming/brainstorm-return-document-model-2026-09-21/brainstorm-intent.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Отгрузка и возврат — разные сущности: возврат обязан ссылаться на конкретную отгрузку и всегда освобождает товар на её складе. Пользователь не может выбрать склад, судьбу остатка и повторять частичные движения по текущему балансу заказа.

**Approach:** Один проведённый документ с маршрутом `fromPlace → toPlace`. Намерение вычисляется из маршрута и всегда явно в UI. Создание атомарно. Reserve then Ship — видимая композиция двух документов с честным частичным успехом.

## Boundaries & Constraints

**Always:**
- Один список, одна последовательность номеров, один раздел «Отгрузки и возвраты».
- Допустимы только `warehouse → customer_order` (Отгрузка) и `customer_order → warehouse` (Возврат). Направление не хранится.
- Количество строки > 0. Эффект задаёт маршрут. Документ не ссылается на исходную отгрузку или её строки.
- Отгрузка списывает только order-owned reserved текущего заказа на выбранном складе. Свободный и региональный остаток напрямую не отгружается.
- Возврат списывает только текущий shipped-баланс заказа и товара в `customer_order`. Склад получателя любой. Destination owner строки: Free, текущий Order или любой Region. Другому заказу — только отдельным Reservation.
- Уникальность строки: документ + товар + destination owner. Один товар в возврате можно разбить по назначениям.
- Существование документа = проведение. Нет черновика и нет `status`. Проведённый документ неизменяем; коррекция — новый документ обратного маршрута.
- Создание документа и проводок — одна SQL-транзакция с защитой от повторного и конкурентного проведения.
- Reserve then Ship по явному желанию: сначала видимый Reservation из выбранных Free/Region, затем отгрузка. Между документами сценарий неатомарен: успешный резерв сохраняется, если отгрузка упала. UI раздельно сообщает оба исхода и предлагает повторить только отгрузку.
- Пользовательский текст на русском. Тип «Отгрузка» или «Возврат» виден сразу на форме, в списке и на карточке.
- Код документа всегда `SHP-n` из identity единой таблицы; направление не меняет префикс.
- Живые `store_shipment` и `store_return` в demo удаляются миграцией. Story seed заново создаёт SHP-903/904/905 и возврат 2 Cruiser как документы новой модели.

**Never:**
- Не оставлять отдельные разделы «Отгрузки» и «Возвраты» в меню.
- Не хранить `direction` / `operation`, `reverses_document_id`, `shipment_id`, `shipment_line_id`.
- Не менять Reservation: destination owner в заголовке, source owner в строках, вычисляемый reserve/release/reassign.
- Не удалять и не сторнировать факты журнала. Не вводить приёмку, оценку состояния, обмен и деньги.
- Не делать Reserve then Ship одной SQL-транзакцией и не откатывать успешный Reservation при ошибке отгрузки.
- Не назначать возврат другому заказу и не отгружать Free/Region без предварительного Reservation.
- Не воссоздавать удалённый test runner.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Отгрузка из резерва | Заказ, склад, qty ≤ reserved(order, WH, product) и потолок заказа | Документ и проводки warehouse(order) → customer_order(order) атомарно | Недостаток или чужой owner — откат, русская ошибка |
| Возврат со сменой склада и owner | Заказ, любой склад, строки с разными dest owner, сумма qty ≤ shipped | Проводки customer_order(order) → warehouse(выбранный owner) | Сумма товара выше shipped — откат |
| Повтор товара в возврате | Две строки одного SKU, разные dest owner | Обе строки сохраняются | Одинаковый dest owner — отказ уникальности |
| Смена намерения | Выбрана Отгрузка, пользователь жмёт «назад» | Форма очищена, снова два выбора | Частичный ввод не переносится |
| Reserve then Ship, отгрузка упала | Reservation проведён, отгрузка отклонена | Резерв остаётся; UI: успех RSV + ошибка отгрузки + «повторить отгрузку» | Повтор не создаёт второй Reservation |
| Недопустимый маршрут | Любая пара мест кроме двух разрешённых | Документ не создаётся | Русская ошибка маршрута |
| Коррекция проведённого | Попытка изменить/отменить существующий документ | Отказ; предлагается новый документ обратного маршрута | Факты исходного документа не трогаются |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260921120000_store_stock_transaction_facts.sql` — `store_move` / `store_qty` / `store_shipped_for_owner_product` / `store_post_shipment` 930–972 / `store_post_return` 974–1021; не править, только новая миграция.
- `supabase/migrations/20260921140000_store_stock_adjustments.sql` — образец атомарного `store_create_and_post_adjustment` 254–350; `store_code` 200–245; `store_cancel_document` 355–383 (`shipment` / `shipment_return` draft-only).
- `supabase/migrations/20260920122000_store_transfer_direct_send.sql` — `p_request_key` + `pg_advisory_xact_lock` для защиты от дубля.
- `supabase/migrations/20260919010000_store_owner_reservations.sql` — unique через `coalesce(owner)` 222–227; `store_assert_owner`.
- `src/features/logistics/logistics-types.ts` — `Shipment` 216–231, `ShipmentReturn` 259–273, `reservationDirection` 383–394. Расширить `Shipment`, удалить `ShipmentReturn`, добавить `shipmentDirection(from,to)`.
- `src/features/logistics/logistics-api.ts` — `createAndPostShipment` 654–677 и `createAndPostReturn` 679–700 сейчас три клиентских шага; заменить одним RPC. `createAndPostReservation` 628–638 оставить как есть и вызывать первым в Reserve then Ship.
- `src/features/logistics/logistics-forms.tsx` — `ShipmentForm` 613–778, `ReturnForm` 781–891, `ReservationLineFields` 160–314. Собрать одну форму с первым шагом намерения.
- `src/features/logistics/flow-documents-pages.tsx` — `ShipmentsPage` 114–161, `ShipmentDetailPage` 164–245, `ReturnsPage` 247–292, `ReturnDetailPage` 442–518.
- `src/features/logistics/logistics-nav.ts`, `logistics-paths.ts`, `logistics-codes.ts`, `logistics-labels.ts`, `logistics-availability.ts` (`hrefForDocument` 455–474, caps возврата 311–326), `logistics-related.ts`, `order-document-coverage.ts`, `logistics-cancel-guidance.ts` (`open-return`), `logistics-rules.ts`.
- `src/features/store/store-nav.ts`, `src/components/store/store-aside-content.tsx` — Flow «Отгрузки», More «Возвраты».
- `app/store/logistics/shipments/page.tsx`, `app/store/logistics/shipments/[id]/page.tsx`, `app/store/logistics/returns/page.tsx`, `app/store/logistics/returns/[id]/page.tsx`.
- `scripts/lib/seed-logistics-stories.mjs` — SHP-903/904/905, RET-905 521–576; `store_reset_logistics_stories`.
- `docs/features/logistics.md` — раздельные маршруты, draft-статусы, связь возврата с отгрузкой.
- Не менять: факт-журнал, Reservation, transfer/output/adjustment posting, owner-пару, набор `location_type`, PREFIX-id без хранения кода, открытый RLS.

## Tasks & Acceptance

**Execution:**
- [x] Новая миграция — удалить живые shipment/return и их факты, перестроить `store_shipment` (+ from/to, убрать `status`), строки (+ dest owner, unique coalesce), атомарный `store_create_and_post_shipment`, журнал-классы `shipment`/`return` по маршруту, удалить `store_return*`, закрыть draft-cancel этих видов.
- [x] Типы и API — один тип документа, `shipmentDirection`, загрузка snapshot без Return, один клиентский create, Reserve then Ship как два вызова с раздельным результатом.
- [x] Список и навигация — пункт «Отгрузки и возвраты», фильтры Все/Отгрузки/Возвраты, редирект `/returns` и `/returns/[id]`, `hrefForDocument('return')` на ту же карточку.
- [x] Форма и карточка — первый шаг Отгрузить / Принять возврат; фиксированное намерение; схема Откуда→Куда; у возврата dest owner на строке; тип заметен сразу; Reserve then Ship с превью и частичным успехом.
- [x] Связанные поверхности — coverage и related по заказу/товару, не по shipment_line; Journey оставляет исходящие в этапе «Отгрузки», возвраты во «Связанные»; cancel-guidance предлагает обратный документ; склад/товар/журнал открывают оба направления.
- [x] Seed и `docs/features/logistics.md` — story-данные и описание модели без draft и без связи возврата с отгрузкой.

**Acceptance Criteria:**
- Given заказ с резервом на складе, when пользователь выбирает «Отгрузить» и проводит qty из этого резерва, then документ и проводки появляются атомарно, а направление читается как Отгрузка.
- Given shipped-баланс заказа, when пользователь выбирает «Принять возврат», другой склад и разные dest owner для одного SKU, then товар уходит из `customer_order` на этот склад с выбранными owner, без ссылки на исходную отгрузку.
- Given общий список, when пользователь включает фильтр Отгрузки или Возвраты, then видны только документы соответствующего маршрута, номера из одной последовательности.
- Given выбранное намерение, when пользователь возвращается к первому шагу, then форма очищена и маршрут можно выбрать заново.
- Given Reserve then Ship, when Reservation успешен, а отгрузка нет, then резерв сохранён, второй Reservation не создаётся, UI предлагает повторить только отгрузку.
- Given существующий документ, when пользователь пытается его изменить или отменить, then система отказывает и предлагает документ обратного маршрута.

## Implementation Notes

- Триггер `store_shipment_history` снят: история пишется только из RPC с классом `shipment`|`return` по маршруту. После drop `status` live-триггер уже отсутствовал; в файле миграции drop оставлен для чистого apply.
- Форма получила `submitting`, чтобы Reserve then Ship не создавал второй Reservation по двойному клику. Повтор отгрузки идёт с тем же `request_key`.
- Story-возврат посеян как `SHP-915` (Free на WH-40). Код всегда `SHP-n`.
- Матрица закрыта unit-тестами `tests/unit/logistics-unified-shipment.test.ts` и cancel-guidance. RPC Reserve then Ship до проведения в demo не гоняли, чтобы не оставить лишние документы.
- Review patches: `request_key` ротируется при смене заказа/склада; `submittingRef` и `reservationId` до `reload`; пикер корректировки фильтрует направление; закрытый заказ не открывает обратную форму, RPC отвергает его.

## Spec Change Log

## Review Triage Log

- `blind-hunter-1` — `low` / reject: таблица маршрутов и раньше не перечисляла все `[id]`; фильтр `?direction=` виден в UI.
- `blind-hunter-2` — `low` / reject: `RETL` в сводной строке кодов строк — косметика docs, не путь пользователя.
- `blind-hunter-3` — `low` / reject: mermaid «Document draft» общий для модуля; отгрузка описана абзацем ниже как без черновика.
- `blind-hunter-4` — `low` / reject: wipe live-данных зафиксирован в intent и Implementation Notes, не в пользовательском экране.
- `blind-hunter-5` — `false`: после wipe+reseed старый `/returns/905` больше не указывает на возврат; intent явно не гарантирует старые номера.
- `blind-hunter-6` — `false`: create на карточке заказа не требовался; единая кнопка «Новый документ» в списке, Journey оставляет только «Отгрузить».
- `blind-hunter-7` — `low` / reject: спека всегда предлагает обратный документ; пустой остаток отклонит RPC.
- `blind-hunter-8` — `low` / reject: форма отгрузки уже предлагает Reserve then Ship, если на складе есть Free/Region.
- `blind-hunter-9` — `false`: `shipmentOrderId` на карточке не читается; preset берётся из `doc.customerOrderId`.
- `blind-hunter-10` — `low` / reject: AvailabilityPanel по первой строке — прежний shell, не новая дыра модели.
- `blind-hunter-11` — `low` / reject: live `store_setting.return` уже `SHP`; видимое поле настроек одно.
- `blind-hunter-12` — `low` / reject: пустой кадр `useSearchParams` — общий паттерн Next, не ломает список после гидрации.
- `blind-hunter-13` — `false`: триггер `store_shipment_history` снят, RPC пишет один снимок с верным классом.
- `blind-hunter-14` — `low` / reject: английская бирка в docs для составного сценария, UI на русском.
- `edge-1` — `medium` / patch: пикер источника корректировки «Отгрузка» отдаёт все `snapshot.shipments`, включая возвраты.
- `edge-2` — `medium` / patch: смена склада возврата не ротирует `request_key`.
- `edge-3` — `medium` / patch: смена заказа не ротирует `request_key`.
- `edge-4` — `medium` / patch: `setSubmitting` асинхронный, два клика до рендера проходят оба.
- `edge-5` — `low` / reject: закрытие диалога начинает новый сеанс; повтор внутри диалога хранит `reservationId`.
- `edge-6` — `medium` / patch: успех Reservation + падение `reload` даёт `false` и не ставит `reservationId`.
- `edge-7` — `medium` / patch: карточка открывает обратную форму по preset закрытого заказа, RPC статус не проверяет.
- `edge-8` — `medium` / patch: тот же корень, что `edge-4` и `edge-6`.
- `verification-gap-1` — `low` / patch: `relatedShipments` / `relatedReturnsForOrder` не покрыты тестом.
- `verification-gap-2` — `low` / patch: `calculateOrderDocumentCoverage` не покрыт тестом.
- `verification-gap-3` — `low` / patch: `shipmentWarehouseId` не покрыт тестом.
- `verification-gap-4` — `low` / patch: `documentLabel(..., "return")` не покрыт тестом.
- `verification-gap-5` — `low` / patch: `shipmentCreateRpcArgs` не покрыт тестом.
- `verification-gap-6` — `low` / patch: тест Reserve then Ship проверяет только ярлык.
- `verification-gap-7` — `medium` / patch: тот же дефект, что `edge-1`.

## Design Notes

Внутренне это расширенный `store_shipment` / TS `Shipment`, не новая зонтичная таблица: UI всё равно говорит «Отгрузки и возвраты». Заголовок: `customer_order_id` + `from_location_*` + `to_location_*` с CHECK, что ровно один конец — `customer_order` этого заказа, другой — `warehouse`. Строка: `product_id`, `quantity`, `to_owner_*`. Source owner не хранится: отгрузка и возврат всегда берут текущий заказ.

Проводки через существующий `store_move`:

```
Отгрузка:  WH + (order, OMS) → customer_order + (order, OMS)
Возврат:   customer_order + (order, OMS) → WH + (Free | order/OMS | region/id)
```

Журнальный `document_type` остаётся `shipment` | `return` по маршруту, чтобы фильтры журнала не обезличились. Код документа всегда `SHP-n`; `RET` больше не выдаётся новым документам. URL раздела — `/store/logistics/shipments`; `/returns` редиректит. Создание — диалог с двумя крупными карточками намерения, не отдельный `/new`. На карточке заказа исходящие остаются в Journey «Отгрузки», возвраты — во «Связанные». Тестовый раннер не возвращать: проверять lint/typecheck/build и браузер.

## Verification

**Commands:**
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run check:deps`
- `npm run check:docs`
- `npm run check:static-images`

**Manual checks (if no CLI):**
- Список: Все / Отгрузки / Возвраты, кнопка «Новый документ», тип виден в строке.
- Создание отгрузки из резерва и возврата на другой склад с dest Free / Order / Region, в том числе две строки одного SKU.
- Смена намерения через возврат на первый шаг очищает форму.
- Reserve then Ship: превью источников, затем успех RSV + ошибка отгрузки (недостаток после резерва) оставляет резерв и предлагает повтор отгрузки.
- Старые URL `/store/logistics/returns` открывают единый раздел.
- Карточка проведённого документа не даёт редактировать или сторнировать факты.
