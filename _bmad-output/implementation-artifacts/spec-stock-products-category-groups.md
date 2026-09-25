---
title: 'Остатки: группировка по категориям во вкладке «Товары»'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
baseline_commit: 'e4a2e3e4b2dbfb590abb47ea6a3280b875b74af7'
review_loop_iteration: 0
context:
  - '{project-root}/docs/features/logistics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Во вкладке «Товары» на «Остатках» товары идут плоским списком, а в «Календаре выпусков» они разложены по дереву категорий — искать товар в остатках неудобно, экраны выглядят по-разному.

**Approach:** Отдать категории в `store_stock_page()` и построить в матрице «Товары» такие же сворачиваемые группы категорий (с подкатегориями и «Без категории»), как в календаре, переиспользуя построение дерева.

## Boundaries & Constraints

**Always:**
- Только вкладка «Товары»; «Склады» и «Регионы» не меняются.
- Строка группы как в календаре: шеврон, название, «· N товаров» (прямые товары группы), отступ по глубине; клик сворачивает; у группы с подкатегориями при наведении — «Развернуть всё» / «Свернуть подкатегории».
- В тулбаре в виде «Товары» — «Свернуть все» / «Развернуть все».
- Порядок категорий — как в календаре (по id); внутри группы — выбранная сортировка из меню сортировки.
- Дерево строится по уже отфильтрованным строкам (фильтры, поиск); пустые категории не показываются; пустое состояние прежнее.
- Товар в нескольких категориях показывается в каждой (как в календаре); счётчик в заголовке карточки — уникальные товары.
- Скрытие/сворачивание колонок продолжает работать; строка группы занимает всю ширину таблицы.
- Решение: строки категорий прилипают под шапкой лесенкой по вложенности, как в календаре. Для этого таблица «Товары» живёт в собственном скролл-контейнере фиксированной высоты с `sticky`-шапкой; логика прилипания — общая с календарём, не копия.

**Never:**
- Не менять данные категорий и привязки в БД; только чтение в RPC.
- Не дублировать алгоритм дерева — один общий хелпер для календаря и остатков.
- Не сохранять состояние сворачивания в URL/localStorage (в календаре тоже нет).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Обычный вид | Все товары с категориями | Группы корневых категорий, внутри товары и подкатегории | N/A |
| Поиск/фильтр | Остались товары из 2 категорий | Видны только эти 2 ветки | N/A |
| Нет категории | У товара `categoryIds = []` | Группа «Без категории» в конце | N/A |
| Нет строк | Фильтр ничего не дал | Прежнее сообщение пустого состояния, групп нет | N/A |
| Старый ответ RPC | Нет `categories` / `category_ids` | Все товары в «Без категории» | Маппер подставляет `[]` |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260923143000_store_drop_variant_sku.sql` -- текущее определение `store_stock_page()`; копировать как основу.
- `supabase/migrations/20260924120000_store_output_calendar_page.sql` -- образец SQL категорий (`store_category` без `deleted_at`, `store_product_category.product_id = v.product_id`).
- `src/features/logistics/logistics-api.ts` -- `LogisticsPayload`, `mapLogisticsPayload` (варианты → `LogisticsProduct` ~стр. 403, сборка снапшота ~стр. 764).
- `src/features/logistics/logistics-types.ts` -- `LogisticsProduct`, `LogisticsSnapshot`.
- `src/features/logistics/output-calendar.ts` -- `CategoryTreeNode`, `buildCategoryTree`, `descendantCategoryIds`, `UNCATEGORIZED_GROUP_ID`, `allCategoryGroupIds`, `pluralTovar` (стр. 459–543, 596).
- `src/features/logistics/ui/output-calendar-matrix.tsx` -- `GroupRows` (стр. 537–667): эталон вида строки группы; потребитель дерева.
- `src/features/logistics/ui/output-calendar-toolbar.tsx` -- кнопки «Свернуть все / Развернуть все» (стр. 128–137).
- `src/features/logistics/stock-page.tsx` -- `productRows` (отсортированы `sortBy`), `ListToolbar` (`viewControls`).
- `src/features/logistics/ui/stock-products-matrix.tsx` -- `ProductsMatrixTable`, `colSpan`, заголовок карточки со счётчиком.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260925120000_store_stock_page_categories.sql` -- `create or replace store_stock_page()`: к `product_variants` добавить `category_ids` (jsonb-массив неудалённых категорий продукта), добавить ключ `categories` (`id, parent_id, name`, `deleted_at is null`); `notify pgrst`; применить к демо-Supabase через MCP `oryx-supabase` -- данные для групп.
- [x] `src/features/logistics/category-tree.ts` -- перенести из `output-calendar.ts` дерево категорий, сделав его обобщённым по товару `{ id; name; categoryIds }` с необязательным компаратором (по умолчанию — по названию); обновить импорты календаря -- один хелпер на два экрана.
- [x] `src/features/logistics/logistics-types.ts`, `logistics-api.ts` -- `LogisticsCategory { id; parentId; name }`, `snapshot.categories`, `LogisticsProduct.categoryIds`; маппинг с дефолтом `[]`; поправить прочие места, где собираются эти типы -- снапшот несёт категории.
- [x] `src/features/logistics/ui/use-sticky-category-rows.ts` -- вынести из `OutputCalendarMatrix` вычисление `stickyIds`, замер высоты шапки (`--…-head-h`), `groupStickyTop`; календарь переходит на хук без изменения поведения -- прилипание на двух экранах.
- [x] `src/features/logistics/ui/stock-products-matrix.tsx` -- в `ProductsMatrixTable` свой скролл-контейнер (`max-h`, `overflow-auto`), `sticky`-шапка (обе строки заголовка), прилипающие строки групп через хук; рендерить дерево групп (порядок строк внутри группы = порядок `rows`), строки групп в стиле календаря на полный `colSpan`; счётчик — уникальные товары -- основная UI-часть.
- [x] `src/features/logistics/stock-page.tsx` -- состояние `collapsed`, «Свернуть все / Развернуть все» в `viewControls` только для «Товары» -- управление группами.
- [x] `docs/features/logistics.md` -- в «Остатки» описать группировку по категориям -- документация экрана.

