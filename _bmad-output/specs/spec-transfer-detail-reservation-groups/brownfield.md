# Brownfield implementation context

## Existing surface

- Primary implementation: `src/features/logistics/transfers-page.tsx`, component `TransferDetailPage`.
- Data model: `src/features/logistics/logistics-types.ts`; `OwnerType` is `order | region`, `TransferAllocation` already stores `ownerType`, `ownerId`, and quantity.
- Current stock truth comes from balances and immutable transactions. A sent transfer is a stock location of type `transfer`.
- Owner presentation and links already exist through `ownerLabel`, `hrefForOwner`, order lookups, and region lookups.
- Reuse `ReservationForm` from `src/features/logistics/logistics-forms.tsx` with preset `{ locationType: "transfer", locationId: transfer.id }`.
- Reuse existing status badges, expected-end mutation, document actions, `ProductIdentity`, and ledger data. Do not duplicate domain rules in presentation code.

## Projection rules

- `In transit`: use positive current balances at the Transfer location, grouped by product and owner. `stockState=free` maps to `Free`; reserved balances use `ownerType` and `ownerId`.
- `Delivered` and `Cancelled`: keep document products visible and reconstruct the relevant read-only owner snapshot from immutable document transactions when current Transfer balances are empty. Do not infer ownership only from status.
- If no live balances or usable transactions exist, use Transfer lines plus saved allocations as a defensive document fallback; unallocated line quantity is `Free`.
- Grouped mode emits one section per positive owner bucket. Products may repeat across sections.
- Ungrouped mode emits one product total and owner breakdown. Bucket sums must equal product total.
- Activity remains chronological and includes only events supported by current ledger data.

## UI composition

- Replace the current `LogisticsToolbar` presentation for this detail surface with a dedicated document header that keeps breadcrumb outside.
- Header owns identity, one status, expected date, actions, and one route strip.
- Desktop content grid: product manifest `minmax(0, 2fr)` and activity `minmax(280px, 1fr)`.
- `Group by reservation` uses local state, defaults to on, and changes no backend data.
- Grouped rows are not disclosures. Ungrouped product rows are keyboard-accessible disclosures.
- `Reserve in transit` is page-level, only for `sent` with positive `Free`; it opens the existing `ReservationForm`.
- Preserve the current direct-send baseline: do not restore Transfer Draft, Send, Add product, or line-editing UI.

## Verification targets

- Add pure projection tests for draft allocations, sent balances, order and region groups, split products, group totals, ungrouped totals, and terminal-history fallback.
- Add component tests for default grouped mode, toggle to ungrouped mode, disclosure labels and quantities, route/header semantics, lifecycle action visibility, Reservation preset, empty/error states, and accessible control names.
- Preserve existing transfer direct-send and schema-prefix coverage.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run check:ui-english`, and `npm run check:static-images`.
