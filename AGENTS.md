# Agent instructions (Oryx BMS)

<!-- bmad:context -->
<!-- Verified 2026-09-21 against 7c9fc8c801b9d3d4b3f135c8e2ec27c88f8403cd. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Oryx BMS

Internal business management app. Next.js App Router, React, TypeScript, Tailwind v4. Conventions live in `docs/conventions/`; screen behavior in `docs/features/`. Follow this file before changing UI, layout, or the demo backend.

## Policy

- Finish work on local `main` (fast-forward merge preferred). Do not push to `origin` or open a PR unless the user explicitly asks (push / publish / задеплой / запушь). No force-push to `main`, no `--no-verify`, no amending others' commits.
- Never put secrets in any user-visible message (quotes, diffs, logs, tables, code blocks): passwords, hashes, API keys, tokens, JWTs, PATs, private keys, connection strings with credentials, OTP/magic-link secrets, Studio/DB/auth credentials. Write secrets only to a gitignored file or the secret store (Dokploy env, password manager). In chat say only that it was set and where to open it; confirm without the value.
- After any diagnostic write to a live system (Oryx demo Supabase, APIs, UI), delete or revert it in the same session. Do not leave rows, users, files, or groups named TEST, dummy, DELETE ME, or similar. Prefer mocks and local fixtures.
- Use only this project's Dokploy compose `supabase` (`oryx-supabase-bb1dnn`). Agent access is MCP `oryx-supabase`. Never Capacity, YNAPB, or cloud `user-supabase`. Browser uses the anon key, no login. Details: `docs/conventions/backend/supabase.md`.
- User-facing page text must be in Russian. Do not use `check:ui-english` / `lint:ui-english` as a gate — that scanner is a leftover English-only rule.
- Planning, design, and implementation workflows use BMAD skills from `.agents/skills/` only. Never Superpowers skills (`superpowers:*`), never write new `docs/superpowers/` plans or specs, never run `.superpowers/` sessions. Historical files under `docs/superpowers/` are leftovers; ignore their "use superpowers:*" headers.

## Where things are

- Conventions (canonical): `docs/conventions/README.md`. Edit those files; keep `.cursor/rules/*.mdc` as pointers.
- Agent workflows: BMAD skills in `.agents/skills/` only. Do not use Superpowers.
- Feature behavior: `docs/features/README.md`.
- List-page / toolbar reference: `src/components/store/pim/products/store-catalog-page.tsx`, `src/components/store/pim/products/catalog/catalog-toolbar.tsx`; Pulse Thanks: `src/features/pulse/thanks/thanks-page.tsx`, `src/features/pulse/thanks/thanks-toolbar.tsx`.
- Logistics: `src/features/logistics/` — `docs/features/logistics.md`.
- Demo images helper: `src/lib/demo-content-image.ts` (`demoContentImageUrl`). Browser Supabase client: `src/lib/supabase/client.ts` (returns `null` if env is unset).
- Humans: `README.md` and `docs/conventions/`.

## Running and verifying

- There is no CI and no e2e suite. `npm test` runs unit tests for pure domain logic (`tests/unit/`, `node:test`, mostly Logistics). Before handing off work, run `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:deps`, `npm run check:docs`, `npm run check:static-images`, and `npm test` locally.
- For UI changes, also verify the affected screens manually in a browser. The old `check:ui-english` / `lint:ui-english` scripts are retired and are not gates.

## Conventions that differ from defaults

- List pages: `bg-muted/30`, breadcrumb outside a white `Card` toolbar (`text-lg` title), filters/tabs inside the toolbar, list full width below. See `docs/conventions/ui/list-page-toolbar.md`.
- No `max-w-*` / `mx-auto` on the page root; use responsive grids or tables. See `docs/conventions/ui/full-width-page-content.md`.
- Bundled UI images: static imports from `src/assets/` with `StaticImageData` and `next/image`, not `"/….png"` strings to `public/`. Demo content: `demoContentImageUrl(seed, w, h)` (Unsplash). Avatars: `i.pravatar.cc/<size>?u=<id>`. Never `loremflickr.com` (HTTP 500) or `picsum.photos` (geoblocked).
- Do not duplicate convention text into Cursor/IDE rule files — point at `docs/conventions/`.

## Known pitfalls

- Do not treat a working UI with local demo data as proof the Oryx demo backend is configured — `src/lib/supabase/client.ts` returns `null` when env is unset.
- Do not follow leftover Superpowers plans/specs under `docs/superpowers/` or local `.superpowers/` state; those are inactive. Use BMAD instead.

<!-- /bmad:context -->

## Prototype status

Oryx is a visual prototype for exploring product ideas, interfaces, workflows, and data models. It is not a production system.

- Treat every record in the app and its demo backend as fictional demonstration data, not authoritative business data.
- Optimize product work for realistic scenarios, coherent UX, rapid iteration, and easy-to-change data models while preserving normal code quality and verification.
- Mocks, fixtures, seeded records, and simplified workflows are appropriate when they support the prototype; keep them believable and internally consistent.
- Do not infer production requirements from the prototype or add production-only complexity such as real authentication, billing, compliance controls, high availability, migration/backfill machinery, or hardened external integrations unless the user explicitly asks.
- Assume interfaces, workflows, schemas, and contracts are exploratory and may change. Prefer reversible changes and avoid unnecessary compatibility layers.
- Never present demo values as real company facts, operational state, or evidence that a production integration is configured.

## Grok models

Outside the managed block on purpose: keep this section when refreshing `bmad-project-context`.

When the active model is Grok, quality outranks speed, token count, and smallest-diff. Do not economize on tokens, do not rush, and do not skip checks or clarifying questions. Work as a senior: read the relevant code and conventions, handle edge cases, and produce a careful result. There is no cap on change volume or time when quality needs more work.

- Do not skip verification (`lint` / `typecheck` / `build` / `check:deps` / `check:docs` / `check:static-images` as applicable), browser checks for UI, or questions that would change the design.
- Do not use the project token-saver MCP in `active` (suppression) mode on Grok. Leave it `off`.

## Subagents

Outside the managed block on purpose: keep this section when refreshing `bmad-project-context`.

Delegate well-defined technical tasks — writing code to a clear spec, and codebase or web research — to subagents running the latest Grok model. Prefer Grok 4.7 medium fast; if that tier is not offered, use the newest available Grok slug (for example `grok-4.7-high-fast`). Keep design decisions, ambiguous requirements, and final review/verification in the parent agent. Give each subagent full context (it cannot see the chat), and check its result before reporting it as done.

Never use Grok for design work: UX prototypes, HTML mocks, design directions, wireframes, DESIGN.md / EXPERIENCE.md. Do it in the parent agent or delegate to a non-Grok subagent (default `inherit`).
