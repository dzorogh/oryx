---
title: 'Права заказчика в заказе клиента по решениям 2026-10-13'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: '44706769cb71e6d61d29a09472626f9bad896c3d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/customer-order-customer-rights-review.md'
  - '{project-root}/docs/features/logistics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Проблема.** Права заказчика в заказе клиента расходятся с решениями сверки с my-back/my-front: заказчик не видит склад, автора, заметку и расчётную стоимость, не может загружать файлы, видит заказы только одного региона, а экспорта списка нет.

**Подход.** Перенастроить правила `store_role_visibility` и разделить два составных правила. Видимость заказов заказчику считать по регионам его тенантов, а в список заказов добавить кнопку-заглушку «Экспорт» для обеих ролей.

## Решения

- Заказчику показываем источник в шапке (`header.source`, только код), автора (`header.author`), заметку (`header.note`, только чтение) и расчётную стоимость (`money.estimate`).
- Курсы валют — новое правило `money.rates`, заказчику закрыто. Кнопка «Курсы» зависит от него и от `order.edit`.
- Файлы: новое правило `files.manage` (загрузка и удаление), открыто обеим ролям; скачивание открыто всем, у кого есть вкладка.
- Тенанты заказчика — демо-константа `CUSTOMER_DEMO_TENANT_IDS = ["tenant-sharmax-ae", "tenant-sharmax-om"]`. Заказчик видит заказы регионов этих тенантов (из `store_tenant.region_id`). На списке заказов переключатель региона убираем; в каталоге и чекауте он остаётся.
- Статус заказа меняет только менеджер (`order.actions` у заказчика закрыто); «Подтвердить получение» не делаем. Маршрут не делаем.
- Комментарии пишут обе роли — как сейчас.
- «Экспорт» в тулбаре списка заказов клиента для обеих ролей: заглушка, по клику тост «Экспорт пока не реализован», без выгрузки.

## Boundaries & Constraints

**Always:** новые ключи добавляются в `CUSTOMER_ORDER_VIEW_KEYS` и в миграцию; правила по умолчанию закрыты для заказчика, кроме перечисленных выше; правки правил — новой миграцией с `on conflict (page, element_key) do update` только для перечисленных ключей.

**Never:** настоящая авторизация; названия заводов и складов (отдельная задача); правка правок существующих миграций; маршрут и подтверждение получения.

## I/O & Edge-Case Matrix

| Сценарий | Вход | Ожидание |
|---|---|---|
| Заказчик, заказ его региона | роль customer | видит источник (код), автора, заметку без правки, расчётную стоимость; нет «Курсы» |
| Заказчик, файлы | вкладка «Файлы» | может загрузить, скачать и удалить |
| Заказчик, заказ чужого региона | регион не AE и не OM | «Заказ другого региона» |
| Заказчик, регион без тенантов | у региона заказа нет тенантов | заказ не виден |
| Менеджер | роль manager | всё как раньше + «Экспорт» |
| Клик «Экспорт» | любая роль | тост, без запроса и файла |

</frozen-after-approval>

## Code Map

