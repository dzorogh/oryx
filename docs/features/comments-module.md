# Comments module (reusable)

Reusable, business-grade discussion module. First integrated on the Pulse News article
page, designed to drop into business sections later (Tracker tasks, Store orders) with no
behavioral changes — only a different `scope` and seed data.

> Status: **implemented** (first integration: Pulse News article page).

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
| `comment-thread.tsx` | One root comment + its replies + inline reply composer toggle. |
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
- `@tiptap/starter-kit` (bold, italic, strike, code, headings, bullet/ordered list,
  blockquote, code block, history)
- `@tiptap/extension-placeholder`
- `@tiptap/extension-link`
- `@tiptap/extension-underline`
- `@tiptap/extension-image` (inline images only)
- `@tiptap/extension-mention` (+ built-in suggestion) for `@`-mentions

Compact fixed toolbar: bold / italic / underline / strike · H2 / H3 · bullet / ordered list ·
quote / code · link · image. `@` opens the mention dropdown. SSR-safe via
`immediatelyRender: false`.

> Slash (`/`) command menu is **optional / phase 2** — the fixed toolbar + `@`-mentions cover
> the required functionality without it.

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
- **Attachments**: paperclip button → hidden multi-file input → pending chips above Send;
  posted attachments render as chips under the comment (image = thumbnail, other = file chip
  with name + size). Images can additionally be embedded inline in the text via the editor's
  image button.
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
