---
title: 'Transfer detail: owner-grouped manifest'
type: 'feature'
created: '2026-09-20'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'af14dde695cda85471623f1e2d14c8f12e14e26c'
context:
  - '{project-root}/_bmad-output/specs/spec-transfer-detail-reservation-groups/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-transfer-detail-reservation-groups/brownfield.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-oryx-2026-09-18-6/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-oryx-2026-09-18-6/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Transfer detail hides the physical route and owner split behind ambiguous columns and a detached allocations table. Its two-value manifest also stretches across the page while document activity sits below it.

**Approach:** Build a route-first document header, owner-grouped manifest with an ungrouped disclosure mode, and adjacent chronological activity. Reuse the existing Reservation flow for free stock in transit.

## Boundaries & Constraints

**Always:** Preserve the approved uncommitted direct-send baseline: Transfer has `sent / delivered / cancelled`, not Draft. Use current balances and immutable transactions as stock truth; use existing order/region owners, `ReservationForm`, lifecycle mutations, Oryx shell, shadcn/Tailwind, English UI labels, full-width root, and reload-after-mutation behavior. Keep all pre-existing dirty-tree changes.

**Never:** Restore Draft, Send, Add product, or line editing. Do not change the transfer list/new-transfer dialog, reservation semantics, migrations, direct-send helper, shared status labels, `ReservationForm`, other logistics pages, or add silent allocations, per-row reserve actions, helper cards, repeated route/status facts, or optimistic owner splits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Active transfer | `sent`, positive balances at `transfer/{id}` | Route current node is Transfer; groups come from live Free/Order/Region balances | Invalid or zero buckets are omitted |
| Completed transfer | `delivered`, no live transfer balance | Manifest reconstructs the last in-transit owner snapshot; current node is destination | Fall back to document lines/allocations only when ledger evidence is unusable |
| Cancelled transfer | `cancelled` with or without residual transfer balance | Live residual balances win; otherwise reconstruct history and show origin as current | Do not infer owner split from status |
| Reserve in transit | `sent` with positive Free | Page action opens existing Reservation form preset to this Transfer; reload updates manifest/activity | Posting failure keeps current projection and existing form feedback |
| Refresh/load failure | Existing data then mutation reload, or initial error/not found | Existing detail remains during refresh; initial error/not-found uses English states | No stale data is presented as a successful initial load |

</frozen-after-approval>

## Code Map

