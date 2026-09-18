---
title: 'Колонка In production в Allocation Atlas'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/docs/features/logistics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Матрица Allocation Atlas показывает завершённый выпуск в `Produced`, но не показывает товар строки заказа, который сейчас находится в производстве.

**Approach:** Добавить перед `Produced` стандартную ERP-колонку `In production`: текущий положительный `reserved` этой строки заказа на местах `production_order_line`. Сохранить `Produced` как накопительный завершённый выпуск и остальной порядок колонок без изменений.

</frozen-after-approval>

## Implementation Notes

- Плановый порядок: `Product | Ordered | In production | Produced | In transit | WH-* | Shipped`.
- Свободный WIP, резервы других строк/заказов и нулевые или отрицательные остатки в `In production` не входят.
- Обновить helper, таблицу, документацию и сфокусированные тесты; API, миграции и операции документов не менять.
- `lineLocationAllocations` возвращает `inProduction`: сумма `StockBalance.quantity` при `stockState=reserved`, `customerOrderLineId` этой строки, `locationType=production_order_line` и `quantity > ALLOCATION_ATLAS_EPSILON`. Не ledger, не `activatedQuantity`, не `sumProducedForLine`.
- UI: колонка `In production` сразу перед `Produced`; `ATLAS_HELP`/caption разделяют текущий WIP и накопительный выпуск; empty `colSpan` = `6 + warehouseIds.length`.
- Файлы: `src/features/logistics/allocation-atlas.ts`, `src/features/logistics/ui/customer-order-lines-table.tsx`, `docs/features/logistics.md`, `tests/unit/allocation-atlas.test.ts`, `tests/unit/customer-order-lines-table.test.tsx`.
- RTL: Cruiser показывает `3` в `In production` из существующего reserved на `pol-1`. Helper-тест суммирует несколько POL и исключает free/чужие строки/0/отрицательные.
- Help/caption: `In production` — текущий WIP reserved этой строки заказа; `Produced` — накопительный завершённый выпуск этой строки. Явно: не складывать Produced с текущими location-колонками (разные базы, возможное пересечение).
- У заголовков `In production` и `Produced` добавлен компактный `title` с тем же смыслом; видимые лейблы не менялись.
- Независимое ревью подтвердило терминологию и расчёт; релевантные замечания по пояснениям исправлены. Несвязанные OMS-906 и stock UX артефакты не изменялись.
- Проверки: 18 сфокусированных тестов, scoped ESLint, typecheck, UI-English и static-images прошли. Полные lint/test по-прежнему падают только на несвязанных существующих файлах и трёх локализационных ожиданиях.

## Review Triage Log

- **medium / patched** — help говорил об уровне заказа вместо строки; текст и тесты переведены на order-line semantics.
- **medium / patched** — не было явного предупреждения о разных базах In production и Produced; help и документация теперь запрещают их складывать.
- **low / patched** — заголовки не объясняли WIP и cumulative output; добавлены компактные `title`.
- **false** — ссылки из агрегированных In production/In transit ячеек неоднозначны при нескольких PO/TR; доступ к конкретным местам остаётся в Release-меню.
- **low / deferred** — базовая done-спецификация не помечена как расширенная новой колонкой; связь записана в deferred-work.
- **false** — наполнение OMS-906 не относится к этой колонке и принадлежит параллельной задаче.
- **false** — термин «поставщики» находится в параллельной спецификации OMS-906, не в текущем изменении.
- **false** — Open Questions OMS-906 не относятся к текущей реализованной матрице.
- **false** — id и сортировка OMS-906 не относятся к текущей колонке.
- **false** — формула Free now принадлежит отдельному stock UX-сеансу.
- **false** — demand-panel другого UX-сеанса не является контрактом Allocation Atlas.
- **false** — product-level uncovered другого UX-сеанса не входит в эту задачу.
- **false** — противоречия чисел mockup другого UX-сеанса не затрагивают текущие тестовые fixtures.
- **false** — фильтры и pagination stock mockup не относятся к карточке заказа.
- **false** — описание `/store/logistics/stock` не связано с изменением customer-order detail.
- **false** — тире для нулей соответствует утверждённому Allocation Atlas; противоположное правило находится в другом UX-сеансе.
- **false** — подписи PO order codes в stock mockup не относятся к production-order-line расчёту этой колонки.
