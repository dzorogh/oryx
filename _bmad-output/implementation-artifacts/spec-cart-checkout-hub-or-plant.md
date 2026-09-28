---
title: 'Корзина и оформление заказа — со склада региона или с производственной площадки'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
baseline_commit: '45c0fbb416e4230655106aba98e181ecb64cf094'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/brainstorming/brainstorm-cart-checkout-hub-or-plant-2026-09-28/brainstorm-intent.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-catalog-region-prices-variant-switcher.md'
  - '{project-root}/docs/conventions/ui/place-codes.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Менеджер видит цены и запасы региона, но не может ничего заказать: корзины нет, кнопка тележки в каталоге ничего не делает, движок укладки знает один тип контейнера и не подключён к товарам.

**Approach:** Глобальная корзина (кнопка в рейле, шторка), страница оформления `/store/checkout`, где корзина раскладывается на черновики заказов клиента по способу «Склад региона» / «Производственная площадка», и доработанный движок укладки в смешанные контейнеры. Полное намерение — `brainstorm-intent.md` из `context`; обязательно к исполнению целиком. Пользователь велел не делить спеку и не останавливаться на чекпоинтах.

## Boundaries & Constraints

**Always:**
- Регион — общий `useSelectedRegion`; `RegionProvider` переезжает в корневой layout (рейл глобальный).
- Корзина — localStorage `store-cart` (`[{variantId, quantity}]`), общая между вкладками; количество кратно `quantity_per_unit` (ввод округляется вверх, ≤0 удаляет строку).
- Строка без цены / с `dealer_status = unavailable` / без региона остаётся в корзине, блокируется с причиной из `getPurchaseBlockReason`.
- Цена строки — дилерская региона в её валюте. «Склад региона»: цена × (1 + Supply costs %/100), нет значения → 0%. Площадка — без наценки.
- Площадки и склады — только коды (`PLT-n`, `WH-n`); слово «завод» в новом UI не используется.
- Оформление блока — RPC `store_checkout_customer_order`: заказ клиента в статусе `draft`, источник hub/plant, `unit_price` с наценкой, валюта денег заказа — `store_region.order_currency_id` (иначе дилерская валюта региона), курсы floatrates.
- Итоги: по каждой валюте + «≈ сумма в валюте заказов региона · примерный курс» (floatrates, при ошибке — `store_currency_rates_snapshot`).
- Весь текст интерфейса на русском.

**Never:** связи подзаказов; сроки выпуска; путь клиента/тенанта; деление товара между способами; хранение «из наличия/под заказ»; критерий фрахта и подсказки «добавь N»; блокировка из-за негабарита или отсутствия Supply costs; поломка `/store/orders/[orderId]` (старый калькулятор остаётся на старом API движка).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Смена региона | в корзине 3 строки, kz → de | цены пересчитаны; строка без цены в de — заблокирована с причиной | N/A |
| Хаба не хватает | готово 12, нужно 20 | «12 из наличия · 8 под заказ», наценка на все 20 | N/A |
| Нет Supply costs | пары товар×регион нет | 0%, строка «в т.ч. Supply costs 0%» не показывается | N/A |
| Площадки | товары PLT-3 и PLT-7 | два блока, у каждого свой калькулятор | N/A |
| Нет площадки у товара | `plant_id` null | строка в «Остаются в корзине» с причиной | N/A |
| Коробка не влезает | габарит больше всех выбранных типов | «не помещается», оформление доступно | N/A |
| Снята галочка | строка блока | уходит в свёрнутый «Остаются в корзине» | N/A |
| «Оформить всё» | 3 блока, 1 падает | окно: 2 «создан» со ссылкой, 1 ошибка; созданные строки ушли из корзины | ошибка RPC в строке результата |
| У региона нет хаба | `hub_warehouse_id` null | способ «Склад региона» недоступен с пояснением | N/A |

</frozen-after-approval>

## Code Map

