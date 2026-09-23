- source_spec: `_bmad-output/implementation-artifacts/spec-store-schema-prefix.md`
  summary: Каталог молча показывает «—», если select `store_manufacturer` вернул error.
  evidence: Тот же `data ?? []` без проверки error был до rename; не регрессия этой миграции.

- source_spec: `_bmad-output/implementation-artifacts/spec-store-schema-prefix.md`
  summary: `store_assert_product_manufactured_at` не гоняется из Vitest.
  evidence: `npm test` не бьёт Postgres; live SQL-проба уже закрывает AC.

- source_spec: `_bmad-output/implementation-artifacts/spec-store-schema-prefix.md`
  summary: Документация IA Store aside и редирект `/releases` смешаны с незакоммиченным unified-reservation.
  evidence: `logistics-forms` / `store-nav` не входили в rename; правки IA были в грязном дереве.

- source_spec: `_bmad-output/implementation-artifacts/spec-store-schema-prefix.md`
  summary: `remap-logistics-demo-ids.mjs` не читает старый ключ `product_manufacturers`.
  evidence: Текущий demo JSON уже несёт `manufacturer_id` на продукте.

- source_spec: `_bmad-output/implementation-artifacts/spec-production-order-dialog-compact-table.md`
  summary: Кнопка Create не блокируется на время запроса, а success-toast не ссылается на новый заказ на производство.
  evidence: `runLogisticsAction` у соседних logistics-форм такой же; это не регрессия компактной таблицы.

- source_spec: `_bmad-output/implementation-artifacts/spec-production-order-close-release-holds.md`
  summary: Vitest не вызывает `store_close_production_order`, только grep текста миграции.
  evidence: В `npm run test` нет Postgres; матрица reserved/free/два OMS/already-closed уже прогнана live с ROLLBACK.

- source_spec: `_bmad-output/implementation-artifacts/spec-production-order-close-release-holds.md`
  summary: RPC close неизвестного или null id возвращает `closed` без ошибки.
  evidence: Тот же ранний `exists (... status = 'closed')` + UPDATE 0 строк был в прежнем `store_close_production_order`.

- source_spec: `_bmad-output/implementation-artifacts/spec-production-order-close-release-holds.md`
  summary: RPC может закрыть заказ на производство в статусе `cancelled`.
  evidence: Кнопка close в UI скрыта для cancelled; старый RPC тоже не фильтровал этот статус.

- source_spec: `_bmad-output/implementation-artifacts/spec-production-order-close-release-holds.md`
  summary: Параллельный reserve после проверки leftover reserved может оставить claim на уже closed PO.
  evidence: Нет `FOR UPDATE` на шапке; прежний close тоже не блокировал строку. Чтобы подтвердить, нужен двухтранзакционный тест.

- source_spec: `_bmad-output/implementation-artifacts/spec-customer-order-products-allocation-atlas.md`
  summary: Уточнить в Implementation Notes формулировку расчёта Produced при сторно.
  evidence: Первая заметка говорит только о положительных production_output-транзакциях, тогда как реализация корректно суммирует и отрицательные сторно для получения накопительного net-значения; это документальное расхождение без влияния на код.

- source_spec: `_bmad-output/implementation-artifacts/spec-customer-order-products-in-production-column.md`
  summary: Пометить базовую спецификацию Allocation Atlas как расширенную колонкой In production.
  evidence: Завершённая базовая спецификация сохраняет прежний перечень колонок без In production; новая спецификация и код корректно расширяют его, но между документами нет явной связи supersedes.

- source_spec: `_bmad-output/implementation-artifacts/spec-customer-orders-newest-mixed-demo.md`
  summary: Vitest не исполняет SQL `store_reset_logistics_stories` и не доказывает, что posted RSV 906 реально удаляются до p_hi=999.
  evidence: Тест читает только JS-строки RPC; в репозитории нет Postgres-харнесса. Live повторный `npm run seed:logistics` уже оставил 70 снимковых OMS и 6 историй, включая открытый OMS-906. Закрыло бы: SQL-тест функции или явная проверка, что DELETE reservation/journal идёт по `p_hi`, а не 905.

- source_spec: `_bmad-output/implementation-artifacts/spec-transfer-direct-send.md`
  summary: Анон по-прежнему может вставить transfer как draft и удалить строку idempotency key.
  evidence: Новая `store_transfer_request` и старая `store_transfer` остаются с open RLS / GRANT ALL, как остальные демо-таблицы `store_*`. UI больше не пишет draft, но сырой клиент может. Закрыло бы: CHECK/trigger на публичный status и revoke INSERT/DELETE у anon.

