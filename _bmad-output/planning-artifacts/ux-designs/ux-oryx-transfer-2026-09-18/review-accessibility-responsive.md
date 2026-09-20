# Accessibility & Responsive UX Review — Oryx Transfer Dialog

## Verdict

**NEEDS REVISION — not yet implementation-ready for WCAG 2.2 AA and fully usable phone creation.**

The spines establish a good accessibility floor: explicit keyboard order, inherited focus trap and launcher return, programmatic dialog naming, inline quantity-error association, desktop table/mobile list semantics, live-region intent, a 44×44 CSS px touch-target floor, and responsive state preservation. However, four high-severity gaps leave data-loss, unreachable-content, focus, and error-discovery behavior unresolved.

## Finding counts

- High: 4
- Medium: 8
- Low: 1
- Total: 13

## Findings

### High

#### A11Y-R01 — Dirty close can silently discard substantial work

**Evidence:** `EXPERIENCE.md` → Component Patterns says `Cancel`, close, and `Esc` follow Open Question 1 (lines 66–75); Open Questions explicitly leaves dirty-close policy unresolved (lines 124–126). A transfer commonly contains 4–10 lines (`.memlog.md`, lines 10–19).

**Impact:** A keyboard or touch user can lose route and quantity input through `Esc`, backdrop, close, or `Cancel`, with inconsistent behavior among exit methods. Focus-return behavior after declining a close is also undefined.

**Remediation:** Resolve one policy for every close trigger. Prefer an in-dialog discard-confirmation state so the “one modal layer” rule is preserved. Define dirty detection, backdrop behavior, first focus, `Esc` behavior while confirmation is active, `Keep editing` as the safe default, `Discard changes` as destructive, and focus restoration to the invoking close control or launcher.

#### A11Y-R02 — The mobile reference makes overflow content unreachable

**Evidence:** The spine requires a scrollable body and supports 4–10 lines (`DESIGN.md`, lines 100–105, 119–128; `.memlog.md`, lines 10–19). The direction instead sets `.sheet-body { flex: 1; overflow: hidden; }` (`direction-dense-ledger.html`, lines 130–149).

**Impact:** Additional lines, expanded inline errors, large text, landscape orientation, or the on-screen keyboard can place controls outside the visible sheet with no way to scroll to them. Programmatic focus may move to an invisible control.

**Remediation:** Require `min-height: 0; overflow-y: auto; overscroll-behavior: contain` on the body, keep header/footer outside that scroller only when sufficient viewport remains, add focus `scroll-margin`, and test 10 lines plus errors with the software keyboard open.

#### A11Y-R03 — Route validation is excluded from the defined error-focus path

**Evidence:** Equal warehouses produce an inline field error (`EXPERIENCE.md`, lines 81–89), but submit-error focus is defined only as the first invalid `QuantityControl` (lines 93–101). The accessibility floor specifies `aria-invalid`/`aria-describedby` only for quantity errors (lines 103–113).

**Impact:** A same-warehouse or other route error can block creation while keyboard and screen-reader users receive neither a deterministic focus move nor a programmatically associated explanation.

**Remediation:** Define a unified validation sequence over all controls in DOM order: `From warehouse` → `To warehouse` → date if constrained → product chooser → quantity. Every field error needs a stable message ID, `aria-invalid="true"`, `aria-describedby`, and focus on the first invalid control after a submission attempt.

#### A11Y-R04 — Disabled actions conceal why progress is blocked

**Evidence:** Primary creation is disabled for incomplete route, missing/invalid lines, duplicates, or availability errors; `Add product` is unavailable when eligible products are exhausted (`EXPERIENCE.md`, lines 69–75, 81–89). Only the availability case has a visible issue count. The direction renders a visually disabled primary without an adjacent reason (`direction-dense-ledger.html`, lines 199–203 and 235–238).

