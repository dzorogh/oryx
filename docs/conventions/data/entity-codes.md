# Префиксы кодов сущностей

Единый реестр отображаемых кодов сущностей. Настройка — «Settings → Префиксы кодов» (`/settings/entity-codes`), одним списком.

## Как добавить сущность

1. Добавьте одну запись в `ENTITY_CODES` в `src/lib/entity-codes.ts` (`defaultPrefix`, `label`, `exampleId`; для нередактируемых — `fixed: true`).
2. Для нового вида документа в той же миграции, что и `store_document_kind`, вставьте строку в `store_code_prefix` — иначе `store_doc_number` упадёт на `upper(p_kind)`, а не на дефолт реестра. Для каталожных сущностей строка в БД не обязательна: клиент берёт дефолт из реестра; сохранение на `/settings/entity-codes` создаёт её через `store_set_code_prefix`.
3. В UI вызывайте `formatEntityCode("snake_case_key", id)`. Для регионов с сохранённым кодом — `storedEntityCode("region", stored, id)`.

SQL-фолбэки `'WH'` / `'OMS'` в `store_location_code` и `store_checkout_customer_order` зеркалят дефолты реестра — меняйте их вместе с `ENTITY_CODES`.

## Контракт

| Кусок | Роль |
|-------|------|
| `src/lib/entity-codes.ts` | Реестр сущностей, дефолты, подписи, `formatEntityCode` / `mergeEntityCodePrefixes` |
| `src/lib/entity-codes-api.ts` | Загрузка / сохранение overrides из `store_code_prefix` |
| `store_code_prefix` | Таблица overrides: `entity` (PK, snake_case), `number_prefix` (A–Z0–9, 1–8) |
| `/settings/entity-codes` | Один список всех записей реестра без `fixed` |

Ключ сущности везде один — snake_case (`customer_order`, `production_output`, `plant`). Правило префикса: латиница и цифры, верхний регистр, 1–8 символов; пустое не сохраняется. Регион и проводки нередактируемы (`fixed`).

Связанные правила отображения склада/завода: [ui/place-codes.md](../ui/place-codes.md).
