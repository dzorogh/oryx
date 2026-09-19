---
title: 'Compact Matrix Stock через generic owner'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'f513207e4d8c852b736ce770783412ffe9fd214b'
context:
  - '{project-root}/docs/conventions/ui/list-page-toolbar.md'
  - '{project-root}/docs/conventions/ui/english-labels.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/specs/spec-order-and-region-reservations/SPEC.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Stock прячет owner в Reserved и показывает Shipped / customer-location; регион выглядит как покрытие спроса.

**Approach:** Compact Matrix с тремя вкладками группировки одного on-hand: `Products`, `Warehouses`, `Regions`. Products показывает Owner (`Free` / `Region reserve` / `Order reserve`) и Location (`Warehouses` / `Production` / `Transfers`); Warehouse группирует product rows по складу; Region — только region-owned reserve по месту. Shipped и customer-location выкинуть до агрегации.

## Boundaries & Constraints

**Always:** English UI, снять ignore. Breadcrumb `bg-muted/30`, `LogisticsToolbar`, full-width, без `max-w-*` и KPI. Вкладки только `Products` / `Warehouses` / `Regions`. Отдельных `SKU`, `Unit`, `Plant` нет; unit показывается рядом с количеством. `0` число; `—` только N/A. Без Factual conditions. Суммы только внутри строки одного product/unit. On-hand ≠ shipped и ≠ `customer_order`. Новый helper; `summarizeProductStock` не трогать. Reuse shell/toolbar/`ProductIdentity`/`useLogisticsStore`/`matchesProductQuery`. Sticky identity. Поиск виден; `Filters` открывает справа контекстную панель: Products — owner/location/region, Warehouses — warehouse/owner/region, Regions — region/location/warehouse. URL `group` `owner` `location` `warehouse` `region` `q`. `stockHref` карточек жив.

**Never:** Operational views (`Customer demand`, `Production & transfers`, `Ledger`, generic Locations), secondary/detail state, Factual conditions, demand/customer-order filters, Shipped-колонки, customer totals, totals across products/units, KPI, палитра, reuse `LogisticsTableCard`/`TypeQty`. Live migration/seed/writes. Ledger/cards/OMS/ship/transfer/production кроме `stockHref`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Matrix | WH 10+4+6; PO Free2; TR order3; shipped5 customer_order | Owner 12/4/9; Location 20/2/3; нет Shipped/Customer | N/A |
| Warehouse grouping | WH-2 содержит три товара | Section WH-2; одна строка на product; On hand = Free+Region+Order только этой строки | N/A |
| Region grouping | REG-1 на WH/PO/TR | Section REG-1; одна строка на product; Region reserve = WH+PO+TR только этой строки | N/A |
| Filters / zero | `owner=region&region=3&location=warehouse&q=chair`; Production 0 | Search виден; Filters открывает правую панель; AND; qty `0` | unknown ignore; `LogisticsError` |
| Empty | нет on-hand | empty copy | skeleton |

</frozen-after-approval>

## Code Map

От `src/features/logistics/`.

- `stock-page.tsx` — русский Stock + `TypeQty` (0→`—`, shipped). Переписать.
- `stock-filters.ts` — `state`/`place` → `owner`/`location`/`order`/`region`/`q`; `stockHref` для карточек.
- `logistics-balances.ts` — balances по owner; `summarizeProductStock` reserved+shipped. Новый `stock-product-matrix.ts`.
- `logistics-types.ts`, `logistics-api.ts`, `use-logistics-store.ts` — owner+regions доступны после landed cutover `f513207`; читать, не переписывать.
- `ui/logistics-table-card.tsx` — нет grouped headers. Reuse shell/toolbar/`ProductIdentity`.
- `app/store/logistics/stock/page.tsx` — English metadata.

## Tasks & Acceptance

**Execution:**
- [x] `stock-product-matrix.ts` — три проекции одного on-hand: product, warehouse×product, region×product; без shipped/customer-location
- [x] `stock-filters.ts` — group/owner/location/warehouse/region/q URL + совместимый `stockHref`
- [x] `ui/stock-products-matrix.tsx` — три grouping tabs, grouped section rows, sticky identity, без `SKU`/`Unit`/`Plant`, unit внутри quantity, 0/`—`
- [x] `stock-page.tsx` + `app/store/logistics/stock/page.tsx` — English Stock; поиск + контекстный CSS/Sheet `Filters` справа; убрать `TypeQty`, operational views, conditions и ignore
- [x] `tests/unit/stock-product-matrix.test.ts` + `tests/unit/stock-filters.test.ts` — I/O matrix

**Acceptance Criteria:**
- Given on-hand Free/region/order на WH/PO/TR и shipped на customer_order, when Products Stock, then одна identity-колонка `Product`, три owner- и три location-колонки одного населения; отдельных `SKU`/`Unit`/`Plant`, Shipped/Customer/KPI нет, unit виден рядом с quantity.
- Given Warehouse grouping, when Stock renders, then rows grouped by warehouse and every data row remains one product/unit with Free, Region reserve, Order reserve, On hand.
- Given Region grouping, when Stock renders, then rows grouped by region and include only region-owned reserve split across Warehouses, Production, Transfers.
- Given Stock, when пользователь меняет Products/Warehouses/Regions, then context filters switch accordingly; operational views, secondary/detail state и Factual conditions отсутствуют.
- Given URL-фильтры и merge, when render, then `0` не `—`; AND; Reset только Stock; `stockHref` и `summarizeProductStock` живы; `check:ui-english` чист.

