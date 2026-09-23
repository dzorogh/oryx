# Production order detail — inherited source patterns

## Scope and precedence

This extraction is limited to the eight confirmed UX source documents, the current production-order screenshot, and `ProductionOrderDetailPage`. It records inherited patterns and conflicts; it does not choose a new direction. The closest document-detail analogue is Transfer Detail; Stock Dashboard contributes table semantics, and Transfer Dialog / Owner Reservations contribute dense editing and owner-allocation patterns.

## Strong inherited patterns

- **Calm, dense logistics surface.** Reuse Oryx/shadcn tokens on `bg-muted/30`; use white bordered panels, compact spacing, `text-sm` rows, muted secondary metadata, and `tabular-nums`. Hierarchy comes from typography, borders, muted row backgrounds, and spacing—not extra palettes, gradients, shadows, or decorative cards.
- **Document hierarchy starts with identity.** Breadcrumb sits outside the content. A single expanded document header should establish document number, one textual status, the sole expected-end value, and compact document actions before line-level data. Do not repeat the same facts in KPI or summary cards.
- **Actions stay close to their scope.** Document lifecycle actions belong in the header, with no more than one primary action at once; section creation actions belong in section headers. Buttons are compact and never hover-only. Related detail guidance centralizes reservation as a page-level action, while the current production page exposes `Зарезервировать` per product row—this is an explicit consistency conflict, not a settled inheritance.
- **The product area is a manifest, not a card collection.** Use one bordered, compact data surface capable of 15+ rows. Keep product name plus secondary SKU/code together; align quantities for comparison, preserve units, show numeric zero as `0`, and reserve `—` for genuinely non-applicable values.
- **Owner allocation remains inspectable.** `Free`, each customer order, and each region are distinct textual owner buckets, not color-coded risk states. The current expandable rows already expose free and reserved owner breakdowns; inherited detail patterns favor either owner grouping or a product-total disclosure whose breakdown sums exactly to the total.
- **Related records and history remain secondary context.** Outputs and immutable movements must stay auditable and link to their source documents, but should not outrank the production plan/manifest. The closest detail analogue places the manifest first and activity second in a desktop `2fr / 1fr` work area, then stacks them manifest-first on tablet.
- **Tablet behavior preserves reading order and actions.** At `768–1023px`, panels stack into one column, actions wrap, and essential product/quantity fields remain visible. For document details, horizontal scrolling must not become the primary reading method; the current 768px baseline visibly clips the right side of Products and Outputs tables, which conflicts with the inherited responsive-detail pattern.
- **Editing must preserve context and give local feedback.** Dense edit flows keep labels visible, validate quantities beside the affected control, retain entered values on request failure, disable duplicate submission, and avoid nested dialogs. Status color cannot carry meaning alone; status always needs text.

## Conflicts to resolve in the active UX run

- **Status treatment:** Transfer Detail specifies a read-only textual status badge plus separate lifecycle actions; the current production header uses an inline status select and also exposes cancel/close actions. The sources do not establish which production transitions belong in the select versus explicit actions.
- **Deadline treatment:** related detail documents define exactly one document-level `Expected` value and no derived ETA or line-level due date. The current page edits it inline; the sources permit editing according to existing rights but do not settle whether editing is always exposed or entered through an action state.
- **Responsive table strategy:** Stock Dashboard deliberately keeps true tables with sticky identity and horizontal scroll, while Transfer Detail avoids horizontal scroll as the main detail-page reading method, and Transfer Dialog converts lines to a compact stack below `md`. The current tablet screenshot demonstrates that a wide-table-only treatment is not working; the active run must choose by surface, without mixing these patterns accidentally.
- **Language:** all eight historical UX contracts require English labels, but the current production page and screenshot are Russian. This is a direct source-versus-baseline conflict; wording should follow the active project convention rather than silently mixing languages.
- **Current vertical hierarchy:** implementation stacks header, Products, Outputs, and Movements as equally wide cards. The closest inherited detail contract instead makes the product manifest primary and activity a narrower secondary panel on desktop; no source supports decorative summaries or an empty middle column.

## Relevant anti-patterns

- Summary/KPI cards that repeat status, expected date, quantities, route, or owner facts.
- A separate card for every product or owner group on desktop; nested cards and decorative shadows inside the page.
- Status, owner type, or urgency communicated only by color; risk scores, traffic lights, inferred delay, or recommendations.
- Totals that mix products or incompatible units; hiding zero; using `—` for a missing expected date.
- Per-row actions repeated without a clear row-specific need, hidden hover actions, bulk controls without an inherited workflow, or modal chains.
- Wide tablet tables whose essential columns/actions are simply clipped, and mobile/tablet reductions that remove document states or lifecycle actions.