**Impact:** Native disabled buttons are skipped by keyboard focus, so users cannot discover a tooltip or description attached only to the button. “Nothing happens” gives no path to completion.

**Remediation:** Keep a persistent, visible status near the action group that states the first blocking reason and is programmatically associated with the action. Announce reason changes politely. When `Add product` is exhausted, replace or accompany it with visible text such as “All available products have been added.” If using `aria-disabled` to retain focusability, guard activation in code.

### Medium

#### A11Y-R05 — Row-removal focus can target a non-focusable disabled control

**Evidence:** After removing the last row, focus goes to `Add product`, or—when adding is unavailable—to the primary action (`EXPERIENCE.md`, lines 93–101). The primary is disabled when no valid lines remain (lines 73–74, 83–87).

**Impact:** Browsers cannot focus a native disabled button, so focus may fall to the document body or disappear after DOM removal.

**Remediation:** Specify only focusable fallbacks: next row chooser, previous row remove/chooser, enabled `Add product`, then a focusable ledger heading/status. Never programmatically focus a native disabled element.

#### A11Y-R06 — Desktop table semantics do not fully identify repeated controls

**Evidence:** The contract says only “correct table semantics with headers” (`EXPERIENCE.md`, lines 103–113). `QuantityControl` must expose unit/current/max, but not product identity. The visual reference uses generic grid `<div>` elements and repeated unnamed inputs (`direction-dense-ledger.html`, lines 191–199).

**Impact:** In forms mode, repeated quantity inputs may be announced without the row/product context; column and row relationships can be lost.

**Remediation:** Require a native `<table>` with an accessible caption, `<th scope="col">` column headers, product `<th scope="row">`, and unique control names such as “Move quantity for Packing Tape.” Associate available/max and unit text through `aria-describedby`; keep each remove button’s product-specific name.

#### A11Y-R07 — Mobile group semantics are named but not operationally specified

**Evidence:** The spine calls for list/group semantics (`EXPERIENCE.md`, lines 103–113), while the reference rows are generic `<div>` containers with unnamed inputs and decorative checkmarks (`direction-dense-ledger.html`, lines 229–234).

**Impact:** Screen-reader users may hear a sequence of unlabeled numbers without knowing the product, available amount, unit, or error relationship.

**Remediation:** Use `<ul>/<li>` plus a labeled `<fieldset>`/`role="group"` per product, or an equivalent structure with `aria-labelledby`. Give each quantity input a product-specific accessible name and described-by references for SKU, on-hand, available, unit, and error. Hide decorative checkmarks with `aria-hidden="true"`.

#### A11Y-R08 — The visual reference contradicts the 44 px touch-target floor

**Evidence:** The spine requires at least 44×44 CSS px targets (`EXPERIENCE.md`, lines 103–113). The reference uses 29 px quantity inputs, 38 px mobile buttons, a 34 px desktop remove column, and a close glyph with no hit-area dimensions (`direction-dense-ledger.html`, lines 90–119, 140–152).

**Impact:** Implementers copying the composition reference can produce difficult touch interaction and miss the project’s explicit target-size requirement.

**Remediation:** Add acceptance criteria that every close, remove, chooser, date, quantity-stepper, cancel, and primary target has a minimum 44×44 hit area; visual glyphs may remain smaller. Annotate the HTML direction as visual-only or update its dimensions separately from the spines.

#### A11Y-R09 — Breakpoint changes preserve values but not focus identity

**Evidence:** Resize/orientation changes preserve values, errors, and context (`EXPERIENCE.md`, lines 115–122), but desktop table and mobile list are different representations and focus preservation is not defined.

**Impact:** Crossing `md` while a chooser or quantity input is focused can remount the control, close its popup, and send focus to the body or a different row.

**Remediation:** Key controls by stable line ID, preserve the active field identity across representation changes, restore focus after reflow, and define that open popovers close safely with focus returned to their trigger. Add an orientation-change test while editing a middle row.

