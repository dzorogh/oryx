# Spine Pair Review — Oryx Transfer Dialog

## Overall verdict

**Thin.** The pair is mechanically sound: both frontmatters parse, every token reference resolves, the custom component vocabulary is aligned, the two entry contexts close through named journeys, and the selected artifacts are linked with an explicit spine-wins rule. It is not yet a clean implementation contract because dirty-close behavior is explicitly unresolved, the selected mobile reference conflicts with several load-bearing spine rules, and source/assumption provenance is not fully disciplined.

Finding counts: **critical 0 · high 1 · medium 7 · low 1**.

## 1. Flow coverage — strong

The source set contains no formal UJ/FR identifiers to mirror verbatim. The memlog's two entry contexts and stated needs are mapped in the need-to-surface table (`EXPERIENCE.md:35-44`) and covered by two numbered Marina journeys (`EXPERIENCE.md:129-153`). Both flows have a climax and an applicable failure path. The IA reaches the out-of-scope Transfer detail only as the post-create destination, which is sufficient closure.

### Findings

No flow-coverage misses.

## 2. Token completeness — strong

`DESIGN.md` frontmatter parses as YAML and supplies valid objects for `colors`, `typography`, `rounded`, `spacing`, and `components`. All 17 distinct `{path.to.token}` paths used across the pair resolve to `DESIGN.md`. All six custom color values are hex strings. The two load-bearing foreground/background pairs exceed WCAG AA for normal text: availability error `#B91C1C` on `#FEF2F2` is approximately **5.91:1**; allocation note `#166534` on `#F0FDF4` is approximately **6.81:1**. Dark pairs are not required by the stated light-theme scope.

### Findings

No token-definition, type, resolution, or contrast misses.

## 3. Component coverage — adequate

All ten custom components have matching, substantive entries in `DESIGN.md.Components` (`DESIGN.md:117-128`) and `EXPERIENCE.md.Component Patterns` (`EXPERIENCE.md:62-75`): `TransferDialog`, `RouteFields`, `ContextNote`, `ProductLedger`, `ProductLine`, `QuantityControl`, `AddProductAction`, `TransferSummary`, `DialogFooter`, and `InlineAvailabilityError`. Their frontmatter token groups are also present under matching kebab-case names (`DESIGN.md:42-71`).

### Findings

- **[low] Inherited primitives used by name are not consistently covered behaviorally.** `Popover/Select` is allowed for the product chooser (`EXPERIENCE.md:32`), and request errors use an inherited Oryx error/toast (`EXPERIENCE.md:89`), but neither has a Component Patterns row or a precise inherited behavior reference. The broad shadcn/Oryx inheritance statement reduces the risk but leaves chooser keyboard behavior and toast lifetime/placement implicit. *Fix:* add concise inherited-primitive rows or point to an existing Oryx behavioral contract without restating shadcn visuals.

## 4. State coverage — thin

Every IA surface has meaningful coverage: list loading/empty/error, customer-order no-eligible-stock, dialog initial/incomplete/no-products/invalid/submitting/request-error/success, and detail load/error (`EXPERIENCE.md:78-91`). Focus, offline failure, server-side stale availability, and responsive state preservation are also addressed elsewhere.

### Findings

- **[high] Dirty-close behavior is load-bearing and explicitly uncommitted.** `Cancel`, close control, backdrop, and `Esc` may either discard or require confirmation (`EXPERIENCE.md:66,98,123-126`). This determines data-loss behavior for a multi-row form and blocks a downstream consumer from implementing a single contract. The current generic implementation resets on any close (`src/features/logistics/transfers-page.tsx:191-196,297-302`), while `reconcile-current-transfer-dialog.md:43` says no conflict needs a user decision and does not surface this divergence. *Fix:* decide one policy for every close channel, specify focus behavior if confirmation is used, and reconcile it against the current implementation and mock.

## 5. Visual reference coverage — thin

The only import, `imports/current-transfer-dialog.png`, and the selected working direction, `.working/direction-dense-ledger.html`, are linked inline by both spines. `DESIGN.md:105-106` names what they illustrate and states that the spines win on conflict. There are no `mockups/` or `wireframes/` files to orphan.

### Findings

