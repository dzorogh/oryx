---
title: 'Магазин: целостность денег и оформления заказа из корзины'
type: 'bugfix'
created: '2026-10-08'
status: 'done'
baseline_commit: '5a767385903417b13ddfb102dabcf985dee74da3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/features/store-cart-checkout.md'
  - '{project-root}/docs/conventions/code/store-module-layers.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Оформление заказа из корзины меняет глобальный справочник курсов, доверяет цене из браузера, может создать дубль заказа при повторной отправке, теряет количество, изменённое во время отправки, и показывает суммы без округления, расходящиеся с сервером. Удалённые/архивные варианты и сбои загрузки превращают строки корзины в «вечные» и безымянные.

**Approach:** RPC оформления пишет курсы только в снимок денег своего заказа и принимает ключ идемпотентности; клиент шлёт те же курсы, по которым считал суммы, блокирует правки на время отправки, вычитает отправленное количество и округляет суммы до копеек. Корзина и оформление явно показывают удалённые и неизвестные строки и позволяют их убрать.

**Decisions (из ответов пользователя):** курсы — только в снимок `store_order_money.rates` заказа, справочник `store_currency` не трогаем (касается всех RPC создания заказов: `store_checkout_customer_order`, `store_create_customer_order`, `store_create_production_order`); историю миграций можно переписывать — но в этой волне только новые миграции, склейка истории — волна 4. Цена строки — всегда из БД на момент оформления (дилерская цена региона; для хаба + расходы на поставку `store_product_supply_cost`), цена из браузера игнорируется; товар без дилерской цены или со статусом не `available` в регионе — ошибка блока.

## Boundaries & Constraints

**Always:** все тексты UI на русском; коды площадок/хабов, без названий; новые миграции через MCP `oryx-supabase` на демо-БД и файлом в `supabase/migrations/`; чистая логика — в `checkout-model.ts` / `cart-store.ts` с unit-тестами `node:test`.

