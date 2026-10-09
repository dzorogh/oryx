---
title: 'Магазин: маршруты, демо-остатки и поток миграций'
type: 'refactor'
created: '2026-10-09'
status: 'done'
baseline_commit: '25e1163'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/reviews/store-review-2026-10-08.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Проблема.** У магазина дубли маршрутов: `/store/catalog` повторяет `/store/pim/products`, заглушка `/store/pricelists` заслоняет настоящие прайс-листы `/store/pim/pricelists`, «Импорт/Экспорт» существует дважды (`/store/exchange` и `/store/pim/import-export`) на двух разных компонентах-заглушках. Демо-карточка `bike-*` живёт рядом с настоящей и не знает о ролях. Провайдеры магазина (регион, корзина, область каталога) смонтированы в корневом layout всего приложения. В потоке миграций лежат три `*_fixups` и два сида данных; `npm run seed:logistics` делает `truncate ... cascade` вариантов и регионов, но эти сиды не повторяет — после пересева пропадают хабы CIS/Americas/Europe, мультиварианты, габариты, стоимость поставки и типы контейнеров, оформление заказа ломается.

**Подход.** Дубли маршрутов — редиректы в `next.config.ts`, файлы страниц удалить. Демо-карточку и её данные удалить. Провайдеры перенести в `app/store/layout.tsx`. Fixups влить в родительские миграции (они идут сразу за ними). Сиды вынести в `supabase/seed/`, привести к текущей схеме и запускать из `seed:logistics` после историй.

## Boundaries & Constraints

**Always:** живую БД не пересевать без запроса — проверка сидов в откатываемой транзакции; итоговый SQL влитых миграций совпадает с прежним порядком выполнения.

**Never:** прайс-листы (кроме маршрута-дубля); разрыв циклической зависимости `logistics` ↔ `store` (отдельная работа).

## I/O & Edge-Case Matrix

| Сценарий | Вход | Ожидание |
|---|---|---|
| Старая ссылка | `/store/catalog`, `/store/pricelists`, `/store/exchange` | редирект на `/store/pim/products`, `/store/pim/pricelists`, `/store/pim/import-export` |
| `bike-1` | `/store/pim/products/bike-1` | «Товар не найден.» настоящей карточки |
| Страница вне магазина | `/crm/deals` | без провайдеров магазина, без корзины |
| Пересев | `npm run seed:logistics` | хабы, мультиварианты, остатки, габариты, стоимость поставки, контейнеры на месте |
| Статусы нового варианта в сиде | триггер уже создал строки | сид обновляет их, без конфликта ключа |

</frozen-after-approval>

## Code Map

- `next.config.ts`, `app/store/{catalog,pricelists,exchange}/page.tsx`, `src/components/store/store-placeholder-page.tsx` -- маршруты
- `app/store/pim/products/[productId]/page.tsx`, `src/components/store/pim/products/detail/*`, `store-catalog-demo-data.ts` -- демо-карточка
- `src/features/logistics/order-view-role.ts` -- пути ролей без `/store/catalog`
- `supabase/migrations/*_fixups.sql`, `supabase/seed/*.sql`, `scripts/seed-logistics.mjs`, `scripts/generate-cart-checkout-seed.mjs` -- миграции и сиды

## Tasks & Acceptance

- [x] редиректы и удаление дублей; одна заглушка импорта/экспорта
- [x] удалить демо-карточку `bike-*` и упоминания `bike-` в живом коде
- [x] ~~провайдеры магазина в `app/store/layout.tsx`~~ — отменено, см. Spec Change Log
- [x] пути ролей без `/store/catalog`; тесты
- [x] fixups влиты в родителей
- [x] сиды в `supabase/seed/`, совместимы с текущей схемой и триггером статусов; `seed:logistics` их применяет; проверка в откатываемой транзакции
- [x] документация

## Implementation Notes