- source_spec: `_bmad-output/implementation-artifacts/spec-transfer-detail-reservation-groups.md`
  summary: Закрыть анонимные UPDATE/DELETE для `store_transfer_request`.
  evidence: Open RLS позволяет менять или удалять idempotency key; проблема находится в ранее созданной direct-send миграции, исключённой из scope карточки.

- source_spec: `_bmad-output/implementation-artifacts/spec-transfer-detail-reservation-groups.md`
  summary: Отделить seed-параметры `p_id` и `p_created_at` от публичного create-and-send RPC.
  evidence: Анонимный caller может выбирать id и created_at; исправление требует изменения direct-send API и миграции.

- source_spec: `_bmad-output/implementation-artifacts/spec-transfer-detail-reservation-groups.md`
  summary: Сделать idempotent replay успешным после delivery или cancellation.
  evidence: RPC возвращает текущий terminal status, а клиент принимает только `sent`; это контракт direct-send вне текущего detail redesign.

- source_spec: `_bmad-output/implementation-artifacts/spec-transfer-detail-reservation-groups.md`
  summary: Блокировать повторный Send на время create-and-send запроса.
  evidence: Обе create forms допускают быстрый повторный RPC; list/dialog были явным non-goal текущей работы.

- source_spec: `_bmad-output/implementation-artifacts/spec-transfer-detail-reservation-groups.md`
  summary: Исправить owner-aware cancellation после резервирования товара в пути.
  evidence: Reverse исходного `transfer_send` после Free→reserved может оставить отрицательный Free и положительный reserved на cancelled Transfer; требуется backend/domain изменение.

- source_spec: `_bmad-output/implementation-artifacts/spec-transfer-detail-reservation-groups.md`
  summary: Перевести transfer list/dialog и общие status/error labels на английский.
  evidence: Эти поверхности остаются русскими под `english-ui:ignore-file`; текущая спецификация ограничена Transfer detail.

- source_spec: `_bmad-output/implementation-artifacts/spec-transfer-detail-reservation-groups.md`
  summary: Добавить исполняемый Postgres contract test для direct-send RPC.
  evidence: Atomicity, rollback и same-key replay сейчас проверяются mock/source-text тестами; нужен реальный database harness для миграции.

- source_spec: `_bmad-output/implementation-artifacts/spec-universal-entity-movement-table.md`
  summary: Тест `parseStockPlace` для `production_order` и legacy `production_order_line`.
  evidence: serialize уже пишет `production_order`; старые bookmark URL без теста молча сбрасываются в all.

- source_spec: `_bmad-output/implementation-artifacts/spec-universal-entity-movement-table.md`
  summary: Убрать дублирующую пару `ownerType`/`ownerId` с `StockBalance` после cutover.
  evidence: читатели ещё могут суммировать по старой паре, пока aliases остаются обязательными.

- source_spec: `_bmad-output/implementation-artifacts/spec-remove-application-tests.md`
  summary: Перенести prototype-first verification policy из управляемого блока AGENTS.md в устойчивый источник генерации.
  evidence: Текущая правка обязательных команд находится внутри `bmad:context` и может исчезнуть при следующем refresh.

- source_spec: `_bmad-output/implementation-artifacts/spec-remove-application-tests.md`
  summary: Вернуть зелёный baseline для lint и check:deps без ослабления правил.
  evidence: До этого chore в продуктовых файлах уже были 11 lint-ошибок, а 23 прямые зависимости отставали от wanted-версий; активное утверждение Comments об успешном check:deps также устарело.

- source_spec: `_bmad-output/implementation-artifacts/spec-remove-application-tests.md`
  summary: Обновить draft-спеку Stock Adjustments под репозиторий без прикладных автотестов.
  evidence: Параллельный untracked-файл `spec-stock-adjustments.md` требует отсутствующие `tests/unit/logistics-stock-adjustment.test.ts` и `npm run test`.

- source_spec: `_bmad-output/implementation-artifacts/spec-remove-application-tests.md`
  summary: Зафиксировать допустимый уровень ручной регрессионной проверки критичных потоков после удаления test suite.
  evidence: У Thanks mapping, меню, packing overrides, Reservation direction и других logistics/pricelist потоков больше нет исполняемой регрессионной защиты; это принято prototype-first intent, но риск остаётся явным.

