---
title: 'Магазин: роль заказчика на карточке товара и в каталоге, роль до показа страницы'
type: 'bugfix'
created: '2026-10-09'
status: 'done'
baseline_commit: '8cc8ef5'
route: 'direct'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/reviews/store-review-2026-10-08.md'
  - '{project-root}/docs/features/store-cart-checkout.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Проблема.** Заказчику открыта карточка товара, но она не смотрит на роль: заказчик видит «Добавить» вариант, «Показать архивные», вкладку «Логистика» с остатками складов, журналом документов и созданием заказа на производство. Кнопка «Добавить» в каталоге тоже видна заказчику. При загрузке страницы роль сначала считается «менеджер», поэтому запрещённая заказчику страница успевает смонтироваться и запустить загрузки, прежде чем смениться на «Раздел недоступен».

**Подход.** Те же правила видимости, что у заказа клиента: таблица `store_role_visibility`, новые страницы `product` (карточка товара) и `catalog` (список товаров). Элемент без правила видит только менеджер; пока правила грузятся или не загрузились, заказчику скрыто всё настраиваемое. Оболочка магазина не показывает страницу, пока роль не прочитана из `localStorage`.

## Boundaries & Constraints

**Always:** правила по умолчанию закрыты для заказчика; поповер «Правила видимости» показывает правила текущей страницы; вкладка «Логистика» не грузит данные, пока она не открыта и не разрешена.

**Never:** настоящая авторизация и серверная проверка роли (прототип); правки прайс-листов; переименования и косметика вне ролей.

## I/O & Edge-Case Matrix

| Сценарий | Вход | Ожидание |
|---|---|---|
| Заказчик на карточке | роль customer, правила загружены | нет «Добавить», «Показать архивные», вкладки «Логистика», диалогов создания |
| Менеджер на карточке | роль manager | всё как раньше |
| Правила не загрузились | ошибка запроса | заказчику скрыто всё настраиваемое, менеджеру видно всё |
| Заказчик открыл архивный вариант по ссылке | `?variant=<архивный>` | вариант показан, «Товар в архиве.», в корзину нельзя |
| Заказчик в каталоге | роль customer | нет кнопки «Добавить» |
| Загрузка запрещённой страницы заказчиком | роль customer в `localStorage` | страница не монтируется, сразу «Раздел недоступен заказчику» |

</frozen-after-approval>

## Code Map

- `src/features/logistics/order-view-role.ts` -- ключи страниц, общий `resolveVisibility`, страница для пути
- `src/features/logistics/use-view-role.ts` -- роль, известная только после гидратации
- `src/features/store/store-view-role-shell.tsx` -- не показывать страницу до чтения роли
- `src/features/store/product-card/store-product-card-page.tsx` -- видимость элементов карточки
- `src/features/logistics/use-logistics-store.ts` -- `enabled` для источника `product`
- `src/components/store/pim/products/catalog/catalog-toolbar.tsx`, `store-catalog-page.tsx` -- кнопка «Добавить» по правилу
- `supabase/migrations/20261009072113_store_role_visibility_product_catalog.sql` -- правила страниц `product` и `catalog`

## Tasks & Acceptance

