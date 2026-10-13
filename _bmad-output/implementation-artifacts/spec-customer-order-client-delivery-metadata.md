---
title: 'Заказ клиента: доставка клиента, метаданные, дата изменения'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: 'c1913bbf9466954ab96514736b7fbec3f3241d70'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/conventions/code/store-module-layers.md'
  - '{project-root}/docs/features/logistics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Карточке заказа клиента (`/store/logistics/customer-orders/[id]`) не хватает трёх вещей из прод-заказа (`my-front` Finances.vue, Metadata, шапка): оплаты доставки со статусом, метаданных учёта и даты последнего изменения.

**Approach:** Добавить новую вкладку «Доставка клиента» с полями заказа, без связи с перемещениями. Добавить вкладку «Метаданные» только для менеджера. В шапку добавить строку «Изменён».

## Boundaries & Constraints

**Always:**
- Вкладка «Доставка клиента»:
  - Подпись под заголовком: «Доставку от склада отгрузки к себе клиент организует сам. Здесь он ведёт её стоимость и статус оплаты для своего учёта. Не связано с перемещениями товаров между складами.»
  - Поля, как на проде:
    - «Статус оплаты доставки»: «Счёт не выставлен» / «Ожидается полная оплата» / «Оплачено», или пусто.
    - «Инвойс»: сумма и своя валюта.
    - «Оплачено»: сумма и своя валюта.
    - «Срок оплаты»: дата.
  - Видят и правят оба: менеджер и заказчик. Правка доступна при любом статусе заказа.
  - Если статус задан, в шапке рядом со статусом заказа стоит бейдж «Доставка: <статус>». Клик по бейджу открывает вкладку. Бейдж виден тем, кому видна вкладка.
- Вкладка «Метаданные»:
  - Поля: «ID в системе учёта», «Номер отслеживания», «Номер заказа поставщика», «Ссылка в системе учёта».
  - Ссылка кликабельна, только если это `http(s)://`.
  - Видит и правит только менеджер. Под заголовком подпись «Видит только менеджер».
- «Изменён» в шапке показывает время последней правки заказа: шапки, статуса, срока, заметки, строк, денег, платежей, файлов, доставки клиента и метаданных. Комментарии не считаются.
- Видимость задают строки `store_role_visibility`:
  - `tab.client_delivery`: заказчику видна.
  - `tab.metadata`: заказчику не видна.
- Весь текст на русском. Вкладки следуют стилю существующих вкладок (`DocumentSection`).

**Never:**
- Не связывать доставку клиента с перемещениями, `transfer_money` и деньгами заказа.
- Не возвращать вкладку «Логистика» прода (склад, маршрут) и 8 статусов прода.
- Не добавлять статус оплаты заказа (он уже в «Деньгах»).
- Не возвращать удалённые `accounting_number` / `accounting_url`; поля новые.

## I/O & Edge-Case Matrix

