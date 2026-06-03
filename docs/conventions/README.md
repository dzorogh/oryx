# Project conventions

Canonical guidelines for humans and AI agents (Cursor, Codex, Claude, CI, etc.). **Edit these files** when conventions change; tool-specific configs should only point here.

## UI and layout

| Topic | Document |
|-------|----------|
| English UI copy | [ui/english-labels.md](ui/english-labels.md) |
| Full-width list/content area | [ui/full-width-page-content.md](ui/full-width-page-content.md) |
| List pages with toolbar header | [ui/list-page-toolbar.md](ui/list-page-toolbar.md) |
| Images & avatars (`src/assets`; Picsum/Pravatar for demo media) | [assets/static-images.md](assets/static-images.md) |

## Entry points for agents

- Root: [AGENTS.md](../../AGENTS.md)
- Cursor: [.cursor/rules/](../../.cursor/rules/) (thin pointers to this folder)

## Verification

```bash
npm run check:ui-english      # English UI copy
npm run lint:ui-english       # ESLint rule oryx-ui/no-cyrillic-ui
npm run check:static-images     # No public/ string paths for bundled images
```
