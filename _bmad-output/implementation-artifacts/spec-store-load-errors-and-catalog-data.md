---
title: 'Магазин: явные ошибки загрузки и честные данные каталога'
type: 'bugfix'
created: '2026-10-09'
status: 'done'
baseline_commit: '50bed7a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/reviews/store-review-2026-10-08.md'
  - '{project-root}/docs/features/store-cart-checkout.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Проблема.** Сбои загрузки в магазине молча превращаются в пустые списки: каталог, регионы, остатки, типы контейнеров, категории карточки. Пользователь видит «ничего нет» вместо «не загрузилось». Данные каталога местами врут: бренд «Oryx» и дата «2026-09-01» зашиты в код; фильтр статуса без региона молча игнорируется; у одного региона нет строк статусов, а значение по умолчанию в БД (`available`) расходится с тем, как отсутствующую строку трактуют UI и оформление (`unavailable`), поэтому фильтр «Недоступен»/«Черновик» теряет такие варианты; связи товар–категория читаются без пагинации (обрезка на 1000); спецсимволы поиска ломают запрос; после ошибки догрузки список больше не догружается.

**Подход.** Каждая загрузка различает «грузится», «ошибка» (текст + «Повторить») и «бэкенд не настроен». Строка статуса существует для каждой пары вариант × регион (бэкфилл + триггеры), по умолчанию `unavailable`/`draft`. Бренд и дата — из БД или «—».

## Boundaries & Constraints

**Always:** русские тексты; «Повторить» перезапускает именно упавшую загрузку; без настроенного Supabase — отдельное сообщение без «Повторить».

**Never:** прайс-листы; переименования и косметика; новые колонки `updated_at` (их нет в схеме — показываем «—»).

## I/O & Edge-Case Matrix

| Сценарий | Вход | Ожидание |
|---|---|---|
| Каталог упал | ошибка RPC | карточка «Не удалось загрузить каталог» + «Повторить» |
| Догрузка упала | ошибка страницы 2 | «Повторить» под списком догружает ту же страницу |
| Supabase не настроен | env пуст | «Бэкенд демо не настроен», без «Повторить» |
| Регионы упали | ошибка `store_region` | в переключателе региона ошибка и «Повторить» |
| Остатки упали (каталог, карточка, оформление) | ошибка | сводка остатков «—» вместо 0, сообщение и «Повторить» |
| Типы контейнеров упали | ошибка | калькулятор: «Не удалось загрузить типы контейнеров» + «Повторить» |
| Фильтр статуса без региона | регион не выбран | фильтры статуса недоступны с подсказкой «Выберите регион»; загрузчик не применяет статус |
| Новый вариант или регион | insert | строки статусов `unavailable`/`draft` для всех пар |
| Поиск `a*b"c\:` | строка | запрос не падает, `*` не работает как маска |
| Категория с >1000 связей | фильтр | все товары категории |

</frozen-after-approval>

## Code Map

- `supabase/migrations/<ts>_store_region_status_complete.sql` -- default, бэкфилл, триггеры
- `src/features/store/store-catalog-from-logistics.ts` -- пагинация категорий, поиск, бренд, статус без региона
- `src/features/store/domain/catalog-item.ts` -- `brand: string | null`, `updatedAt: string | null`
- `src/components/store/pim/products/store-catalog-page.tsx`, `catalog/catalog-table.tsx`, `catalog/catalog-filters*.tsx` -- ошибки, догрузка, фильтр статуса, ref в рендере
- `src/features/store/region-context.tsx`, `region-switcher.tsx` -- ошибка регионов, `hubCode` после префиксов
- `src/features/store/catalog-scope-context.tsx` -- `localStorage` в try/catch
- `src/features/store/checkout/store-checkout-page.tsx`, `packing/container-load-calculator.tsx` -- ошибки остатков и контейнеров
- `src/features/store/product-card/store-product-card-page.tsx` -- категории и остатки

## Tasks & Acceptance

- [x] миграция статусов (default `unavailable`, бэкфилл, триггеры на `store_product_variant` и `store_region`)
- [x] загрузчик каталога: `fetchAllRows` для категорий; экранирование поиска; бренд из `store_brand`, `updatedAt: null`; статус без региона не применяется
- [x] каталог: ошибка первой загрузки, «не настроен», «Повторить» догрузки, ref без записи в рендере, фильтры статуса без региона
- [x] регионы: ошибка + «Повторить»; `hubCode` считается после загрузки префиксов
- [x] остатки и типы контейнеров: ошибка вместо пустоты в каталоге, карточке, оформлении
- [x] карточка товара: ошибка категорий не глотается
- [x] `catalog-scope-context`: `localStorage` в try/catch
- [x] тесты чистых функций; документация

## Implementation Notes

## Spec Change Log

## Review Triage Log

Ревью 2026-10-09: Blind Hunter, Edge Case Hunter, Verification Gap. Дифф от `50bed7a` случайно включил чужие коммиты `fd5df3b` и `7b36689` (logistics: календарь, оплата, план заказа) — их находки вне этой спецификации, отклонены.

| Находка | Вердикт | Решение |
| --- | --- | --- |
| `seed-logistics.mjs` вставляет статусы после триггера — конфликт уникального ключа | high | patch: upsert `on_conflict=product_variant_id,region_id`, `merge-duplicates` |
| «Повторить» на карточке товара не перезагружает остатки | medium | patch: `reload` увеличивает `stockAttempt` |
| Фильтр статуса остаётся применённым (и в `hasActive`) после сброса региона | medium | patch: при отключённых фильтрах значения сбрасываются в «Все» |
| Одинаковый `id` подсказки в панели и листе фильтров | low | patch: `useId()` |
| Комментарий миграции противоречит backfill | low | patch: формулировка |
| Комментарий `resolveCatalogLoadMore(null)` не описывает выброшенную ошибку | low | patch: комментарий |
| Нет теста маппинга бренда и `updatedAt` | medium | patch: тест в `store-catalog-search.test.ts` |
| Ошибка опций фильтров (сайты, семейства) молча глотается | low | defer |
| Загрузка остатков продублирована в трёх компонентах | low | defer: общий хук |
| Нет тестов React-состояний ошибок | low | defer |
| Поиск из одних спецсимволов показывает всё; склейка `v1.2` → `v12` | low | reject: поведение «пустой поиск» ожидаемо, склейка безопаснее разрыва |
| Сбой `ensureEntityCodePrefixes` | low | reject: префиксы по умолчанию, регионы грузятся |
| Триггеры без `drop ... if exists`, архивные варианты получают строки | low | reject: миграция одноразовая, строки нужны всем вариантам |
| `in()` длиннее URL при >1000 товаров, «—» при загрузке и при отсутствии данных, неиспользуемый `isInitialLoading`, дубль `BackendUnsetNotice` | low | reject |

## Verification

**Commands:**
- `npm run typecheck && npx eslint src/features/store src/components/store tests/unit && npm test`
- `npm run build && npm run check:docs`

**Manual checks:**
- Браузер: каталог, карточка, оформление; имитация сбоя (офлайн в DevTools) показывает ошибки и «Повторить».
