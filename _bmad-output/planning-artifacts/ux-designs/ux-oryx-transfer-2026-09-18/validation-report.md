# Validation Report — Oryx Transfer Dialog

- **DESIGN.md:** `/Users/dzorogh/Develop/oryx/_bmad-output/planning-artifacts/ux-designs/ux-oryx-transfer-2026-09-18/DESIGN.md`
- **EXPERIENCE.md:** `/Users/dzorogh/Develop/oryx/_bmad-output/planning-artifacts/ux-designs/ux-oryx-transfer-2026-09-18/EXPERIENCE.md`
- **Run at:** 2026-09-20T15:12:00+03:00

## Overall verdict

**Thin.** The pair is mechanically sound: frontmatter parses, token references resolve, custom component vocabulary aligns, both entry contexts close through named journeys, and selected artifacts are linked with an explicit spine-wins rule. It is not yet a clean implementation contract because several load-bearing behaviors and domain contracts remain uncommitted or contradict the selected mobile reference.

The accessibility review finds a useful WCAG-oriented foundation, but unresolved data-loss, focus, discoverability, target-size, reflow, and mobile overflow behavior prevents WCAG 2.2 AA implementation sign-off. The feasibility review confirms that Dense Ledger is structurally buildable on the current domain, but its current create path cannot satisfy the specified transaction, result, availability, allocation, integrity, or navigation behavior.

**These documents are not ready for final status until the atomic Draft creation/API result contract, Draft availability semantics, On hand/Available formulas, dirty-close policy, and mobile reference contradictions are resolved.**

## Category verdicts

- Flow coverage — strong
- Token completeness — strong
- Component coverage — adequate
- State coverage — thin
- Visual reference coverage — thin
- Bloat & overspecification — adequate
- Inheritance discipline — thin
- Shape fit — adequate

## Findings by severity

### Critical (2)

**[Implementation feasibility] — Atomic Draft creation and API result contract is missing** (`src/features/logistics/transfers-page.tsx:208-233`; `src/features/logistics/logistics-api.ts:705-744`; `src/features/logistics/ui/run-action.ts:47-63`)

Draft headers, lines, and allocations are written through separate browser requests with no rollback, while the action wrapper discards the created id. A partial failure can leave an orphan Draft, a retry can duplicate it, and the required detail navigation cannot occur reliably.

Fix: define one transactional, idempotent `store_create_transfer_draft` command that validates the complete payload, inserts all records atomically, and returns a typed success result containing the transfer id. Preserve that result through the UI action path and navigate only after commit.

**[Implementation feasibility] — Draft availability semantics and line-error contract are unresolved** (`EXPERIENCE.md:142-153`; `docs/features/logistics.md:50-64`; `20260919010000_store_owner_reservations.sql:461-482,810-867`)

The UX promises create-time rejection with refreshed line maxima, but Draft creation neither claims nor moves stock; authoritative stock checking currently happens on Send. A point-in-time create check cannot guarantee future availability, and the current plain error/toast path cannot identify affected rows. This also subsumes implementation finding F-12.

Fix: explicitly choose whether create performs no stock check or advisory transactional validation, state that Send remains authoritative and a Draft does not reserve stock, and define structured per-line errors if create-time validation is retained.

### High (8)

**[State coverage / Accessibility A11Y-R01] — Dirty-close behavior can silently discard substantial work** (`EXPERIENCE.md:66,98,123-126`; `src/features/logistics/transfers-page.tsx:191-196,297-302`)

`Cancel`, close, backdrop, and `Esc` have no single committed policy for a 4–10-line form. Data-loss behavior and focus restoration are therefore undefined. This is the same blocker reported by the rubric and accessibility reviews.

Fix: commit one policy for every close channel, define dirty detection and backdrop behavior, and specify confirmation focus, safe default, destructive action, and restoration behavior when confirmation is used.