| Сценарий | Ввод / состояние | Ожидаемо | Ошибка |
|----------|------------------|----------|--------|
| Новый заказ | Доставку и метаданные не заполняли | Поля пусты, в чтении показан «—» | N/A |
| Сумма без валюты | Указан «Инвойс» 500, валюта пуста | Не сохраняется | Тост «Укажите валюту инвойса» (то же для «Оплачено») |
| Отрицательная сумма | `-1` | Не сохраняется | Тост «Сумма не может быть отрицательной» |
| Очистка | Пустая сумма | Сумма и валюта очищаются | N/A |
| Плохая ссылка | `ftp://x`, `example.com` | Не сохраняется | Тост «Ссылка должна начинаться с http:// или https://» |
| Длинный текст | Метаполе длиннее 200 символов | Не сохраняется | Тост «Не длиннее 200 символов» |
| Заказчик | Роль customer | Видна «Доставка клиента» с правкой, «Метаданных» нет | N/A |
| Изменение | Правка любого поля из списка «Изменён» | После перезагрузки «Изменён» показывает новое время | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260929120000_store_customer_order_oms_parity.sql`:
  - L314–341 `store_set_customer_order_accounting`: образец команды (валидация, `security definer`, `raise exception` с русским текстом).
  - L817–818: образец грантов.
- `supabase/migrations/20261013160000_store_customer_rights_2026_10_13.sql`: образец upsert для `store_role_visibility`.
- Таблицы, которые трогают «Изменён»:
  - `store_document` (baseline L551);
  - `store_customer_order`;
  - `store_document_product_line`;
  - `store_order_money`, `store_order_payment`;
  - `store_document_file`;
  - две новые таблицы этой задачи.
- `src/features/logistics/logistics-api.ts`:
  - L1054 `loadDocumentContext`: загрузка карточки.
  - Рядом команды через `runRpc`/`loadMappedRpc`; читать их как образец.
- `src/features/logistics/customer-order-oms.ts`: тип `CustomerOrderOms` и маппер `store_document_context`. Сюда положить новые поля и мапперы.
- `src/features/logistics/customer-orders-page.tsx`:
  - L647–819: массив вкладок с фильтром `tab.${id}`. Новые вкладки ставить после «Деньги».
  - L578: пропсы шапки.
- `src/features/logistics/ui/customer-order-header.tsx`:
  - L506–516 `contextRows`: строку «Изменён» ставить после «Создан». Формат даты — `formatMetaTimestamp`.
  - L535: бейдж статуса доставки ставить после `StatusPill`.
  - Переход на вкладку — через `openDocumentTab`, как в `DatesPanel`.
- `src/features/logistics/ui/order-money-tab.tsx`: образец полей суммы и валюты и `runLogisticsAction`. Список валют брать из `orderMoney.currencies`.
- `src/features/logistics/order-view-role.ts` (`CUSTOMER_ORDER_VIEW_KEYS`) и `tests/unit/order-view-role.test.ts`: ключи видимости.
- `scripts/seed-logistics.mjs` (+ `scripts/lib/seed-logistics-stories.mjs`): демо-данные.
- Не трогать: `store_context_payload` и `store_document_context`. Новые данные идут отдельной RPC.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261013180000_store_customer_order_client_delivery_meta.sql`:
  - Таблица `store_customer_order_client_delivery`:
    - `order_id` pk/fk → `store_customer_order`;
    - `payment_status` text, check `awaiting_invoice|pending_payment|paid`, может быть null;
    - `invoice_amount` numeric ≥0 + `invoice_currency_id`;
    - `paid_amount` + `paid_currency_id`;
    - `due_on` date;
    - check: у суммы есть валюта.
  - Таблица `store_customer_order_meta`:
    - `order_id`, `external_id`, `track_number`, `supplier_order_number`, `external_url`;
    - check: `http(s)` и длина ≤200.
  - Колонка `store_document.updated_at timestamptz not null default now()`, backfill значением `created_at`. Триггеры выставляют `now()` на документе при insert/update/delete в таблицах из Code Map.
  - Команды `store_set_customer_order_client_delivery(...)` и `store_set_customer_order_meta(...)` с русскими ошибками из матрицы.
  - Чтение `store_customer_order_extras(p_order_id)` → `{ updated_at, client_delivery, meta }`.
  - Гранты как у образца.
  - Upsert `store_role_visibility` (`page` = `customer_order`):
    - `tab.client_delivery` «Вкладка: доставка клиента», заказчику видна;
    - `tab.metadata` «Вкладка: метаданные», заказчику не видна.
  - Применить к демо-базе через MCP `oryx-supabase`.
- [x] `src/features/logistics/customer-order-extras.ts` — типы, маппер RPC, метки статуса.
- [x] `src/features/logistics/logistics-api.ts` — загрузка extras и две команды.
- [x] `src/features/logistics/ui/customer-order-client-delivery-tab.tsx`, `ui/customer-order-meta-tab.tsx` — вкладки: чтение и правка, сохранение по blur/select, как в «Деньгах».
- [x] `src/features/logistics/customer-orders-page.tsx`:
  - загрузить extras вместе с контекстом;
  - добавить вкладки;
  - передать `updatedAt` в шапку.
- [x] `src/features/logistics/ui/customer-order-header.tsx` — строка «Изменён» и бейдж статуса доставки.
- [x] `src/features/logistics/order-view-role.ts` + тест — ключи вкладок.
- [x] `tests/unit/customer-order-extras.test.ts` — маппер и валидации из матрицы, если они на клиенте.
- [x] `scripts/seed-logistics.mjs` — доставка клиента у OMS-921 (оплачено) и OMS-906 (ожидается оплата, срок в будущем); метаданные у OMS-921.
- [x] `docs/features/logistics.md` — описание вкладок, «Изменён», миграция.

**Acceptance Criteria:**
- Given менеджер на OMS-921, when правит статус, суммы и срок в «Доставке клиента» и перезагружает страницу, then значения на месте, и «Изменён» обновился.
- Given заказчик на OMS-921, when открывает карточку, then видна «Доставка клиента» с правкой, а вкладки «Метаданные» нет.
- Given менеджер заполнил ссылку `https://…`, then в чтении это ссылка, открывается в новой вкладке.

## Implementation Notes

- Реализовал subagent на Grok. Правки при приёмке:
  - убраны пометки `english-ui:ignore-file`;
  - убран дублирующий запасной текст бейджа;
  - убрана мёртвая ветка `delete` в триггере `store_document`. Триггер в демо-базе пересоздан под исправленную миграцию.
