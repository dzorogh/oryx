---
title: 'Деньги заказов и платежи в календаре выпусков'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
baseline_commit: 'a13555c50d1987088c69047cfa135a801ca1501a'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-order-money-payments-calendar/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-order-money-payments-calendar/money-rules.md'
  - '{project-root}/_bmad-output/specs/spec-order-money-payments-calendar/calendar-money-rows.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** У PO и заказа клиента нет денег (валюта, курсы, сумма, график оплат), а календарь выпусков показывает только штуки — исходящие платежи заводам и входящие оплаты клиентов по месяцам не видны.

**Approach:** Реализовать канонический контракт `_bmad-output/specs/spec-order-money-payments-calendar/` (SPEC.md + money-rules.md + calendar-money-rows.md, CAP-1…CAP-10) целиком: одна модель денег для обоих видов заказа, вкладка «Деньги» в карточке, денежные группы, раскрытие месяцев по дням и три панели фильтров в календаре, настройка «Валюта производств», демо-данные.

## Boundaries & Constraints

**Always:** Контракт — файлы спека выше; при расхождении с этим документом прав контракт. Запись только через security definer RPC `store_*`; anon — SELECT. Курсы floatrates запрашивает браузер и передаёт в RPC создания (`p_rates`), RPC обновляет ими `store_currency.rate`; без `p_rates` снимок берётся из `store_currency.rate`. Формулы денег — один чистый TS-модуль; SQL отдаёт сырые факты. Заводы — `PLT-n`, регионы — `store_region.code`, подписи на русском.