## Implementation Notes

- Пользователь подтвердил: `Free` в Products суммируется по всем on-hand местам; в контрольном примере `10 warehouse + 2 production = 12`.
- Реализованы отдельный owner-aware matrix helper, URL-фильтры, три табличные группировки и контекстная панель Filters.
- Добавлен render coverage для заголовков, нулей, grouped sections, empty state и состава фильтров.
- Полный `npm run test`: 50 файлов / 391 тест; typecheck, English UI и static-images прошли. Repo-wide lint блокируют существующие ошибки вне Stock; lint изменённых Stock-файлов чист.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence / route |
|---|---|---|---|
| blind-hunter | Старые входящие `place/state/order` URL не мигрируются | low | Новые внутренние ссылки совместимы через `stockHref`; сохранённые legacy URL вне ежедневного пути, а `state/order` неоднозначны. Отклонено. |
| blind-hunter | При смене grouping остаются скрытые фильтры | medium | Воспроизведено по URL; исправлено через `stockFilterForGroup` и тесты переходов. |
| blind-hunter | Region вместе с Owner Free/Order даёт пустое пересечение | false | Спека явно задаёт AND между фильтрами; пустое пересечение корректно, оба контроля видимы в Products. |
| blind-hunter | URL-only updates могут терять соседний patch; поиск не охватывает group labels | medium | Потеря patch реальна и исправлена optimistic ref; поиск намеренно ограничен product name/SKU согласно placeholder и spec. |
| blind-hunter | `docs/features/logistics.md` описывает старый Stock | medium | Подтверждено; Stock-параграф обновлён под три группировки и owner filters. |
| blind-hunter | Нет page-level теста вкладок/search/panel/reset | medium | Подтверждено; добавлен `stock-page.test.tsx` и расширен render coverage. |
| blind-hunter | Неизвестные warehouse/region ids остаются значениями Select | medium | Подтверждено против I/O правила unknown-ignore; добавлена snapshot-нормализация и тесты. |
| blind-hunter | Warehouse options должны показывать code + name | false | Каноническое правило Logistics вне справочника показывает только `WH-*`; текущее поведение намеренно. |
| blind-hunter | Закрытая панель не показывает summary активных фильтров | false | Утверждённый прототип использует filled Filters + Reset без chips/summary. |
| blind-hunter | Desktop Filters не открывается во время loading/error | medium | Реально: кнопка была активна без панели; исправлено отключением до готовности данных. |
| blind-hunter | Неполная table accessibility и нет sticky vertical header | medium | `scope`/rowgroup gap подтверждён и исправлен; sticky vertical header не входит в spec. |
| blind-hunter | Filters/tabs не связаны ARIA-атрибутами | medium | Подтверждено; добавлены dynamic label, controls, tab ids и tabpanel wiring. |
| blind-hunter | Локальный quantity formatter дублирует shared helper | false | Shared helper переводит `pcs` в русский; локальный English formatter нужен rewritten Stock surface. |
| blind-hunter | Новые owner/location types будут молча отброшены | false | Типы и DB constraints закрыты на `order|region` и фиксированные locations; новый type требует schema/code change. |
| edge-case-hunter | Быстрые последовательные filter patches теряют предыдущее значение | medium | Подтверждено; исправлено optimistic `filtersRef`, покрыто page test. |
| edge-case-hunter | Filters click при loading/error не показывает panel | medium | Подтверждено; кнопка disabled до ready state. |
| edge-case-hunter | Group change сохраняет hidden fields | medium | Подтверждено; исправлено единым transition helper. |
| edge-case-hunter | Пустой `warehouseId` создаёт пустую секцию | false | `location_id` обязателен в ledger/schema и mapper всегда возвращает строковый id; состояние недостижимо. |
| verification-gap | Warehouse card URL не проверяет warehouse projector filter | medium | Gap подтверждён; добавлен regression test `warehouseId` → одна секция. |
| verification-gap | `q` не проверен на удаление rows/empty sections | medium | Gap подтверждён; добавлен focused Stock page search test. |
| verification-gap | Filter panel не проверяет записываемые patch values | medium | Gap подтверждён; добавлены select/clear assertions для owner/location/warehouse/region. |
| verification-gap | Shipped исключался только вместе с customer location | medium | Gap подтверждён; добавлен shipped-at-warehouse fixture, totals остаются неизменны. |

## Design Notes

Compact Matrix — три группировки одного on-hand: Product, Warehouse, Region. `Reserved`/`Shipped`/`Customer` → owner/location projections. On-hand: не shipped и не `customer_order`. Фильтры скрыты в контекстной правой панели; никаких demand-срезов и conditions.

## Verification

**Commands:**
- `npm run lint` -- expected: exit 0
- `npm run typecheck` -- expected: exit 0
- `npx vitest run tests/unit/stock-product-matrix.test.ts tests/unit/stock-filters.test.ts` -- expected: I/O ok
- `npm run check:ui-english` -- expected: Stock English
- `npm run check:static-images` -- expected: exit 0

**Manual checks (if no CLI):**
- `/store/logistics/stock`: вкладки Products/Warehouses/Regions; нет operational views/conditions/detail/Shipped/Customer/KPI; поиск виден, Filters открывает контекстную правую панель.
