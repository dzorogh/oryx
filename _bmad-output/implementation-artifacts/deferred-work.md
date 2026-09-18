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

- source_spec: `_bmad-output/implementation-artifacts/spec-store-schema-prefix.md`
  summary: Нет правила, какой `plant_id` варианта побеждает при повторном импорте из Корпортала.
  evidence: Эта работа только копирует уже 1:1 live-связи в колонку.