**[Visual reference coverage / Accessibility A11Y-R02] — Mobile overflow content is unreachable** (`.working/direction-dense-ledger.html:138`; `DESIGN.md:101,119`; `EXPERIENCE.md:74,119`)

The contract requires a scrollable body supporting 4–10 lines, errors, zoom, and the software keyboard, but the selected mobile reference uses `overflow: hidden`. This raises the rubric's scroll contradiction from medium to high.

Fix: make the body a bounded vertical scroller (`min-height: 0; overflow-y: auto; overscroll-behavior: contain`), keep required controls reachable, add focus scroll margins, and test ten lines plus errors with the software keyboard open.

**[Accessibility A11Y-R03] — Route errors are excluded from the error-focus contract** (`EXPERIENCE.md:81-89,93-113`)

Equal-warehouse errors can block creation, but submit focus and programmatic error association are defined only for quantity controls.

Fix: define one DOM-order validation sequence from route through date, chooser, and quantity; give every field error a stable id, `aria-invalid`, `aria-describedby`, and first-invalid focus behavior.

**[Accessibility A11Y-R04] — Disabled actions conceal why progress is blocked** (`EXPERIENCE.md:69-75,81-89`; `.working/direction-dense-ledger.html:199-203,235-238`)

The primary and Add product actions can become unavailable for several reasons, yet native disabled controls are not focusable and the reference supplies no persistent explanation.

Fix: expose a visible, programmatically associated blocking reason near the actions, announce reason changes politely, and explicitly explain when all eligible products have been added.

**[Implementation feasibility F-03] — Order entry still sends all reserved stock immediately** (`src/features/logistics/order-action-forms.tsx:695-724`; `src/features/logistics/logistics-api.ts:705-744`; `EXPERIENCE.md:142-153`)

The current order controller submits every positive reserved line and sends by default, contradicting subset selection, editable quantities, and Draft-only creation.

Fix: replace it with an order-context Draft controller and route it through the atomic create-Draft command; do not reuse send-by-default behavior.

**[Implementation feasibility F-05] — “Order-line allocation” is not a persisted identity** (`EXPERIENCE.md:39,70-72,144-153`; `20260919010000_store_owner_reservations.sql:116-123,180-193`)

Persistence records owner plus product, not an immutable customer-order-line id. The wording is valid only because product is currently unique within an order.

Fix: state that the UI line id is a selection key while persistence uses `owner_type = order`, `owner_id = orderId`, and transfer-line product; document the order+product uniqueness dependency.

**[Implementation feasibility F-06] — Duplicate-product integrity is guarded only in the client** (`src/features/logistics/transfers-page.tsx:105-112,181-188`; `20260919010000_store_owner_reservations.sql:896-899`)

The backend permits duplicate product lines even though completion selects an arbitrary matching line, degrading traceability under direct, retry, or concurrent requests.

Fix: validate uniqueness in the create RPC and add a database uniqueness constraint on `(transfer_id, product_id)` unless duplicates are explicitly made part of the domain.

**[Implementation feasibility F-07] — On hand and Available have no executable formulas** (`DESIGN.md:99-128`; `EXPERIENCE.md:70-72`; `docs/features/logistics.md:34-47`)

The contract requires both values while the domain distinguishes physical stock from free and owner-specific balances. Implementers can produce different, plausible numbers.

Fix: define `On hand` as positive physical source-warehouse balance across free and all reserved owners; generic `Available` as free/null-owner quantity; order-context `Available` as current-order reserved quantity for the product; state that Drafts do not reduce either value.

### Medium (17)

**[Visual reference coverage] — Mobile selection model contradicts the ledger contract** (`EXPERIENCE.md:41,69-72,119`; `DESIGN.md:123-125`; `.working/direction-dense-ledger.html:199,228-234`)

The reference shows preselected checkbox rows, no mobile Add product or remove action, and only Available, while the spine requires add-row editing, removal, On hand, and Available.

Fix: align the mobile composition with the contract or mark the checkbox composition as rejected and non-contractual.