**Never:** Сальдо, автостатусы, исторические курсы, частичные оплаты, предупреждение «платежей больше суммы», интеграции кроме floatrates, названия заводов вне каталогов, сохранение раскрытия месяцев в URL/localStorage.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Создание при доступном floatrates | окно создания PO/заказа клиента открыто | снимок = ответ floatrates для валют `store_currency`, USD = 1; `store_currency.rate` обновлён | N/A |
| floatrates недоступен | fetch упал | окно показывает «Курсы не загрузились — возьмём последние сохранённые»; снимок = `store_currency.rate` | создание не блокируется |
| Пустая сумма заказа | amount = null | сумма = расчётная стоимость | N/A |
| Строка без цены | unit_price = null | вклад 0 | N/A |
| Платежей больше суммы | Σ платежей > суммы | в карточке «Не распределено» < 0 красным; в календаре вклад 0 | N/A |
| Смена валюты заказа | CNY → USD | числа суммы и платежей те же, код новый; расчётная пересчитана по снимку | N/A |
| Просрочка | срок < сегодня, статус ≠ paid | метка в карточке, красная ячейка в календаре, месяц в диапазоне | N/A |
| Отменённый заказ | status = cancelled | платежи не в календаре, статусы не меняются | N/A |
| Курс ≤ 0 | ручная правка | отказ RPC | тост с ошибкой |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260922200000_store_baseline.sql:152` -- `store_currency` без курса; `store_region.default_dealer_currency_id`; `store_document_product_line.unit_price/currency_id` (снимок цены строки, менять запрещено триггером).
- `supabase/migrations/20260923203000_store_reservations_in_outputs_fixups.sql:8` -- актуальный `store_create_production_order(bigint, jsonb, text, date, text, bigint, bigint, timestamptz)`; вызывается позиционно из `store_order_plan*` SQL (сигнатуру только расширять хвостом с default).
- `supabase/migrations/20260925150000_store_dialogs_warehouse_kind_and_order_source.sql:270` -- актуальный `store_create_customer_order(..., p_source_kind, p_source_id)`; образец drop/revoke/grant на 268/404.
- `supabase/migrations/20260924181000_store_order_plan.sql:857` -- актуальный `store_document_context`; сюда добавить `order_money` / `order_payments` для PO и заказа клиента.
- `supabase/migrations/20260924170000_store_output_status_planned_done.sql:101` -- актуальный `store_output_calendar_page`; добавить `productionCurrency`, `moneyOrders`, `payments`, `code` у регионов.
- `supabase/migrations/20260925120000_store_catalog_code_prefix.sql` -- образец таблицы настроек: RLS select, revoke/grant, команда-RPC.
- `src/features/logistics/logistics-api.ts` -- `rpc`/`rpcJson` (137–150), `createProductionOrder` (1419), `createCustomerOrder` (1355), `createProductionOrderWithDraftOutput` (1251), `loadLogisticsSettings` (179), `mapLogisticsPayload` + `orderPlan` (259–268, 658–709, 876), `loadOutputCalendarPage` (1064).
- `src/features/logistics/use-logistics-store.ts:106` -- как `orderPlan` пробрасывается в страницу; так же пробросить деньги.
- `src/features/logistics/production-orders-page.tsx:381-600`, `customer-orders-page.tsx:363-718` -- карточки: `DocumentHeader` + `DocumentTabs`; действия через `runLogisticsAction` (`ui/run-action.ts`) с reload.
- `src/features/logistics/ui/production-order-catalog-dialog.tsx:135`, `ui/customer-order-catalog-dialog.tsx:267` -- окна создания.
- `src/features/logistics/output-calendar.ts` -- чистая логика календаря (`computeMonthRange`, `monthCell`, фильтры); `output-calendar-page.tsx`, `ui/output-calendar-matrix.tsx`, `ui/output-calendar-toolbar.tsx` (панель `OutputCalendarOwnersPanel` — `<aside w-[380px]>`), `ui/output-calendar-create-dialog.tsx` (дата по умолчанию `lastDayOfMonthIso`).
- `src/features/store/store-settings-page.tsx` -- страница настроек.
- `src/features/logistics/logistics-codes.ts:103-123` -- `formatLogisticsCode`, `regionCatalogCode`.
- `scripts/seed-logistics.mjs`, `scripts/lib/seed-logistics-stories.mjs` -- сид через RPC service role; валюты вставляются if-missing (48–60, 188–196); PO-901…920, OMS-901…910, 70 JSON-заказов на `ae`.
- `tests/unit/output-calendar.test.ts` -- стиль unit-тестов (`node:test`, фикстура).
- `docs/features/logistics.md:100-146` -- разделы календаря и настроек.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260925190000_store_order_money.sql` -- `store_currency.rate numeric > 0` (+ курсы известных кодов); синглтон `store_setting(production_currency_id)`; `store_order_money(document_id PK, currency_id, amount null, rates jsonb {CODE: rate})`; `store_order_payment(id, document_id, due_on, amount > 0, status planned|invoiced|paid)`; AFTER INSERT триггеры на `store_production_order`/`store_customer_order` создают деньги (валюта производств / дилерская региона, снимок из `store_currency.rate`); `p_rates jsonb default null` в обе create-RPC (обновляет курсы до вставки); команды `store_set_order_currency`, `store_set_order_amount`, `store_set_order_rates`, `store_save_order_payment`, `store_delete_order_payment`, `store_set_production_currency`; backfill существующих заказов; `store_document_context` и `store_output_calendar_page` отдают деньги; RLS/гранты по образцу -- модель и запись.
- [x] `src/features/logistics/order-money.ts` -- типы, `convert`, `estimatedCost`, `orderTotal`, `unallocated`, `isPaymentOverdue`, `formatOrderMoney`, метки статусов, `fetchFloatRates` -- единый источник формул.
- [x] `src/features/logistics/logistics-api.ts`, `logistics-types.ts`, `use-logistics-store.ts` -- мапинг денег из контекста, команды, `p_rates` в create, загрузка/сохранение валюты производств.
- [x] `src/features/logistics/ui/order-money-tab.tsx` -- вкладка «Деньги»: валюта, расчётная стоимость, сумма заказа, «Не распределено» (красное < 0), таблица платежей (добавить/изменить/удалить/статус, метка «просрочен»), курсы снимка с правкой; подключить в обе карточки.
- [x] окна создания PO и заказа клиента -- запрос floatrates при открытии, строка о статусе курсов, передача `rates`.
- [x] `src/features/logistics/output-calendar.ts` -- колонки месяцев/дней, денежные строки, диапазон с платежами, три фильтра.
- [x] `output-calendar-page.tsx`, `ui/output-calendar-matrix.tsx`, `ui/output-calendar-toolbar.tsx` (+ панели) -- группы «Платежи заводам» / «Поступления от клиентов», hover-расшифровки, раскрытие месяцев, три кнопки и панели; «+» в днях ставит дату дня.
- [x] `src/features/store/store-settings-page.tsx` -- карточка «Валюта производств».
- [x] `scripts/seed-logistics.mjs`, `scripts/lib/seed-logistics-stories.mjs` -- курсы валют, валюта производств, суммы/графики по CAP-10; закрытым и JSON-заказам — оплаченный платёж на полную сумму.
- [x] `tests/unit/order-money.test.ts`, `tests/unit/output-calendar.test.ts` -- формулы, матрица I/O, денежные ячейки, диапазон, сумма дней = месяц.
- [x] `docs/features/logistics.md` -- деньги заказа, календарь, настройка.

