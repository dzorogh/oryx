import type { JSONContent } from "@tiptap/react";

/** A person who can author or be mentioned in a comment. */
export type CommentUser = {
  id: string;
  name: string;
  role?: string;
  avatarUrl: string;
};

export type CommentAttachmentKind = "image" | "file" | "audio" | "video";

export type CommentAttachment = {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  /** Object URL in the demo (no real upload backend). */
  url: string;
  kind: CommentAttachmentKind;
  /**
   * Transient upload state used only by the composer while a freshly added file
   * is "uploading" (demo simulation). Omitted once the comment is persisted.
   */
  status?: "uploading" | "ready";
  /** Upload progress 0–100 while `status === "uploading"`. */
  progress?: number;
};

/** Emoji reactions: emoji glyph → ids of the users who reacted with it. */
export type CommentReactions = Record<string, string[]>;

/** Role badge shown next to an author (drives trust/affiliation hints). */
export type CommentBadge = "author" | "reporter" | "assignee";

/** A reference to a business entity mentioned via `#` (task/order). */
export type CommentEntityRef = {
  id: string;
  type: "task" | "oms";
  label: string;
  href: string;
};

/** Delivery state used by the optimistic / offline send queue. */
export type CommentDeliveryStatus = "sent" | "sending" | "queued" | "failed" | "scheduled";

/** A user-authored comment. Replies always reference a ROOT comment (single nesting level). */
export type CommentRecord = {
  kind: "comment";
  id: string;
  parentId: string | null;
  author: CommentUser;
  contentHtml: string;
  contentJson: JSONContent;
  mentionIds: string[];
  attachments: CommentAttachment[];
  createdAtIso: string;
  /** Set when the author edits; drives the "edited" marker. */
  editedAtIso?: string;
  /** Tombstone kept only to preserve a reply thread after deletion. */
  deleted?: boolean;
  likedByMe: boolean;
  /** When 0 we render only the like button (no "0"). */
  likeCount: number;
  /** Emoji reactions beyond the basic like (emoji → user ids). */
  reactions?: CommentReactions;
  /** Pinned root comments float to a dedicated section at the top. */
  pinned?: boolean;
  /** User ids who have read this comment (drives "read by N"). */
  readBy?: string[];
  /** Affiliation badge for the author within this scope. */
  badge?: CommentBadge;
  /** Business entities referenced via `#` mentions. */
  entityRefs?: CommentEntityRef[];
  /** Ids of the comments this comment quotes (for back-references). */
  quotedRefs?: string[];
  /** ISO time the comment is scheduled to publish (drives the "Scheduled" badge). */
  scheduledAtIso?: string;
  /** Optimistic / offline delivery state. Absent means already "sent". */
  delivery?: CommentDeliveryStatus;
};

/** Supported AI transforms exposed by `/api/comments/ai` and the client service. */
export type CommentAiAction =
  | "improve"
  | "grammar"
  | "shorten"
  | "lengthen"
  | "summarize"
  | "tldr"
  | "translate"
  | "smart-reply"
  | "soften"
  | "toxicity";

/** Request body for the AI route handler. */
export type CommentAiRequest = {
  action: CommentAiAction;
  text: string;
  /** Target language for `translate` (e.g. "English", "Russian"). */
  targetLang?: string;
};

/** Result envelope from the AI service (server or local mock fallback). */
export type CommentAiResult = {
  result: string;
  /** "ai" when the configured provider answered, "mock" for the offline heuristic. */
  source: "ai" | "mock";
};

/** Open Graph link-preview payload returned by `/api/comments/unfurl`. */
export type UnfurlResult = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

/** An unsent composer draft, persisted per scope + target so it survives reloads. */
export type CommentDraft = {
  contentJson: JSONContent;
  updatedAtIso: string;
};

/** A personal canned reply (saved snippet) the user can quickly insert. */
export type CommentSavedReply = {
  id: string;
  title: string;
  contentJson: JSONContent;
};

export type CommentTone = "info" | "success" | "warning";

/** Author-less, system-generated timeline entry. */
export type SystemNotification = {
  kind: "system";
  id: string;
  tone?: CommentTone;
  /** At least one of title/description must be present. */
  title?: string;
  description?: string;
  createdAtIso: string;
};

/** The timeline is an ordered mix of user comments and system notices. */
export type CommentFeedItem = CommentRecord | SystemNotification;

/** Identifies the thread a panel is bound to (e.g. a news article, task, or order). */
export type CommentScope = {
  type: string;
  id: string;
};

/** A root comment together with its (single-level) replies. */
export type CommentThreadGroup = {
  root: CommentRecord;
  replies: CommentRecord[];
};

/** A renderable feed row: either a system notice or a comment thread group. */
export type CommentFeedRow =
  | { kind: "system"; notification: SystemNotification }
  | { kind: "thread"; thread: CommentThreadGroup };

/** Ordering applied to root threads in the feed. */
export type CommentSort = "oldest" | "newest" | "popular";

/** Optional feed filters (combine with AND). */
export type CommentFilters = {
  mineOnly: boolean;
  withAttachments: boolean;
};

/** Persisted per-scope view preferences. */
export type CommentPrefs = {
  sort: CommentSort;
  filters: CommentFilters;
};

export const DEFAULT_COMMENT_PREFS: CommentPrefs = {
  sort: "oldest",
  filters: { mineOnly: false, withAttachments: false },
};

export const isComment = (item: CommentFeedItem): item is CommentRecord =>
  item.kind === "comment";

export const isSystemNotification = (
  item: CommentFeedItem,
): item is SystemNotification => item.kind === "system";