**[Visual reference coverage] — Allocation note visually signals success** (`DESIGN.md:86`; `EXPERIENCE.md:56,68`; `.working/direction-dense-ledger.html:13-15,139,229`)

Green success treatment and a checkmark contradict the contract's informational meaning.

Fix: remove success semantics and iconography, or explicitly change the contract if success meaning is intentional.

**[Bloat & overspecification] — Behavioral ownership is duplicated across both spines** (`DESIGN.md:101-103,119-123`; `EXPERIENCE.md:69,74,118-120`)

Scroll ownership, control structure, reading order, and horizontal-scroll rules have two authorities that can drift.

Fix: keep visual anatomy and density in DESIGN; keep interaction, order, scrolling, and state retention in EXPERIENCE, with one-way cross-references.

**[Inheritance discipline] — Architecture provenance is stale and overbroad** (`DESIGN.md` and `EXPERIENCE.md` frontmatter; `../../architecture/architecture-oryx-2026-09-17/ARCHITECTURE-SPINE.md:23-30,53-65`; `docs/features/logistics.md:44,64,70`)

The listed architecture source describes older reservation fields and vocabulary that conflict with the current owner-based model.

Fix: replace it with a current transfer-relevant source or narrowly identify the still-valid invariant being inherited.

**[Inheritance discipline] — Assumptions are promoted without traceability** (`.memlog.md:20-21`; `DESIGN.md:78`; `EXPERIENCE.md:89,104-112`)

Accessibility inheritance, light-theme posture, and offline behavior move from assumptions to unconditional rules without confirmation.

Fix: confirm each against an upstream Oryx contract or keep explicit assumption/open-item markers.

**[Shape fit] — Applicable Inspiration & Anti-patterns section is absent** (`.memlog.md:10,22`; `DESIGN.md:76-78`; `EXPERIENCE.md:16-18`)

The source names one structural reference and selected/rejected directions, which triggers this compact section under the rubric.

Fix: record only the sourced lift and rejects with their reasons.

**[Accessibility A11Y-R05] — Row removal can move focus to a disabled control** (`EXPERIENCE.md:73-74,93-101`)

After deleting the last row, the fallback primary action is disabled and cannot receive focus.

Fix: use only focusable fallbacks: adjacent row control, enabled Add product, then a focusable ledger heading or status.

**[Accessibility A11Y-R06/R07] — Ledger semantics and repeated-control names are incomplete across layouts** (`EXPERIENCE.md:103-113`; `.working/direction-dense-ledger.html:191-199,229-234`)

Desktop and mobile rules do not fully bind product identity, unit, maxima, and errors to repeated quantity and remove controls.

Fix: require a native labeled table on desktop and named list/group structures on mobile, with product-specific control names and described-by links for SKU, balances, unit, and error.

**[Accessibility A11Y-R08] — Reference target sizes contradict the 44×44 floor** (`EXPERIENCE.md:103-113`; `.working/direction-dense-ledger.html:90-119,140-152`)

Inputs, buttons, remove affordances, and close affordances in the reference fall below or fail to define the required touch hit area.

Fix: annotate or update every interactive target to guarantee a 44×44 CSS px hit area while allowing smaller glyphs.

**[Accessibility A11Y-R09] — Breakpoint changes preserve values but not focus identity** (`EXPERIENCE.md:115-122`)

Switching between table and list representations can remount a focused field or close a chooser without deterministic restoration.

Fix: key controls by stable line id, preserve active-field identity, and define safe popover closure and focus return during reflow.

**[Accessibility A11Y-R10] — Zoom and reflow lack measurable acceptance criteria** (`DESIGN.md:100-105`; `EXPERIENCE.md:115-122`; `.working/direction-dense-ledger.html:90-99,110-119`)

No contract covers 320 CSS px, 400% browser zoom, 200% text zoom, long names, or footer wrapping.

