# Spine Pair Review — Oryx Stock Dashboard

## Overall verdict

**Strong and ready to serve as the downstream UX contract for architecture and story development.** The editorially polished pair remains mechanically complete: its source and visual references resolve, token paths and canonical component names join exactly, all five IA views have applicable states, Output ownership is explicit, and the two mock copies are byte-identical with English-only UI. No downstream-impacting findings remain.

Finding counts: **0 critical, 0 high, 0 medium, 0 low**.

## 1. Flow coverage — strong

Pass 1 extracted and inspected every frontmatter source from both spines:

- `docs/features/logistics.md`
- `src/features/logistics/stock-page.tsx`
- `src/features/logistics/logistics-types.ts`
- `src/features/logistics/logistics-balances.ts`

None defines a formally named UJ, user journey, FR, NFR, or requirement ID, so there are no source-defined names requiring verbatim Key Flow counterparts.

All three Key Flows meet the mechanical contract:

| Key Flow | Named protagonist | Numbered steps | Climax | Applicable failure path |
|---|---|---:|---|---|
| `Flow 1 — Ежедневный обзор` | Анна, менеджер по закупкам | 4 | Factual review and transition to Customer demand | Filtered-empty result |
| `Flow 2 — Расследование покрытия заказа` | Максим, менеджер внутреннего обеспечения | 5 | Separates shipped, reserved, and uncovered quantities | Missing expected date |
| `Flow 3 — Аудит расхождения` | Ирина, операционный контролёр | 5 | Traces discrepancy to source/reversal without losing context | Source record unavailable |

The flows cover the principal daily-review, demand-investigation, and ledger-audit jobs; preserve URL and table context; and keep all conclusions within the canonical `FC*`, `R*`, and `DB*` boundaries.

### Findings

No findings.

## 2. Token completeness — strong

Pass 1 extracted five spacing leaves and twenty-three component-token leaves from `DESIGN.md` frontmatter.

Spacing:

- `spacing.page-padding`
- `spacing.section-gap`
- `spacing.control-gap`
- `spacing.table-cell-x`
- `spacing.table-cell-y`

Canonical component namespaces:

- `components.StockToolbar`
- `components.ViewSwitcher`
- `components.FilterBar`
- `components.FactualConditionChip`
- `components.DataTableFrame`
- `components.DataTable`
- `components.GroupedQuantityHeader`
- `components.QuantityCell`
- `components.ExpectedDateCell`
- `components.RightDetailPanel`
- `components.FormulaBlock`
- `components.StockStateSet`

Thirty-one `{path.to.token}` occurrences were checked across frontmatter and body. Every path resolves with exact case to a defined token, including all `components.RightDetailPanel.*` references and every component-table reference. All leaves are valid CSS dimensions or valid references to dimension tokens under the type rules in `design-md-spec.md`.

`colors`, `typography`, and `rounded` are deliberately empty because the pair inherits Oryx/shadcn and states that inheritance explicitly. No local color token is missing a hex value or light/dark pair. WCAG 2.2 AA is the stated floor; foreground/background, muted, border, ring, and destructive combinations inherit from Oryx/shadcn; factual conditions are always text-labelled rather than color-only.

### Findings

No findings.

## 3. Component coverage — strong

Pass 1 compared the frontmatter component namespaces, the canonical list in `DESIGN.md.Components`, the visual table, and `EXPERIENCE.md.Component Patterns`.

The exact same twelve canonical implementation names occur in all required locations:

1. `StockToolbar`
2. `ViewSwitcher`
3. `FilterBar`
4. `FactualConditionChip`
5. `DataTableFrame`
6. `DataTable`
7. `GroupedQuantityHeader`
8. `QuantityCell`
9. `ExpectedDateCell`
10. `RightDetailPanel`
11. `FormulaBlock`
12. `StockStateSet`

Each has a substantive visual contract and a substantive behavioral contract. Names are exact, including capitalization, and each token path uses that same name. Oryx/shadcn primitives (`Card`, `Sheet`, `Skeleton`, buttons, inputs, selects, tooltips, alerts) are explicitly identified as inherited primitives rather than additional dashboard components; their inheritance boundary is unambiguous.

### Findings

No findings.

## 4. State coverage — strong

Pass 1 walked all five IA views. Every view receives the shared initial, empty, filtered-empty, first-load error, stale-snapshot, offline-with-snapshot, and offline-without-snapshot behavior. Focus and activation behavior is specified in Interaction Primitives and Accessibility Floor. Permission-denied is not applicable because the source contract explicitly uses no login and open anon RLS.

| IA view | Shared states | Relevant specialized states |
|---|---|---|
| `Products` | Initial, empty, filtered-empty, load error, stale, offline with/without snapshot, focus | Zero quantity, multiple conditions, negative base grain inside aggregate |
| `Locations` | Initial, empty, filtered-empty, load error, stale, offline with/without snapshot, focus | Zero quantity, multiple conditions, negative balance |
| `Customer demand` | Initial, empty, filtered-empty, load error, stale, offline with/without snapshot, focus | Missing document date, multiple conditions, stale detail ID |
| `Production & transfers` | Initial, empty, filtered-empty, load error, stale, offline with/without snapshot, focus | N/A fields, missing document date, Output/production/transfer status semantics, multiple conditions |
| `Ledger` | Initial, empty, filtered-empty, load error, stale, offline with/without snapshot, focus | Stale detail ID and unavailable source record |

Freshness is explicit: only a failed refresh after a successful load marks a snapshot stale; elapsed age alone does not. In stale/offline states the timestamp remains the last successful load, rows and local investigation state remain visible when available, fetch-dependent actions are disabled with an explanation, Retry preserves URL/sort/page/panel context, and only a successful response replaces the snapshot. No auto-refresh or hidden row reordering occurs.

