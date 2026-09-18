---
title: 'Закрытие заказа на производство снимает резерв'
type: 'bugfix'
created: '2026-09-18'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '34f20b4c7a411752be671ef3a29e6c85fcac132f'
context:
  - '{project-root}/docs/features/logistics.md'
  - '{project-root}/docs/conventions/backend/supabase.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-unified-reservation.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Закрытие заказа на производство списывает остаток на его строках напрямую, в том числе `reserved`. Документ Reservation не создаётся, claim заказа клиента остаётся, товары «висят» в резерве.

**Approach:** Перед списанием незавершённого количества атомарно провести release-Reservation на каждый остаточный резерв места заказа на производство (как при закрытии заказа клиента), затем списать уже свободный остаток через `production_close`.

## Boundaries & Constraints

**Always:**
- Снять резерв можно только posted Reservation с `operation=release`.
- Один release-документ = один заказ клиента + одно место (`production_order_line`) + origin `order_close`.
- После release оставшийся остаток на строках (теперь `free`) списывается `production_close`, как сейчас. Незавершённое производство не переезжает на склад.
- Закрытие и все документы — одна транзакция RPC; повторный вызов на уже `closed` идемпотентен.

**Never:**
- Не писать отрицательный `reserved` источником `production_close`.
- Не отменять и не сторнировать posted RSV.
- Не менять закрытие заказа клиента, схему Reservation и UI списка резервов, кроме тоста закрытия PO.
- Не превращать close в отказ «сначала снимите резерв вручную».

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Close with reserved | Строка PO: 2 reserved по OMS | Posted release RSV `origin=order_close`, затем `production_close` −2 free; PO `closed`; OMS больше не держит этот claim | Ошибка post/release откатывает всё |
| Close free only | Строка PO: только free | Release-документов нет; `production_close` списывает free; PO `closed` | N/A |
| Several orders on one line | Два OMS reserved на одной строке PO | По одному release RSV на каждый заказ+место, потом списание free | Атомарный откат |
| Already closed | PO status `closed` | RPC возвращает `closed`, новых RSV и ledger нет | N/A |
| Live PO-2 repair | PO-2 closed, RSV-11 posted, ledger −2 reserved через `production_close` | После фикса: release RSV + списание free; RSV-11 не остаётся единственным posted reserve без встречного release | Не оставлять отрицательный reserved |

</frozen-after-approval>

## Code Map

- `public.store_close_production_order` (live; исходник в `supabase/migrations/20260917230200_logistics_integer_id_rpcs.sql`, после prefix) — баг: цикл по остаткам сразу `store_write_tx(..., stock_state)` включая `reserved`.
- `public.store_close_customer_order` — образец: draft release RSV на каждое место с `reserved > 0`, `store_post_reservation`, затем статус.
- `src/features/logistics/logistics-api.ts` -- `closeProductionOrder` → RPC, сигнатуру не менять.
- `src/features/logistics/production-orders-page.tsx` -- кнопка закрытия и тост.
- `docs/features/logistics.md` -- правило: close PO сначала release, потом списание free.
- Live demo: PO-2 / line 4 / product 46 / RSV-11 / OMS-904; tx 71 `production_close` −2 reserved. Не класть этот ремонт в миграцию — только one-off SQL после деплоя функции.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/` -- additive migration: `store_close_production_order` сначала создаёт и проводит release RSV на `(customer_order_id, production_order_line)` с `reserved > 0`, затем существующий write-off только оставшихся положительных остатков -- ядро бага.
- [ ] MCP `oryx-supabase` `apply_migration` -- применить на demo `oryx-supabase-bb1dnn`.
- [ ] Live repair PO-2 -- убрать ошибочный `production_close` reserved write-off, повторно закрыть уже новой RPC (или эквивалентные compensating docs+ledger), чтобы RSV-11 был покрыт release и остаток строки 4 = 0.
- [ ] `src/features/logistics/production-orders-page.tsx` -- тост закрытия: резервы сняты и заказ закрыт.
- [ ] `docs/features/logistics.md` -- одно предложение про close PO = release затем write-off.

**Acceptance Criteria:**
- Given строка PO с reserved, when пользователь закрывает заказ на производство, then появляются posted release RSV на каждое (заказ, место), ledger reserved→free, затем production_close списывает free, PO `closed`.
- Given только free на строках, when close, then release-документов нет и free списан.
- Given уже закрытый PO, when close снова, then без новых документов и движений.
- Given текущий PO-2, when repair завершён, then на line 4 нет остатка, у OMS-904 нет reserved на line 4, и есть posted release напротив RSV-11.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Закрытие заказа клиента уже делает auto-release per location. У PO одно место может держать несколько OMS — группировать по `(customer_order_id, location_id)`, note `Production order closed`. После release write-off цикл можно оставить: `having sum(quantity) > 0` увидит только free.

Ремонт PO-2 не в миграции: функция на `closed` выходит сразу. Сначала компенсировать tx 71, затем вызвать исправленный RPC (или reopen → close).

## Verification

**Commands:**
- `npm run typecheck` -- expected: pass
- `npm run check:ui-english` -- expected: pass (тост на английском в UI? нет — текущие тосты логистики на русском и в ignore/не сканере страницы; не добавлять кириллицу в пользовательский page text сверх существующего паттерна тостов)

**Manual checks:**
- SQL: закрыть тестовый не-PO-2 нельзя оставлять; проверить PO-2 line 4 qty=0, новый release RSV posted, OMS-904 reserved на line 4 = 0.
- Browser: `/store/logistics/production-orders/2` closed; `/store/logistics/reservations` есть release по этому месту; карточка OMS-904 не показывает эти 2 как занятые на PO-2.
