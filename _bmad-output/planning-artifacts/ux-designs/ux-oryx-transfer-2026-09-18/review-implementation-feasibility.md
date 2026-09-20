# Transfer UX Specification — Implementation Feasibility Review

## Verdict

**CONDITIONAL GO — visually and structurally feasible, but not implementation-ready.**

The Dense Ledger interaction can be built with the current React, shadcn, snapshot, balance, and transfer-detail surfaces. The existing domain also supports free stock, order-owned reserved stock, Draft transfers, multiple products, expected dates, and transfer allocations. Implementation should not begin, however, until the create transaction, availability contract, allocation identity, and success-navigation contract below are made explicit.

Reviewed:

- `DESIGN.md`, `EXPERIENCE.md`, `.memlog.md`, and `reconcile-current-transfer-dialog.md`
- `src/features/logistics/transfers-page.tsx`
- `src/features/logistics/order-action-forms.tsx`
- `src/features/logistics/logistics-api.ts`
- `src/features/logistics/logistics-rules.ts`
- `src/features/logistics/logistics-availability.ts`
- `src/features/logistics/logistics-related.ts`
- `src/features/logistics/customer-orders-page.tsx`
- `docs/features/logistics.md`
- relevant transfer schema and posting RPC definitions

Finding counts: **2 Critical · 5 High · 5 Medium · 12 total**

## Confirmed Feasibility

- **Free-only list entry is domain-correct.** `freeAtPlace` reads only `stock_state = free` with a null owner, so it excludes customer-order and region reservations (`logistics-availability.ts:157-170`).
- **Order-context availability is representable.** `reservedAtWarehouseForLine` resolves the exact order/product owner balance, and `reservedLinesAtWarehouse` filters to positive quantities (`logistics-availability.ts:188-233`).
- **Draft semantics already exist.** Transfers support `draft → sent → delivered`; only `store_send_transfer` moves stock (`docs/features/logistics.md:42-44,64`; migration `20260919010000_store_owner_reservations.sql:810-867`).
- **Multiple products and quantities are representable.** A transfer has multiple positive-quantity lines and optional allocations; the selected UX does not require a schema redesign.
- **Order association survives while Draft.** `relatedTransfersForOrder` follows transfer allocations as well as ledger movements, so an allocated Draft can appear on the order journey before sending (`logistics-related.ts:93-130`).
- **The post-create target exists.** `/store/logistics/transfers/[id]` and `TransferDetailPage` are already present.
- **Expected end is already nullable** in the UI/API model and transfer table.

## Findings

### F-01 — Critical — Draft creation is not atomic

**Evidence**

- List creation inserts the transfer header, then each line, then each allocation in separate browser requests (`transfers-page.tsx:208-225`).
- `createAndSendReservedTransfer` repeats the same multi-request sequence (`logistics-api.ts:705-741`).
- `runLogisticsAction` can report failure but cannot roll back writes already completed (`ui/run-action.ts:47-63`).

**Why it matters**

A line or allocation failure can leave a partial Draft. Retrying can create another Draft while the orphan remains. This directly conflicts with the success contract, which treats creation as one operation returning one valid id.

**Implementation implication**

Add one transactional `store_create_transfer_draft` RPC accepting route, expected date, context, and all lines/allocations as JSON. It must validate the complete payload, insert all rows in one transaction, and return the transfer id. Do not compose this operation from public table inserts in the client.

### F-02 — Critical — The stale-availability failure path is not supported by Draft creation

**Evidence**

- `EXPERIENCE.md`, Flow 2 failure path, says the server rejects the create mutation when availability changes and returns updated line maxima.
- Draft inserts do not query or lock stock and do not write the ledger (`transfers-page.tsx:208-225`; `logistics-api.ts:717-737`).
- Authoritative stock checks occur later inside `store_send_transfer` through `store_move` (`20260919010000_store_owner_reservations.sql:810-867,461-482`).
- The domain contract states posting checks and stock movement are transactional (`docs/features/logistics.md:50-64`), while a Draft itself does not move stock.

**Why it matters**

The specified failure behavior cannot occur with the current API. Even a create-time check would only be a point-in-time validation because creating a Draft does not claim stock; another operation can consume that stock immediately afterward.

**Implementation implication**

Choose and document one contract:

1. **Recommended:** creation validates payload shape and owner/product consistency; displayed availability is snapshot-based and authoritative availability is revalidated on Send; or
2. creation additionally rejects when its transactional snapshot is already insufficient, while still warning that Draft does not reserve stock.

In either case, remove the promise that a Draft guarantees future availability. If option 2 is selected, the new RPC must return structured per-line failures.

### F-03 — High — The customer-order controller currently sends all reserved stock immediately

**Evidence**

- `TransferReservedForm` derives every positive reserved line for the selected warehouse and submits all of them (`order-action-forms.tsx:695-724`).
- `createAndSendReservedTransfer` sends by default unless `send === false` (`logistics-api.ts:705-744`).
- The UX requires selecting a subset of order lines, editing each quantity, and stopping at Draft (`EXPERIENCE.md:142-153`; reconciliation items 5 and 7).