- **[medium] The mobile direction depicts a different line-selection model and omits required row anatomy.** The contract requires `AddProductAction` to insert an editable row, row removal, and explicit `On hand` plus `Available` data (`EXPERIENCE.md:41,69-72,119`; `DESIGN.md:123-125`). The mobile reference instead renders five preselected checkbox rows, has no mobile `Add product` or remove action, and labels only `Available` (`direction-dense-ledger.html:228-234`; the sole `Add product` is desktop-only at line 199). *Fix:* align the mobile composition with the add-row ledger contract, or explicitly mark the checkbox composition as rejected/non-contractual.
- **[medium] The selected mobile reference cannot demonstrate the required 4–10-line scroll behavior.** Its `.sheet-body` uses `overflow: hidden` (`direction-dense-ledger.html:138`), while the spine requires a scrollable body with a separate footer (`EXPERIENCE.md:74,119`; `DESIGN.md:101,119`) and the memlog establishes 4–10 typical lines (`.memlog.md:11`). *Fix:* make the sheet body vertically scrollable in the reference while keeping route/header/footer behavior consistent with the spine.
- **[medium] The allocation note reads visually as success despite the contract forbidding that meaning.** The spine defines it as contextual information, not a success state (`DESIGN.md:86`; `EXPERIENCE.md:56,68`). The reference uses a green “success surface” and a leading checkmark (`direction-dense-ledger.html:13-15,139,229`). *Fix:* remove the success icon/semantics or amend the contract only if success meaning is intentionally chosen.

## 6. Bloat & overspecification — adequate

The documents are compact, use tables for extractable contracts, and avoid restating upstream domain scope. Pixel values are concentrated in design tokens rather than scattered through prose.

### Findings

- **[medium] Behavioral ownership is duplicated in the visual spine.** Scroll ownership, desktop/mobile control structure, reading order implications, and the prohibition on horizontal scrolling appear in `DESIGN.md:101-103,119-123` and again in `EXPERIENCE.md:69,74,118-120`. The copies currently agree, but two authorities can drift. *Fix:* keep visual anatomy, spacing, density, and responsive appearance in `DESIGN.md`; keep scrolling, control order, state retention, and interaction behavior in `EXPERIENCE.md`, with one-way cross-references.

## 7. Inheritance discipline — thin

The two frontmatters have identical names, statuses, dates, and source lists. Every listed source path exists. Custom component names are identical across the body tables, and EXPERIENCE token references resolve exactly to DESIGN tokens. The selected mock is explicitly subordinate to the spines.

### Findings

- **[medium] A listed architecture source is stale and broader than this UX contract.** `../../architecture/architecture-oryx-2026-09-17/ARCHITECTURE-SPINE.md` is a final spine for reservation/unreservation, not transfer creation. It names `logistics_*`, `customer_order_id`, and `customer_order_line_id` (`ARCHITECTURE-SPINE.md:23-30,53-65`), while the newer feature source says the live model uses `store_*` and generic `owner_type`/`owner_id`, with those claim fields removed (`docs/features/logistics.md:44,64,70`). A downstream source extractor receives conflicting technical vocabulary without a declared boundary. *Fix:* replace it with the current transfer-relevant architecture source, or narrow the citation explicitly to the still-valid “transfer preserves stock state/owner” invariant.
- **[medium] Memlog assumptions are promoted to unconditional contract text without confirmation or assumption markers.** Accessibility inheritance and light-theme/offline posture are recorded as assumptions (`.memlog.md:20-21`), but the spines state WCAG 2.2 AA, light-theme inheritance, and offline request behavior as committed rules (`DESIGN.md:78`; `EXPERIENCE.md:89,104-112`). These may be sound, but their decision status is not traceable. *Fix:* confirm them against an upstream Oryx contract or retain explicit `[ASSUMPTION]` markers/open items until confirmed.

## 8. Shape fit — adequate

`DESIGN.md` follows the required canonical order: Brand & Style, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Components, Do's and Don'ts. `EXPERIENCE.md` contains all default sections plus Responsive & Platform and a justified Open Questions section. Frontmatter schema is complete for a draft pair; no Mermaid blocks are present.

### Findings

- **[medium] Inspiration & Anti-patterns is applicable but omitted.** The memlog names `ProductionFromOrderForm` as the structural reference (`.memlog.md:10`) and records Dense Ledger as selected while Route First and Guided Table are rejected (`.memlog.md:22`); the spines repeat the rejection (`DESIGN.md:76-78`; `EXPERIENCE.md:16-18`). Under the rubric, those explicit lifts/rejects trigger the section. *Fix:* add a compact section containing only those sourced choices and why they were lifted or rejected.

## Mechanical notes

- Both YAML frontmatters parse successfully. `DESIGN.md` includes all design-token groups required by its content; `EXPERIENCE.md` includes `name`, `status`, `sources`, and `updated`. Both are consistently `status: draft`.
- All listed sources resolve: the import relative to the UX workspace, project-root `src/` and `docs/` paths, and the relative architecture path.
- No unresolved `{token.path}` references, missing hex values, malformed component token objects, or Mermaid syntax were found.
- IA closure is explicit through the need → surface → journey table. Transfer detail remains correctly bounded as a navigation destination rather than an invented in-scope design.
- The reconciliation file accurately records the intentional split between free-stock and order-context creation, Draft creation, optional expected end, and post-create navigation. It does not reconcile the dirty-close question or the selected mobile mock conflicts listed above.