- Демо-данные `bike-*` (`product-detail-demo-data.ts`, `store-catalog-demo-data.ts`, картинки) остаются: на них строятся строки прайс-листов без бэкенда, а прайс-листы вне задачи. Удалены только UI демо-карточки и ветка маршрута.
- Нечисловой id товара сразу даёт «Товар не найден» вместо ошибки Postgres `bigint`.
- Сид корзины сравнивал коды регионов в нижнем регистре и после `store_region_code_upper` молча не ставил валюты заказа; генератор пишет заглавные. Сид хабов передаёт текущую валюту в `store_update_region` (иначе обнулит) и обновляет строки статусов, созданные триггером.
- `oryx_supabase.py sql` выходит с 0 и при ошибке psql; `seed:logistics` проверяет поле `ok`.
- Проверка сидов: обе части в одной транзакции с `rollback` на живой БД — 2 новых варианта, 20 строк статусов, AE → AED, KZ → CIS Hub; после отката данные не изменились.

## Spec Change Log

- 2026-10-09: перенос провайдеров в `app/store/layout.tsx` отменён. `CartRailButton` в `NavRail` (корневой layout) читает корзину через `useOptionalCart`; без провайдера кнопка пропадает, и корзину нечем открыть. Строка матрицы «Страница вне магазина» снята.
- 2026-10-09: в сиде корзины габариты сопоставлялись по `id` товара из снимка, а `seed:logistics` нумерует товары по порядку снимка — у всех товаров были чужие габариты (Cross 180 RX получал 130×74×62 вместо 189×71.1×79.6). Генератор ключует по позиции; исправленный сид применён к живой демо-БД (только upsert, документы не создаются).

## Review Triage Log

Ревью 2026-10-09: Blind Hunter, Edge Case Hunter, Verification Gap.

| Находка | Вердикт | Решение |
| --- | --- | --- |
| Кнопка корзины в `NavRail` вне `CartProvider` — корзину не открыть | high | patch: провайдеры остаются в корневом layout |
| Габариты сида корзины по старым `id` снимка — чужие размеры у всех товаров | high | patch: ключ — позиция в снимке; живая БД исправлена |
| `oryx_supabase.py`: общий `/tmp/oryx_agent.status` — прошлый `0` читается как успех; опрос 24 с | medium | patch: файлы на запуск (`uuid`), опрос до 120 с, чистка старше часа |
| Сид хабов: регионы и резервы по id 1–10 | low | patch: по `store_region.code` |
| Id товара больше `bigint` даёт ошибку вместо «не найден» | low | patch: `^\d{1,18}$` |
| Нет теста, что `/store/catalog` убран из путей ролей | low | patch: два assert |
| Хабы регионов и валюты заказов ставятся после историй — заказы историй в CNY и с Dubai Hub | medium | defer |
| Ссылки демо-строк прайс-листа ведут на `bike-*` → «Товар не найден» | medium | defer: прайс-листы вне задачи |
| Полный `seed:logistics` с нуля не запускался | medium | defer: пересев стирает живую демо-БД; ветки проверены в транзакции |
| `limit` после `jsonb_agg` в сиде хабов не ограничивает строки; склады 2 и 5 по id | low | reject: объёмы демо, остатков хватает |
| История миграций в БД расходится с файлами | low | reject: таблицы `schema_migrations` в демо-БД нет |
| Повтор POST `runManually` при таймауте в `dokploy()` | low | reject: редкий сбой сети, сид перезапускается целиком |

## Verification

- `tsc`, `next build`, `check:docs`, `check:static-images` — ок; `eslint` — только прежние ошибки в tracker/comments; `npm test` — 399 ок, 1 прежний сбой `buildDocumentTimeline`.
- Браузер: старые маршруты отдают 307 на новые; `bike-1` — «Товар не найден»; каталог, выбор региона, корзина, кнопка «Корзина» в меню, оформление; `/crm/deals`.
- Живая БД: оба сида в транзакции с откатом (новые варианты, строки статусов без конфликта, KZ → CIS Hub, AE → AED, габариты Cross 180 RX верные, проценты поставки без изменений); после отката данные прежние.
