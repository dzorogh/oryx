# List pages and toolbar headers

Use this layout for module pages that show a **filterable list** (cards, table, or feed).

**Reference implementations:**

- Store: `src/components/store/pim/products/store-catalog-page.tsx` + `catalog/catalog-toolbar.tsx`
- Pulse Thanks: `src/features/pulse/thanks/thanks-page.tsx` + `thanks-toolbar.tsx`

Works together with [full-width-page-content.md](full-width-page-content.md) for the list body below the toolbar.

## Page shell

```tsx
<main className="min-h-screen bg-muted/30">
  <section className="p-4">
    <div className="flex w-full flex-col gap-4">
      <Breadcrumb>{/* outside the white card */}</Breadcrumb>
      <FeatureToolbar {...toolbarProps} />
      {/* list: grid, table, or feed — full width */}
    </div>
  </section>
</main>
```

- **Breadcrumb** sits on the grey (`bg-muted/30`) background, not inside the toolbar card.
- **Do not** use a large hero (`text-2xl`/`text-3xl`) or only `MODULE_PAGE_CONTENT_CLASS` without the toolbar card for these pages.

## Toolbar card (white header)

Extract a `*Toolbar` component per feature. Structure matches `CatalogToolbar` / `ThanksToolbar`:

```tsx
<Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
  <CardHeader className="gap-0 space-y-3 pb-0">
    {/* 1. Title row */}
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">Page title</h1>
        <p className="text-xs text-muted-foreground">One-line description.</p>
      </div>
      <Button type="button" size="sm">Primary action</Button>
    </div>

    {/* 2. Divider */}
    <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

    {/* 3. Controls: tabs, filters, view toggles */}
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      {/* tablist, selects, search, etc. */}
    </div>
  </CardHeader>
</Card>
```

### Typography and actions

| Element | Classes |
|---------|---------|
| Title | `text-lg font-semibold` |
| Description | `text-xs text-muted-foreground` |
| Primary CTA | `Button` `size="sm"`, top-right of title row |

### Filters in the toolbar

- Embed filters **inside** the toolbar card (second row), not in a separate grey box.
- Inline label + `Select` `size="sm"`, fixed width (e.g. `w-[10.5rem]`), `bg-background` on trigger.
- Compact clear: `Button` `variant="ghost"` `size="sm"` with icon.
- Examples: `thanks-person-filters.tsx` (`variant="embedded"`), `catalog-filters.tsx`.

### Tabs in the toolbar

Use `HomeFilterChip` in a `role="tablist"` row inside the controls section (not below the card).

## List body (below toolbar)

- Renders on **muted background** under the white card.
- **Card grids**: `grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3`
- **Tables**: full-width `Table` (see `catalog-table.tsx`)
- **Pagination**: `CatalogFooter` or `ThanksListFooter` with `buildPaginationItems` from `src/lib/pagination.ts`

## Checklist for new list pages

1. `bg-muted/30` page + `p-4` + `gap-4` column layout
2. Breadcrumb above white toolbar card
3. Dedicated `*Toolbar` with title, divider, controls
4. List full width with anti-stretch (grid columns or table)
5. English UI labels — [english-labels.md](english-labels.md)
