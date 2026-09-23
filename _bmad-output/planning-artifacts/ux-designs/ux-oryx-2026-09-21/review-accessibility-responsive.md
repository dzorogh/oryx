# Final Accessibility & Responsive Validation — Production Order UX

Review date: 2026-09-21  
Standard: WCAG 2.2 AA  
Normative sources: `DESIGN.md`, `EXPERIENCE.md`  
Non-normative source: `.working/direction-document-workspace.html`

## Verdict

**Pass — no remaining substantive accessibility or responsive contract findings.**

The current spines close all findings from the prior review. Output lines preserve product/quantity relationships in the accessibility tree; collapsed reservation details are removed or natively hidden; pagination has a valid fallback when the activated control becomes disabled or disappears; and scroll-spy handles a short final section at document bottom. Tablet/reflow semantics are normative and the selected visual board demonstrates the four-row movement sample without field loss.

This verdict validates the UX contract, not a production implementation. The direction HTML remains a non-normative visual board and does not implement runtime state transitions.

## Severity counts

- Critical: **0**
- High: **0**
- Medium: **0**
- Low: **0**
- Total: **0**

## Remaining substantive findings

None.

## Verification record

### Output line pairing — verified

- `DESIGN.md` Components, lines 125–129 requires every output line to be one semantic nested item/group containing product name, product code, quantity, and unit. Visual desktop columns may not break that programmatic pair.
- `EXPERIENCE.md` Information Architecture, lines 52–55; Component Patterns, lines 88–92; Accessibility Floor, lines 145–150; Responsive & Platform, lines 164–168 repeat the same normative relationship for desktop, tablet, and 320 CSS-pixel reflow.
- `.working/direction-document-workspace.html`, lines 51–55 exposes desktop quantities inside the corresponding product list items and hides the duplicate visual quantity column from assistive technology.
- Tablet lines 85–89 expose two distinct list items:
  - `CR 125 / PRD-108 / 22 шт`;
  - `Enduro 125 / PRD-75 / 1 комплект`.
- Browser accessibility inspection announced each tablet product and quantity as one list item, rather than parallel unrelated lists.

### Collapsed reservation hidden state — verified

- `DESIGN.md` Components, lines 125–128 requires the collapsed reservation container to be hidden or removed in full.
- `EXPERIENCE.md` Component Patterns, lines 87–90 and Interaction Primitives, lines 132–136 require atomic `aria-expanded=false` plus unmounting or native `hidden`; expansion restores the same ID and `aria-controls` relationship.
- The selected HTML demonstrates the expanded state with a named group, two explicit owner list items, and field labels. It is static and therefore does not independently test the collapse transition; the normative runtime contract is nevertheless complete.

### Pagination fallback focus — verified

- `EXPERIENCE.md` Interaction Primitives, lines 136–140 retains focus on the activated pagination control only while it remains enabled.
- If it becomes disabled, focus moves to the current-page control.
- If pagination/current-page controls disappear because results shrink to one page, focus moves to the «Движения» heading.
- Every successful page load still announces `Показаны движения X–Y из M`.

### Scroll-spy bottom fallback — verified

- `EXPERIENCE.md` Interaction Primitives, lines 131–133 uses the sticky-offset crossing rule normally.
- At document bottom it explicitly marks the last visible section current, including short or empty «Движения».
- Neither normal scroll-spy nor the bottom fallback moves keyboard focus.

### Tablet semantics — verified

- `EXPERIENCE.md` Accessibility Floor, lines 145–150 requires each responsive item to have a heading and explicit `dl` term/value pairs, with nested labelled output-line groups.
- `EXPERIENCE.md` Responsive & Platform, lines 159–168 defines the complete ordered output and movement field mappings.
- In the selected HTML:
  - output is an `article` labelled by an `h3`;
  - «Товары и количество» is a named nested group with one list item per product/quantity pair;
  - each movement is an `article` labelled by its own `h3`;
  - each movement exposes all six fields through explicit `dt`/`dd` pairs;
  - reservation assignments are list items with explicit owner type, code, and reserved quantity.

### Four-row movement sample — verified

- `.working/direction-document-workspace.html`, lines 58–64 contains four desktop movement table rows.
- Lines 90–96 contains four tablet movement articles with matching times, signed quantities, products, places, owners/free state, and reservation documents.
- Runtime inspection at a 768 CSS-pixel viewport confirmed:
  - desktop movement rows: **4**;
  - tablet movement articles: **4**;
  - tablet output line groups: **2**;
  - reservation assignment items: **2**;
  - page-level horizontal overflow: **none** for the supplied sample.

## Non-normative prototype observations

These do not change the zero-finding contract verdict.

1. The HTML is a static direction board. It cannot execute or prove disclosure collapse, pagination focus transfer, scroll-spy updates, async editing, close-dialog lifecycle, or reduced-motion behavior.
2. The board keeps compact visual target dimensions that are smaller than the normative 44×44 CSS-pixel tablet/reflow requirement, especially the disclosure button. Production must follow `EXPERIENCE.md`, not copy these dimensions.
3. Breadcrumb markup remains illustrative rather than the normative ordered-list/current-page structure.
4. Destination headings are focusable, but the board does not visually demonstrate the required heading focus ring or sticky-chrome scroll offset.
5. Desktop and tablet examples coexist as separate board compositions. Production must render the local responsive structures defined by the spines rather than duplicate both complete page trees.
