# Comments module (reusable)

Reusable, business-grade discussion module. First integrated on the Pulse News article
page, designed to drop into business sections later (Tracker tasks, Store orders) with no
behavioral changes — only a different `scope` and seed data.

> Status: **implemented** (first integration: Pulse News article page).
>
> Advanced capabilities (reactions, presence/realtime, drafts & offline queue, scheduled send,
> link previews, media recording, entity mentions, AI assist/translate/TL;DR/soften, search)
> are documented in [Advanced features (Phases 0–8)](#advanced-features-phases-08) below. The
> original "Non-goals" section reflects the **first** iteration; items marked there as out of
> scope (Collaboration/AI, emoji reactions) have since been added — see the advanced section.

## Goals

- One module, identical behavior everywhere it is mounted.
- Threaded replies (Discord-style, **single** nesting level: root comment → replies).
- `@`-mentions of users.
- Newest comments at the **bottom**; composer pinned at the bottom; the block reads as a
  self-contained, bounded (scrollable, not very tall), paginated panel.
- Rich-text composer comparable to Tiptap's Notion-like editor, built on **open-source
  Tiptap** (MIT) — no paid Start-plan template, no Collaboration/AI cloud.
- File attachments via a **separate button** (chips below the comment). Only **images** can
  be embedded inline inside the text.
- **System (author-less) notifications** interleaved in the timeline (e.g. "Order status
  updated. New status — In transit", "Deadline soon! Complete the task or change the due
  date", "Task completed"). A notice may have a title **and** description, or just a single
  line. Sent by the system — **no author**.
- **Edit own comments**; reachable via a context menu on **right-click** and via a **⋯ button
  in the top-right** of the comment.
- **Delete own comments** with a **confirmation** dialog. Deleting a comment that still has a
  reply thread under it leaves a **"Comment deleted" tombstone** so the thread stays readable;
  a comment with no replies is removed entirely.
- **Like** comments. When there are no likes we do **not** render "0" — only the like
  affordance; the count appears once ≥ 1.
- Modern, compact, premium design consistent with the rest of the app, with a **convenient
  adaptive / mobile** layout.

## Non-goals (this iteration)

- No backend / persistence beyond the current session (static export, demo data). State is
  **in-memory** only and resets on reload.
- No real file upload — attachments use `URL.createObjectURL` previews.
- No Collaboration/AI; no edit history (editing replaces content, optional "edited" marker).
- No multi-level nesting (replies cannot be replied-to with deeper nesting).
- System notifications are read-only: no author, no replies, no likes, no edit/delete.
- Likes are the only reaction (no emoji reaction palette).

## Public API

Folder: `src/features/comments/`

```tsx
<CommentsPanel
  scope={{ type: "news", id: item.id }}      // identifies the thread
  currentUser={currentUser}                   // CommentUser
  mentionableUsers={mentionableUsers}          // CommentUser[]
  initialComments={seed}                       // CommentRecord[]
  pageSize={8}                                 // "Load earlier" page size (default 8)
  maxHeight="32rem"                            // bounded scroll area (default 32rem)
/>
```

Business sections reuse the panel by passing their own `scope`, `currentUser`,
`mentionableUsers`, and seed. Nothing else changes.

## Types (`comments-types.ts`)

```ts
export type CommentUser = { id: string; name: string; role?: string; avatarUrl: string };

export type CommentAttachment = {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  url: string;            // object URL in demo
  kind: "image" | "file";
};

export type CommentRecord = {
  kind: "comment";
  id: string;
  parentId: string | null;  // single-level: replies always point to a ROOT comment
  author: CommentUser;
  contentHtml: string;       // rendered Tiptap HTML (for display)
  contentJson: unknown;      // Tiptap JSON (source of truth)
  mentionIds: string[];      // user ids mentioned in the body
  attachments: CommentAttachment[];
  createdAtIso: string;
  editedAtIso?: string;      // set when the author edits; drives the "edited" marker
  deleted?: boolean;         // tombstone: kept only to preserve a reply thread
  likedByMe: boolean;
  likeCount: number;         // when 0 → render only the like button, no "0"
};

// Author-less, system-generated timeline entry.
export type SystemNotification = {
  kind: "system";
  id: string;
  tone?: "info" | "success" | "warning";  // styling/icon hint (default "info")
  title?: string;        // at least one of title/description must be present
  description?: string;
  createdAtIso: string;
};

// The timeline is an ordered mix of user comments and system notices.
export type CommentFeedItem = CommentRecord | SystemNotification;
```

Only **root** feed items can be a `SystemNotification`; replies are always `CommentRecord`.

## File map

| File | Responsibility |
|------|----------------|
| `comments-types.ts` | Shared types above (`CommentUser`, `CommentAttachment`, `CommentRecord`, `SystemNotification`, `CommentFeedItem`). |
| `use-comments-state.ts` | In-memory state + actions (`addComment`, `editComment`, `removeComment`, `toggleLike`), pagination helper, grouping roots → replies, merged chronological feed (comments + system notices). `removeComment` hard-deletes a comment with no replies and **tombstones** (sets `deleted`) a root that still has replies. |
| `comments-panel.tsx` | Container: header (count), bounded scroll area scrolled to bottom on mount, floating "scroll up to load earlier" pill with animated lazy-load (anchored scroll), feed list, bottom-pinned root composer. Auto-scroll to bottom on send. |
| `comment-thread.tsx` | One root comment + its replies + inline reply composer. Reply/quote state is controlled by `comments-panel.tsx`; the thread tags its root with `data-thread-root`. |
| `comment-quote.ts` | Quote helpers: `seedFromComment` / `seedFromRange` build a `QuoteSeed` (author + HTML), and `buildQuotedHtml` wraps it in an attributed `blockquote`. Preserves nested `blockquote`s → quote-of-quote at any depth. |
| `comment-quote-selection.tsx` | Floating `Quote` button shown when text is selected inside a rendered comment body (`data-comment-body`); quotes the exact selection into the enclosing thread's composer. |
| `comment-item.tsx` | Single comment: avatar, name/role/time + "edited" marker, rendered body, attachment chips, like button, actions trigger (⋯ button + right-click). Inline edit mode reuses the composer. Renders a "Comment deleted" tombstone when `deleted`. Delete confirmation via `alert-dialog`. |
| `comment-system-notice.tsx` | Author-less system notice row: centered, subtle, tone icon, optional title + description (or single line). |
| `comment-actions-menu.tsx` | Context menu opened by right-click **and** the ⋯ button: Reply (roots), Edit/Delete (own), Copy text. Built on `dropdown-menu`. |
| `comment-composer.tsx` | Editor + toolbar + attach button + send; `variant="root" | "reply" | "edit"`. |
| `comment-editor.tsx` | Tiptap `useEditor` wrapper (SSR-safe), toolbar, mention suggestion dropdown, image insert. |
| `comment-mention-list.tsx` | Keyboard-navigable mention suggestion popup. |
| `comment-attachments.tsx` | Attachment chips (image thumbnail vs file chip) + pending-attachment editing in composer. |
| `comments-demo-data.ts` | `buildCommentSeed(...)` (mixes a few system notices), `COMMENT_MENTIONABLE_USERS`, current user — reuses `EMPLOYEE_OPTIONS` + pravatar avatars. |

## Editor stack (open-source Tiptap)

All MIT, no subscription:

- `@tiptap/react`, `@tiptap/pm`
- `@tiptap/starter-kit` v3 (bold, italic, strike, code, headings, bullet/ordered list,
  blockquote, code block, history — **and bundled `link` + `underline`**, so those are
  configured via StarterKit instead of registered as separate extensions)
- `@tiptap/extension-placeholder`
- `@tiptap/extension-image` (inline images only)
- `@tiptap/extension-mention` (+ built-in suggestion) for `@`-mentions
- `@tiptap/extension-task-list` + `@tiptap/extension-task-item` — checklists
- `@tiptap/extension-table` (Table / Row / Header / Cell) — tables
- `comment-callout.ts` — local custom node: `<div data-callout data-tone>` callouts
  (`info` / `warning` / `success`)
- `comment-slash-command.ts` + `comment-slash-list.tsx` — local `/` command menu built on
  `@tiptap/suggestion` (same utility as mentions)

Compact fixed toolbar: bold / italic / underline / strike · H2 / H3 · bullet / ordered list ·
quote / code · checklist / table / callout (tone dropdown) · link · image · **AI assist**. `@`
opens the mention dropdown. SSR-safe via `immediatelyRender: false`.

**AI assist (mock)**: the sparkles toolbar dropdown offers Improve writing / Fix spelling &
grammar / Make shorter / Make longer / Summarize. It runs deterministic local heuristics (no
network) over the current draft text after a short simulated latency (spinner on the trigger),
then replaces the draft in place. This is a stand-in for a real assistant so the latency +
replace-in-place UX can be demonstrated.

Slash (`/`) command menu: typing `/` opens a keyboard-navigable block palette that mirrors the
toolbar blocks (text, H2/H3, lists, checklist, quote, code block, table, callouts, divider,
image). The query after `/` filters by title + keywords; selecting an item deletes the `/query`
range and inserts the block. Implemented with the shared `@tiptap/suggestion` utility (its own
plugin key, distinct from the mention suggestion).

Code blocks: `@tiptap/extension-code-block-lowlight` (StarterKit's `codeBlock` disabled) gives
live syntax highlighting in the editor via the shared `lowlight` instance (`comment-highlight.ts`,
highlight.js common languages). In the read-only body, `comment-code-enhance.ts` re-highlights
each `<pre>` (lowlight → `hljs-*` token spans) and appends a hover **Copy** button; it runs in a
`useEffect` on the body ref and is idempotent (`data-code-enhanced`). Token colors live in
`globals.css` (`.comment-prose .hljs-*`).

Tables and callouts render in the read-only comment body via `.comment-prose` CSS (callout
tones styled by the `data-tone` attribute). Task-list checkboxes are **read-only status
markers** in a published comment: toggling them wouldn't persist, so `comment-item.tsx` bakes
`disabled tabindex="-1"` directly into the rendered HTML string (`withReadOnlyCheckboxes`,
memoized on `contentHtml`). This is deliberate over a post-mount DOM mutation: an imperative
`input.disabled = true` gets wiped whenever React re-applies the body's
`dangerouslySetInnerHTML` (e.g. when a sibling comment is added), and the disabling effect
wouldn't re-run because its deps are unchanged. Baking it into the string is also SSR-safe.
CSS alone is insufficient because Tiptap wraps each checkbox in a `<label>` that forwards
clicks past `pointer-events: none`. Checkboxes stay editable in the editor (edit mode), which
seeds from `contentJson` and runs its own Tiptap node view.

## UX & layout

- A white `Card` titled `Comments {n}` on the page background, ring-1 like other blocks.
- **Bounded body**: scrollable region `max-h: maxHeight; overflow-y-auto`. Comments oldest →
  newest (newest at the bottom). **On mount the panel is scrolled to the bottom** (newest
  comment); after posting, it scrolls to the bottom again.
- **Pagination + lazy-load**: only the latest `pageSize` root rows render. A **floating pill**
  at the top of the scroll area ("Scroll up to load earlier comments") signals there is more
  history. Scrolling near the top (or clicking the pill) triggers a **simulated async load**
  (short spinner state), then prepends the next page. The scroll position is **anchored from
  the bottom** so the view does not jump, and newly revealed rows animate in
  (`animate-in fade-in slide-in-from-top`). The pill disappears once the oldest comment is
  reached.
- **Composer pinned at the bottom** of the card (outside the scroll area) so it always reads
  as "the input lives here, this is the bottom".
- **Timestamps** render a deterministic UTC label on the server / first client render and swap
  to live relative time (`5 hours ago`, `yesterday`) after hydration via a `useSyncExternalStore`
  hydration flag — avoiding `Date.now()`/locale hydration mismatches. The seed is built in the
  server component and passed down so comment data is identical on both sides.
- **Replies**: indented under their root with a connecting guide line; each root has a
  `Reply` action that toggles a compact inline composer scoped to that thread.
- **Quote reply**: two ways to cite a comment, both routed through `comment-quote.ts`
  (`seedFromComment` / `seedFromRange` → `buildQuotedHtml`):
  - **Whole comment**: the actions menu on any comment (root or reply) has a `Quote reply` item.
  - **Selection**: selecting text inside a rendered comment body shows a floating `Quote` button
    (`comment-quote-selection.tsx`) anchored to the selection; clicking it quotes exactly the
    selected fragment. The injected code "Copy" button is stripped from the cloned HTML.
  Either way the thread's reply composer opens pre-filled with a `blockquote` citing the source
  (bold author name + the quoted **HTML**, structure preserved). Because the quoted HTML can itself
  contain a `blockquote`, **quote-of-quote nests cleanly to any depth**. Reply/quote state lives in
  `CommentsPanel` (not per-thread) so the panel-level selection button can open any thread's
  composer; only one reply is open at a time. Replies stay single-level (always attached to the
  root); quoting a reply just seeds the citation. The composer is remounted (`key`) when the quoted
  source changes so the draft resets correctly.
- **Attachments**: paperclip button → hidden multi-file input, **or drag & drop** files onto the
  editor (a dashed "Drop files to attach" overlay appears while dragging, tracked with a drag-depth
  counter to avoid child-element flicker). The editor's `handleDOMEvents` returns `true` for file
  drags so ProseMirror's dropcursor (the insertion line) and default drop never engage — files are
  always treated as attachments, never inserted into the body. Newly added files show a
  **simulated upload progress**
  bar (per-chip percentage; image chips overlay the thumbnail) and **Send is disabled until all
  uploads finish**. Transient `status`/`progress` fields live only in the composer and are stripped
  before the attachment is persisted. Posted attachments render as chips under the comment (image =
  thumbnail, other = file chip with name + size). Images can additionally be embedded inline in the
  text via the editor's image button.
- **Mentions** render as styled inline chips; mentioned user ids are collected from the doc
  on submit.
- **System notices**: rendered author-less and visually distinct from comments — centered,
  muted, with a small tone icon (info/success/warning). Title + description, or a single line.
  Not interactive (no like/reply/menu). They sit in chronological order within the feed.
- **Likes**: a like button on each comment (and reply). With 0 likes only the icon shows (no
  "0"); the count renders once ≥ 1. `likedByMe` toggles fill/active state.
- **Edit own comment**: opens the composer **inline in place** with the existing content; on
  save the body is replaced and an "edited" marker appears next to the timestamp.
- **Delete own comment**: triggers an `alert-dialog` confirmation ("Delete comment? This can't
  be undone."). On confirm:
  - a **leaf** comment (reply, or a root without replies) is **removed** from the feed;
  - a **root with replies** becomes a **tombstone** — its author/body/attachments/like/menu
    are dropped and it renders a muted "Comment deleted" line, keeping the replies intact and
    correctly threaded. A tombstone has no actions and cannot be edited/liked/replied-to.
- **Actions menu** (`comment-actions-menu.tsx`): opened by **right-click anywhere on the
  comment** and by the **⋯ button top-right** (the button is always available; it makes the
  menu reachable on touch where right-click is awkward). Items by permission: Reply (roots),
  Edit + Delete (author only), Copy text (all). System notices and tombstones have no menu.
- Compact density, neutral palette, focus rings consistent with `Button`/`Input`.

### Adaptive / mobile

- The panel is fluid; `maxHeight` still bounds the scroll area, with a smaller default on
  small screens.
- Composer toolbar wraps and shows the most-used controls first; less-used controls collapse
  into a "more" menu on narrow widths. Send + attach stay visible.
- Mention dropdown and the actions menu are anchored/popovered so they stay on-screen on
  mobile.
- Reply indentation is reduced on small screens (thin guide line instead of large indent) to
  preserve reading width.
- Comment header wraps (name / role / time / edited) without overflow; the ⋯ trigger stays
  reachable. Touch targets ≥ 36px.
- Verified at representative widths (≈ 375 mobile, ≈ 768 tablet, desktop) before completion.

## Integration (this iteration)

- `news-article-page.tsx` swaps `NewsArticleComments` for `CommentsPanel` with
  `scope={{ type: "news", id: item.id }}`.
- Seed built from the existing `item.commentThread` (plain text wrapped in `<p>`), plus a few
  threaded replies, some likes, and 1–2 system notices for demo (e.g. "Article published",
  "Pinned by editorial team").
- `currentUser` = demo "Alexey Nazarov"; `mentionableUsers` from `EMPLOYEE_OPTIONS`.
- Remove the now-unused `news-article-comments.tsx`.

## Advanced features (Phases 0–8)

Built on top of the base module above. All client state stays per-`scope` and hydration-safe;
realtime and AI are **server-backed** (the app runs `output: "standalone"`, see
[next.config.ts](../../next.config.ts)).

### Status overview

| Area | Status | Key files |
|------|--------|-----------|
| Foundations: extended types, per-scope storage, deep-link, code-highlight bake | **done** | `comments-types.ts`, `comments-storage.ts`, `comment-code-enhance.ts` |
| Navigation/UX: hover toolbar, thread collapse, sort/filter, pin section, New-divider, skeletons, windowing, haptics | **done** | `comment-item.tsx`, `comment-thread.tsx`, `comments-panel.tsx`, `use-comments-state.ts` |
| Rich content: link previews, audio/video/screen recording + players | **done** | `comment-link-preview.tsx`, `app/api/comments/unfurl/route.ts`, `comment-recorder.tsx`, `comment-attachments.tsx` |
| Quotes & entities: multi-quote, `#task`/`#oms` mentions, convert-to-task | **done** | `comment-quote.ts`, `comment-entities.ts`, `comment-entity-mention.ts`, `comment-entity-list.tsx`, `comment-actions-menu.tsx` |
| Reactions / badges / read receipts | **done** | `comment-reactions.tsx`, `comment-item.tsx`, `use-comments-state.ts`, `comments-storage.ts` |
| Drafts / offline queue / scheduled send | **done** | `comment-composer.tsx`, `comments-storage.ts`, `use-comments-state.ts` |
| Realtime (Yjs): presence, typing, live record sync | **done** | `comments-collab.ts`, `comment-presence.tsx`, `comments-panel.tsx` |
| AI: rewrite/translate/TL;DR/soften + search | **done** | `app/api/comments/ai/route.ts`, `comments-ai-service.ts`, `comment-text.ts`, `comment-editor.tsx`, `comment-item.tsx`, `comments-panel.tsx` |

### Foundations (Phase 0)

- `comments-types.ts` extended: `reactions` (emoji → user ids), `pinned`,
  `readBy`, `badge` (author affiliation), `entityRefs`, `quotedRefs`,
  `scheduledAtIso`, `delivery`, plus draft/prefs/AI types.
- `comments-storage.ts`: hydration-safe per-`scope` localStorage via `useSyncExternalStore`
  (drafts, last-visit marker, read receipts, sort/filter prefs).
  Cross-tab + in-app writes notify a shared snapshot cache so getSnapshot stays stable.
- Deep-link: `#comment-<id>` scrolls to and flashes the target (`loadAll()` first so it isn't
  hidden behind pagination).
- Code-block enhancement reworked from a post-mount DOM mutation to a **pure string transform**
  (`enhanceCodeHtml`) + a delegated copy listener (`attachCodeCopy`), so highlighting/Copy
  survive re-renders and SSR.

### Navigation & UX (Phase 2)

- Hover toolbar on each comment (reaction picker + Reply) over the header.
- Long threads collapse older replies behind "Show N earlier replies".
- Panel toolbar: sort (oldest/newest/most-liked) + filters (Mine / Attachments),
  persisted in prefs; pinned threads in a dedicated top section; "New since last visit" divider.
- Skeleton rows during simulated lazy-load; `content-visibility:auto` windowing above a row
  threshold; `navigator.vibrate` haptics on like/reaction.

### Rich content (Phase 3)

- `comment-link-preview.tsx`: provider-specific embeds (YouTube/Loom/Figma/Vimeo) plus generic
  Open Graph cards fetched through the **unfurl Route Handler** (`app/api/comments/unfurl`),
  which does server-side fetch with a timeout, byte cap, and a best-effort SSRF guard.
- `comment-recorder.tsx`: record **audio** (`getUserMedia`) or **screen** (`getDisplayMedia`)
  via `MediaRecorder` into an attachment blob; `comment-attachments.tsx` renders native
  audio/video players for `audio`/`video` kinds.

### Quotes, entities, conversion (Phase 4)

- Multiple quotes in one reply (`buildQuotedHtmlMany` accumulates `QuoteSeed[]`).
- `#` entity mentions for tasks/orders: a second Tiptap suggestion (`EntityMention` +
  `comment-entity-list.tsx`) backed by a demo registry (`comment-entities.ts`); renders as a
  `.comment-entity` chip-link; ids collected via `collectEntityRefs`.
- "Convert to task" in the actions menu → demo toast with a generated `GP-xxxx` Tracker link.

### Reactions, badges, read receipts (Phase 5)

- Emoji reactions with counts and a "who reacted" tooltip (`comment-reactions.tsx`);
  `toggleReaction` in `use-comments-state.ts`. The "like" is the leading heart chip in the
  same reactions strip.
- Author badges (author / reporter / assignee) in the comment header.
- Read receipts ("Read by N").

### Drafts, offline, scheduled send (Phase 6)

- Draft autosave per `scope` + target (`root` / `reply:<id>`), debounced; restored on mount
  (unless the composer was seeded with a quote) and cleared on send/cancel. An unobtrusive
  **"Draft saved"** status (not a button) shows in the composer footer only while a draft is
  persisted.
- Offline send queue: new comments are `sending → sent` when online, `queued` when offline,
  `failed` on a retry while still offline; an `online` event flushes the queue; per-comment
  **Retry** affordance. Indicators render in the comment header.
- **Scheduled send**: the Send split-button offers presets; scheduled comments show a
  "Scheduled · <time>" badge and auto-publish via a 15s interval check.

### Realtime (Phase 7)

- `comments-collab.ts`: per-scope Yjs room `comments-<type>-<id>` (singleton `Y.Doc` +
  `WebsocketProvider`) modeled on the pricelists collab hook. Awareness carries presence +
  typing; a `Y.Map<id, CommentRecord>` mirrors comment records.
- Panel publishes only locally-changed records (tracked in a `synced` ref to avoid echo) and
  ingests remote records by id (`ingestRecords`, last-write-wins by JSON equality).
- `comment-presence.tsx`: header presence bar (live dot + avatar stack) and a composer-adjacent
  "X is typing…" line. **Graceful fallback**: when the collab server is unreachable everything
  is a no-op (empty presence, local-only state).
- Config: `NEXT_PUBLIC_COLLAB_WS_URL` (default `ws://127.0.0.1:1234`); ws server is the existing
  [scripts/collab-server.mjs](../../scripts/collab-server.mjs) (`npm run collab` / `npm run dev:collab`).

### AI (Phase 8, server-backed)

- `app/api/comments/ai/route.ts`: POSTs to an OpenAI-compatible `/chat/completions` endpoint
  using **server-only** env (`AI_BASE_URL`, `AI_API_KEY`, optional `AI_MODEL`). Returns `503
  not_configured` when env is absent. Supports improve / grammar / shorten / lengthen /
  summarize / tldr / translate / smart-reply / soften / toxicity.
- `comments-ai-service.ts`: single client entry (`runAiAction`) that calls the route and
  **falls back to a deterministic local mock** when the provider is unconfigured/unreachable,
  so the UI never blocks. `looksHostile`/`checkToxicity` back the soften flow.
- UI surfaces: editor AI-assist dropdown (now real service), per-comment **Translate** toggle,
  header **TL;DR** thread summary banner, **soften?** banner before sending a harsh-sounding
  comment, and toolbar **search** with safe in-body `<mark>` highlighting (`comment-text.ts`,
  `.comment-search-hit`).

### Environment configuration

| Variable | Scope | Purpose | Default |
|----------|-------|---------|---------|
| `NEXT_PUBLIC_COLLAB_WS_URL` | client | y-websocket endpoint for realtime presence + record sync | `ws://127.0.0.1:1234` |
| `AI_BASE_URL` | server-only | OpenAI-compatible base URL (without trailing `/chat/completions`) | `https://api.openai.com/v1` |
| `OPENAI_API_KEY` / `AI_API_KEY` | server-only | Bearer token for the AI provider (either name works) | — (AI disabled) |
| `AI_MODEL` | server-only | Model id for completions | `gpt-4o-mini` |

To enable real OpenAI, set `OPENAI_API_KEY` in `.env.local` (the base URL defaults to OpenAI).
Restart `next dev` after editing env. Without a key, AI features degrade to the local mock.

Without AI env, AI features degrade to the local mock; without the ws server, realtime degrades
to local-only with no presence.

### Risks / notes (advanced)

- Realtime is last-write-wins per record by JSON equality — no operational-transform merge of
  concurrent edits to the same comment; adequate for append-mostly discussions.
- The publish/ingest bridge guards against echo via a `synced` ref; if records grow large,
  consider publishing diffs instead of whole records.
- Unfurl/AI routes are `force-dynamic` and do outbound fetches — keep timeouts and the SSRF
  guard in place; AI input is capped (`MAX_INPUT_CHARS`).
- Search highlight only wraps text nodes (never tag/attribute content) so it can't corrupt the
  rendered HTML.

## Dependencies & checks

- New deps installed at latest **stable** versions (passes `check:deps`).
- English-only UI labels (`check:ui-english`).
- Avatars via `i.pravatar.cc` per static-images convention; no bundled image strings.
- `typecheck`, `lint`, `test` must stay green.

## Testing

- Unit (vitest + RTL): posting a root comment appends at the bottom; reply attaches under its
  root (single level); "Load earlier" reveals older threads; attachment chip renders for a
  selected file; mention ids are captured; editing an own comment replaces its body and sets
  the "edited" marker; like toggles count and hides "0" at zero; a system notice renders
  author-less with no actions; the actions menu opens via the ⋯ button and exposes
  Edit/Delete only for the author; deleting requires confirmation; deleting a leaf removes it
  while deleting a root with replies leaves a "Comment deleted" tombstone with the replies
  still present. Editor internals are smoke-tested (render + type), not deeply asserted.

## Risks / notes

- Tiptap + Next SSR: must render client-side only (`"use client"`, `immediatelyRender:false`).
- Object URLs should be revoked on unmount to avoid leaks.
- Keep `comment-editor.tsx` focused; if it grows, split toolbar/mention into their own files.
