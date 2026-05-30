# English UI labels

All user-facing text on application pages must be in **English**:

- Headings, breadcrumbs, buttons, placeholders
- Table column headers, empty states, tooltips
- Filter labels, status badges, aria-labels
- Error messages and validation copy shown in the UI

**Do not** use Russian (or other languages) for visible UI strings unless explicitly requested.

Code comments and internal developer docs may remain in any language.

## Examples

```tsx
// BAD
<TableHead>Наименование</TableHead>
placeholder="Поиск по названию или артикулу"

// GOOD
<TableHead>Name</TableHead>
placeholder="Search by name or SKU"
```

Price prefix for base products: use `from` (e.g. `from 11,990 USD`), not `от`.

## Automated check

- `npm run check:ui-english` — CI-friendly scan
- `npm run lint:ui-english` — ESLint `oryx-ui/no-cyrillic-ui` on `app/**`, `src/**` TSX, and `src/**/*-demo-data.ts`

## Exemptions

- `// english-ui:ignore` — skip the current or next line
- `// english-ui:ignore-file` — skip the entire file (top of file)

Known legacy copy is baselined in `scripts/english-ui-baseline.json`. Regenerate only when intentionally allowing new Cyrillic:

```bash
npm run check:ui-english -- --update-baseline
```
