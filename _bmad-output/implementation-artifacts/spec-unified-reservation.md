---
title: 'Единая модель Reservation'
type: 'refactor'
created: '2026-09-18'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
  - '{project-root}/docs/features/logistics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Бронирование RSV и снятие REL дублируют таблицы, формы, маршруты и posting-логику, хотя отличаются только направлением перевода количества между `free` и `reserved`.

**Approach:** Заменить их одной сущностью `Reservation`: заголовок задаёт `operation=reserve|release`, один заказ и одно место; положительные строки задают количества. Мигрировать существующие данные и журнал без изменения остатков.

## Boundaries & Constraints

**Always:**
- Заголовок: `customer_order_id`, одно `location_type/location_id`, `operation`, `status=draft|posted`, `origin=manual|order_close`, необязательный `note`, даты.
- Строка: `reservation_id`, `customer_order_line_id`, положительный `quantity`; `product_id` не хранится.
- Все строки документа принадлежат заказу заголовка, используют его место и одно направление.
- `reserve`: `free → reserved`; `release`: `reserved → free`. Signed quantity существует только в ledger.
- Допустимые места: `warehouse`, `production_order_line`, `transfer`.
- Posted Reservation неизменяема. Нет `cancelled` и сторно.
- Код и последовательность едины: `RSV-n`.
- Закрытие заказа атомарно создаёт по одной posted release-Reservation с `origin=order_close` на каждое место остаточного резерва.
- Миграция сохраняет документы, связи, журнал и итоговые балансы. Старые IDs/коды могут измениться; multi-location документы разделяются по местам.

**Never:**
- Не сохранять отдельные таблицы/API/UI-модель REL.
- Не добавлять ссылку release на исходный reserve.
- Не хранить `product_id` или место в строке Reservation.
- Не сбрасывать/пересоздавать демо-данные.
- Не менять семантику transfer, shipment, return, output за пределами адаптации к единой Reservation.
- Не использовать Capacity, YNAPB или cloud Supabase.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reserve | `operation=reserve`, positive qty, free/open demand хватает | `free -qty`, `reserved(order,line) +qty` | Атомарный отказ без ledger rows при превышении |
| Release | `operation=release`, positive qty, reserved места хватает | `reserved -qty`, `free +qty` | Атомарный отказ при превышении |
| Partial release | qty меньше текущего reserved | Освобождается только qty | Не требует отдельного режима |
| Order close | Reserved распределён по нескольким местам | По одному posted release-документу на место в одной транзакции | Любая ошибка откатывает все документы |
| Migration | Старые RSV/REL, включая multi-location | Новые Reservation, ledger remap, balances до/после равны | Миграция прерывается при нарушении инварианта |
| Legacy URL | Старый `/releases` | Redirect в Reservations с фильтром release | Нет отдельной Releases страницы |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260916200000_logistics.sql` и последующие `logistics_*` -- текущие RSV/REL таблицы, ledger и RPC.
- `src/features/logistics/logistics-types.ts` -- раздельные типы Reservation/ReservationRelease и statuses.
- `src/features/logistics/logistics-api.ts` -- snapshot queries и create/post RPC wrappers.
- `src/features/logistics/logistics-forms.tsx` -- ReservationForm и ReleaseForm.
- `src/features/logistics/reservations-page.tsx` -- RSV list/detail.
- `src/features/logistics/flow-documents-pages.tsx` -- Releases list/detail и общие flow pages.
- `src/features/logistics/customer-orders-page.tsx` -- действия reserve/release и order close.
- `src/features/logistics/logistics-nav.ts`, `logistics-paths.ts`, `logistics-codes.ts`, `logistics-labels.ts`, `logistics-related.ts` -- навигация, ссылки и отображение.
- `scripts/seed-logistics.mjs` и `scripts/data/logistics-demo.json` -- воспроизводимость новой схемы.
- `tests/unit/logistics-*.test.ts` -- unit coverage.
- `_bmad-output/brainstorming/brainstorm-unified-reservation-sign-2026-09-18/brainstorm-intent.md` -- полный утверждённый intent.

## Tasks & Acceptance

**Execution:**
- [x] Новая migration -- создать единую schema/RPC, мигрировать RSV/REL и ledger, проверить неизменность балансов, удалить legacy tables/functions.
- [x] Types/API/store -- один Reservation shape и один create/post path.
- [x] Forms/pages -- единая форма, список, detail и operation filter; удалить Releases UI.
- [x] Navigation/routes -- удалить Releases, legacy URLs redirect на release filter.
- [x] Order close -- генерировать release Reservation per location атомарно.
- [x] Seed/docs/tests -- обновить fixtures, canonical docs и покрыть инварианты.
- [x] Применить migration только к Oryx demo Supabase и проверить живую схему без тестовых записей.

**Acceptance Criteria:**
- Given reserve или release, when пользователь проводит Reservation, then один RPC пишет корректные противоположные ledger movements.
- Given один документ, when он создаётся, then все строки относятся к одному order/location/operation и не содержат product/location.
- Given distributed reserve, when order closes, then created posted release Reservations count equals locations count and all residual reserved becomes free atomically.
- Given legacy RSV/REL data, when migration completes, then documents remain discoverable and every stock balance equals its pre-migration value.
- Given UI, when user opens Logistics, then only Reservations is present with All/Reserve/Release filter and codes use RSV.
- Given old release URL, when opened, then it redirects to unified Reservations release view.
- Given posted Reservation, when mutation/cancel is attempted, then it is rejected.

## Implementation Notes

- **Decision:** One additive migration `20260918100000_logistics_unified_reservation.sql` renames legacy RSV/REL tables, creates canonical `logistics_reservation` (+ lines), splits multi-location docs, remaps ledger `source_type/source_id/source_line_id` to `reservation`, drops REL tables/`logistics_post_release`, and rewrites `logistics_post_reservation` / `logistics_close_customer_order` / cancel message. Order close creates draft release Reservation(s) per location then posts via the same RPC (ledger identity always `reservation`).
- **Files:** schema migration; `logistics-types/api/forms/codes/labels/nav/paths/related/availability/rules`; `reservations-page` + hold list; release routes → redirect; customer-orders related block; seed stories; `docs/features/logistics.md`; unit tests including `logistics-unified-reservation.test.ts`.
- **Live:** Applied on Oryx demo Supabase (`oryx-supabase-bb1dnn`). Balances matched pre-migration snapshot exactly. Result: 9 RSV docs (7 reserve + 2 release; old multi-location RSV-1 split into RSV-1/RSV-2). No `reservation_release` / `customer_order_close` ledger sources remain. After DDL, `NOTIFY pgrst, 'reload schema'` was needed for PostgREST.
- **Verification:** `typecheck` pass; `test` 310/310; `check:ui-english` / `check:static-images` pass; targeted eslint on touched files clean. Full `npm run lint` still reports pre-existing React Compiler issues in `production-orders-page.tsx` / `stock-page.tsx` (unrelated). Browser: list All/Reserve/Release, detail RSV-8 release, `/releases` → `?operation=release`.
- **Risks:** Historical note text may remain non-English (migrated demo content). Legacy release detail URLs redirect to the release filter list (IDs changed). Seed-from-zero relies on this additive migration after existing logistics migrations.

## Spec Change Log

## Review Triage Log

## Design Notes

Prefer one canonical table pair and one posting RPC. Compatibility redirects are allowed; compatibility data models are not. Keep migration self-validating with before/after balance comparison.

## Verification

**Commands:**
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run check:ui-english`
- `npm run check:static-images`
- Oryx Supabase schema/data checks and browser verification of unified Reservations.
