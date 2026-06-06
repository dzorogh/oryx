import type { JSONContent } from "@tiptap/react";

/** A person who can author or be mentioned in a comment. */
export type CommentUser = {
  id: string;
  name: string;
  role?: string;
  avatarUrl: string;
};

export type CommentAttachmentKind = "image" | "file";

export type CommentAttachment = {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  /** Object URL in the demo (no real upload backend). */
  url: string;
  kind: CommentAttachmentKind;
};

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

export const isComment = (item: CommentFeedItem): item is CommentRecord =>
  item.kind === "comment";

export const isSystemNotification = (
  item: CommentFeedItem,
): item is SystemNotification => item.kind === "system";