- source_spec: `_bmad-output/implementation-artifacts/spec-stock-adjustments.md`
  summary: Закрыть UPDATE/DELETE у `store_adjustment` / `store_adjustment_line` для anon, не ломая общий open-RLS прототипа.
  evidence: Новые таблицы повторяют GRANT+RLS остальных `store_*`; иммутабельность сейчас только в RPC/UI.

- source_spec: `_bmad-output/implementation-artifacts/spec-stock-adjustments.md`
  summary: Сериализовать проверку свободного остатка при параллельных списаниях.
  evidence: `store_qty` читается без `FOR UPDATE`, как у соседних `store_post_*`; два уменьшения могут уйти в минус.

- source_spec: `_bmad-output/implementation-artifacts/spec-stock-adjustments.md`
  summary: Добавить Postgres-проверку `store_create_and_post_adjustment`.
  evidence: `npm test` гоняет только `buildAdjustmentFacts`; форма пишет через RPC, harness для SQL в раннере нет.

- source_spec: `_bmad-output/implementation-artifacts/spec-stock-adjustments.md`
  summary: После появления `npm run test` обновить фразу в AGENTS.md, что у приложения нет автотестов.
  evidence: Правка попала бы в agent-context / управляемый блок и не является частью этой складской истории.

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: `npm test` не исполняет `store_create_and_post_adjustment` и `store_cancel_document`.
  evidence: Раннер — только unit TS; SQL-harness нет. Закрыло бы: Postgres contract test, что write-off пишет отрицательный факт и draft-cancel меняет только статус.

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: Обратная корректировка не ссылается на исходный ADJ и не различает write_off/decrease.
  evidence: `ADJUSTMENT_SOURCE_DOCUMENT_TYPES` и SQL check не знают `adjustment`; `oppositeAdjustmentOperation` всегда ведёт increase↔decrease. Это модель `spec-stock-adjustments`.

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: `store_cancel_document` не пишет снимок в `store_document_history`.
  evidence: Документация требует снимок на каждую смену статуса; дыра была в RPC до кнопки «Отменить».

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: После появления `npm run test` обновить фразу в AGENTS.md, что автотестов нет.
  evidence: Правка agent-context не входит в эту историю.

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: Список корректировок показывает draft/cancelled, нет seed ADJ и related-блоков.
  evidence: Зависимость `spec-stock-adjustments`; ADJ проводится без черновика, seed и related не входили в помощник отмены.

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: `npm test` не исполняет `store_create_and_post_adjustment` и `store_cancel_document`.
  evidence: Раннер — только unit TS; SQL-harness нет. Закрыло бы: Postgres contract test, что write-off пишет отрицательный факт и draft-cancel меняет только статус.

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: Обратная корректировка не ссылается на исходный ADJ и не различает write_off/decrease.
  evidence: `ADJUSTMENT_SOURCE_DOCUMENT_TYPES` и SQL check не знают `adjustment`; `oppositeAdjustmentOperation` всегда ведёт increase↔decrease. Это модель `spec-stock-adjustments`.

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: `store_cancel_document` не пишет снимок в `store_document_history`.
  evidence: Документация требует снимок на каждую смену статуса; дыра была в RPC до кнопки «Отменить».

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: После появления `npm run test` обновить фразу в AGENTS.md, что автотестов нет.
  evidence: Правка agent-context не входит в эту историю.

- source_spec: `_bmad-output/implementation-artifacts/spec-document-cancellation-guidance.md`
  summary: Список корректировок показывает draft/cancelled, нет seed ADJ и related-блоков.
  evidence: Зависимость `spec-stock-adjustments`; ADJ проводится без черновика, seed и related не входили в помощник отмены.

