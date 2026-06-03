# Agent instructions (Oryx BMS)

This file is the **tool-neutral** entry point for AI agents and automation. Follow it before changing UI or layout.

## Conventions (canonical source)

All project conventions live under **[docs/conventions/](docs/conventions/)**. Do not duplicate long rules in Cursor-only or IDE-only config — update the markdown there and keep tool configs as pointers.

| Topic | Path |
|-------|------|
| Index | [docs/conventions/README.md](docs/conventions/README.md) |
| English UI copy | [docs/conventions/ui/english-labels.md](docs/conventions/ui/english-labels.md) |
| Full-width content / anti-stretch | [docs/conventions/ui/full-width-page-content.md](docs/conventions/ui/full-width-page-content.md) |
| List pages + toolbar header | [docs/conventions/ui/list-page-toolbar.md](docs/conventions/ui/list-page-toolbar.md) |
| Images & avatars (`src/assets`; Picsum/Pravatar demo media) | [docs/conventions/assets/static-images.md](docs/conventions/assets/static-images.md) |

## Quick rules

1. **UI text** — English only in user-visible strings; run `npm run check:ui-english`.
2. **List pages** — `bg-muted/30`, breadcrumb outside a white `Card` toolbar (`text-lg` title), filters/tabs inside toolbar, list full width below. See list-page-toolbar doc.
3. **Width** — No `max-w-*` / `mx-auto` on page root; use responsive grids or tables so blocks do not stretch on ultra-wide screens.
4. **Images & avatars** — Bundled UI images live under `src/assets/` with static imports (`StaticImageData`); not `"/…/file.png"` strings to `public/`. Demo media use seeded remote URLs: `picsum.photos/seed/<id>/<w>/<h>` for content images, `i.pravatar.cc/<size>?u=<id>` for avatars (never `loremflickr.com`). Run `npm run check:static-images`.

## Feature docs (how screens work)

| Feature | Path |
|---------|------|
| Index | [docs/features/README.md](docs/features/README.md) |
| Pulse Thanks | [docs/features/pulse-thanks.md](docs/features/pulse-thanks.md) |

## Reference implementations

- Products catalog: `src/components/store/pim/products/store-catalog-page.tsx`, `catalog/catalog-toolbar.tsx` — behavior: [docs/features/store-pim-catalog.md](docs/features/store-pim-catalog.md)
- Pulse Thanks: `src/features/pulse/thanks/thanks-page.tsx`, `thanks-toolbar.tsx` — [docs/features/pulse-thanks.md](docs/features/pulse-thanks.md)

## Verification before PR

```bash
npm run lint
npm run typecheck
npm run test
npm run check:ui-english
npm run check:static-images
```

## Tool-specific pointers

- **Cursor**: `.cursor/rules/*.mdc` → links to `docs/conventions/`
- **Humans**: [README.md](README.md) and `docs/conventions/`