**Never:** не трогать прайс-листы (`components/store/pim/pricelists/**`); не добавлять авторизацию/RLS; не менять процесс «плавающих курсов» (`useFloatRatesOnOpen`) кроме того, куда они пишутся; не оставлять тестовых заказов в демо-БД.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Курсы | «Оформить» с плавающими курсами | Курсы в `store_order_money.rates` нового заказа; `store_currency.rate` не изменился | Плавающие не загрузились → шлём fallback-курсы, по которым считали ≈ |
| Повтор | Тот же ключ блока отправлен дважды (потерян ответ) | Второй вызов возвращает уже созданный заказ, второго заказа нет | — |
| Правка во время отправки | Блок «Оформляется…» | Количество и галочки блока недоступны | — |
| Частичное вычитание | В корзине 6, отправлено 4 (другая вкладка добавила 2) | В корзине остаётся 2 | — |
| Копейки | Цена хаба 2577.15 × 3 | Строка 7731.45; итоги = сумма округлённых строк | — |
| Удалённый вариант | В корзине id варианта, удалённого/архивного | Строка «Товар удалён» с кнопкой «Убрать» | — |
| Неизвестный id | Нечисловой id в localStorage | Отбрасывается, остальная корзина грузится | — |
| Пустой ввод | Стёрли количество и ушли из поля | Количество возвращается к прежнему | — |
| Сбой каталога корзины | Запрос упал | Баннер с «Повторить»; повтор перезапрашивает | — |
| Остатки неизвестны | Остатки не загрузились | Нет «0 из наличия», разбивка не показывается | — |
| Хаб чужого региона | RPC с хабом, не принадлежащим региону | Ошибка «Склад не относится к региону» | Показ в окне результата |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260928165138_store_code_prefix_registry.sql` -- последнее тело `store_checkout_customer_order` (копировать в новую миграцию).
- `supabase/migrations/20260925190000_store_order_money.sql` -- `store_apply_currency_rates` (глобальная запись, удалить), `store_create_customer_order`, `store_create_production_order` (последние тела), `store_set_order_rates` (образец слияния курсов в снимок).
- `store_order_money_init` (триггер, `20260929120000`) -- создаёт снимок курсов при вставке подтипа: слияние курсов делать ПОСЛЕ вставки `store_customer_order` / `store_production_order`.
- `store_insert_line` / `store_resolve_line_price` -- валюта строки из дилерской цены региона; клиентская цена перекрывает сумму.
- `src/features/store/cart/checkout-api.ts` -- RPC-обёртка; добавить ключ, проверку пустого ответа.
- `src/features/store/cart/checkout-model.ts` -- `applySupplyCost`, `lineTotal`, итоги, `submitCheckoutBlocks`.
- `src/features/store/cart/cart-store.ts` -- чистые операции корзины (добавить вычитание количества).
- `src/features/store/cart/cart-context.tsx` -- снапшот каталога (`requested` никогда не сбрасывается), `removeVariants`.
- `src/features/store/cart/cart-catalog.ts` -- фильтр id, удалённые варианты, порядок `store_product_supply_cost`.
- `src/features/store/cart/cart-quantity-control.tsx` -- пустой ввод → 0.
- `src/features/store/checkout/store-checkout-page.tsx` -- `submitBlock` (строка ~230), `rates` (~121, ~238), `hubReady` (~154), остаток (~533), «Supply costs» (~476, ~498).
- `src/features/store/product-card/store-product-card-page.tsx` -- причина блокировки «В корзину» без проверки `deletedAt` (~553).
- `tests/unit/cart-checkout.test.ts` -- существующие тесты модели; расширять.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261008180000_store_order_rates_snapshot_and_checkout_key.sql` -- функция `store_merge_order_rates(doc, rates)` (без assert); новые тела трёх RPC создания: вместо `store_apply_currency_rates` — слияние в снимок после вставки подтипа; `drop function store_apply_currency_rates`; колонка `store_customer_order.checkout_key text` + уникальный индекс; `store_checkout_customer_order(..., p_checkout_key text default null)` возвращает существующий заказ по ключу; проверки: регион активен, хаб `= store_region.hub_warehouse_id` региона; цена строки считается на сервере (дилерская × (1 + поставка%) для хаба, округление до копеек), `unit_price` клиента игнорируется -- курсы, дубли, цена
- [x] `src/features/store/cart/checkout-model.ts` -- округлять `lineTotal`, итоги поставки и валютные итоги через `roundMoney`; `checkoutBlockKey(block, lines)` — детерминированный ключ из региона, источника и строк -- копейки, идемпотентность
- [x] `src/features/store/cart/cart-store.ts` -- `subtractCartQuantities(lines, submitted)` -- частичное вычитание
- [x] `src/features/store/cart/cart-context.tsx` -- `subtractSubmitted`; `retryCatalog()` сбрасывает упавшие id; `catalogError` не гаснет, пока есть незагруженные id; `missingVariantIds` (запрошены, но не вернулись) -- удалённые и повтор
- [x] `src/features/store/cart/cart-catalog.ts` -- только `^\d+$` id; Supabase не настроен → ошибка, не `[]`; `.order("product_variant_id").order("region_id")` -- данные
- [x] `src/features/store/cart/checkout-api.ts` -- `checkoutKey`, `rates`, пустой ответ → ошибка -- контракт
- [x] `src/features/store/cart/cart-quantity-control.tsx` -- пустой ввод восстанавливает количество -- поведение
- [x] `src/features/store/checkout/store-checkout-page.tsx` -- курсы = те, что в UI; блокировка строк блока при отправке; вычитание вместо удаления; удалённые строки «Товар удалён» + «Убрать» и кнопка «Убрать» у заблокированных строк остатка; имя-фолбэк — код товара; `hubReady = null`, пока остатки не загружены; «Повторить» для каталога; «Supply costs» → «Расходы на поставку» -- поведение
- [x] `src/features/store/product-card/store-product-card-page.tsx` -- архивный вариант нельзя положить в корзину -- данные
- [x] `src/features/store/cart/cart-sheet.tsx` -- удалённые строки и «Повторить» так же, как в оформлении -- согласованность
- [x] `tests/unit/cart-checkout.test.ts` -- кейсы матрицы: копейки, ключ блока, вычитание, `adjustCartPack`/`removeCartLines`/сериализация, пропуск пустого блока -- регрессия
- [x] `docs/features/store-cart-checkout.md` -- исправить фразу про «одну площадку»; описать курсы-снимок, ключ, удалённые строки -- документация