**Why it matters**

Reusing the current order form or helper without replacing its controller would silently preserve the exact behavior the new UX is intended to remove.

**Implementation implication**

Replace `TransferReservedForm` state and submit logic with an order-context Draft controller. If the old helper remains for other callers, do not use its send-by-default behavior for this flow. Prefer the new atomic create-Draft RPC from F-01.

### F-04 — High — The create result is discarded, so success cannot navigate to detail

**Evidence**

- List creation receives `id` only inside the action closure and returns nothing (`transfers-page.tsx:208-228`).
- `runLogisticsAction` reduces every successful action to `true` (`ui/run-action.ts:47-63`).
- Current success only closes and resets the dialog (`transfers-page.tsx:229-233`).
- `createAndSendReservedTransfer` does return an id, but the current order form also discards it and only closes (`order-action-forms.tsx:708-728`).

**Why it matters**

The specified `/store/logistics/transfers/:id` navigation is impossible through the current action wrapper.

**Implementation implication**

Make the create operation return the id through a typed result path, then call `router.push("/store/logistics/transfers/" + id)` only after the transaction succeeds. Do not close/reset before the id is available. A snapshot reload is optional before navigation; the detail route can load the new snapshot.

### F-05 — High — “Order-line allocation” is not a persisted domain identity

**Evidence**

- The UX repeatedly says allocation stays attached to the selected customer-order line (`EXPERIENCE.md:39,70-72,144-153`).
- `store_transfer_allocation` now persists only `owner_type`, `owner_id`, and quantity; old `customer_order_line_id` was removed (`20260919010000_store_owner_reservations.sql:116-123,180-186,230-232`).
- The current domain makes product unique within an order (`20260919010000_store_owner_reservations.sql:192-193`; `docs/features/logistics.md:70`).

**Why it matters**

The behavior is consistent today only because an order can have one line per product. The persisted claim is “reserved for order + product,” not “reserved for immutable line id.” Implementers could otherwise invent a nonexistent line-level guarantee.

**Implementation implication**

Use `customerOrderLine.id` as a UI selection key, but persist the allocation as `owner_type = order`, `owner_id = orderId`, with product supplied by the transfer line. Update the UX wording or add an implementation note stating that “line allocation” resolves through the current order+product uniqueness invariant. A future requirement for duplicate product lines would require a domain migration.

### F-06 — High — Duplicate products are client-only guarded but backend logic assumes uniqueness

**Evidence**

- Current validation rejects duplicate product ids only in browser state (`transfers-page.tsx:105-112,181-188`).
- No unique `(transfer_id, product_id)` constraint is present on transfer lines.
- Completion chooses one transfer line with `limit 1` for a product (`20260919010000_store_owner_reservations.sql:896-899`).
- The new UX allows many lines and separately describes no duplicate product/order line (`EXPERIENCE.md:41,70`).

**Why it matters**

A direct request, retry bug, or concurrent submit can create duplicate product lines. Completion then associates movement with an arbitrary line, degrading ledger traceability.

**Implementation implication**

Validate uniqueness in the create RPC and add a database unique constraint/index on `(transfer_id, product_id)` unless the domain intentionally permits duplicate products. Keep the UI guard for feedback, but do not rely on it for integrity.

### F-07 — High — “On hand” and “Available” lack executable formulas

**Evidence**

- The visual contract requires simultaneous `On hand`, `Available`, and `Move` columns (`DESIGN.md`, Layout & Spacing and Components).
- Generic max is defined as free quantity, while order max is the selected order-owned reserved quantity (`EXPERIENCE.md:70-72`).
- The logistics domain distinguishes physical location quantity from owner/state splits and warns against adding values with different bases (`docs/features/logistics.md:34-47`).
- Current transfer UI exposes free and selected reserved maxima but has no transfer-specific on-hand calculation (`transfers-page.tsx:76-93`).

**Why it matters**

Two correct-looking implementations can show different numbers. In particular, showing free quantity as both On hand and Available would conceal other owners’ stock, while summing only order-owned reserved stock would understate physical stock.

**Implementation implication**

Specify the formulas:

- `On hand` = positive physical balance for the product at the source warehouse across free and all reserved owners.
- Generic `Available` = free/null-owner quantity at that warehouse.
- Order-context `Available` = reserved quantity at that warehouse for the current order and product.
- Draft transfers do not reduce either value; values come from the latest loaded snapshot.

If another definition is intended, record it before implementation and add unit tests around mixed free/order/region stock.

### F-08 — Medium — Eligible-choice rules and source changes need a precise row policy

**Evidence**

- The spec says generic choices contain products with free stock and order choices contain positive allocated quantities at the source (`EXPERIENCE.md:70`).
- Before a source is selected, order choices are not eligible, while the generic initial state may already contain an empty row (`EXPERIENCE.md:81-85`).
- Current generic chooser lists every product, including zero-free products, and `canAddLine` considers all products rather than eligible products (`transfers-page.tsx:180-181,665-678`).
- The spec says changing source recalculates rows but does not remove existing rows (`EXPERIENCE.md:66,84-86`).