- `src/features/logistics/transfers-page.tsx` — replace `TransferDetailPage` composition only; preserve list/dialog and direct-send changes.
- `src/features/logistics/transfer-detail-projection.ts` — new pure projection for route, owner buckets, product totals/breakdowns, terminal fallback, free total, and chronological activity.
- `src/features/logistics/ui/transfer-detail-header.tsx` — dedicated document identity, status, expected date, actions, and single route strip.
- `src/features/logistics/ui/transfer-product-manifest.tsx` — grouped default view, local Switch, ungrouped accessible disclosures.
- `src/features/logistics/ui/transfer-activity.tsx` — read-only chronological ledger-derived events and empty state.
- `src/features/logistics/logistics-forms.tsx` — reuse `ReservationForm` with transfer preset; do not modify.
- `src/features/logistics/logistics-lookups.ts` — reuse owner/order/region/warehouse lookup helpers; format region code + name locally.
- `tests/unit/transfer-direct-send.test.tsx` — preserve direct-send coverage; update only detail assertions affected by English actions/layout.
- `tests/unit/transfer-detail-projection.test.ts` — new pure owner/history projection coverage.
- `tests/unit/transfer-detail-page.test.tsx` — new interaction, lifecycle, action, and accessibility coverage.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/logistics/transfer-detail-projection.ts` — implement deterministic live-balance, ledger-history, and document fallback projections.
- [x] `src/features/logistics/ui/transfer-detail-header.tsx` — implement the expanded route-first header and lifecycle actions.
- [x] `src/features/logistics/ui/transfer-product-manifest.tsx` — implement owner groups, local grouping toggle, and ungrouped disclosures.
- [x] `src/features/logistics/ui/transfer-activity.tsx` — render supported ledger events oldest-first beside the manifest.
- [x] `src/features/logistics/transfers-page.tsx` — integrate projections, components, Reservation form preset, refresh-safe display, and responsive grid without touching list/create behavior.
- [x] `tests/unit/transfer-detail-projection.test.ts` — cover live Free/Order/Region splits, totals, terminal reconstruction, residual cancelled balance, and fallback.
- [x] `tests/unit/transfer-detail-page.test.tsx` and `tests/unit/transfer-direct-send.test.tsx` — cover UI modes, route, actions, async states, accessibility, and preserved direct-send behavior.

**Acceptance Criteria:**
- Given split live stock, when Transfer detail opens, then grouping is on and each positive Free/Order/Region section shows exact product and group quantities.
- Given grouping is turned off, when a product is expanded, then one total row reveals Free, order number, and region code plus name whose quantities sum to the total.
- Given a delivered or cancelled Transfer with empty live balance, when detail renders, then document products and their last in-transit owner split remain visible from immutable history.
- Given `sent` with positive Free, when `Reserve in transit` is selected, then `ReservationForm` opens with location type `transfer` and current id; the action is absent otherwise.
- Given the page loads, then one English status, one expected date, and one origin-current-destination route appear without duplicate summary blocks.
- Given desktop width, then manifest and activity use the specified two-column layout; given a narrow viewport, then manifest precedes activity in one column.
- Given keyboard or screen-reader use, then the grouping Switch, product disclosures, headings, route, quantities, and pending/error feedback expose names and states defined by the UX contract.
- Given the existing dirty direct-send work, when the suite runs, then no Draft UI or list/dialog regression is introduced.

## Implementation Notes

- Live transfer-location balances are authoritative; terminal views reconstruct the pre-completion owner snapshot from immutable transfer-location transactions, then use document lines/allocations only as a defensive fallback.
- The current direct-send work remained intact; no Draft behavior was restored.
- Matrix rows are covered by the new projection/page tests and the existing direct-send suite.
- Full typecheck, 440 tests, English UI, static-image checks, and focused ESLint passed. Full ESLint remains blocked by pre-existing errors outside this implementation.

## Spec Change Log

## Review Triage Log

| Finding | Verdict / route | Evidence |
|---|---|---|
| BH-1 activity source-id collision | medium / patch | `projectActivity` accepts any `sourceType` when `sourceId === transfer.id`; unrelated same-id reservations are reachable. |
| BH-2 nested links inside disclosure button | medium / patch | `ProductIdentity` defaults to linked name/code and is rendered inside a `<button>`. |
| BH-3 mixed-unit group totals | false / reject | Current catalog and seed expose only `pcs`; the dimension mismatch is not reachable in this product state. |
| BH-4 owner header uses `colgroup` | medium / patch | The header labels a `tbody` row group, not a column group. |
| BH-5 cancellation missing from activity | medium / patch | Reversal rows keep `transfer_send` and are collapsed into the earlier sent event, so cancellation time is lost. |
| BH-6 partial terminal history drops products | medium / patch | Any non-empty reconstructed history wins globally; missing product rows never reach document fallback. |
| BH-7 request-table open update/delete | high / defer | Real security risk in pre-existing direct-send migration; frozen intent explicitly excludes migrations/direct-send changes. |
| BH-8 public seed-only RPC parameters | high / defer | Anonymous execute can supply `p_id`/`p_created_at`; belongs to the pre-existing direct-send contract. |
| BH-9 terminal idempotent replay rejected by client | medium / defer | RPC returns current terminal status while client expects sent; pre-existing direct-send behavior outside this page redesign. |
| BH-10 Send remains enabled while pending | medium / defer | List/dialog direct-send forms can submit twice; frozen intent excludes list/create changes. |
| BH-11 reserve-then-cancel owner imbalance | high / defer | `store_cancel_document` reverses original send after owner reassignment; backend reservation/cancellation semantics are pre-existing and excluded. |
| BH-12 Russian copy outside detail | medium / defer | List/dialog and shared labels remain Russian under an ignore-file; those surfaces are explicit non-goals. |
| BH-13 incomplete lifecycle tests | medium / patch | Current-story delivery/cancel/date/activity calls lack exact arguments/reload/order assertions; reserve-cancel backend gap is tracked separately in BH-11. |
| BH-14 DESIGN still lists Draft | low / patch | The finalized visual companion retained one obsolete Draft status label after direct-send became baseline. |
| BH-15 lint expectation conflicts with result | low / reject | The inconsistency is confined to this build spec; review rules reject findings whose fix edits the spec, and focused changed-file lint passes. |
| BH-16 cancel action is not destructive | low / patch | `Cancel transfer` uses `outline`, contrary to the accepted visual contract. |
| EC-1 partial terminal history | medium / patch | Verified duplicate of BH-6. |
| EC-2 unrelated activity collision | medium / patch | Verified duplicate of BH-1. |
| EC-3 mixed-unit aggregate | false / reject | Verified duplicate of BH-3; all reachable product units are `pcs`. |
| EC-4 region delimiter truncation | low / patch | `split(" · ")` keeps only one name segment; region names can contain the delimiter. |
| EC-5 nested interactive identity | medium / patch | Verified duplicate of BH-2. |
| EC-6 wrong table header scope | medium / patch | Verified duplicate of BH-4. |
| EC-7 activity min-width overflow | low / patch | Unconditional `min-w-[280px]` can overflow a narrow stacked viewport. |
| VG-1 no executable Postgres direct-send test | high / defer | Pre-verified gap belongs to the excluded direct-send migration/RPC, not the detail redesign. |
| VG-2 Reservation preset test does not observe preset | medium / patch | The test only checks that TR-901 is an option; removing the preset would still pass. |
| VG-3 delivery test omits target id/reload | medium / patch | Pending-state test never asserts `completeTransfer("tr-1")` or successful reload. |

## Design Notes

Live transfer-location balances are authoritative because post-send Reservations do not update `TransferAllocation`. When terminal lifecycle removes those balances, replay only usable transfer-location transactions into the existing balance projector; allocations are a defensive final fallback, not the primary terminal source.

## Verification

**Commands:**
- `npm run lint` — expected: no lint errors.
- `npm run typecheck` — expected: no TypeScript errors.
- `npm run test` — expected: all tests pass.
- `npm run check:ui-english` — expected: no new non-English UI.
- `npm run check:static-images` — expected: no static-image violations.
