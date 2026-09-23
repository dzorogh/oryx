# Reconciliation: current production order

Sources: `imports/current-production-order.png`, `src/features/logistics/production-orders-page.tsx` (`ProductionOrderDetailPage`), `src/features/logistics/ui/document-ledger.tsx`, `src/features/logistics/logistics-api.ts`, `src/features/logistics/logistics-cancel-guidance.ts`, `docs/features/logistics.md`, `.working/direction-document-workspace.html`, and canonical decisions in `.memlog.md`.

## Canonical direction

- Preserve the user-selected document-workspace composition: breadcrumb, dedicated document passport, anchor index, then one continuous document with «Товары» → «Выпуски» → «Движения».
- Desktop and tablet section controls are anchors, never mutually exclusive tabs. Counts are production-order lines, output documents, and all matching ledger facts before pagination.
- The selected HTML shows desktop and tablet boards simultaneously. Its `t-*` IDs exist only to avoid duplicate IDs inside that visual board; production uses only `#products`, `#outputs`, and `#movements`.
- Tablet/reflow uses local labelled-list renderers and retains every output/movement field. Product strategy does not add a mobile feature layout, but accessibility reflow works at 320 CSS px equivalent.
- No movement filters are part of the page contract. Signed ledger facts must not be interpreted as physical «Приход / Расход».

## Retained source behavior and data

- Preserve document number, code-only manufacturer, workflow status, expected completion date, and terminal close action.
- Non-terminal statuses (`draft`, `planned`, `in_progress`, `done`) remain freely editable labels, including backward/skipped changes. `done` remains operationally active until explicit close.
- Existing `closed` and `cancelled` records remain visible. Status is read-only in terminal states; expected date remains editable because `docs/features/logistics.md` says it can be changed at any time and current implementation already allows it.
- Page exposes no transition to `cancelled`. `closeProductionOrder` is the only user-triggered terminal transition and retains the terminal guard.
- Preserve product plan/free/reserved/produced totals, manufacturer-compatible add-product flow, customer-order reservation limits, output availability/capacity checks, entity links, compact product-code badges, loading/error handling and movement page size 20.
- Reservation display supports order and region owners (`REG-n`). This page creates only customer-order reservations; region-owned reservations may originate elsewhere.
- Preserve multi-line output documents. Every line carries its own product name/code/quantity/unit and unlike units are never summed.

## Canonical component and semantic changes

- Use local `ProductionOrderDocumentHeader`; do not mutate shared `LogisticsToolbar`.
- Use local product/output responsive renderers; do not mutate shared `LogisticsTableCard`.
- A product gets a disclosure only when reservation assignments exist. Its details row contains only owner assignments; Free stays in the parent «Свободно» total. Collapse hides/unmounts the entire details container atomically with `aria-expanded`.
- Each output line is one programmatic nested item/group containing product name, code, quantity and unit. Parallel visual columns cannot be the only association.
- The local production-order ledger view uses exported `documentLedgerRows` and `paginateLedgerRows` directly, or a new shared model hook, and owns its desktop table, tablet list, empty state and pagination. It does not wrap the current `DocumentLedger` component and does not require changing that shared component API.
- The movement section always renders, including count `0` and «Движений пока нет.».

## Terminal close contract

- The header has one action: «Закрыть заказ». There is no production-order cancel action or direct immediate-close button.
- Exact approved text: «Закрытие снимет резервы и спишет весь оставшийся незавершённый остаток; история движений сохранится. Завершённые выпуски и связанные документы не отменяются.»
- `CANCEL_GUIDANCE_PRODUCTION_CLOSE` must be updated to that exact text and remains the single wording source projected through `CancelGuidance.closeEffects`; no duplicate close copy is introduced.
- Confirmation starts on safe action «Вернуться», blocks duplicate submit, stays open on failure, and after success focuses/announces the stable updated status.

## Output command requirement

The canonical UX requires a new downstream domain command for output creation. This is an implementation requirement, not a description of current `createProductionOutput`.

- Optional reservation/allocation, output header, all output lines, and optional completion execute in one database transaction.
- The client supplies a stable idempotency key for the user intent. Retrying the same unchanged pending/failed intent reuses that key and returns the same result instead of creating another reservation/output; success, cancellation, or input change starts a new intent/key.
- Success exposes the complete committed result. Failure exposes no partial reservation, orphaned header, partial lines, or partial completion.
- While pending, both submit intents are disabled and UI announces «Создаём выпуск…». On failure, every input remains and UI says «Выпуск не создан. Ничего не сохранено. Можно повторить.»; retry is safe with the same key.

## Remaining implementation mismatches

- Current detail renders both `DocumentCancelControl` and a direct `closeProductionOrder` button. It needs one specialized confirmed close flow.
- Current `CANCEL_GUIDANCE_PRODUCTION_CLOSE` says WIP is removed and omits preserved movement history; it must be replaced by the single approved text above.
- Current header uses shared `LogisticsToolbar`; the chosen geometry requires a local detail header. Current terminal expected-date editing is retained, not a mismatch.
- Current page has no anchor index, canonical section IDs, section counts, focus/hash/scroll-spy behavior, or bottom-of-document active-section fallback.
- Current product table exposes disclosure for every product and inserts synthetic «Свободно» details rows. Canon requires disclosure only for actual assignments.
- Current output renderer puts products and quantities in separate cells, sums all line quantities, and only preserves a unit for a single line. Canon requires per-line product/quantity/unit grouping.
- Current `createProductionOutput` performs reservation, header, line and completion as separate requests without a stable request key. It must be replaced by the atomic/idempotent command above before the UX retry contract is safe.
- Current `DocumentLedger` returns `null` when empty and owns fixed desktop table/pagination markup. The page-local ledger view must consume exported model helpers (or a shared model hook) and own empty/desktop/tablet rendering.
- Current generic tables do not provide the local tablet labelled-list semantics, field headings, focus behavior, target sizes, or 320 CSS px reflow required by the spines.
- Existing action runner feedback is toast-centric. Inline field association, retained input, live pending/success/error messages, safe pagination focus fallback, and close-dialog error lifecycle remain implementation work.

## Selected visual reference

`.working/direction-document-workspace.html` is a non-production direction board. It demonstrates the selected composition, canonical `PLT`, `REG`, `PRD`, `OMS`, `PO`, `RSV`, and `OUT` examples, nested reservations, multi-line output pairing, and four-row tablet ledger with «Показано 4 из 4». Production follows spine semantics and canonical IDs rather than copying the two-board DOM.
