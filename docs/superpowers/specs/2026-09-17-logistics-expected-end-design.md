# Logistics — Expected End Dates Design Spec

**Date:** 2026-09-17  
**Status:** Implemented  
**Surface:** `/logistics/customer-orders`, `/logistics/production-orders`, `/logistics/outputs`, `/logistics/transfers`  
**Related:** [docs/features/logistics.md](../../features/logistics.md)

## Goal

Long-running logistics work (production, output, transfer) carries an optional expected end date. The customer order shows those dates on related documents and a separate manager-set end date for the whole order, so clients can see timelines.

This is a prototype: change the model and UI for real. Do not keep `draft`/`posted` under output, do not map old names in the UI, do not leave compatibility shims.

## Decisions

| Topic | Choice |
|-------|--------|
| Order timeline | Manager sets `expected_end_on` on the order by hand. Not derived from documents. |
| Document dates | Each production, output, and transfer has its own optional `expected_end_on`. Shown on the order hub next to status. |
| Output lifecycle | Real statuses `planned` → `done` (plus `cancelled`). Stock moves on `done`. |
| Date type | Calendar `date`, not timestamptz. |
| Required | Optional on order, production, output, and transfer. |
| Editable | Always, including after done / delivered / order closed. |
| Shipments / reservations / releases / returns | No expected-end field. |
| Overdue badges | Out of scope. |
| Output fact timestamp | `posted_at` renamed to `done_at`. |
| Complete RPC | `logistics_post_output` renamed to `logistics_complete_output`. |
| UI language | Same as current logistics screens (`english-ui:ignore-file`). Do not translate the module in this change. |

## Data model

Add nullable `expected_end_on date` to:

- `logistics_customer_order`
- `logistics_production_order`
- `logistics_transfer`
- `logistics_output`

The field is independent of posting. It never writes stock transactions and never changes balances.

### Output status (breaking)

`logistics_output.status` is no longer a generic document status.

| New | Old |
|-----|-----|
| `planned` | `draft` |
| `done` | `posted` |
| `cancelled` | `cancelled` |

Column rename: `posted_at` → `done_at`.

TypeScript: `OUTPUT_STATUSES = ["planned", "done", "cancelled"]`. `ProductionOutput.status` uses `OutputStatus`, not `DocumentStatus`. Lists, badges, filters, and related-document meta use these values.

Migration updates existing rows and recreates `logistics_post_output` as `logistics_complete_output`. Drop the old function name. Cancel and “already outputted” checks use `done`.

Idempotency: completing an output that is already `done` writes no new ledger rows.

Cancel: reverse ledger only when status is `done`, then set `cancelled`.

Create: new outputs insert as `planned`. Completing a planned output writes the same stock movements as today’s post (reserved stays reserved, free stays free on the manufacturer warehouse), then sets `done` and `done_at = now()`.

Production and transfer workflows stay as they are. Only the date column is added.

## UI

### Customer order

- Toolbar / header: date input **Expected end** bound to `customer_order.expected_end_on`. Editable while open and after closed.
- Related board, first row (productions, outputs, transfers): item meta is `status` or `status · <short date>` when the document has `expected_end_on`.
- Shipments, reservations, releases, returns: unchanged (status only).

### Lists

Customer order, production, output, and transfer tables gain an **Expected end** column. Empty value renders `—`.

### Detail and create

Production, output, transfer, and order create/edit surfaces get the same optional date field. Saving updates the row immediately (or as part of create payload). Always writable.

### Output copy and actions

| Was | Becomes |
|-----|---------|
| Draft | Planned |
| Posted / Post / Выпустить | Done / Complete |
| Cancelled | Cancelled |

Output list filters: All / Planned / Done / Cancelled.

Quantity already outputted counts only lines whose output status is `done`.

Date display: short calendar day (same locale as existing logistics timestamps, without time).

## Seed

`scripts/seed-logistics.mjs` must use `planned`/`done` for outputs and include `expected_end_on` on a subset of:

- open customer orders
- production orders
- planned and done outputs
- sent and delivered transfers

Leave some rows without a date so the empty state is visible.

## Documentation and tests

- Update [docs/features/logistics.md](../../features/logistics.md): expected-end field, output Planned/Done, order hub shows document dates plus manager order date.
- Unit tests for related-document meta that includes the date.
- Browser check: order card shows both date kinds; edit order date; edit a document date after completion; complete a planned output; list column renders.

## Out of scope

- Expected end on shipments, reservations, releases, returns.
- Derived / max date on the order.
- Overdue styling or date-change history.
- Output as a stock location.
- Extra output statuses (`in_progress`).
- Translating the logistics module to English.

## Prototype rule

When this spec says “rename”, rename in the schema, RPC, TypeScript, seed, tests, and UI. Do not keep the old name as a hidden alias.