- [x] `order-view-role.ts` -- `PRODUCT_VIEW_KEYS`, `CATALOG_VIEW_KEYS`, `resolveVisibility(keys, rules, role)`; `viewRolePageForPath` отдаёт `product` для `/store/pim/products/<id>` и `catalog` для `/store/pim/products` и `/store/catalog`
- [x] `use-view-role.ts` -- `useHydratedViewRole()`: `null` на сервере и при гидратации
- [x] `store-view-role-shell.tsx` -- пока роль `null`, ни страница, ни переключатель не рендерятся
- [x] `store-product-card-page.tsx` -- правила `product`; вкладка по умолчанию «Логистика» только если разрешена, иначе «Атрибуты»; логистика грузится только на открытой разрешённой вкладке
- [x] `use-logistics-store.ts` -- `{ kind: "product"; variantId; enabled?: boolean }`
- [x] каталог -- `canAdd` в `CatalogToolbar`
- [x] миграция -- правила `product`: `variants.add`, `variants.archived`, `tab.logistics`, `logistics.production`; `catalog`: `catalog.add`; все закрыты для заказчика
- [x] `tests/unit/` -- `resolveVisibility`, `viewRolePageForPath`
- [x] `docs/features/` -- роли на карточке и в каталоге

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Слой | Находка | Вердикт | Маршрут | Доказательство |
|---|------|---------|---------|---------|----------------|
| 1 | blind | Демо-карточка (`StoreDemoProductDetailPage`, кнопка «Редактировать») обходит правила | low | defer | Открывается только для демо-id `bike-*` из старых данных; уборка дублей маршрутов — волна 4. |
| 2 | blind, edge | `addOpen` залипает при смене роли | false | reject | Диалог модальный: переключатель роли под оверлеем, сменить роль при открытом диалоге нельзя. |
| 3 | blind | `productionOpen` залипает при смене роли или вкладки | false | reject | То же: модальный диалог перекрывает вкладки и переключатель. |
| 4 | blind | Пустой кадр до гидратации | low | patch | Вместо `null` фон `bg-muted/30` с `aria-busy`. |
| 5 | blind | Две подписки на роль в оболочке | false | reject | Обе читают один `localStorage` через `useSyncExternalStore`; после гидратации значения совпадают, до неё оболочка ничего не показывает. |
| 6 | blind, edge | Вкладка у заказчика прыгает на «Логистику», если правило её открывает | low | reject | Только при ручном открытии правила заказчику; по умолчанию закрыто. |
| 7 | blind | Подменённая вкладка не записывается в состояние | low | reject | После переключения на менеджера открывается вкладка по умолчанию — ожидаемо. |
| 8 | blind, edge | Логистика перезагружается при каждом возврате на вкладку | medium | patch | `enabled` сбрасывал `loadedKey`; теперь флаг первого открытия, дальше данные держатся. |
| 9 | blind | Скрытие только в UI, RPC доступны | false | reject | Документ прямо называет это «Режим просмотра (демо)»; прототип без авторизации. |
| 10 | blind | Нет тестов для `/store/pim/variants/…` и краёв путей | low | reject | Путь — редирект на карточку; слэш на конце уже в тесте (`/store/catalog/`). |
| 11 | blind | `on conflict do nothing`, нет check на `page`, подпись `catalog.add` | low | reject | Повторное применение не должно перетирать правки из Studio; остальное косметика. |
| 12 | blind | В документе миграция `20261008180000`, которой нет в диффе | false | reject | Миграция из коммита `8cc8ef5`, в перечне её не хватало. |
| 13 | edge | Пока правила грузятся, менеджер видит элемент с `manager_visible=false` | low | reject | Таких правил для `product` и `catalog` нет. |
| 14 | vg | Применение флагов в компоненте карточки без тестов | low | defer | Тестов компонентов нет; проверено в браузере под обеими ролями. |
| 15 | vg | `enabled` для `product` в `useLogisticsStore` без тестов | low | defer | Тестов хуков нет; в браузере заказчик не запрашивает логистику. |
| 16 | vg | Гейт гидрации без тестов | low | defer | Проверено в браузере: `/store/logistics/stock` у заказчика — только `store_currency` и `store_region`, без запросов остатков. |

## Verification

**Commands:**
- `npm run typecheck && npx eslint src/features/store src/features/logistics src/components/store tests/unit && npm test`
- `npm run build && npm run check:docs`

**Manual checks:**
- Браузер: карточка товара и каталог под менеджером и заказчиком; заказчик открывает `/store/logistics/stock` после перезагрузки — сразу «Раздел недоступен».
