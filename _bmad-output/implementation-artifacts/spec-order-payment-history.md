---
title: 'Платёж: автор, время создания и история изменений'
type: 'feature'
created: '2026-10-08'
status: 'done'
route: 'dispatch'
baseline_commit: 'd65d9f506da3b1c7634b603b765d895ab21a8169'
review_loop_iteration: 1
context:
  - '{project-root}/docs/conventions/backend/supabase.md'
  - '{project-root}/docs/features/logistics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Во вкладке «Деньги» (например `/store/logistics/customer-orders/936#money`) у платежа не видно, когда и кем он создан, а история хранит только смены статуса без автора — изменения срока и суммы теряются.

**Approach:** Хранить автора платежа и полную историю (создание + каждое изменение статуса, срока или суммы, с автором и временем); в таблице платежей показать «Создан» (дата-время, автор) и кнопку «История», открывающую окно с хронологией «было → стало» по статусу, сроку и сумме.

## Boundaries & Constraints

**Always:** Автор — `store_current_user_id()` (демо, логина нет; имя из `snapshot.users`). История пишется только триггером на `store_order_payment`, событие переживает удаление платежа. Лента комментариев заказа по-прежнему показывает только смены статуса платежа. Одна реализация для всех вкладок «Деньги» (PO, заказ клиента, перемещение). Тексты UI на русском.

**Never:** Не создавать вторую таблицу истории. Не показывать удалённые платежи. Не менять сигнатуры `store_save_order_payment` / `store_delete_order_payment`. Не трогать чужие незакоммиченные правки в рабочем дереве (коммитить только свои куски).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Новый платёж | `store_save_order_payment` без id | событие `create` со статусом, сроком, суммой, `changed_by` | — |
| Изменение | меняются срок и сумма, статус тот же | одно событие `update`, в окне две строки «было → стало» | — |
| Сохранение без изменений | те же значения | события нет | — |
| Старое событие статуса | `kind='update'`, `prev_*` пусты | в окне «Статус → Оплачен» без «было»; в ленте как раньше | — |
| Платёж до миграции | нет событий | бэкфилл `create` на `created_at` с текущими значениями | — |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260925190000_store_order_money.sql` -- `store_order_payment` (уже есть `created_at`), `store_save_order_payment`, `store_order_money_payload` (`order_payments` JSON) — последние определения.
- `supabase/migrations/20260929120000_store_customer_order_oms_parity.sql` -- `store_order_payment_event` + `store_order_payment_event_writer` (только смена статуса) и последнее определение `store_customer_order_oms_payload` (ключ `order_payment_events` для ленты). Копировать целиком при `create or replace`.
- `supabase/migrations/20260922200000_store_baseline.sql` -- `store_current_user_id()`, `app_user`.
- `src/features/logistics/order-money.ts` -- `OrderPayment`, `mapPaymentRows`; место для чистой логики истории.
- `src/features/logistics/ui/order-money-tab.tsx` -- таблица платежей, `PaymentStatusPill`, `DialogShell`; в файле чужие незакоммиченные правки (`AddPaymentDialog`, `savePaymentDraft`) — сохранить.
- `src/features/logistics/logistics-labels.ts` -- `formatMetaTimestamp` («23.09.2026, 14:09»).
- `src/features/logistics/output-calendar.ts` -- `formatOutputDate` для сроков.
- `src/features/logistics/ui/customer-order-files-tab.tsx` -- образец окна просмотра `DialogShell` с `dismissLabel="Назад"`.
- `src/features/logistics/customer-order-oms.ts` -- `OrderPaymentEvent`, `buildOrderSystemNotices` (лента; не менять поведение).
- `tests/unit/order-money.test.ts`, `tests/unit/customer-order-oms.test.ts` -- тесты маппинга.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261008170000_store_order_payment_history.sql` -- `store_order_payment.created_by` (not null, default `store_current_user_id()`, FK `app_user`); в `store_order_payment_event` колонки `kind` (`create`|`update`, существующие → `update`), `prev_status`, `prev_amount`, `prev_due_on` (nullable), `changed_by` (not null, default текущий); триггер `after insert or update of status, amount, due_on` пишет `create` или `update` (если хоть одно поле изменилось) со старыми значениями в `prev_*`; бэкфилл `create` на `created_at` только для платежей без событий (исходный статус платежа со старым событием неизвестен — `create` не выдумываем, `prev_*` старых событий остаются NULL); `store_order_money_payload.order_payments` + `created_at`, `created_by`, `history[]` (kind, status, amount, due_on, prev_*, changed_at, changed_by по возрастанию); `store_customer_order_oms_payload.order_payment_events` — только `kind='update'` и `prev_status is distinct from status`. Применить через MCP `apply_migration` на oryx-supabase.
- [x] `src/features/logistics/order-money.ts` -- `OrderPayment` + `createdAt`, `createdBy`, `history: OrderPaymentHistoryEvent[]`; маппинг; чистая функция `paymentHistoryChanges(event)` → `{ field: 'status'|'dueOn'|'amount', from, to }[]` (у `create` — пусто, у старых событий `from = null`).
- [x] `src/features/logistics/ui/order-money-tab.tsx` -- колонка «Создан» (дата-время, под ней автор мелким серым), кнопка «История» перед «Изменить»; окно `PaymentHistoryDialog` (только просмотр): записи «Создан» (статус-пилюля, срок, сумма) и «Изменён» (строки «Статус / Срок оплаты / Сумма: было → стало»), у каждой дата-время и автор; `OrderMoneyTab` получает `users` из `snapshot`. Автор (в колонке и в окне) скрыт, если роль не видит `header.author` (`customer-orders-page.tsx` передаёт `visibility["header.author"]`, по умолчанию виден).
- [x] `tests/unit/order-money.test.ts` -- маппинг новых полей и `paymentHistoryChanges` по матрице.
- [x] `docs/features/logistics.md` -- обновить пункты про карточку «Деньги», `store_order_payment_event` и список миграций.

