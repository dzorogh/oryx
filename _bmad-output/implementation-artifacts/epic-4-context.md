# Epic 4 Context: Остальные поверхности

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Apply the generic stock-owner model to every remaining Store Logistics surface so operators can read and act on Free, region reserve, and order reserve as separate quantities. Reservation posting already reclassifies ownership; this epic makes stock, ledger, cards, orders, shipments, transfers, and production show that ownership and refuse actions that ignore it — especially shipping from a region pool.

The first implementation slice is the Stock dashboard only (not ledger, cards, or fulfillment screens): Compact Matrix layout, three reserve columns, no Shipped balance columns.

## Stories

- Story 4.1: Stock, ledger, product/warehouse cards
- Story 4.2: Orders, shipments, transfers, production

## Requirements & Constraints

Balances key on place + product + owner. Free is a missing owner, not an owner type. Region reserve and order reserve are the same reserved bucket with different owners; they must appear as separate quantities. Do not hide region reserve inside Free or collapse both into a single Reserved total.

Stock dashboard balance columns are Free, Region reserve, and Order reserve. Do not add Shipped as a stock-matrix balance column. Shipped remains an order-fulfillment fact on a customer-order place with an order owner, not a warehouse availability column.

Ledger and related-document links identify owner, not an order line. Demand, reserve, and ship checks for an order aggregate by order + product.

Shipment may consume only order-owned reserve for that shipment’s order. Region quantity may be listed as unavailable until a Reservation reassigns it to the order. Physical moves (transfer send/complete, production location moves) copy owner; they must not silently convert region reserve to Free. Transfer and output allocations carry an owner pair.

English labels on rewritten surfaces. Distinguish owners by code and name (`OMS-12`, `REG-3`, the word `Free`), not by a color legend that region is “softer.” No `operation` field, no soft earmark, no new owner types, no editing a posted Reservation from these screens.

## Technical Decisions

Client fields are `ownerType` / `ownerId`; SQL is `owner_type` / `owner_id`. Both NULL means Free. Allowed types are only `order` and `region`, always both set or both empty.

`stock_state` stays aligned with owner: `free` iff owner is NULL; `reserved` iff owner is set on warehouse, production-order line, or transfer; `shipped` only on a customer-order place with an order owner. The browser never inserts ledger rows. Balances are computed from the append-only journal.

Snapshot and balance helpers from earlier epics already expose regions and owner columns. Stock UI is read-only investigation against that snapshot; posting stays on existing Reservation / shipment / transfer RPCs. Demo backend is Oryx demo Supabase with anon access.

## UX & Interaction Patterns

Selected Stock dashboard direction is Compact Matrix: a dense operational worksheet with thin rules, short controls, fixed numeric columns, and strong two-level headers. Keep the list-page shell — breadcrumb on `bg-muted/30`, white toolbar card, full-width table, no root `max-w-*`. Product identity stays sticky under horizontal scroll. Inherit Oryx/shadcn; do not add a new palette or KPI cards.

Five views stay on one Stock surface: Products, Locations, Customer demand, Production & transfers, Ledger. For the current slice, implement the Products matrix (and only the Stock-dashboard chrome needed to host it). Location type remains a second, independent breakdown of the same quantities — values inside one group may add along a row; never add one group’s totals to the other. Different products or units never mix.

Quantities use tabular numerals. Show `0`; use `—` only for not-applicable. Factual conditions are independent text chips (no risk score, RAG, or severity). Negative qty may use existing destructive color on the number and the label `Negative balance` only. The dashboard does not edit stock; row activation opens a right detail panel beside the table on desktop. Actions leave to existing document pages.

Owner chips show code plus short name. On cards and remaining stock surfaces later in the epic, reserved rows expand per owner. Shipment source picker shows only this order’s reserved rows as selectable; region rows stay visible but disabled with `Reassign to this order first`. Order overflow Reserve / Release / Reassign and Allocation Atlas reuse the same generic Reservation dialog — destination in the header, source on the line.

## Cross-Story Dependencies

This epic needs the owner schema and posting RPC, client snapshot/balance helpers, and the Reservation form plus Regions catalog from earlier epics.

Story 4.1 can land before 4.2 once balances expose owner. Ledger and product/warehouse cards share 4.1’s owner-split rule but are out of the current Stock-dashboard slice. Story 4.2 depends on the same balances plus the order-only ship rule and owner-preserving moves; related documents must resolve Reservation by destination/source owner, not a customer-order claim column.