- `src/domain/packing/*` -- текущий движок (один `CONTAINER_DIMENSIONS`, оси: x = `width` вдоль длинной стороны, y = `length`, z = высота, мм). Новый модуль рядом, старый API не трогать.
- `src/features/packing-visualization/components/multi-container-scene.tsx`, `item-mesh.tsx` -- сцена с одним `containerSize`; обобщить на размер у каждого контейнера (обратно совместимо).
- `scripts/data/logistics-demo.json` -- `products[].logistics` (см, кг) по `id` товара = `store_product.id` = id первого варианта (1–207); `containers[]` (мм, кг).
- `src/features/store/region-context.tsx` -- `StoreRegionOption`; добавить `orderCurrency`. `app/layout.tsx`, `app/store/layout.tsx` -- перенос `RegionProvider`.
- `src/features/store/store-catalog-from-logistics.ts` -- `loadRegionPricing(variantIds)` переиспользовать в загрузчике корзины.
- `src/features/store/variant-stock.ts`, `src/components/store/stock/variant-stock-summary.tsx` -- «Готово · Всего» в строках оформления; `ready` = из наличия на хабе.
- `src/components/store/pim/products/catalog/catalog-table.tsx` (`DealerCell`), `catalog-helpers.ts` (`getPurchaseBlockReason`), `catalog-buy-tooltip.tsx` -- кнопка тележки → счётчик.
- `src/features/store/product-card/store-product-card-page.tsx` -- правая панель варианта: добавить кнопку корзины у цены.
- `src/components/layout/nav-rail.tsx` -- футер рейла (над Settings): кнопка корзины со счётчиком.
- `src/features/logistics/order-money.ts` (`convert`, `fetchFloatRates`), `ui/float-rates-status.tsx` (`useFloatRatesOnOpen`, `FloatRatesNote`).
- `src/features/logistics/logistics-api.ts` (`createCustomerOrder`, `updateRegion`), `regions-page.tsx` (диалог региона с хабом) -- образцы; валюта заказов добавляется так же, как хаб.
- `supabase/migrations/20260925190000_store_order_money.sql` -- `store_create_customer_order`, `store_order_money_init`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_store_cart_checkout.sql` -- таблицы `store_product_variant_logistics`, `store_container_type`, `store_product_supply_cost`; колонки `store_product_variant.quantity_per_unit`, `store_region.order_currency_id`; `store_update_region(+p_order_currency_id)`; `store_order_money_init` берёт валюту заказов; RPC `store_checkout_customer_order`; гранты anon.
- [x] `supabase/migrations/<ts>_store_demo_cart_checkout_seed.sql` (генерируется `scripts/generate-cart-checkout-seed.mjs` из снимка) -- логистика всех вариантов (доп. варианты копируют товар), 3 контейнера, Supply costs ≈5–15% (~20% пар без значения), площадки для вариантов без `plant_id`, валюты заказов регионов.
- [x] `src/domain/packing/mixed-containers.ts` + `tests/unit/packing-mixed-containers.test.ts` -- набор типов, критерий «меньше пустоты, при ±2% — меньше контейнеров», коробки, вес, stacking/limit, повороты, max_per_container, негабарит.
- [x] `multi-container-scene.tsx` -- размер на контейнер, подпись кода типа и % заполнения.
- [x] `src/features/store/cart/*` -- `cart-store.ts` (localStorage, чистые функции количества), `cart-context.tsx`, `cart-catalog.ts` (загрузка вариантов: имя, фото, площадка, логистика, упаковка, Supply costs, цены/статусы), `checkout-model.ts` (чистая раскладка блоков, цены, итоги по валютам), `cart-quantity-control.tsx`, `cart-sheet.tsx`, `cart-rail-button.tsx`.
- [x] `tests/unit/cart-checkout.test.ts` -- матрица: кратность, блокировки, раскладка, наценка, «под заказ», итоги.
- [x] `app/store/checkout/page.tsx` + `src/features/store/checkout/*` -- страница оформления: карточки способа, блоки, галочки, «Остаются в корзине», калькулятор контейнеров, кнопки блока и «Оформить всё», окно результата.
- [x] Каталог, карточка товара, рейл -- подключение счётчика и кнопки.
- [x] `regions-page.tsx`, `logistics-api.ts` -- «Валюта заказов» в диалоге региона.
- [x] `docs/features/` -- описать корзину и оформление.

**Acceptance Criteria:**
- Given пустая корзина, when нажать тележку в каталоге, then кнопка становится «− 1 +», счётчик в рейле = 1, строка видна в шторке.
- Given корзина с товарами двух площадок и способ «Производственная площадка», when «Оформить всё», then создаются 2 черновика заказа клиента с источником PLT-n, в валюте заказов региона, и корзина пустеет.
- Given способ «Склад региона», when оформить блок, then в заказе цены строк включают Supply costs, источник — хаб региона.
- Given калькулятор площадки с выбранными 20ft и 40HC, when товаров на 1,3 40HC, then движок выбирает комбинацию с меньшей пустотой и показывает % заполнения каждого контейнера.

## Implementation Notes

- Миграции применены к демо-БД через MCP `oryx-supabase`: `20260928144812_store_cart_checkout.sql`, `20260928144930_store_demo_cart_checkout_seed.sql` (генератор `scripts/generate-cart-checkout-seed.mjs`). `store_checkout_customer_order` дополнительно возвращает `number_prefix` и `sequence_number` — окно результата показывает номер `OMS-n`; функция переприменена отдельным `create or replace`.
- Снимок корзины для `useSyncExternalStore` кэшируется по строке localStorage (иначе бесконечные перерисовки); изменение количества не меняет порядок строк.
- Движок: однотипный флот останавливается на первом достаточном количестве; жадный вариант «наполняем основной тип, остаток — в самый маленький подходящий» перебирается для каждого типа — так появляется 40HC + 20ft. Ориентация коробки выбирается по вместимости контейнера; высота стопки ограничена `max_per_container`.
- Оформление: последовательная отправка блоков вынесена в `submitCheckoutBlocks` (ошибка блока не останавливает остальные). Запасные курсы — `store_currency.rate` (RPC снимка курсов закрыт для anon); пока грузятся регионы/корзина — «Загружаем корзину…», без региона — заглушка «Выберите регион». Снятые строки возвращаются галочкой из «Остаются в корзине». Коды площадок берут префиксы из настроек (`loadLogisticsSettings`).
- 3D: у `<group>` убран `aria-label` (R3F падал при смене типа контейнера); высота сцены в оформлении — `min(360px, 50vh)`.
- Браузер (localhost:3001, регион KZ): тележка → «− 1 +», счётчик рейла; шторка; ввод 40 с клавиатуры; «16 из наличия · 24 под заказ», Supply costs в строках и итог; ≈ сумма в KZT; площадки SH-3/4/5/10 с 3D, мультиселект (без 40HC → 3×20ft, без типов — подсказка); «Оформить всё» → OMS-931…933, возврат снятой строки и хаб → OMS-934. В БД: `draft`, источники plant/hub, валюта денег KZT, цена хаба с наценкой. Все 4 черновика удалены (история документов защищена триггером — удаление в транзакции с `session_replication_role = replica`). Побочный эффект, штатный для любого создания заказа: `store_currency.rate` обновлён сегодняшними курсами floatrates.
- Проверки: typecheck, build, check:docs, check:static-images, новые тесты зелёные. `lint` (4 ошибки в tracker/comments), `check:deps` (устаревшие пакеты) и тест `document-timeline` падают и на базовом коммите.

- Сид: 234 строки логистики, 3 контейнера, ~1861 пара Supply costs, валюта заказов у всех 10 регионов, вариантов без площадки — 0. `RegionProvider` и `CartProvider` — в корневом `app/layout.tsx`, чтобы корзина из рейла работала вне `/store`. Старый однотипный движок укладки не тронут.

## Spec Change Log

## Review Triage Log

Проход 1 (blind-hunter, edge-case-hunter, verification-gap). Патчи применены в родительской сессии.

| # | Находка | Вердикт | Доказательство | Маршрут |
|---|---------|---------|----------------|---------|
| 1 | Первое добавление из каталога/карточки берёт шаг 1, а не упаковку | medium | `addPack` без `quantityPerUnit`, каталог корзины ещё без варианта; скрыто, пока у всех 1 | patch: `normalizeCartToPacks` после загрузки каталога |
| 2 | Дробное количество из localStorage даёт строку с 0 | low | проверка `<= 0` шла до `Math.floor` | patch |
| 3 | После каждого оформленного блока страница мигает «Загружаем корзину…» и перезапрашивает всё | medium | удаление строк меняло `variantKey` → `catalogLoading` | patch: догружаются только недостающие id |
| 4 | Неуложенные коробки (вес, >40 контейнеров) молча пропадают из калькулятора | medium | `unplacedBoxIds` не читался | patch: предупреждение |
| 5 | Стопки не учитывают вес; коробка тяжелее контейнера не «не помещается» | medium | `maxTiers` без веса; `bestOrientationFor` только габариты | patch + тесты |
| 6 | Правило «±2% — меньше контейнеров» не проверено тестом | gap | мутация порога в 0 не роняла тесты | patch: тест с настоящей ничьей, мутация теперь падает |
| 7 | Итог без курса / с неизвестной валютой не покрыт | gap | подтверждено | patch: тест |
| 8 | Сборка строк RPC и цена с наценкой только в компоненте | gap | подтверждено | patch: `buildCheckoutOrderLines` + тест |
| 9 | Цены не округлены (107.30000000000001 уходит в RPC) | low | `applySupplyCost` без округления | patch: `roundMoney` |
| 10 | Шторка во время загрузки/при ошибке пишет «не задана дилерская цена» | low | `item` отсутствует → ветка «нет цены» | patch |
| 11 | Ошибка загрузки каталога корзины проглатывается | medium | `catch` → пустая карта, в оформлении всё «недоступно» | patch: `catalogError` и сообщение |
| 12 | Генератор сида пишет в другой файл; мёртвый код; `abs(hashtext)` на int4-минимуме | low | подтверждено | patch; вывод генератора совпадает с миграцией |
| 13 | Шапка оформления не по конвенции страниц | low | голый `h1 text-2xl` | patch: белая карточка-тулбар, `text-lg` |
| 14 | «mm» в подписи 3D | low | подтверждено | patch |
| 15 | Одинаковые подписи счётчиков, нет `aria-pressed` у карточек способа | low | подтверждено | patch |
| 16 | Жёсткий `PLT-` в запасном коде площадки; документация про `PLT-n` | low | префикс берётся из настроек | patch |
| 17 | Английская заметка «Browser manual pass left for human» противоречит проверке | low | заметка сабагента | patch (Implementation Notes) |
| 18 | Нет повторяемой проверки SQL (валюта заказов, draft, проверка площадки) | gap | в репо нет SQL-тестов | defer |
| 19 | RPC доверяет цене и курсам клиента | false | тот же принцип у существующего `store_create_customer_order`; прототип без авторизации | reject |
| 20 | Счётчик не заблокирован у заблокированной строки | low | блокировка не дала бы и уменьшить; строка и так не оформится | reject |
| 21 | `dealerCurrency = null` роняет сортировку | false | `loadRegionPricing` отбрасывает цены с неизвестной валютой → цены нет | reject |
| 22 | Хаб RPC не сверяется с хабом региона | low | клиент всегда шлёт хаб выбранного региона | reject |
| 23 | Способ по умолчанию «Склад региона» у региона без хаба | low | у всех демо-регионов есть хаб; есть пояснение | reject |
| 24 | `maxPerContainer = 0` зацикливает; нулевые габариты | false | CHECK `> 0` в таблице; округление см→мм не даёт 0 у реальных данных; стопка теперь ≥ 1 | reject |
| 25 | Прочее: пустой ответ RPC, `storage` без ключа, квота localStorage, валюта вне union, удалённая валюта, итоги в шторке, `ratesApproximate`, «Готово · Всего» в режиме площадок | low/false | редкие пути или требование намерения («в любом блоке») | reject |

## Design Notes

Решения, принятые без вопросов (пользователь не хотел остановок): Supply costs — отдельная таблица пара вариант×регион (на бою — параметр прайс-листа с переопределениями; для демо эквивалентно). Валюта заказов — новая колонка региона, по умолчанию пустая → дилерская. Черновик — новый RPC-обёртка над `store_create_customer_order` (статус `draft`), чтобы не ломать сигнатуру. Повороты: поворот в плане (90°) разрешён всегда; `rotate_length` — можно положить на бок вокруг длины (ширина↔высота), `rotate_width` — вокруг ширины (длина↔высота). `stacking = false` — ничего сверху; `stacking_limit` — максимум ярусов в стопке. Укладка — стопки одного типа, затем 2D-раскладка оснований на пол контейнера. Все типы контейнеров выбраны по умолчанию.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images && npm test` -- expected: зелёное (известные падения базового коммита — отметить отдельно).

**Manual checks:**
- Браузер: добавить товары из каталога и карточки, счётчик и ввод с клавиатуры, шторка, смена региона; оформление обоими способами, галочки, калькулятор (мультиселект, 3D), «Оформить всё» — созданные демо-черновики потом удалить (правило «не оставлять тестовые записи»).
