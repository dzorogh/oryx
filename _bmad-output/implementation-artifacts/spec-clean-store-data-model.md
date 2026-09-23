---
title: 'Чистая модель данных Store'
type: 'refactor'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '461cf68abf84dc4adc3f9d64290aac3572bdc3ca'
context:
  - '_bmad-output/brainstorming/brainstorm-store-data-schemas-2026-09-22/brainstorm-intent.md'
  - 'docs/conventions/backend/supabase.md'
  - 'docs/conventions/ui/place-codes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Store вырос из цепочки экспериментальных миграций: схема содержит legacy-поля и объекты, permissive RLS/grants, несогласованные статусы и названия, слабые FK, публичные внутренние функции и незащищённый журнал остатков. По самой БД невозможно однозначно восстановить предметную модель.

**Approach:** Заменить Store одной чистой `public.store_*` baseline-моделью, удалить текущие demo-данные, выполнить privileged reseed и одновременно перевести приложение, seed и тесты на новый контракт. Сама схема, ограничения, SQL-логика и подробные комментарии каждой таблицы и колонки становятся единственным источником истины.

## Boundaries & Constraints

**Always:** Сохранить class-table документы и одну универсальную product-line; ввести отдельные реестры stock location/owner; разделить product/variant; повторить очищенную production-модель pricing; использовать `deleted_at` во всех справочниках; защищать lifecycle, history и append-only ledger в БД; блокировать конкурентные stock keys; оставить `public.store_*`; создать общий `public.app_user` demo-каталог и ссылать авторские поля на него; пользовательский текст и DB-comments писать по-русски.

**Never:** Не вводить PostgreSQL schema `store`, application API, legacy aliases/overloads, replay старой migration-chain, request/idempotency tables, публичный reset RPC, JSON snapshots, прямую browser-запись фактов/финальных документов или отдельный backend-handoff.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Posting | Достаточный остаток; один документ | Факты добавлены атомарно, balance изменён один раз | Вся транзакция откатывается |
| Concurrent posting | Два запроса расходуют один stock key | Stable advisory locks сериализуют проверку; отрицательный остаток невозможен | Второй запрос получает предметную ошибку |
| Lifecycle | Разрешённый переход kind/status | `store_document` обновлён; history пишет один trigger | Запрещённый переход отклоняется |
| Immutable data | UPDATE/DELETE ledger, history или final document | Изменение не выполняется | DB exception |
| Soft delete | Справочник имеет исторические ссылки | `deleted_at` скрывает запись, FK и история сохраняются | Physical delete запрещён |
| Pricing | Purchase без региона; dealer/retail с регионом | Валюта и текущая цена однозначны; document line фиксирует использованную цену | Некорректная комбинация отклоняется |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260916*`–`20260922*` -- заменить Store/logistics-цепочку одной canonical baseline; `thank_you_entry` не менять.
- `src/features/logistics/logistics-api.ts` -- новый read contract, command RPC, убрать generic/direct mutations и старые projections.
- `src/features/logistics/logistics-types.ts`, `logistics-rules.ts`, `logistics-codes.ts`, `logistics-balances.ts`, `logistics-cancel-guidance.ts` -- variant/location/owner IDs, единые статусы и новые kinds.
- `src/features/logistics/**/*.{ts,tsx}` -- plant/production_output naming и новые document/line contracts.
- `src/features/store/store-catalog-from-logistics.ts`, `src/components/store/pim/{products,pricelists}/**/*` -- product/variant, relational prices, currencies, groups и statuses.
- `scripts/seed-logistics.mjs`, `scripts/lib/seed-logistics-stories.mjs`, `scripts/data/logistics-demo.json` -- privileged seed без public reset и dropped tables.
- `tests/unit/logistics-*.test.ts`, `tests/unit/universal-document-lines.test.ts` -- новый контракт и edge cases.
- `docs/features/logistics.md`, `docs/features/store-pim-*.md`, `docs/conventions/backend/supabase.md` -- синхронизировать поведение и доступ.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/` -- создать canonical Store baseline: target tables/views, FK/check/partial unique/indexes, comments, lifecycle/history/immutability/concurrency logic, минимальные grants/RLS; удалить superseded Store/logistics migrations.
- [x] `src/features/logistics/` -- перевести домен, чтение и команды на новую схему без legacy names/types и прямой мутации защищённых таблиц.
- [x] `src/features/store/`, `src/components/store/pim/` -- подключить product/variant и production-shaped pricing/region catalogs вместо demo price structures.
- [x] `scripts/` -- сделать внешний privileged reseed и удалить reset/remap/old-line assumptions.
- [x] `tests/unit/` -- покрыть lifecycle, owners/locations, signed adjustments, shipment direction, pricing и concurrency-facing invariants.
- [x] `docs/` -- обновить единственные пользовательские/convention документы; схема остаётся канонической технической документацией.
- [x] Oryx Supabase -- применить baseline выбранной стратегией данных и выполнить DB acceptance audit.