#### A11Y-R10 — Zoom and reflow have no measurable acceptance criteria

**Evidence:** Horizontal table scrolling is prohibited and mobile stacks rows (`DESIGN.md`, lines 100–105; `EXPERIENCE.md`, lines 115–122), but neither spine defines 200% text zoom, 400% browser zoom/320 CSS px reflow, long localized/product text, or footer wrapping. The reference truncates desktop product names with ellipsis and uses non-wrapping footer layouts (`direction-dense-ledger.html`, lines 90–99, 110–119).

**Impact:** Content can clip, overlap, or become unreachable even though the nominal viewport breakpoint works.

**Remediation:** Add acceptance tests at 320 CSS px width and 400% zoom with no two-dimensional scrolling, at 200% text zoom with no clipped labels/errors, and with long product/SKU names. Allow footer actions and summaries to wrap/stack before collision; do not make ellipsis the only access to a product name.

#### A11Y-R11 — Contrast intent is sound, but active-control contrast is not locked down

**Evidence:** The two special text pairs pass based on the documented hex values: error text is 5.91:1 and allocation text is 6.81:1. However, inherited tokens and focus-ring contrast have no recorded values (`DESIGN.md`, lines 78–87), and the active remove glyph in the reference uses `#a1a1aa` on white, only 2.56:1 (`direction-dense-ledger.html`, lines 90–103), below the 3:1 non-text contrast target.

**Impact:** Remove/focus affordances may be hard to perceive; theme changes can silently invalidate the asserted AA floor.

**Remediation:** Record or test computed contrast for interactive icons, borders, focus indicators, text, and status surfaces in each supported theme/state. Use at least a 3:1 remove-icon color and verify the focus ring against white, muted, allocation, and error backgrounds.

#### A11Y-R12 — Live-region behavior risks duplicate or noisy announcements

**Evidence:** Availability changes and issue count are both polite live regions, while submit failure is assertive once (`EXPERIENCE.md`, lines 103–113). Source changes can recalculate every row at once (lines 66–75).

**Impact:** A warehouse change or quantity typing can trigger multiple row updates plus summary updates, overwhelming users or announcing stale intermediate values.

**Remediation:** Define one debounced, atomic summary announcement for bulk recalculation, announce a row error once when it becomes valid/invalid rather than on every keystroke, suppress duplicate issue-count announcements, and keep visible inline messages as the durable source of truth.

### Low

#### A11Y-R13 — The HTML direction can be mistaken for accessible implementation markup

**Evidence:** The file is an illustrative composition reference, but it contains no `role="dialog"`/`aria-modal`, uses `<span>` for close/remove, `<div>` controls and grid rows, and unnamed readonly inputs (`direction-dense-ledger.html`, lines 179–203, 214–239). `DESIGN.md` does state that the spine wins on conflict (lines 100–105).

**Impact:** Copying the prototype structure would regress keyboard and screen-reader behavior despite the stronger written contract.

**Remediation:** Add a prominent “visual reference only—do not copy semantics or target sizes” note in the working artifact or implementation handoff. Treat the spine requirements and native shadcn primitives as normative.

## Acceptance checks before implementation sign-off

- Keyboard-only: open, traverse every control, add/remove middle and final rows, resolve route and quantity errors, close a popover with `Esc`, then close/retain a dirty dialog and verify focus return.
- Screen reader: confirm dialog title/description/context; table row/column announcements; mobile group names; product-specific quantity/remove names; associated max/unit/error text; restrained live-region output.
- Responsive: 320 CSS px, 400% zoom, 200% text zoom, portrait/landscape change while editing, 10 lines with multiple errors, and software keyboard visible.
- Pointer/touch: verify every interactive hit area is at least 44×44 CSS px and no required action depends on hover.
- Contrast: automate token-state checks and manually verify focus indicators on normal, muted, allocation, and error surfaces.
