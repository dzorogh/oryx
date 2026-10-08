---
title: 'Список заказов клиента: сумма, оплата, выполнение, закрыт, позиций'
type: 'feature'
created: '2026-10-08'
status: 'done'
baseline_commit: '0cd7281d812ba32062517aa773ab9f4db753a379'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/conventions/ui/list-page-toolbar.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** В списке `/store/logistics/customer-orders` нет денег заказа и наглядного выполнения: сумму, долю оплаты и ближайший платёж видно только в карточке, а четыре числовые колонки количества занимают ширину.

**Approach:** RPC `store_customer_order_list()` дополнительно отдаёт деньги заказа (валюта, ручная сумма, курсы, итоги строк по валютам), суммы платежей, дату закрытия и число позиций; список считает сумму и оплату теми же хелперами, что карточка, и показывает полосу «Выполнение» как в шапке карточки.

Решения пользователя: колонки «Сумма», «Оплата» (подробная), «Выполнение» вместо четырёх числовых, скрытые по умолчанию «Закрыт» и «Позиций». Группировок не добавлять. «В производстве» и смену формулы «Не обеспечено» не делать. Четыре числовые колонки не удаляются, а становятся скрытыми по умолчанию (доступны в «Колонки»).

## Boundaries & Constraints

**Always:** Сумма = ручная `amount`, иначе расчётная (`estimatedCostFromTotals` по снимку курсов заказа), расчётная помечается «≈». Оплата = `summarizePayments` от этой суммы. Полоса — сегменты отгружено / в резерве / не обеспечено (только для открытых), цвета как в `FulfillmentPanel`. Тексты на русском. Сортировка суммы — в USD через `convert` по курсам заказа.

**Never:** Группировки; колонка «В производстве»; изменение `openToReserve`; правка карточки заказа; новые фильтры.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ручная сумма | `amount` задан | «12 345 ¥», без «≈» | N/A |
| Расчётная | `amount` null, у строк есть цены | «≈ 9 800 $» | N/A |
| Нет цен и суммы | `amount` null, `lineTotals` пуст | «—», сортировка в конце | N/A |
| Нет графика | `payments` пуст | «Нет графика» приглушённо | N/A |
| Частично, просрочен | один `paid`, неоплаченный со сроком в прошлом | «40 %» и «до 25.09» красным | N/A |
| Оплачен полностью | все `paid` | «100 %», без даты | N/A |
| Нет курса | валюта строки без курса | строка добавляет 0 (как в карточке) | N/A |
| Закрыт | статус done/closed | дата первого done-снимка последней серии в истории | открытый — «—» |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261008150000_store_customer_order_list_filters.sql` -- текущая версия RPC; новая миграция копирует её и добавляет поля.
- `supabase/migrations/20261005160000_store_pages_base_product.sql:193-215` -- образец `lineTotals` (`sum(unit_price*quantity)` по `currency_id`) и `store_order_money` + `store_currency`.
- `store_document_history` (status, changed_at) -- источник даты закрытия; логика как `documentCompletedAt` в `src/features/logistics/document-timeline.ts:248`.
- `src/features/logistics/order-money.ts` -- `estimatedCostFromTotals`, `orderTotal`, `summarizePayments`, `convert`, `formatOrderMoney`, `mapOrderRates`; переиспользовать, не дублировать.
- `src/features/logistics/customer-order-oms.ts` -- `fulfillmentSegments`, `headerPercent`.
- `src/features/logistics/ui/customer-order-header.tsx:137-182` -- образец полосы и легенды; карточку не менять.
- `src/features/logistics/customer-order-list-filters.ts` -- `customerOrderPaymentState`, фильтры оплаты; фильтры работают с `payments[].status/dueOn`, добавление `amount` их не ломает.
- `src/features/logistics/logistics-list-types.ts`, `logistics-api.ts` (`mapCustomerOrderListRow`) -- тип и маппер строки.
- `src/features/logistics/customer-orders-page.tsx` -- `customerOrderColumns`.
- `tests/unit/logistics-payload-mapper.test.ts`, `tests/unit/customer-order-list-filters.test.ts` -- существующие тесты маппера и фильтров.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/20261008170000_store_customer_order_list_money.sql` -- `create or replace store_customer_order_list()`: поля из 20261008150000 + `money` {`currencyCode`, `amount`, `rates`, `lineTotals`} или null, `payments[].amount`, `completedAt`, `positions`; применить к демо-Supabase -- данные для колонок.
- [ ] `src/features/logistics/logistics-list-types.ts`, `src/features/logistics/logistics-api.ts` -- поля `money`, `payments[].amount`, `completedAt`, `positions` и маппинг -- типобезопасный ряд.
- [ ] `src/features/logistics/customer-order-list-money.ts` -- чистые функции: итог суммы (total, estimated, currency, usd) и оплата (paidPct, nextDueOn, overdue) для строки -- тестируемая логика.
- [ ] `src/features/logistics/customer-orders-page.tsx` + при необходимости `src/features/logistics/ui/customer-order-list-cells.tsx` -- колонки «Выполнение» (видимая, после «Товары»), «Сумма», «Оплата» (видимые), «Закрыт», «Позиций» (скрытые); четыре числовые → `defaultHidden` -- UI.
- [ ] `tests/unit/customer-order-list-money.test.ts`, `tests/unit/logistics-payload-mapper.test.ts` -- кейсы матрицы и маппинг новых полей.
- [ ] `docs/features/logistics.md` -- строка про колонки списка заказов клиента и миграция в списке миграций.