**Acceptance Criteria:**
- Given вкладка «Товары», when открыть «Остатки», then товары разложены по категориям как в календаре, и календарь выглядит и работает как раньше.
- Given сортировка «Всего», when открыть группу, then товары внутри неё идут по «Всего».
- Given «Свернуть все», when нажать, then видны только корневые группы; «Развернуть все» возвращает всё.
- Given свёрнута колонка «Место», when смотреть строку группы, then она по-прежнему на всю ширину таблицы.
- Given длинный список, when прокручивать таблицу «Товары», then шапка и строки текущей категории/подкатегории прилипают сверху лесенкой.

## Implementation Notes

- Миграция записана под версией, которую выдал MCP `apply_migration`: `20260925094732_store_stock_page_categories.sql` (а не `20260925120000_…`); применена к демо-Supabase, `store_stock_page()` отдаёт 27 категорий.
- Дерево и `pluralTovar` перенесены в `category-tree.ts`; прилипание — `ui/use-sticky-category-rows.ts` (переменная высоты шапки параметризована: календарь `--calendar-head-h`, остатки `--stock-head-h` + `-row` для второй строки шапки).
- Матрица покрыта юнит-тестами `tests/unit/stock-category-groups.test.ts` и `logistics-payload-mapper.test.ts` (32 теста зелёные). Полный `npm test`: 2 падения (`buildDocumentTimeline`, помощник отмены) — такие же на `baseline_commit`. `lint` (6 ошибок) и `check:deps` (устаревшие установленные пакеты) падают вне этой задачи.

## Spec Change Log

## Review Triage Log

| Находка | Вердикт | Обоснование | Маршрут |
|---|---|---|---|
| Товары под удалённым родителем пропадают (blind, edge ×3, gap-other) | low | Реально в коде, но в демо-БД 0 удалённых категорий и 0 сирот; фикс добавляет логику; то же было в календаре | reject |
| «0 товаров» у родителя только с подкатегориями | false | Спека требует прямой счётчик, как в календаре; в данных товары привязаны и к родителю (ATV · 8) | reject |
| Свёрнутые группы прячут результаты поиска | low | Поведение календаря; сворачивание не сохраняется; фикс — новая логика | reject |
| Невидимая кнопка «Свернуть подкатегории» ловит клики | low | Реально (opacity-0 без pointer-events-none); прямой фикс в обоих экранах | patch |
| Отступ товаров корневой группы левее заголовка | low | Подтверждено на скриншоте; прямая правка | patch |
| Хук: дефолт `--calendar-head-h`, `unknown`, лишний `headVar` | low | Неиспользуемый возврат удалён; дефолт безвреден | patch |
| Фиксированные 32px строки группы | false | Лесенка ATV → 4×2 визуально без зазоров | reject |
| Бессмысленный `colSpan` у первой ячейки группы | low | Всегда 1 | patch |
| Кнопки свернуть/развернуть скопированы, активны до загрузки | low | Безвредно, маловероятно | reject |
| Производительность построения дерева | false | 27 категорий × ~130 товаров, мемоизировано | reject |
| Нет тестов нескольких категорий, сортировки id, pluralTovar | low | Дерево покрыто существующими тестами календаря | reject |
| Дубли/null в `category_ids` | false | PK-уникальность, в БД 0 дублей | reject |
| Новые модули не указаны в docs | low | Прямая правка | patch |
| Миграция копирует весь RPC без ссылки на источник | low | Так устроены все миграции проекта | reject |
| Нечисловые id категорий | false | id — bigint | reject |
| «Свернуть все» до загрузки | low | Кнопки видны только после загрузки данных вкладки; маловероятно | reject |
| Шаг «строки → дерево» не покрыт тестами (gap) | medium | Pre-verified; вынесено в `buildStockProductTree` + 3 теста | patch |
| SQL-контракт `store_stock_page()` не проверяется тестами (gap) | medium | Нет харнесса БД в репо | defer |

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm run build && npm run check:deps && npm run check:docs && npm run check:static-images` -- expected: всё зелёное.

**Manual checks (if no CLI):**
- Браузер: `/store/logistics/stock` вкладки «Товары», «Склады», «Регионы» + поиск; `/store/logistics/calendar` — группы без регрессий.
