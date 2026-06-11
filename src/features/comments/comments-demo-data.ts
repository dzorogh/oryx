import type { JSONContent } from "@tiptap/react";
import { EMPLOYEE_OPTIONS } from "@/components/home/thanks-demo-data";
import { demoContentImageUrl } from "@/lib/demo-content-image";
import type { CalloutTone } from "@/features/comments/comment-callout";
import { getEntity } from "@/features/comments/comment-entities";
import type {
  CommentAttachment,
  CommentBadge,
  CommentEntityRef,
  CommentFeedItem,
  CommentReactions,
  CommentRecord,
  CommentUser,
} from "@/features/comments/comments-types";

const avatarFor = (id: string): string => `https://i.pravatar.cc/96?u=comment-${id}`;

/** Everyone who can author or be mentioned, derived from the shared employee roster. */
export const COMMENT_MENTIONABLE_USERS: CommentUser[] = EMPLOYEE_OPTIONS.map((employee) => ({
  id: employee.id,
  name: employee.fullName,
  role: employee.role,
  avatarUrl: avatarFor(employee.id),
}));

const usersById = new Map(COMMENT_MENTIONABLE_USERS.map((user) => [user.id, user]));

const requireUser = (id: string): CommentUser => {
  const user = usersById.get(id);
  if (!user) {
    throw new Error(`Unknown comment user: ${id}`);
  }
  return user;
};

const requireEntity = (id: string): CommentEntityRef => {
  const entity = getEntity(id);
  if (!entity) {
    throw new Error(`Unknown comment entity: ${id}`);
  }
  return entity;
};

/** Demo "me" — matches the article-page author identity. */
export const COMMENT_CURRENT_USER: CommentUser = requireUser("emp-12");

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Compact rich-content DSL for demo comments. Each block/run emits BOTH the display
 * HTML and the Tiptap JSON (kept consistent so editing a seeded comment works).
 */
type InlineRun =
  | string
  | { bold: string }
  | { italic: string }
  | { strike: string }
  | { underline: string }
  | { code: string }
  | { link: string; href: string }
  | { mention: string }
  | { entity: string };

type CheckItem = { text: InlineRun[]; done: boolean };

