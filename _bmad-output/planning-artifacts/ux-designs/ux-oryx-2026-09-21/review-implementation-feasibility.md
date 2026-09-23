# Final implementation-feasibility validation

## Verdict

**Approved for implementation with one cross-layer prerequisite.** The active UX contract is now internally consistent and matches the current domain model. Reconciliation, ledger ownership seam, tablet semantics and footer, native date validity, prototype-only IDs, canonical `PLT` code, and no-reservation disclosure behavior are resolved.

No unresolved UX or data-model contradiction remains. Before the output-dialog retry contract can ship, implementation must add the specified atomic/idempotent output command. The approved close wording must also replace the current source constant during implementation.

## Severity counts

| Severity | Count |
|---|---:|
| Critical | 0 |
| Major | 1 |
| Minor | 1 |
| **Total** | **2** |

## Remaining substantive findings

### Major

#### M1. The required atomic/idempotent output command does not exist yet

**Locations:** `EXPERIENCE.md:93-96,124-127,216-227`; `reconcile-current-production-order.md:39-47,56`; `src/features/logistics/logistics-api.ts:642-686`; `supabase/migrations/20260920122000_store_transfer_direct_send.sql:6-13,36-69`; `supabase/migrations/20260921160000_store_unified_shipment.sql:114-121,132-176`

The contract now correctly requires one transaction for optional reservation/allocation, output header, all lines, and optional completion, keyed by a stable idempotency key. Current `createProductionOutput` still performs reservation, header insert, line insert, and completion as separate requests and accepts no request key.

This is feasible: transfers and shipments already provide repository patterns for a request-key table, advisory transaction lock, retry lookup, and atomic RPC. Output creation needs the equivalent migration/RPC plus a client API that sends all lines, completion intent, optional allocation, expected date, and stable key in one call.

**Implementation gate:** do not wire the new dialog’s “nothing saved; retry safely” failure state to the current `createProductionOutput`. Land and use the atomic/idempotent command first.

**Consequence if skipped:** a failed request can leave a posted reservation or orphaned output, and retry can duplicate stock claims.

### Minor

#### m1. The canonical close wording is defined but the source constant is still stale

**Locations:** `EXPERIENCE.md:77-78,95-97`; `reconcile-current-production-order.md:33-36,50-51`; `src/features/logistics/logistics-cancel-guidance.ts:33-35,320-328`

The documents now consistently make `CANCEL_GUIDANCE_PRODUCTION_CLOSE` the single wording source and provide its exact replacement text. The current constant still says WIP is “removed” and does not explicitly say movement history remains.

**Implementation requirement:** update that constant to the approved text and keep `CancelGuidance.closeEffects` as the only dialog source. The existing projection and tests already provide the correct seam.