**Acceptance Criteria:**
- Given чистая БД, when применяется baseline, then создаются только целевые `store_*` объекты без legacy kinds, tombstones, subtype identities и request/reset объектов.
- Given любая target table/column, when читаются PostgreSQL comments, then бизнес-смысл, units/precision, NULL и ограничения понятны без внешнего handoff.
- Given anon/authenticated, when проверяются grants/RLS/functions, then нет прямого Store DML, open-all policies и EXECUTE внутренних helpers.
- Given документ и subtype/role registries, when нарушается kind correspondence, then DB отклоняет запись.
- Given завершённый документ или существующий ledger/history fact, when выполняется mutation, then DB отклоняет её.
- Given приложение после cutover, when открываются Store logistics, catalog и pricelists и выполняются основные операции, then они работают только с новой моделью.

## Implementation Notes

Completed cutover on top of interrupted baseline work: privileged reseed fills currencies/groups/10 regions, full purchase+regional prices and statuses; PIM pricelists bootstrap from relational Store tables (Yjs still overlays live edits); retail_status check aligned with UI; balance view column comments added; unit suite covers lifecycle/owners/shipment direction/signed adjustments/pricelist cell keys.

Проверка после реализации: `manufacturer` заменён на `plant` во всём коде, включая маршрут `/plants`; мёртвый `requestKey` удалён из логистики; seed привязывает заводы к исходным складам (43 склада, 42 завода), загружает 70 заказов из снимка Корпортала и полный набор демо-историй; в baseline ровно один подробный COMMENT на каждую из 29 таблиц и 141 колонки, тексты совпадают с живой БД.

Известные ограничения: правки цен в прайс-листах живут только в совместном редактировании (функции записи цены в БД нет); все заказы из снимка Корпортала привязаны к одному региону; `npm run lint` и `npm run check:deps` падают по причинам вне этой задачи.

## Spec Change Log

- 2026-09-22: finished remaining app/seed/PIM wiring and DB acceptance after baseline already applied.

## Review Triage Log

- high: `manufacturer` оставался в коде приложения как алиас — исправлено.
- high: комментарии БД были заглушками, затем задублированы в baseline — исправлено, один комментарий на объект.
- medium: seed задваивал склады заводов и не загружал заказы из снимка — исправлено.
- medium: мёртвый `requestKey` после удаления таблиц идемпотентности — удалён.
- medium: демо-историй стало мало — восстановлены.
- false: коды `DFL-`/`PL-` в UI — ошибка чтения скриншота браузерным субагентом; на экране OMS-/PO-.

## Design Notes

Baseline должен быть самодокументируемым и атомарным. Internal helpers не являются public RPC; history имеет ровно один trigger-author; subtype IDs не имеют defaults/sequences; все FK/query paths индексируются осознанно.

## Verification

**Commands:**
- `npm test` -- все unit-тесты проходят.
- `npm run lint` -- без ошибок.
- `npm run typecheck` -- без ошибок.
- `npm run build` -- production build успешен.
- `npm run check:deps && npm run check:docs && npm run check:static-images` -- все project gates проходят.

**Manual checks (if no CLI):**
- Проверить DB audit: grants/RLS, function exposure, comments coverage, identity sequences, orphan FK/indexes, single history writer и append-only ledger.
- Проверить Store logistics, products и pricelists в браузере после reseed.