**Acceptance Criteria:**
- Given демо после `npm run seed:logistics`, when планировщик раскрывает октябрь, then в одной таблице видны выпуски по дням, красная просрочка у `PLT-2` и поступление региона в валюте производств, а при наведении — номера заказов.
- Given карточка PO, when срок платежа перенесён и календарь обновлён, then сумма стоит в новом дне.
- Given фильтр одной панели изменён, when смотрим другие группы, then их строки не меняются, а иконка кнопки тёмная.
- Given валюта производств сменена в настройках, when открыт календарь и создан новый PO, then суммы календаря и валюта PO — в новой валюте.

## Implementation Notes

- Миграция `20260925190000_store_order_money.sql` применена к Oryx Supabase; `store_currency.rate` — `not null default 1`; снимок включает все активные валюты (у каждой есть курс).
- `npm run seed:logistics` перезапущен: демо пересоздано (ручные PO-921…930 на демо-стенде стёрты сидом — это штатное поведение сида).
- Префикс завода на демо-стенде задан как `SH`, поэтому `PLT-2` из спека отображается как `SH-2`.
- Окно «Новый заказ на производство» из календаря floatrates не запрашивает — снимок из `store_currency.rate` (спек требует запрос только в двух окнах создания).
- Проверено: `npm test` (падает только старый `document-timeline` «reservation», как и на базовом коммите), typecheck, build, check:docs, check:static-images; lint — 4 старые ошибки в tracker/comments; check:deps падает из-за устаревших версий пакетов. SQL-проба в откатываемой транзакции: снимок = `p_rates`, курс 0 отклоняется, смена валюты не меняет сумму платежа.

## Spec Change Log

## Review Triage Log