**Acceptance Criteria:**
- Given заказ 936 во вкладке «Деньги», when платёж добавлен, then в строке «Создан» — текущие дата-время и «Демо-пользователь».
- Given платёж, у которого меняли статус, срок и сумму, when нажата «История», then окно показывает создание и каждое изменение по порядку с автором и временем.
- Given изменились только срок или сумма, when открыта лента «Комментарии», then нового системного сообщения о платеже нет.

## Implementation Notes

- Миграция переименована в `20261008170000_…`: префикс `20261008160000` занят параллельной `store_role_visibility`.
- `DialogShell`: `submitLabel` / `onSubmit` необязательны — окно просмотра с одной кнопкой `dismissLabel`.
- Окно истории хранит id платежа, а не объект (свежие данные после `reload`).
- Триггер проверен на живой базе в откатываемой транзакции: create → один update на срок+сумму → повторное сохранение без события → update статуса; в ленту попадает только смена статуса.
- Итерация 1 исправлена напрямую в родительском агенте (мелкие правки + коррекция живой базы).

## Spec Change Log

- Итерация 1. Триггер: ревью (blind, edge-case, verification-gap) — бэкфилл `prev_status = 'planned'` противоречил замороженной матрице («старое событие: `prev_*` пусты») и выбрасывал возвраты в «Запланирован» из ленты; заказчик (режим `store_role_visibility`, появился параллельно) видел автора в новой колонке и окне. Изменено: задача миграции — `prev_*` старых событий не трогаем, `create` только для платежей без событий; задача UI — автор скрыт по `header.author`. Избегаем: выдуманного «было» и статуса создания, утечки автора заказчику. KEEP: схему (`created_by`, `kind`, `prev_*`, `changed_by`), триггер, payload, маппинг, `paymentHistoryChanges`, вёрстку колонки и окна, `DialogShell` без кнопки отправки — всё работает и проверено.

## Review Triage Log

| # | Находка | Вердикт | Обоснование | Маршрут |
|---|---------|---------|-------------|---------|
| 1 | Бэкфилл `prev_status='planned'` искажает «было» в цепочках | medium | Расходится с замороженной матрицей; в живой базе 1 событие, но правило неверно | bad_spec |
| 2 | Бэкфилл выбрасывает возврат в «Запланирован» из ленты, пустое «Изменён» | medium | `prev_status = status` → фильтр ленты и `paymentHistoryChanges` дают пусто | bad_spec (с №1) |
| 3 | `create` бэкфилла со статусом `planned` для платежа со старым событием — выдумка | medium | Исходный статус неизвестен (`p_status` допускает любой) | bad_spec (с №1) |
| 4 | Комментарий `prev_status` противоречит бэкфиллу | low | Следствие №1 | bad_spec (с №1) |
| 5 | Автор виден заказчику (колонка «Создан», окно) | medium | `header.author` скрыт у заказчика по `store_role_visibility` | bad_spec |
| 6 | Изменение суммы < `MONEY_EPSILON` скрывается | low | numeric(18,4) допускает 0,001; прямая правка — точное сравнение | patch |
| 7 | Пустое окно во время анимации закрытия | low | `payment` → null сразу при закрытии; заметно на каждом закрытии | patch |
| 8 | `createIntents` без `onSubmit` → «undefined и закрыть» | low | Типы теперь допускают; прямая правка условия | patch |
| 9 | Порядок миграций в docs | low | `170000` перед `160000` | patch |
| 10 | Нет теста смены статуса при известном `prevStatus` | — | gap, pre-verified | patch |
| 11 | `null` в массиве `history` роняет маппинг | false | SQL `jsonb_agg(jsonb_build_object…)` не даёт null-элементов | reject |
| 12 | `store_current_user_id()` может вернуть NULL в миграции | false | Функция — `select 1::bigint` | reject |
| 13 | Клиентская сортировка по строкам ISO ненадёжна | false | Все `changed_at` сериализует один Postgres в одном формате; SQL уже упорядочил | reject |
| 14 | Платежи перемещений в OMS-payload без `created_at`/`history` | false | Вкладка «Деньги» перемещения читает `store_order_money_payload`, где поля есть | reject |
| 15 | «было → стало» не озвучивается скринридером | low | Редко встречается, правка добавляет разметку | reject |
| 16 | SQL-часть не покрыта тестами | low | Инфраструктуры SQL-тестов нет; триггер проверен откатываемой транзакцией на живой базе | reject |

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images` -- expected: всё зелёное

**Manual checks:**
- Браузер: `/store/logistics/customer-orders/936#money` — колонка «Создан», «История» на пробном платеже после смены статуса/срока/суммы; затем удалить пробный платёж и его события в `store_order_payment_event` (в демо-базе ничего не оставлять).