**Acceptance Criteria:**
- Given демо-БД, when оформляю блок, then `store_currency.rate` до и после совпадает, а `store_order_money.rates` заказа содержит отправленные курсы.
- Given один блок площадки, when смотрю страницу, then кнопка оформления одна (у блока или в подвале — не обе).
- Given заказы созданы для проверки, when проверка закончена, then они удалены из демо-БД.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Слой | Находка | Вердикт | Маршрут | Доказательство |
|---|------|---------|---------|---------|----------------|
| 1 | blind | `checkout_key` со всей подписью строк упирается в лимит строки btree-индекса | low | patch | Ключ рос линейно с числом строк; теперь отправляется только id попытки. |
| 2 | blind, edge | Защита от дубля живёт только в открытой странице; перезагрузка или правка после ошибки дают новый ключ | low | patch | `attemptKeysRef` в памяти; документ уточнён: «пока страница открыта, перезагрузка — новая попытка». |
| 3 | blind, edge | Попадание по ключу пропускает проверки региона и хаба | low | reject | Ключ — свежий uuid попытки, совпадает только при повторе той же отправки; отклонять уже созданный заказ нет смысла. |
| 4 | blind, edge | `roundMoney` на float округляет половину копейки вниз (0.505 → 0.50), сервер — 0.51 | medium | patch | Воспроизводится на 10.10 × 5 %; округление через `toPrecision(15)`, тесты добавлены. |
| 5 | blind | Сервер не проверяет кратность упаковке и дубли варианта в `p_lines` | medium | defer | Было до изменения; кратность задаёт клиент, дубли корзина не порождает. |
| 6 | blind | Без env Supabase баннер «Повторить» в корзине висит всегда | low | reject | Ошибка без бэкенда задана спекой; текст ошибок загрузки — волна 3. |
| 7 | blind | В шторке у «Товар удалён» можно увеличить количество | low | patch | `CartQuantityControl` без `disableIncrease`; добавлено. |
| 8 | blind | «Товар в архиве.» на карточке и «Товар удалён» в корзине | low | reject | Мелкий недочёт формулировки, вне объёма по решению пользователя. |
| 9 | blind | Сбой загрузки остатков на оформлении не виден, показывается 0 | medium | defer | Состояния ошибок загрузки — волна 3. |
| 10 | blind | Разное форматирование денег в шторке и на оформлении | low | reject | Косметика, вне объёма. |
| 11 | blind | Мёртвое поле `unitPrice` в `CheckoutOrderLineInput` | low | patch | Не отправлялось; удалено из типа и сборки строк. |
| 12 | blind, edge | В снимок заказа попадают ~150 кодов floatrates | low | patch | `fetchFloatRates()` без `codes`; `store_merge_order_rates` пропускает коды вне справочника, проверено пробой с откатом (XAU отброшен). |
| 13 | blind | При «Оформить всё» все кнопки «Оформляется…» | low | reject | Задумано: при пакетной отправке блокируются все блоки. |
| 14 | blind, vg | Нет тестов миграции (ключ, цена, курсы, хаб) | medium | defer | SQL-тестов в репозитории нет; разово проверено на демо-БД транзакцией с откатом: тот же id, 1 документ, цена 84432.48 при клиентской 1, справочник не изменён, чужой хаб отклонён. |
| 15 | edge | «abc» в поле количества даёт 0 и удаляет строку | medium | patch | `inputMode="numeric"` не мешает вводу на десктопе; нечисловое теперь восстанавливает значение, тест добавлен. |
| 16 | edge | id с ведущими нулями «012» не сопоставится | false | reject | `localStorage` пишет только код корзины из числовых id каталога. |
| 17 | edge | Запасной курс USD ≠ 1 ломает оформление | false | reject | В демо-БД `store_currency.USD = 1`. |
| 18 | edge | Шторка позволяет менять количество во время отправки | false | reject | Отправляется снимок строк, из корзины вычитается отправленное — остаток верен. |
| 19 | edge | Нечисловой ввод противоречит «пустой ввод восстанавливает» | medium | patch | То же, что 15. |
| 20 | vg | Связка страницы (курсы, удаление ключа, одна кнопка) без тестов | low | reject | Тестов компонентов нет; ручная проверка в браузере. |
| 21 | vg | Округление площадок и `orderCurrencyTotal` без точных тестов | low | patch | Добавлен случай 2577.15 × 3 и точное сравнение. |
| 22 | vg | «Товар удалён» в остаток проверен только для хаба | low | patch | Тест расширен на площадки и регион без хаба. |
| 23 | vg | Загрузчик каталога и `disableIncrease` без тестов | low | defer | Тестов компонентов нет; правило дублировано в `onChange` карточки. |

## Verification

**Commands:**
- `npm run typecheck && npm run lint && npm test` -- без новых ошибок; store-тесты зелёные
- `npm run build && npm run check:docs` -- успешно

**Manual checks (if no CLI):**
- Браузер `/store/checkout`: оформить блок хаба и площадки, проверить окно результата, остаток корзины, блокировку при отправке; затем удалить созданные заказы.