### Findings

No findings.

## 5. Visual reference coverage — strong

Pass 1 inventory:

- `mockups/stock-dashboard.html`
- No files in `wireframes/`
- No files in `imports/`

The promoted mock resolves and is linked inline in `DESIGN.md.Components`. `EXPERIENCE.md` links it once at the IA overview as the authoritative visual reference for all five named views and identifies the illustrated toolbar, table frame, open demand panel, and responsive transitions. The separate contract-preface sentence states the spine-wins-on-conflict rule exactly once.

The promoted mock and `.working/key-stock-dashboard.html` are byte-identical. Both produced SHA-256 `c4165eae0488ac4ed8b3b024a116e34914c8b2df4cd424293d8fbf9da8d5f02c`. Both declare `lang="en"`, contain no Cyrillic characters, and use English UI labels throughout. Both show `Output` as a distinct Production & transfers process type, with an Output filter option, Output row, status/date/quantity semantics, and N/A cells.

There are no orphaned or unspecific visual references.

### Findings

No findings.

## 6. Bloat & overspecification — strong

The polished spine keeps the load-bearing detail required by architecture and story-dev: data grains, formulas, date scope, Output semantics, URL persistence, shared freshness behavior, accessibility, and unsupported-data boundaries.

Duplication has been materially removed. Foundation is now the single normative home for `FC1`–`FC7`, `R1`–`R3`, and `DB1`–`DB6`. Voice and Tone, Inspiration & Anti-patterns, the manager-question matrix, components, states, and flows refer back to those identifiers instead of redefining their meanings. The manager-question matrix still earns its place as a compact traceability/non-capability map.

Literal component dimensions are tokenized. Remaining breakpoint values, table semantics, and URL parameter names are implementation-significant contract decisions rather than decorative overspecification. EXPERIENCE prose is functional and source-extractable; DESIGN prose carries only the appropriate visual rationale.

### Findings

No findings.

## 7. Inheritance discipline — strong

All six frontmatter source entries resolve; DESIGN's two sources are a valid visual subset of EXPERIENCE's four data/behavior sources. No source-defined UJ or requirement names require inheritance.

Domain terminology aligns across the spines, memlog, and source model: `Stock state`, `Location type`, `free`, `reserved`, `shipped`, `warehouse`, `production_order_line`, `transfer`, `customer_order`, `Plant`, `expected_end_on`, `ProductionOutput`, `ProductionOutputLine`, `Open`, and `Uncovered`. The canonical component vocabulary is exact across tokens and both component sections. `EXPERIENCE.md` uses no `{path.to.token}` references, so it introduces no unresolved DESIGN token dependency.

Output ownership now resolves cleanly:

- IA grain includes `ProductionOrderLine`, `ProductionOutputLine`, and `TransferLine`.
- Process types are exactly `Production order`, `Output`, and `Transfer`.
- Shared and type-specific columns are defined.
- Planned Output dates participate in `FC3`/`FC4`.
- Output quantity, done quantity, destination, N/A fields, filters, and detail links are explicit.
- The mock mirrors the Output filter and row.

Data and risk boundaries remain explicit and source-aligned: no inferred risk/replenishment advice, no cross-axis or cross-unit totals, document-level dates only, immutable ledger history, unavailable procurement/planning/financial/customer-priority fields, and conditional category/family enrichment.

### Findings

No findings.

## 8. Shape fit — strong

`DESIGN.md` contains all canonical sections in the required order:

1. Brand & Style
2. Colors
3. Typography
4. Layout & Spacing
5. Elevation & Depth
6. Shapes
7. Components
8. Do's and Don'ts

Required DESIGN frontmatter fields are present, and inherited empty token groups are explained.

`EXPERIENCE.md` contains every required default:

- Foundation
- Information Architecture
- Voice and Tone
- Component Patterns
- State Patterns
- Interaction Primitives
- Accessibility Floor
- Key Flows

Responsive & Platform is present because the contract defines breakpoint-specific panel/table behavior. Inspiration & Anti-patterns is present because the memlog and sources establish inherited conventions and explicit rejects. The invented Filter semantics and manager-question sections earn their places as URL-state semantics and downstream traceability/data-boundary evidence. Both spines remain explicitly `draft`.

### Findings

No findings.

## Mechanical notes

- **References:** Every source-frontmatter path, inline mock link, sibling-spine mention, and promoted visual reference resolves.
- **Examples:** All configured design and experience examples were re-read before judgment.
- **Token graph:** 28 token leaves and 31 references checked; all references resolve with exact case and valid dimension/reference types.
- **Colors:** Empty by explicit Oryx/shadcn inheritance; the critical missing-hex rule is not triggered.
- **Components:** Twelve canonical names match exactly across frontmatter, DESIGN visual rows, and EXPERIENCE behavioral rows.
- **States:** Every IA view receives the shared initial/empty/error/stale/offline/focus contract plus relevant view-specific states.
- **Output:** Production & transfers explicitly owns Production order, Output, and Transfer rows and their distinct semantics.
- **Visual artifacts:** One promoted mock, zero wireframes, zero imports, zero orphans; working and promoted HTML copies are byte-identical.
- **Mock language:** Both HTML copies declare English and contain no Cyrillic UI text.
- **Spine priority:** The spine-wins-on-conflict statement appears exactly once.
- **Duplication:** Normative factual, interpretation, and data-boundary rules are centralized under canonical identifiers and referenced elsewhere.
- **Data/risk boundaries:** Explicit and source-aligned; no unsupported inference or recommendation is introduced.
- **Frontmatter:** Names, statuses, sources, and update dates are present; DESIGN includes the required description.
- **Mermaid:** Neither spine contains Mermaid; no syntax issue applies.
