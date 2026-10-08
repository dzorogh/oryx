# Ревью раздела «Магазин» (store) — 2026-10-08

Объём: `app/store/**` (без `logistics/`), `src/features/store/**`, `src/components/store/**`, миграции `supabase/migrations/*store*`, `scripts/collab-server.mjs`, `docs/features/store-*.md`, тесты `tests/unit/*`. Логистика — только стыки.

Линзы: adversarial (24), edge-case-hunter ×2 — cart/checkout/region (30) и PIM catalog/pricelists (24), verification-gap (11), плюс архитектурный разбор (Winston). Перекрытия между линзами оставлены — это сигнал.

## Штатные проверки

| Проверка | Результат |
|---|---|
| `typecheck` | OK |
| `eslint` (store) | 1 error — `store-catalog-page.tsx:133` запись в ref во время render; 2 warning (`catalog-table.tsx:535` incompatible-library, `store-catalog-page.tsx:267` лишний disable) |
| `npm test` | 365/366; падает `document-timeline.test.ts:148` (логистика, не store) |
| `check:docs`, `check:static-images` | OK |
| `check:deps` | устаревшие: y-websocket, @tailwindcss/postcss, @types/ws, eslint-config-next, shadcn |
| `build` | OK |

Демо-БД (read-only SELECT): 234 варианта, 207 товаров, 4956 цен, 2360 статусов, 11 регионов — лимит PostgREST 1000 и длина URL `.in(...)` пока не стреляют, но латентны.

## Архитектура (Winston)

1. **Два источника правды для цен.** Прайс-листы правят цены и статусы только в Yjs-документе в памяти collab-сервера (`collab-server.mjs:96-99` уничтожает doc при уходе последнего клиента); в `store_product_price` / `store_product_region_status` ничего не пишется. Каталог, корзина и checkout читают БД. Плюс seed-значения прайс-листов (`pricelists-demo-data.ts:202-246`) выдумывают цены там, где в БД их нет. Итог: менеджер видит в прайс-листе «Доступен» и цену, заказчик в каталоге — «нет цены».
2. **Три источника курсов.** `CURRENCY_USD_RATE` (статичная демо-константа прайс-листов), `store_currency.rate` (БД), «плавающие» курсы checkout. Хуже того, `store_checkout_customer_order` → `store_apply_currency_rates(p_rates)` перезаписывает глобальный справочник курсов при каждом оформлении.
3. **Циклические зависимости.** `features/store ↔ components/store` (27 и 20 импортов), `store ↔ logistics` (≈25 и 4). Доменные типы (`CurrencyCode`, `DealerStatus`, `StoreCatalogItem`) живут в `*-demo-data.ts` и `pricelists-helpers.ts` — DB-код зависит от демо-модулей.
4. **Глобальные провайдеры в корневом layout.** `CatalogScopeProvider` / `RegionProvider` / `CartProvider` / `CartSheet` в `app/layout.tsx` — запрос регионов и каталога корзины идёт на любой странице любого модуля.
5. **Скрытая временная связь через глобальный кеш префиксов.** `formatEntityCode` читает module-global префиксы; их грузит `loadLogisticsSettings()` побочным эффектом (результат в `loadDbCatalogItems` отбрасывается). `region-context` и `loadCatalogFilterOptions` форматируют коды без ожидания загрузки; парсеры зашивают `PLT-` / `PRD-`.
6. **Роль только на клиенте и не везде.** `StoreViewRoleShell` гейтит маршруты, но карточка товара не учитывает роль (заказчик может создать вариант и производственный заказ, видит остатки складов). Сначала рендерится «manager»-снапшот → запрещённая страница успевает смонтироваться.
7. **Мёртвые/дублирующие маршруты.** `/store/catalog` = `/store/pim/products`; `/store/pricelists` — заглушка, затеняющая `/store/pim/pricelists`; две разные заглушки «Импорт/Экспорт» (`/store/exchange`, `/store/pim/import-export`).
8. **Гигиена миграций.** Цепочки `*_fixups`, RPC checkout переопределён в двух миграциях, сгенерированный seed (491 строка) в потоке DDL.
9. **Деплой collab.** `COLLAB_WS_URL` по умолчанию `ws://127.0.0.1:1234` — если build-arg не задан, задеплоенный сайт стучится на localhost посетителя.

## Подтверждённые баги (сверены с кодом)

- Фильтр по площадке и поиск по коду ломаются при своём префиксе — `store-catalog-from-logistics.ts:136-143, 410` (3 линзы).
- Правки прайс-листов теряются — `collab-server.mjs:96-99`.
- Checkout пишет курсы в глобальный `store_currency` — миграция `20260928165138`, `store_apply_currency_rates`.
- Recalc-deps мемоизирован по демо-строкам, без `dataEpoch` → наценки DB-вариантов «—» — `pricelist-recalc-deps.ts:52-58`.
- Кириллическое имя параметра → пустой slug, кнопка заблокирована — `pricelists-parameters.ts:114-119`.
- Пустое поле количества → 0 → строка тихо удаляется — `cart-quantity-control.tsx:38-43`.
- Карточка товара без проверки роли — `store-product-card-page.tsx`.
- Английский текст «Supply costs» в checkout — `store-checkout-page.tsx:476, 498`; английские presence-имена — `collab-config.ts:23-24`.
- Пагинация `store_product_supply_cost` без уникального order — `cart-catalog.ts:110-117`.
- ESLint error: ref в render — `store-catalog-page.tsx:133`.

## Незакоммиченная правка checkout

- Док: «всё везётся с одной площадки» неверно — в режиме хаба блок один, потому что хаб один; товары с разных площадок.
- При одном блоке площадки — две кнопки с одинаковым действием («Оформить заказ» и «Оформить всё»). «Подзаказ» не соответствует модели: RPC создаёт независимые заказы.

## Приоритеты

1. Решить судьбу цен прайс-листов: писать в БД (debounced upsert) либо явно маркировать как «сессия, не сохраняется»; убрать seed-цены при наличии БД.
2. Убрать запись курсов в глобальный справочник из checkout; отдавать в RPC те же `rates`, что в UI.
3. Префиксы: парсить по активным префиксам (или передавать id), дождаться загрузки префиксов до форматирования.
4. Роль на карточке товара; гидратация роли до выбора children/denied.
5. Ошибки загрузки (каталог, регионы, остатки, контейнеры, корзина) — явные состояния с «Повторить».
6. Checkout: блокировать правки во время отправки, вычитать отправленное количество, ключ идемпотентности; округление `lineTotal`.
7. Тесты: `pricelist-recalc`, `pricelists-export`, обратный разбор префиксов, `adjustCartPack`/`removeCartLines`, маппинг cart-catalog.
8. Разрезать циклы: общий модуль `src/features/store/domain` (типы, регион, деньги, роль); перенести PIM UI под `features/store`.
9. Удалить/редиректнуть дубли маршрутов; seed — в отдельный скрипт.

## Все находки (JSON по линзам)

Все 89 находок в каноническом формате (`lens`, `location`, `trigger_condition`, `guard_snippet`, `potential_consequence`) — [store-review-2026-10-08.findings.json](store-review-2026-10-08.findings.json).
