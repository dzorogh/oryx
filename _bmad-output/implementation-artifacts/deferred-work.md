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
