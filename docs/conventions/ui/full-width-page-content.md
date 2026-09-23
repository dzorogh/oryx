# Full-width page content

Module and app pages must use the **full width** of the main content area (between nav rail and aside). Do not center-narrow the entire page with `max-w-*` or `mx-auto` on the root page shell.

## Page shell

Use `w-full` with horizontal padding, for example:

```tsx
import { MODULE_PAGE_CONTENT_CLASS } from "@/components/layout/module-layout-tokens";

<div className={MODULE_PAGE_CONTENT_CLASS}>{/* page content */}</div>
```

Or equivalent: `flex w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:gap-8 lg:px-8`.

**Do not** on the page root:

```tsx
// BAD — leaves empty space on wide screens
<div className="mx-auto max-w-3xl w-full ...">
<div className="mx-auto max-w-7xl w-full ...">
```

## Exceptions (local max-width only)

- Dialogs, sheets, popovers, form fields: `sm:max-w-md`, etc.
- Hero **subtitle/description** text: `max-w-2xl` on the paragraph only, not on lists or grids

## Anti-stretch (lists, cards, tiles)

On wide screens, a single full-width column makes cards and lines too long. Prefer:

- **Responsive grid** for card lists: `grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3`
- **Tables** for dense tabular data at full width
- **Prose** for long reading text: `max-w-prose` on the text block inside the layout, not on the page root

Empty states spanning a grid should use `md:col-span-2 xl:col-span-3` when appropriate.

## Tables inside a card

A table inside a `Card` spans the card edge to edge: no horizontal padding on the card body or table wrapper, and no vertical card padding above or below the table. Only the first and last cells keep an inset (`pl-4` / `pr-4`), so row hover and row borders reach the card edges. In Store logistics use `LogisticsTableCard` (or `FLUSH_TABLE_CLASS` from it) instead of hand-rolled padding. Note: shadcn `CardContent` in `size="sm"` cards adds `group-data-[size=sm]/card:px-3`, which a plain `px-0` does not override — clear it explicitly.

## List pages with toolbar

Pages with a compact white toolbar above a list (Products, Thanks) use `bg-muted/30` and place the breadcrumb outside the card. See [list-page-toolbar.md](list-page-toolbar.md) for the header; this document governs width of the list body below.

## Scope

Applies to `app/**`, `src/features/**`, and `*-page.tsx` under `src/components/`. Legacy pages with `max-w-*` shells should be migrated when touched.