type ContentBlock =
  | { type: "p"; runs: InlineRun[] }
  | { type: "h"; level: 2 | 3; text: string }
  | { type: "ul"; items: InlineRun[][] }
  | { type: "ol"; items: InlineRun[][] }
  | { type: "check"; items: CheckItem[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "callout"; tone: CalloutTone; runs: InlineRun[] }
  | { type: "quote"; runs: InlineRun[] }
  | { type: "codeblock"; code: string };

const p = (...runs: InlineRun[]): ContentBlock => ({ type: "p", runs });
const h = (level: 2 | 3, text: string): ContentBlock => ({ type: "h", level, text });
const ul = (...items: InlineRun[][]): ContentBlock => ({ type: "ul", items });
const ol = (...items: InlineRun[][]): ContentBlock => ({ type: "ol", items });
const check = (...items: CheckItem[]): ContentBlock => ({ type: "check", items });
const done = (...text: InlineRun[]): CheckItem => ({ text, done: true });
const todo = (...text: InlineRun[]): CheckItem => ({ text, done: false });
const table = (header: string[], ...rows: string[][]): ContentBlock => ({
  type: "table",
  header,
  rows,
});
const callout = (tone: CalloutTone, ...runs: InlineRun[]): ContentBlock => ({
  type: "callout",
  tone,
  runs,
});
const quote = (...runs: InlineRun[]): ContentBlock => ({ type: "quote", runs });
const codeblock = (code: string): ContentBlock => ({ type: "codeblock", code });

const mentionIdOf = (run: InlineRun): string | null =>
  typeof run === "object" && "mention" in run ? run.mention : null;

const inlineHtml = (run: InlineRun): string => {
  if (typeof run === "string") return escapeHtml(run);
  if ("bold" in run) return `<strong>${escapeHtml(run.bold)}</strong>`;
  if ("italic" in run) return `<em>${escapeHtml(run.italic)}</em>`;
  if ("strike" in run) return `<s>${escapeHtml(run.strike)}</s>`;
  if ("underline" in run) return `<u>${escapeHtml(run.underline)}</u>`;
  if ("code" in run) return `<code>${escapeHtml(run.code)}</code>`;
  if ("link" in run)
    return `<a href="${escapeHtml(run.href)}" rel="noreferrer">${escapeHtml(run.link)}</a>`;
  if ("entity" in run) {
    const entity = requireEntity(run.entity);
    return `<a data-type="entityMention" class="comment-entity" data-id="${escapeHtml(
      entity.id,
    )}" data-label="${escapeHtml(entity.label)}" data-entity-type="${entity.type}" href="${escapeHtml(
      entity.href,
    )}" rel="noreferrer">#${escapeHtml(entity.id)}</a>`;
  }
  const user = requireUser(run.mention);
  return `<span class="comment-mention" data-type="mention" data-id="${user.id}">@${escapeHtml(
    user.name,
  )}</span>`;
};

const inlineJson = (run: InlineRun): JSONContent => {
  if (typeof run === "string") return { type: "text", text: run };
  if ("bold" in run) return { type: "text", text: run.bold, marks: [{ type: "bold" }] };
  if ("italic" in run) return { type: "text", text: run.italic, marks: [{ type: "italic" }] };
  if ("strike" in run) return { type: "text", text: run.strike, marks: [{ type: "strike" }] };
  if ("underline" in run)
    return { type: "text", text: run.underline, marks: [{ type: "underline" }] };
  if ("code" in run) return { type: "text", text: run.code, marks: [{ type: "code" }] };
  if ("link" in run)
    return { type: "text", text: run.link, marks: [{ type: "link", attrs: { href: run.href } }] };
  if ("entity" in run) {
    const entity = requireEntity(run.entity);
    return {
      type: "entityMention",
      attrs: {
        id: entity.id,
        label: entity.label,
        href: entity.href,
        entityType: entity.type,
      },
    };
  }
  const user = requireUser(run.mention);
  return { type: "mention", attrs: { id: user.id, label: user.name } };
};

type BuiltContent = {
  contentHtml: string;
  contentJson: JSONContent;
  mentionIds: string[];
};

const buildRichContent = (blocks: ContentBlock[]): BuiltContent => {
  const htmlParts: string[] = [];
  const jsonContent: JSONContent[] = [];
  const mentionIds = new Set<string>();
  const trackMentions = (runs: InlineRun[]) => {
    for (const run of runs) {
      const id = mentionIdOf(run);
      if (id) {
        mentionIds.add(id);
      }
    }
  };
  const listItemJson = (item: InlineRun[]): JSONContent => ({
    type: "listItem",
    content: [{ type: "paragraph", content: item.map(inlineJson) }],
  });
  const listItemHtml = (item: InlineRun[]): string =>
    `<li><p>${item.map(inlineHtml).join("")}</p></li>`;

  for (const block of blocks) {
    switch (block.type) {
      case "p":
        trackMentions(block.runs);
        htmlParts.push(`<p>${block.runs.map(inlineHtml).join("")}</p>`);
        jsonContent.push({ type: "paragraph", content: block.runs.map(inlineJson) });
        break;
      case "h":
        htmlParts.push(`<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`);
        jsonContent.push({
          type: "heading",
          attrs: { level: block.level },
          content: [{ type: "text", text: block.text }],
        });
        break;
      case "ul":
      case "ol": {
        const tag = block.type === "ul" ? "ul" : "ol";
        const nodeType = block.type === "ul" ? "bulletList" : "orderedList";
        block.items.forEach(trackMentions);
        htmlParts.push(`<${tag}>${block.items.map(listItemHtml).join("")}</${tag}>`);
        jsonContent.push({ type: nodeType, content: block.items.map(listItemJson) });
        break;
      }
      case "check": {
        block.items.forEach((item) => trackMentions(item.text));
        const itemsHtml = block.items
          .map(
            (item) =>
              `<li data-type="taskItem" data-checked="${item.done}"><label><input type="checkbox"${item.done ? " checked" : ""
              }><span></span></label><div><p>${item.text.map(inlineHtml).join("")}</p></div></li>`,
          )
          .join("");
        htmlParts.push(`<ul data-type="taskList">${itemsHtml}</ul>`);
        jsonContent.push({
          type: "taskList",
          content: block.items.map((item) => ({
            type: "taskItem",
            attrs: { checked: item.done },
            content: [{ type: "paragraph", content: item.text.map(inlineJson) }],
          })),
        });
        break;
      }
      case "table": {
        const headerHtml = block.header.map((cell) => `<th><p>${escapeHtml(cell)}</p></th>`).join("");
        const rowsHtml = block.rows
          .map(
            (row) => `<tr>${row.map((cell) => `<td><p>${escapeHtml(cell)}</p></td>`).join("")}</tr>`,
          )
          .join("");
        htmlParts.push(`<table><tbody><tr>${headerHtml}</tr>${rowsHtml}</tbody></table>`);
        const cellJson = (cell: string, header: boolean): JSONContent => ({
          type: header ? "tableHeader" : "tableCell",
          content: [{ type: "paragraph", content: cell ? [{ type: "text", text: cell }] : [] }],
        });
        jsonContent.push({
          type: "table",
          content: [
            { type: "tableRow", content: block.header.map((cell) => cellJson(cell, true)) },
            ...block.rows.map((row) => ({
              type: "tableRow",
              content: row.map((cell) => cellJson(cell, false)),
            })),
          ],
        });
        break;
      }
      case "callout":
        trackMentions(block.runs);
        htmlParts.push(
          `<div data-callout data-tone="${block.tone}" class="comment-callout"><p>${block.runs
            .map(inlineHtml)
            .join("")}</p></div>`,
        );
        jsonContent.push({
          type: "callout",
          attrs: { tone: block.tone },
          content: [{ type: "paragraph", content: block.runs.map(inlineJson) }],
        });
        break;
      case "quote":
        trackMentions(block.runs);
        htmlParts.push(`<blockquote><p>${block.runs.map(inlineHtml).join("")}</p></blockquote>`);
        jsonContent.push({
          type: "blockquote",
          content: [{ type: "paragraph", content: block.runs.map(inlineJson) }],
        });
        break;
      case "codeblock":
        htmlParts.push(`<pre><code>${escapeHtml(block.code)}</code></pre>`);
        jsonContent.push({ type: "codeBlock", content: [{ type: "text", text: block.code }] });
        break;
    }
  }

  return {
    contentHtml: htmlParts.join(""),
    contentJson: { type: "doc", content: jsonContent },
    mentionIds: [...mentionIds],
  };
};

/** Single-paragraph content, optionally prefixed with a mention. */
const buildPlainContent = (text: string, mentionId?: string): BuiltContent => {
  const runs: InlineRun[] = mentionId ? [{ mention: mentionId }, ` ${text}`] : [text];
  return buildRichContent([p(...runs)]);
};

const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString();

type SeedAttachment = {
  kind: "image" | "file";
  name: string;
  sizeBytes: number;
  mimeType: string;
  imageSeed?: string;
};

type SeedComment = {
  id: string;
  authorId: string;
  parentId: string | null;
  /** Simple single-paragraph text (ignored when `blocks` is set). */
  text?: string;
  mentionId?: string;
  /** Rich multi-block content (headings, lists, quote, code, links, mentions). */
  blocks?: ContentBlock[];
  attachments?: SeedAttachment[];
  /** Tombstone demo: a removed root kept only to preserve its reply thread. */
  deleted?: boolean;
  minutesAgo: number;
  likeCount?: number;
  likedByMe?: boolean;
  pinned?: boolean;
  badge?: CommentBadge;
  /** Emoji → author ids who reacted. */
  reactions?: CommentReactions;
  /** Author ids who have read this comment. */
  readBy?: string[];
};

const SEED_COMMENTS: SeedComment[] = [
  {
    id: "root-0a",
    authorId: "emp-2",
    parentId: null,
    text: "First! Bookmarking this — we have been waiting for an official word on the change for a while.",
    minutesAgo: 1450,
    likeCount: 9,
  },
  {
    // Edge case: rich markup — headings, bold/italic/underline/strike, code, links,
    // lists, ordered list, quote, code block, and an inline mention.
    id: "root-rich",
    authorId: "emp-9",
    parentId: null,
    minutesAgo: 1400,
    likeCount: 18,
    badge: "reporter",
    reactions: { "👍": ["emp-2", "emp-4", "emp-7"], "🚀": ["emp-6"] },
    readBy: ["emp-2", "emp-4", "emp-6", "emp-7", "emp-8"],
    blocks: [
      p(
        "Sharing a quick ",
        { bold: "summary" },
        " of how this affects ",
        { italic: "marketing" },
        " workflows — most of it is ",
        { underline: "good news" },
        ".",
      ),
      h(3, "What changes for us"),
      ul(
        [
          "Campaign asset requests now go through ",
          { link: "Service Desk", href: "https://example.com/service-desk" },
          ".",
        ],
        ["Legacy email aliases are ", { strike: "still active" }, " deprecated next month."],
        ["Ping ", { mention: "emp-7" }, " if you need an urgent exception."],
      ),
      h(3, "How to file a request"),
      ol(
        ["Open a ticket with the ", { code: "marketing-assets" }, " template."],
        ["Attach the brief and the target launch date."],
        ["Track the status in the portal."],
      ),
      quote(
        "We are not adding process for its own sake — we are removing the steps that slow people down.",
      ),
      p("Minimal request payload for the API folks:"),
      codeblock('{\n  "type": "asset_request",\n  "priority": "normal"\n}'),
    ],
  },
  {
    // Edge case: structured blocks — callout, checklist, and a small table.
    id: "root-blocks",
    authorId: "emp-12",
    parentId: null,
    minutesAgo: 1380,
    likeCount: 13,
    pinned: true,
    badge: "author",
    reactions: { "🎉": ["emp-1", "emp-5"], "❤️": ["emp-7", "emp-8", "emp-10"] },
    blocks: [
      callout(
        "info",
        "Rollout is staged by region — check the table below before you migrate anything.",
      ),
      h(3, "Pre-migration checklist"),
      check(
        done("Inventory integrations still calling the legacy endpoints"),
        done("Notify owners of the ", { code: "marketing-assets" }, " queue"),
        todo("Dry-run the request template in staging"),
        todo("Schedule the cutover window with ", { mention: "emp-6" }),
      ),
      h(3, "Regional schedule"),
      table(
        ["Region", "Wave", "Cutover"],
        ["EU", "1", "Jun 9"],
        ["US", "2", "Jun 16"],
        ["APAC", "3", "Jun 23"],
      ),
      callout(
        "warning",
        "Freeze non-urgent changes 24h before your region's cutover to keep the audit trail clean.",
      ),
    ],
  },
  {
    // Edge case: long multi-paragraph comment (tests wrapping and density).
    id: "root-long",
    authorId: "emp-6",
    parentId: null,
    minutesAgo: 1360,
    likeCount: 11,
    blocks: [
      p(
        "I want to add some context from the infrastructure side, because a few people in the hallway told me they are worried this will slow delivery down. It won't — and I think it's worth explaining the reasoning in a bit of detail so the decision doesn't feel arbitrary.",
      ),
      p(
        "Over the last quarter we measured how long requests actually spent waiting in each intake channel. The uncomfortable truth is that the email and chat paths looked fast on the surface, but they hid a lot of invisible queueing: messages got buried, ownership was ambiguous, and the same question was often answered three times by three different people. When we added up that rework, the supposedly slower ticket flow was consistently finishing the same class of request a full day earlier on average.",
      ),
      p(
        "The Service Desk flow also gives us something the ad-hoc channels never could: a paper trail. If a request stalls, we can see exactly where and why, instead of guessing. That visibility is what lets us promise the new SLAs with a straight face, and it's what will let us tighten them further once the rollout settles.",
      ),
      p(
        "So please don't read this as more bureaucracy. It's the opposite — we are trading a pile of informal, untracked back-and-forth for one predictable place to ask, with clear ownership and a status you can actually point your manager to. Happy to walk anyone through the numbers if you're skeptical.",
      ),
    ],
  },
  {
    // Edge case: a busy thread with many replies under one root.
    id: "root-thread",
    authorId: "emp-4",
    parentId: null,
    minutesAgo: 1300,
    likeCount: 5,
    reactions: { "👍": ["emp-6", "emp-8"] },
    text: "Question that probably affects a lot of teams: how does this interact with the existing on-call rotation? Tagging a few people who would know.",
  },
  {
    id: "reply-th-1",
    authorId: "emp-6",
    parentId: "root-thread",
    text: "On-call still pages the same way — only the intake for non-urgent work moves to Service Desk.",
    mentionId: "emp-4",
    minutesAgo: 1295,
    likeCount: 6,
  },
  {
    id: "reply-th-2",
    authorId: "emp-10",
    parentId: "root-thread",
    text: "So a P1 at 3am does not require opening a ticket first, right? Just want to be 100% sure.",
    minutesAgo: 1288,
  },
  {
    id: "reply-th-3",
    authorId: "emp-6",
    parentId: "root-thread",
    text: "Correct. Incidents follow the incident process; the ticket is created automatically afterwards for the record.",
    mentionId: "emp-10",
    minutesAgo: 1284,
    likeCount: 4,
  },
  {
    id: "reply-th-4",
    authorId: "emp-8",
    parentId: "root-thread",
    text: "This is the part I was most worried about. Glad it's unchanged.",
    minutesAgo: 1280,
    likeCount: 2,
  },
  {
    id: "reply-th-5",
    authorId: "emp-7",
    parentId: "root-thread",
    text: "Can we get this exact clarification into the FAQ? It will come up constantly.",
    minutesAgo: 1276,
    likeCount: 8,
  },
  {
    id: "reply-th-6",
    authorId: "emp-12",
    parentId: "root-thread",
    text: "Adding it now — good catch.",
    mentionId: "emp-7",
    minutesAgo: 1270,
    likedByMe: true,
    likeCount: 3,
  },
  {
    id: "reply-th-7",
    authorId: "emp-2",
    parentId: "root-thread",
    text: "Logistics has a similar rotation — assuming the same logic applies to us?",
    minutesAgo: 1264,
  },
  {
    id: "reply-th-8",
    authorId: "emp-4",
    parentId: "root-thread",
    text: "Yes, same logic for every rotation. Thanks everyone, this answers my question.",
    minutesAgo: 1258,
    likeCount: 1,
  },
  {
    // Edge case: a deleted root that still has replies (tombstone keeps the thread).
    id: "root-tomb",
    authorId: "emp-3",
    parentId: null,
    deleted: true,
    minutesAgo: 1240,
  },
  {
    id: "reply-tomb-1",
    authorId: "emp-7",
    parentId: "root-tomb",
    text: "Not sure why the comment above was removed, but the point about quarterly access reviews still stands.",
    minutesAgo: 1232,
    likeCount: 4,
  },
  {
    id: "reply-tomb-2",
    authorId: "emp-8",
    parentId: "root-tomb",
    text: "agreed — let's make sure that part lands in the FAQ.",
    mentionId: "emp-7",
    minutesAgo: 1228,
  },
  {
    // Edge case: a comment carrying attachments (image thumbnail + file chip).
    id: "root-attach",
    authorId: "emp-1",
    parentId: null,
    minutesAgo: 600,
    likeCount: 8,
    text: "Here is the before/after dashboard and the full rollout schedule for reference.",
    attachments: [
      {
        kind: "image",
        name: "dashboard-before-after.png",
        sizeBytes: 384_000,
        mimeType: "image/png",
        imageSeed: "comments-dashboard",
      },
      {
        kind: "file",
        name: "rollout-schedule.pdf",
        sizeBytes: 1_280_000,
        mimeType: "application/pdf",
      },
    ],
  },
  {
    id: "root-0b",
    authorId: "emp-7",
    parentId: null,
    text: "Could we get a short FAQ pinned somewhere? Support is already getting questions about it.",
    minutesAgo: 1320,
    likeCount: 21,
  },
  {
    id: "reply-0b",
    authorId: "emp-12",
    parentId: "root-0b",
    minutesAgo: 1290,
    likeCount: 5,
    blocks: [
      p(
        { mention: "emp-7" },
        " good idea — tracking it in ",
        { entity: "GP-2356" },
        ", I'll link the FAQ from the article once it's published.",
      ),
    ],
  },
  {
    id: "root-0c",
    authorId: "emp-10",
    parentId: null,
    text: "Will the QA environment follow the same flow, or is this production-only for now?",
    minutesAgo: 1100,
  },
  {
    id: "root-0d",
    authorId: "emp-8",
    parentId: null,
    text: "Appreciate the heads-up. Operations will update the internal runbooks accordingly.",
    minutesAgo: 920,
    likeCount: 4,
  },
  {
    id: "root-0e",
    authorId: "emp-11",
    parentId: null,
    text: "Does this affect procurement tickets too, or only IT requests?",
    minutesAgo: 760,
  },
  {
    id: "reply-0e",
    authorId: "emp-1",
    parentId: "root-0e",
    text: "only IT requests for now — procurement keeps its current process.",
    mentionId: "emp-11",
    minutesAgo: 700,
    likeCount: 2,
  },
  {
    id: "root-0f",
    authorId: "emp-9",
    parentId: null,
    text: "The staged rollout approach is reassuring. Nice to see change management done right.",
    minutesAgo: 540,
    likeCount: 7,
  },
  {
    id: "root-1",
    authorId: "emp-5",
    parentId: null,
    text: "Clear and to the point — thanks for sharing this ahead of the rollout. Looking forward to the details.",
    minutesAgo: 320,
    likeCount: 14,
  },
  {
    id: "reply-1",
    authorId: "emp-6",
    parentId: "root-1",
    text: "agreed, the timeline finally makes sense now.",
    mentionId: "emp-5",
    minutesAgo: 295,
    likeCount: 3,
  },
  {
    id: "root-2",
    authorId: "emp-1",
    parentId: null,
    text: "Will the migration guide cover the legacy endpoints too? We still have a few integrations on the old API.",
    minutesAgo: 180,
    likeCount: 6,
  },
  {
    id: "reply-2",
    authorId: "emp-12",
    parentId: "root-2",
    text: "yes — there's a dedicated section for that, I'll link it once it's published.",
    mentionId: "emp-1",
    minutesAgo: 150,
  },
  {
    id: "root-link",
    authorId: "emp-5",
    parentId: null,
    minutesAgo: 70,
    likeCount: 3,
    blocks: [
      p(
        "Recorded a 2-minute walkthrough of the new request flow — worth a watch before the cutover: ",
        {
          link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
      ),
    ],
  },
  {
    id: "root-3",
    authorId: "emp-9",
    parentId: null,
    text: "Great write-up. The before/after numbers are genuinely impressive.",
    minutesAgo: 40,
    likeCount: 2,
    likedByMe: true,
  },
];

const buildAttachment = (
  scopeId: string,
  commentId: string,
  index: number,
  attachment: SeedAttachment,
): CommentAttachment => ({
  id: `${scopeId}-${commentId}-att-${index + 1}`,
  name: attachment.name,
  sizeBytes: attachment.sizeBytes,
  mimeType: attachment.mimeType,
  url:
    attachment.kind === "image"
      ? demoContentImageUrl(attachment.imageSeed ?? `${commentId}-${index}`, 640, 480)
      : "#",
  kind: attachment.kind,
});

const buildSeedComment = (scopeId: string, seed: SeedComment): CommentRecord => {
  const content = seed.blocks
    ? buildRichContent(seed.blocks)
    : buildPlainContent(seed.text ?? "", seed.mentionId);
  const attachments = (seed.attachments ?? []).map((attachment, index) =>
    buildAttachment(scopeId, seed.id, index, attachment),
  );
  return {
    kind: "comment",
    id: `${scopeId}-${seed.id}`,
    parentId: seed.parentId ? `${scopeId}-${seed.parentId}` : null,
    author: requireUser(seed.authorId),
    contentHtml: seed.deleted ? "" : content.contentHtml,
    contentJson: seed.deleted ? { type: "doc", content: [] } : content.contentJson,
    mentionIds: seed.deleted ? [] : content.mentionIds,
    attachments: seed.deleted ? [] : attachments,
    createdAtIso: minutesAgo(seed.minutesAgo),
    deleted: seed.deleted,
    likedByMe: seed.deleted ? false : (seed.likedByMe ?? false),
    likeCount: seed.deleted ? 0 : (seed.likeCount ?? 0),
    pinned: seed.deleted ? false : seed.pinned,
    badge: seed.deleted ? undefined : seed.badge,
    reactions: seed.deleted ? undefined : seed.reactions,
    readBy: seed.deleted ? undefined : seed.readBy,
  };
};

/** Demo feed: a few threaded comments plus interleaved author-less system notices. */
export const buildCommentSeed = (scopeId: string): CommentFeedItem[] => {
  const comments = SEED_COMMENTS.map((seed) => buildSeedComment(scopeId, seed));
  const notices: CommentFeedItem[] = [
    {
      kind: "system",
      id: `${scopeId}-sys-published`,
      tone: "success",
      title: "Article published",
      description: "This article is now visible to the whole company.",
      createdAtIso: minutesAgo(360),
    },
    {
      kind: "system",
      id: `${scopeId}-sys-archive`,
      tone: "warning",
      title: "Heads up",
      description: "Comments older than 90 days are archived automatically.",
      createdAtIso: minutesAgo(1180),
    },
    {
      kind: "system",
      id: `${scopeId}-sys-pinned`,
      tone: "info",
      title: "Pinned by the editorial team",
      createdAtIso: minutesAgo(120),
    },
  ];
  return [...comments, ...notices];
};