**Why it matters**

Without a deterministic policy, source changes can either erase user input, leave an unselectable stale product with no explanation, or allow endless empty rows after eligible choices are exhausted.

**Implementation implication**

Require source selection before enabling product choice. Filter new choices to positive context-specific availability and exclude already-selected products. On source change, preserve existing rows, recompute each max, mark now-ineligible rows inline, and compute `Add product` availability from the remaining eligible set.

### F-09 — Medium — Shared visual pattern must not become shared inventory logic

**Evidence**

- The UX correctly asks both entries to share one `TransferDialog` pattern (`EXPERIENCE.md:15-29`).
- Generic lines consume free/null-owner stock; order lines consume reserved stock for one known owner (`docs/features/logistics.md:42-44`).
- The current universal list form mixes both through `allocLineId`, adds free to selected reserved stock, and exposes manual allocation controls (`transfers-page.tsx:76-93,637-715`).

**Why it matters**

A single universal line model would preserve incompatible rules, make free stock accidentally available in order context, or reintroduce manual allocation controls the specification explicitly removes.

**Implementation implication**

Share presentation and interaction primitives only: dialog shell, route fields, responsive ledger, quantity field, summary, errors, and footer. Use separate context adapters/controllers:

- generic adapter: product key, free availability, no allocation payload;
- order adapter: order-line UI key, order-owned reserved availability, implicit full allocation of the selected move quantity.

Map both adapters to one validated create-Draft command at the API boundary.

### F-10 — Medium — Pending and idempotency behavior is specified but unsupported

**Evidence**

- The UX requires mutation controls to disable during submit and prevents repeat requests (`EXPERIENCE.md:74,88`).
- Current create forms have no local pending state; `runLogisticsAction` does not suppress concurrent calls (`transfers-page.tsx:333-335`; `ui/run-action.ts:47-63`).
- Draft creation currently has no idempotency key.

**Why it matters**

Double click, Enter plus click, or a slow network can create duplicate Drafts.

**Implementation implication**

Add a synchronous submit guard plus visible pending state at the controller level. The atomic create RPC should accept a client operation/idempotency key and return the existing id for a retry. UI disabling alone is insufficient for network retries.

### F-11 — Medium — Entry eligibility does not match the specified loading and empty states

**Evidence**

- The spec says the list launcher must not open until the required snapshot is available and the order entry should not open an empty ledger when no eligible allocated stock exists (`EXPERIENCE.md:80-82`).
- The current list toolbar action remains wired independently of loading/error state (`transfers-page.tsx:170-178,237-245,257-260`).
- The order journey always exposes `Move reserved stock` whenever the order is actionable; eligibility is discovered only after opening (`customer-orders-page.tsx:367-379`; `order-action-forms.tsx:695-696,740-754`).

**Why it matters**

Users can open a form whose required data is unavailable or whose only valid outcome is an empty state, contradicting the entry contract.

**Implementation implication**

Disable or omit the list launcher while loading/on error. Derive order-action eligibility from positive order-owned warehouse balances before opening; expose the specified disabled/empty explanation at the launcher.

### F-12 — Medium — The server error shape cannot update affected rows

**Evidence**

- The UX failure path requires affected lines to receive refreshed maxima and inline errors after a stale submit (`EXPERIENCE.md:153`).
- `store_move` raises a plain message containing product id, and `runLogisticsAction` converts failures to a general toast (`20260919010000_store_owner_reservations.sql:466-472`; `ui/run-action.ts:57-61`).
- The current create API has no structured validation result.

**Why it matters**

The UI cannot reliably map a generic database exception back to one or more ledger rows. A reload alone can recompute maxima, but it cannot distinguish transport/server failure from a line-specific availability conflict without an explicit contract.

**Implementation implication**

Have the create RPC return or throw a stable structured error containing a code and line/product identifiers. On an availability conflict, reload once, recompute all maxima, retain user-entered quantities, and attach inline errors to every affected row. Reserve the toast for request-level failure.

## Required Implementation Contract Before Coding

1. Define `On hand` and both context-specific `Available` formulas as in F-07.
2. Decide whether Draft creation performs advisory stock validation or no stock validation; keep Send as the authoritative stock-moving check.
3. Add a transactional, idempotent create-Draft RPC returning the new transfer id.
4. State that persisted order allocation is owner+product, with UI line identity relying on order+product uniqueness.
5. Enforce one transfer line per product server-side.
6. Implement one visual shell with separate generic and order controllers.
7. Define the structured line-error and post-create navigation result.

## Editorial/Specification Notes

The documents are otherwise coherent and the Russian planning prose intentionally coexists with English UI copy. The highest-value structural improvement is to add the preceding implementation contract near `EXPERIENCE.md` Foundation, before component behavior. That would make the specification pyramid-shaped for implementers and eliminate the need to infer API semantics from the two flows. The repeated visual rules across `DESIGN.md` and `EXPERIENCE.md` are mostly useful cross-references rather than harmful duplication; no broad condensation is recommended.