| # | Источник | Замечание | Вердикт | Доказательство / маршрут |
|---|---|---|---|---|
| 1 | blind, edge | Строка дней в шапке липнет к `top:0` и перекрывает строку месяцев | false | В Chrome при scrollTop=600 строка дней на 28 px ниже верха (под строкой месяцев), перекрытия нет |
| 2 | blind, edge×2 | Нет курса в снимке → сумма молча 0 | low | Нужна валюта, добавленная после создания заказа; UI добавления валют нет. Отклонено: редко, фикс добавляет ветки |
| 3 | edge | Escape в «Сумма заказа» сохраняет правку | medium | `commit` на blur читает старый `draft` до ре-рендера. patch |
| 4 | blind, edge | Создание, пока floatrates грузится, уходит с `rates: null` | medium | `submitDisabled` не учитывает `loading`; нарушает строку матрицы «при доступном floatrates». patch |
| 5 | blind | `store_apply_currency_rates` падает на чужой плохой курс | false | `fetchFloatRates` уже отбрасывает нечисловые и ≤ 0 курсы, из приложения такое не приходит |
| 6 | blind | Курсы браузера перезаписывают `store_currency.rate` без проверки | false | Так требует контракт (CAP-2, money-rules) |
| 7 | blind | Отменённый заказ редактируется без пояснения | low | Контракт разрешает; косметика. Отклонено |
| 8 | blind, edge | Удаление платежа без подтверждения; двойной клик — тост ошибки | low | Косметика, отклонено |
| 9 | blind, edge | Курс 0 уходит на сервер без локальной проверки | low | Сервер отклоняет с понятным текстом. Отклонено |
| 10 | blind | Сид даёт второй платёж story-заказу в `done` | false | В `done` только PO-910…915 и OMS-901, их `apply` не трогает |
| 11 | blind | Панель «Поступления» показывает заказы скрытых регионов | low | Косметика, отклонено |
| 12 | blind, edge | «Сбросить» в «Выпуски» не сбрасывает завод | false | «Сбросить» — «снять все», как раньше; иконка и так тёмная после снятия владельцев |
| 13 | blind | Нет итогов и сальдо в денежных группах | false | Сальдо — non-goal, итоги контракт не требует |
| 14 | blind, edge | Сбой загрузки валют ломает всю страницу настроек | low | Редко, отклонено |
| 15 | blind | Фолбэк на USD прячет ошибки данных | low | Отклонено |
| 16 | blind | Двойной смысл «Не распределено»; «Нет товаров» под деньгами | low | Смысл колонки задан контрактом; отклонено |
| 17 | blind | Счётчик вкладки включает оплаченные | low | Косметика, отклонено |
| 18 | blind, vg | SQL-правила денег без автотестов | medium | В прототипе нет БД-харнесса; проверено SQL-пробой с откатом. defer |
| 19 | blind | `todayIso` по локальной дате; floatrates без кэша | low | Отклонено |
| 20 | edge | `parseMoneyInput("1,234.56")` → null | low | Русский UI, отклонено |
| 21 | edge, vg | Удалённая валюта: карточка и календарь считают по-разному | low | Нужна мягко удалённая валюта в строках — UI нет. Отклонено |
| 22 | edge | Типы денег не в `logistics-types.ts` | false | Типы в `order-money.ts`, вреда нет |
| 23 | vg | `npm test` не в списке проверок AGENTS.md, набор уже красный | medium | Правка AGENTS.md и старый тест `document-timeline` — defer |
| 24 | vg | `summarizeOrderMoney` / `orderMoneyLines` без тестов | medium | Пред-проверено ревьюером. patch |
| 25 | vg | Сид дублирует формулу расчётной стоимости | low | `.mjs` не импортирует TS; отклонено |

## Design Notes

- Снимок курсов — `rates jsonb` вида `{"USD":1,"CNY":7.12,...}` (единиц за 1 USD); `convert = amount / rates[from] * rates[to]`. Валюты без курса в снимок не попадают; выбор валюты заказа — из кодов снимка.
- Триггер на вставку подтипа покрывает все пути создания (окна, календарь, план заказа клиента, сид) без правки каждого вызова.
- Календарь получает по заказу `lineTotals` (Σ unit_price×qty по валюте строки без конвертации), `amount`, `rates`, `currencyCode`; расчёт в TS. Заголовок раскрытого месяца — ячейка с colspan над днями (вторая строка шапки).
- Размещение в карточке — отдельная вкладка «Деньги» после «Товары» + поле «Сумма заказа» в шапке. Валюта производств по умолчанию в миграции — USD, в сиде — CNY.

## Verification

**Commands:**
- `npm test` -- все тесты зелёные, включая новые.
- `npm run lint && npm run typecheck && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images` -- без ошибок.

**Manual checks (if no CLI):**
- Миграция применена на Oryx Supabase (MCP `apply_migration`), `npm run seed:logistics` прошёл; в браузере проверены карточка PO, карточка заказа клиента, календарь (группы, раскрытие октября, три панели, hover), настройки.