- `src/features/logistics/order-view-role.ts` -- `CUSTOMER_ORDER_VIEW_KEYS`, `isOrderRegionVisibleForRole(role, orderRegionId, customerRegionId)` → заменить на проверку по набору регионов.
- `src/features/logistics/customer-orders-page.tsx` 293–378 список: фильтр по `selectedRegion` (309), `RegionSwitcher` в `quickControls` (330), `emptyMessage` (331); 381–465 карточка: проверка региона (450–463); вкладки «Деньги» (733–745, `showEstimate`), «Файлы» (766–777, `editable={order.edit}`).
- `src/features/logistics/ui/order-money-tab.tsx` 575–737 -- `showEstimate` управляет и ячейкой, и кнопкой «Курсы» (692); добавить `showRates`.
- `src/features/logistics/ui/customer-order-files-tab.tsx` 36–160 -- `editable` управляет загрузкой и удалением; разделить на `canUpload` / `canDelete`.
- `src/features/logistics/ui/customer-order-header.tsx` 502–606 -- автор, заметка (`noteEditable = canAct && editable`), источник — уже по правилам.
- `src/features/logistics/ui/list/logistics-list-page-content.tsx` / `list-toolbar.tsx` -- проп `actions?: ReactNode` для кнопки «Экспорт».
- `src/features/logistics/customer-order-oms.ts` -- `StoreTenant { regionId }`, `tenantsForRegion`; `src/lib/demo-tenants.ts`, `src/lib/use-demo-tenant-id.ts` -- тенанты меню.
- `supabase/migrations/20261008160000_store_role_visibility.sql` -- формат строк правил (образец для новой миграции).
- `tests/unit/` -- тесты `order-view-role`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_store_customer_rights_2026_10_13.sql` -- `customer_visible = true` для `header.source`, `header.author`, `header.note`, `money.estimate`; новые `money.rates` (закрыто), `files.manage` (открыто); применить через MCP `oryx-supabase`
- [x] `order-view-role.ts` -- новые ключи; `CUSTOMER_DEMO_TENANT_IDS`; `isOrderVisibleForRole(role, orderTenantIds)` вместо `isOrderRegionVisibleForRole` (тенанты заказа = тенанты его региона: `row.tenants` в списке, `tenantsForRegion(orderOms.tenants, order.regionId)` в карточке)
- [x] `customer-orders-page.tsx` -- видимость по тенантам; убрать `RegionSwitcher` и ожидание регионов на списке и в карточке; «Экспорт»-заглушка через `actions`; `showRates`, `canManage` во вкладки
- [x] `order-money-tab.tsx` -- `showRates` для кнопки «Курсы»
- [x] `customer-order-files-tab.tsx` -- загрузка и удаление по `files.manage`
- [x] `tests/unit/` -- видимость по тенантам (свой, чужой, без тенантов, менеджер), новые ключи
- [x] `docs/features/logistics.md` (раздел ролей) -- новые права

**Acceptance Criteria:**
- Given заказчик, when открывает список заказов клиента, then видит заказы только регионов своих тенантов и кнопку «Экспорт».
- Given заказчик на вкладке «Деньги», when смотрит сводку, then видит «Расчётную стоимость» и не видит «Курсы».

## Implementation Notes

- Субагент реализации добавил однострочные хелперы ради тестов (`customerOrderExportStub`, `isOrderNoteEditable`, `isOrderRatesButtonVisible`, `customerOrderFilePermissions`, `customerOrderAccessDenial`); убраны, логика встроена по месту. Вкладка «Файлы» оставлена с одним пропом `editable` от `files.manage`.
- Роль из `localStorage` и `CUSTOMER_DEMO_TENANT_IDS` вынесены в базовый слой `src/features/store/view-role.ts`: `region-context` (базовый слой) не может импортировать логистику. Модуль добавлен в `eslint.config.mjs` и `docs/conventions/code/store-module-layers.md`.
- Падение `tests/unit/document-timeline.test.ts`, 5 проблем `npm run lint` и расхождение версий в `check:deps` есть и на `baseline_commit` — не от этой правки.

## Spec Change Log

## Review Triage Log

| # | Слой | Находка | Вердикт | Маршрут | Доказательство |
|---|------|---------|---------|---------|----------------|
| 1 | blind, edge | В каталоге и чекауте заказчик выбирает регион вне AE/OM, и оформленный заказ пропадает из его списка | medium | patch | `RegionProvider` у заказчика показывает только регионы `CUSTOMER_DEMO_TENANT_IDS` (`store_tenant.region_id`); в браузере в каталоге и чекауте только AE и OM. |
| 2 | blind | Тенанты заказчика зашиты в код | false | reject | Решение человека: демо-константа. |
| 3 | blind | Список и карточка берут тенантов из разных RPC | low | reject | Оба источника — `store_tenant.region_id`; расхождение не показано. |
| 4 | blind | Файлы можно грузить и удалять в закрытом заказе, заказчик удаляет файлы менеджера | low | reject | Решение человека: обе роли загружают и удаляют; у менеджера и раньше не было проверки статуса. |
| 5 | blind | Док сузил «кнопки действий» до «смены статуса» | low | patch | Формулировка возвращена с перечнем `order.actions`. |
| 6 | blind | Без строки в таблице `files.manage` закрыт заказчику, а док пишет «открыто» | low | reject | Общее правило «ключ без строки видит только менеджер» в доке есть; строка в миграции. |
| 7 | blind | Upsert не обновляет `sort_order` и `manager_visible` | low | reject | Новые ключи вставляются с порядком; у старых меняется только то, что решено. |
| 8 | blind | «Экспорт» — нерабочая кнопка у обеих ролей | false | reject | Решение человека: заглушка для всех. |
| 9 | blind | Нет тестов UI; заказчику видны авторы платежей | low | reject | Тестов компонентов нет, проверено в браузере; авторы идут за `header.author`, который решено открыть. |
| 10 | blind | У заказчика пропало пояснение в пустом списке | low | patch | `emptyMessage` с тенантами заказчика. |
| 11 | blind | Тексты заглушек — внутренний термин «тенантов» | low | patch | В алерте карточки названы Sharmax UAE и Sharmax Oman. |
| 12 | edge | Без ключа `tenants` в контексте заказчик видит «Заказ другого региона» на своём заказе | maybe-false | reject | `store_document_context` всегда отдаёт `tenants`; если бы нет — low. |
| 13 | edge | Подпись `order.edit` всё ещё говорит про курсы и файлы | low | patch | Подпись исправлена в миграции и в демо-базе. |
| 14 | vg | Не проверено, какие тенанты страница передаёт в `isOrderVisibleForRole` | low | reject | Тестов страниц нет; проверено в браузере (921 открыт, 908 закрыт). |
| 15 | vg | `CUSTOMER_DEMO_TENANT_IDS` не сверяются с id сида | low | reject | Демо-id стабильны с `20260929120000`. |
| 16 | vg | «Курсы» и файлы не покрыты тестами | low | reject | Нет тестов компонентов; проверено в браузере под обеими ролями. |

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- без ошибок
- `npm run check:deps && npm run check:docs && npm run check:static-images` -- без ошибок

**Manual checks:**
- Браузер: заказ клиента под заказчиком и менеджером (шапка, «Деньги», «Файлы»), список заказов с «Экспорт».