- `store_document_header_guard` не мешает: у закрытого документа он запрещает только статус, заметку и срок, а `updated_at` менять можно.
- Тост для «Оплачено» без валюты — «Укажите валюту оплаты».
- В демо-базе у нетронутых документов `updated_at` выставлен по последней записи истории (193 строки). Сид делает то же после раскладки истории.
- Скрытие метаданных от заказчика работает только в интерфейсе: RPC открыты `anon`, авторизации в прототипе нет. Об этом сказано на checkpoint.

## Spec Change Log

## Review Triage Log

| # | Слой | Находка | Вердикт | Обоснование | Маршрут |
|---|------|---------|---------|-------------|---------|
| 1 | blind | После пересева «Изменён» = время сида, у закрытых позже «Завершён» | medium | Insert-триггеры ставят now(), сид двигает только историю | patch: сид и демо-база по последней записи истории |
| 2 | blind, edge, gap | Падение extras RPC роняет всю карточку | low | Заказ найден контекстом, RPC применена; если молча проглотить ошибку, откроется пустая форма, и сохранение затрёт данные | reject |
| 3 | blind | Второй запрос идёт после первого | low | Лишний сетевой круг, на поведение не влияет | reject |
| 4 | blind | Статус и суммы доставки не согласованы между собой | false | На проде поля независимы; intent: «как на проде» | reject |
| 5 | blind | Правки доставки не пишутся в историю | low | В intent нет | reject |
| 6 | blind | Дока «Создать копию» не упоминает новые данные | low | `store_copy_customer_order` их не копирует; поправить строку доки | patch |
| 7 | blind, edge | Подпись «Видит только менеджер» вшита в код; anon RPC метаданных | false | Подпись требует intent; anon — известное ограничение прототипа, сказано на checkpoint | reject |
| 8 | blind, edge | Валюта при пустой сумме не сохраняется | low | Сохраняется пара «сумма + валюта»; после ввода суммы валюта уходит в базу | reject |
| 9 | blind | `displayExtrasValue` / `displayDeliveryStatus` нигде в UI не используются | low | Используются только тестом | patch: удалены |
| 10 | blind | Мёртвое `\|\| currencyError` | low | `error` всегда задан | patch |
| 11 | blind | Дублирование `ExtrasRow` / `refuse` | low | Нет конкретного вреда | reject |
| 12 | blind | Нет `maxLength`; trim nbsp на клиенте и сервере разный | low | Тост из матрицы срабатывает; nbsp по краям маловероятен | reject |
| 13 | blind | В поле 2 знака, в базе 4 | low | Из UI 4 знака почти не вводят | reject |
| 14 | blind | Построчные триггеры и все виды документов | low | Объём демо мал, смысл `updated_at` общий для всех видов | reject |
| 15 | blind | Связанные документы не двигают «Изменён» | false | Intent перечисляет только поля заказа | reject |
| 16 | blind | Нет тестов парсинга и выбора id; тавтологичный тест | low | Выбор id упрощён до `document_id` (#18) | reject |
| 17 | blind | Нет колонок в списке заказов | false | Вне intent | reject |
| 18 | edge | Запасной поиск id может дать NaN | false | `store_document_context` всегда отдаёт `document_id` при found; запасной путь мёртв | patch: убран запасной путь |
| 19 | edge | Отказ при выборе «—» оставляет «—» в селекте, а в базе валюта | low | Подтверждено по коду `apply` | patch |
| 20 | edge | Переполнение numeric(18,4) показывает английскую ошибку | low | Сумма от 10^14 нереальна | reject |
| 21 | edge | Мягко удалённая валюта блокирует правки | low | В демо валюты не удаляют | reject |
| 22 | edge | Дата сохраняется на каждый onChange | maybe-false | Общий `DocumentMetaDateInput`, так было и раньше; проверить набором года | defer |
| 23 | edge | При ошибке сервера теряется черновик | low | Клиент проверяет то же, что сервер | reject |
| 24 | edge | Update с теми же значениями двигает «Изменён» | low | Команды почти не пишут то же значение | reject |
| 25 | gap | Выбор id в `loadDocumentContext` не тестируется | low | После #18 одна строка | reject |
| 26 | gap | Триггеры и серверные проверки без автотестов | low | Тестов против базы нет; проверено через MCP | defer |
| 27 | gap | Логика сохранения во вкладках и бейдж без тестов | low | Тестов компонентов нет | defer |

## Verification

**Commands:**
- `npm run typecheck`, `npm run build`, `npm run check:docs`, `npm run check:static-images` — успех.
- `npm run lint`, `npm test`, `npm run check:deps` — допустимы только прежние сбои: 5 проблем lint в tracker/comments, `document-timeline.test.ts`, расхождение версий пакетов.

**Manual checks:**
- Браузер, OMS-921: роль менеджера и заказчика, обе вкладки, «Изменён» в шапке.
