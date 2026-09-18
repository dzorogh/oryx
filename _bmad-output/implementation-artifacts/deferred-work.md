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