Fix: add those acceptance cases, prohibit clipped required content and two-dimensional scrolling, and allow actions and summaries to wrap or stack.

**[Accessibility A11Y-R11] — Interactive and focus-indicator contrast is not locked down** (`DESIGN.md:78-87`; `.working/direction-dense-ledger.html:90-103`)

Special text pairs pass, but interactive icons, borders, and focus rings are unspecified; the reference remove glyph is below the 3:1 non-text target.

Fix: record or test computed contrast for supported control states and surfaces, including at least 3:1 for required non-text affordances.

**[Accessibility A11Y-R12] — Live regions can produce duplicate, noisy announcements** (`EXPERIENCE.md:66-75,103-113`)

Source changes may update every row plus the issue summary, producing repeated or stale speech.

Fix: debounce one atomic recalculation summary, announce row validity transitions rather than keystrokes, and suppress duplicate issue-count announcements.

**[Implementation feasibility F-08] — Eligibility and source-change row policy is underspecified** (`EXPERIENCE.md:66,70,81-86`; `src/features/logistics/transfers-page.tsx:180-181,665-678`)

The contract does not fully define pre-source choice, now-ineligible rows, or Add product exhaustion.

Fix: require source selection before product choice, filter to positive context-specific availability, preserve rows on source change, recompute maxima, mark stale rows inline, and derive Add product from remaining eligible choices.

**[Implementation feasibility F-09] — Shared presentation risks shared inventory logic** (`EXPERIENCE.md:15-29`; `docs/features/logistics.md:42-44`; `src/features/logistics/transfers-page.tsx:76-93,637-715`)

Generic free stock and order-owned reserved stock have incompatible availability and allocation rules.

Fix: share the shell and interaction primitives, but use separate generic and order context adapters that map to one validated create-Draft command.

**[Implementation feasibility F-10] — Pending-state guard is absent** (`EXPERIENCE.md:74,88`; `src/features/logistics/transfers-page.tsx:333-335`; `src/features/logistics/ui/run-action.ts:47-63`)

Double click or Enter-plus-click can submit concurrently. Server retry idempotency is covered by the critical atomic API contract above.

Fix: add a synchronous controller guard and visible pending state while the idempotent create command is in flight.

**[Implementation feasibility F-11] — Entry eligibility contradicts loading and empty-state rules** (`EXPERIENCE.md:80-82`; `src/features/logistics/transfers-page.tsx:170-178,237-260`; `src/features/logistics/customer-orders-page.tsx:367-379`)

Launchers remain available while required data is loading or when no eligible order-owned stock exists.

Fix: disable or omit the list launcher during load/error and derive order-action eligibility before opening, with the specified explanation at the launcher.

### Low (2)

**[Component coverage] — Inherited chooser and toast behavior is implicit** (`EXPERIENCE.md:32,89`)

Popover/Select keyboard behavior and inherited error/toast lifetime and placement lack a precise behavioral reference.

Fix: add concise inherited-primitive rows or point to an existing Oryx behavior contract.

**[Accessibility A11Y-R13] — The visual direction can be mistaken for implementation markup** (`.working/direction-dense-ledger.html:179-203,214-239`; `DESIGN.md:100-105`)

The prototype uses generic elements, unnamed inputs, and non-button affordances despite stronger written semantics.

Fix: mark it prominently as visual-only and require native shadcn primitives plus the spine semantics for implementation.

## Reviewer files

- `/Users/dzorogh/Develop/oryx/_bmad-output/planning-artifacts/ux-designs/ux-oryx-transfer-2026-09-18/review-rubric.md`
- `/Users/dzorogh/Develop/oryx/_bmad-output/planning-artifacts/ux-designs/ux-oryx-transfer-2026-09-18/review-accessibility-responsive.md`
- `/Users/dzorogh/Develop/oryx/_bmad-output/planning-artifacts/ux-designs/ux-oryx-transfer-2026-09-18/review-implementation-feasibility.md`