- source_spec: `_bmad-output/implementation-artifacts/spec-production-order-detail-redesign.md`
  summary: Нет автотеста идемпотентности `store_create_production_output`.
  evidence: Утверждённая спека запрещает новый test suite. Повтор ключа и откат транзакции проверены устройством RPC, не тестом.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-universal-document-product-lines.md`
  summary: Нет автотеста, что закрытие заказа на производство не списывает складской остаток.
  evidence: `npm test` не вызывает RPC. Случайное возвращение списания WIP не уронит юнит-тесты; поведение закрытия проверено чтением функции, не тестом.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-outputs-multi-product.md`
  summary: Нет автотеста SQL-функции многотоварного выпуска и группировки резервов.
  evidence: `npm test` не вызывает Postgres. Два товара, разбиение 6/4, два резерва, план и отказы проверены живым SQL с откатом подтранзакции.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-outputs-multi-product.md`
  summary: Подсказка «Осталось выпустить по плану» на карточке выпуска считает остаток по пустому `productionOrderLineId`.
  evidence: Загрузка строк выпуска пишет `productionOrderLineId: ""` с универсальных строк, до этой задачи. Подсказка берёт количество строки выпуска, а не остаток плана.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-logistics-list-scoped-data.md`
  summary: Строки резерва несут сырой `from_owner_id` (id владельца остатка) вместо id заказа/региона: резерв из свободного остатка показан как «Переназначение» с источником «1», источник-заказ — как «85» со ссылкой на чужой заказ.
  evidence: `mapLineOwners` в `logistics-api.ts` отдаёт сырой id при спроецированном типе; `store_reservation_list` повторяет это (`x.id = l.from_owner_id`). RSV-905 показывает источник «85» вместо OMS-904. Было до задачи; затрагивает и запись (формы передают этот id в `resolveOwnerId`).

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-logistics-list-scoped-data.md`
  summary: Старые проверки статусов `open` / `sent` / `delivered` не совпадают с жизненным циклом `draft/in_progress/done/cancelled`: пустые пикеры заказа в формах резерва и отгрузки, скрытые подсказки отмены для заказов `in_progress`.
  evidence: `logistics-forms.tsx:572,1034`, `logistics-availability.ts:275,510`, `production-output-lines-fields.tsx:65`, `flow-documents-pages.tsx:279`, `logistics-cancel-guidance.ts:307`, `transfer-detail-projection.ts:443,599`, `order-action-forms.tsx:759`; в демо-БД заказы только `in_progress`/`done`. Было до задачи.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-logistics-list-scoped-data.md`
  summary: Тип корректировки выводится по знаку строк: уменьшение (`decrease`) неотличимо от списания и показывается как «Списание».
  evidence: и старый маппер, и `store_adjustment_list` ставят `write_off` при всех отрицательных строках; операция не хранится в БД. Было до задачи.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-logistics-list-scoped-data.md`
  summary: Нет автотеста read-RPC (итоги заказов, подписи резервов, скоупы контекстов) — только разовое сравнение скриптом и прямые SQL-проверки.
  evidence: `npm test` не вызывает Postgres; дефект подписи источника резерва прошёл все гейты.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-logistics-list-scoped-data.md`
  summary: `AGENTS.md` не включает `npm test` в проверки перед сдачей.
  evidence: `AGENTS.md` называет только lint/typecheck/build/check:*; правка агентских файлов вынесена из задачи.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-store-document-screens-redesign.md`
  summary: На карточке перемещения кнопки «Отметить доставленным» и «Зарезервировать в пути» показываются только при статусе `sent`, а в демо-БД перемещения в пути имеют статус `in_progress`.
  evidence: `transfers-page.tsx` проверяет `doc.status === "sent"`, `canReserveInTransit` тоже; та же проверка была в базовой `transfer-detail-header.tsx:79`; в БД статусы перемещений — `in_progress`/`done`.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-store-document-screens-redesign.md`
  summary: На карточке отгрузки действие по связанному заказу клиента показывается только при `status === "open"`, а у открытых заказов в БД статус `in_progress`.
  evidence: `flow-documents-pages.tsx:313`; так же в базовой версии (строка 279); в БД 35 заказов клиента `in_progress`, ни одного `open`.

- source_spec: `/Users/dzorogh/Develop/oryx/_bmad-output/implementation-artifacts/spec-store-document-screens-redesign.md`
  summary: Ошибка действия на карточке перемещения выводится только в `sr-only` live-region — зрячий пользователь её не видит.
  evidence: `transfers-page.tsx` ~429; так же в базовой `transfer-detail-header.tsx:144`; можно перевести действия на `runLogisticsAction` (toast).
- source_spec: `_bmad-output/implementation-artifacts/spec-store-lists-redesign.md`
  summary: Проверить `store_customer_order_list` на двойной учёт резерва/отгрузки, если в заказе две строки одного товара.
  evidence: maybe-false — CTE `per_line` соединяет каждую строку с агрегатом по (заказ, товар); логика перенесена без изменений из `20260923120000`. Решает проверка, допускает ли создание заказа дубли товара.
- source_spec: `_bmad-output/implementation-artifacts/spec-store-lists-redesign.md`
  summary: Добавить `npm test` в обязательные проверки перед сдачей в AGENTS.md (через bmad-project-context).
  evidence: В `package.json` есть `test` (node --test, 80+ тестов), но AGENTS.md пишет «no automated test suite» и не требует его запускать.