**Acceptance Criteria:**
- Given открыт список, when загрузились данные, then видны колонки Номер, Статус, Товары, Выполнение, Сумма, Оплата, Срок, Регион, Тенант, Создан, а Заказано/Отгружено/В резерве/Не обеспечено/Закрыт/Позиций/Источник включаются в «Колонки».
- Given клик по заголовку «Сумма», then заказы в разных валютах сортируются по эквиваленту в USD.
- Given открытый заказ без отгрузок и резервов, then полоса целиком янтарная, подпись «0 из N шт».

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images` -- expected: всё зелёное.

**Manual checks:**
- Локально `/store/logistics/customer-orders`: колонки по AC, сортировка суммы, сверка суммы и оплаты двух заказов (OMS-907 с просрочкой и любого закрытого) с шапкой их карточек.

## Implementation Notes

- Базовый коммит `0cd7281` оказался без файлов фильтров (`list-filters.ts`, `list-filter-defs.ts` пришли в `99fefe7`); работа перенесена rebase на `687d6d4`, временные копии файлов и проп `filters` удалены. Диффы ревью — от `687d6d4`.
- Миграция переименована в `20261008173000_…`: префикс `20261008170000` занят параллельной `store_order_payment_history`.
- Демо-Supabase: функция применена; `completedAt` по всем 101 заказу сверен с пересчётом по истории; OMS-907 и OMS-4 сверены с карточкой.
- `listId` списка → `customer-orders-v2`, чтобы сохранённые в localStorage колонки не перекрывали новые значения по умолчанию.
- Сортировка «Выполнение» — по доле отгруженного.

## Review Triage Log

| # | Находка | Вердикт | Обоснование / маршрут |
|---|---------|---------|-----------------------|
| 1 | Оплата без суммы заказа даёт 100 % / 0 % | medium | Реально: `headerPercent(paid, 0)`; patch — знаменатель Σ платежей |
| 2 | Полностью оплаченный при погрешности расчётной суммы — 99 % | low | Реально (cap 99 в `headerPercent`); patch — порог `MONEY_EPSILON` |
| 3 | Сохранённые колонки перекрывают новые дефолты | medium | Реально: `use-list-view` пишет `hiddenColumns` после гидрации; patch — `listId` v2 |
| 4 | «до ДД.ММ» без года | low | Реально (в демо есть платёж со сроком 0132 г.); patch — год, если не текущий |
| 5 | Полоса без чисел для читателя | low | Реально, числовые колонки скрыты; patch — `title` с количествами |
| 6 | Док не перечисляет колонки по умолчанию | low | Реально; patch |
| 7 | SQL `completedAt` / ключи JSON не покрыты тестами | low | Пробел верификации; харнесса для RPC нет; ручная сверка 101 заказа выполнена; defer |
| 8 | Конфиг колонок страницы не покрыт тестом | low | Пробел верификации; тестов конфигов страниц нет; проверено в браузере; defer |
| 9 | Отменённый заказ без даты «Закрыт» | false | Так же в карточке (`documentCompletedAt`), «Закрыт» = done/closed, как переключатель |
| 10 | Просрочка красным у отменённых/закрытых | low | Редко, долг остаётся долгом; reject |
| 11 | «≈ 0 ¥» при отсутствии курсов | low | Как в карточке; курсы есть у всех демо-заказов; reject |
| 12 | «10 из 8 шт» при отгрузке больше заказанного | false | `shipped` — нетто по строкам заказа, сверх заказа не отгружается |
| 13 | Повторные вычисления денег на строку | low | 101 строка, чистые функции; reject |
| 14 | Сортировка «Выполнение» только по отгруженному | low | Осознанный выбор, описан в доке; reject |
| 15 | Описание «Закрыт» не упоминает done/delivered | false | Статус `done` в UI называется «Закрыт» |
| 16 | Имя миграции отличается от спека | false | Спек и док обновлены на `…173000` |
