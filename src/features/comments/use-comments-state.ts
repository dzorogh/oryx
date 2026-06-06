"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  CommentAttachment,
  CommentFeedItem,
  CommentFeedRow,
  CommentRecord,
  CommentUser,
  SystemNotification,
} from "@/features/comments/comments-types";
import { isComment } from "@/features/comments/comments-types";

export type NewCommentInput = {
  parentId: string | null;
  author: CommentUser;
  contentHtml: string;
  contentJson: CommentRecord["contentJson"];
  mentionIds: string[];
  attachments: CommentAttachment[];
};

export type EditCommentInput = {
  contentHtml: string;
  contentJson: CommentRecord["contentJson"];
  mentionIds: string[];
  attachments: CommentAttachment[];
};

const createId = (): string =>
  `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const sortByCreatedAtAsc = (a: CommentFeedItem, b: CommentFeedItem): number =>
  a.createdAtIso.localeCompare(b.createdAtIso);

type UseCommentsStateOptions = {
  initialItems: CommentFeedItem[];
  pageSize: number;
};

export type UseCommentsStateResult = {
  /** Root rows (system notices + thread groups) in chronological order, paginated. */
  visibleRows: CommentFeedRow[];
  totalCommentCount: number;
  hasEarlier: boolean;
  loadEarlier: () => void;
  addComment: (input: NewCommentInput) => void;
  editComment: (id: string, input: EditCommentInput) => void;
  removeComment: (id: string) => void;
  toggleLike: (id: string) => void;
};

export const useCommentsState = ({
  initialItems,
  pageSize,
}: UseCommentsStateOptions): UseCommentsStateResult => {
  const [items, setItems] = useState<CommentFeedItem[]>(() =>
    [...initialItems].sort(sortByCreatedAtAsc),
  );
  const [visibleRootCount, setVisibleRootCount] = useState(pageSize);

  const totalCommentCount = useMemo(
    () => items.filter((item) => isComment(item) && !item.deleted).length,
    [items],
  );

  /** Build ordered root rows; each comment thread carries its replies. */
  const allRows = useMemo<CommentFeedRow[]>(() => {
    const repliesByParent = new Map<string, CommentRecord[]>();
    for (const item of items) {
      if (isComment(item) && item.parentId) {
        const list = repliesByParent.get(item.parentId) ?? [];
        list.push(item);
        repliesByParent.set(item.parentId, list);
      }
    }

    const rows: CommentFeedRow[] = [];
    for (const item of items) {
      if (!isComment(item)) {
        rows.push({ kind: "system", notification: item as SystemNotification });
        continue;
      }
      if (item.parentId) {
        continue;
      }
      const replies = (repliesByParent.get(item.id) ?? []).sort(sortByCreatedAtAsc);
      // Drop tombstone roots that have no surviving replies (nothing to preserve).
      if (item.deleted && replies.length === 0) {
        continue;
      }
      rows.push({ kind: "thread", thread: { root: item, replies } });
    }
    return rows;
  }, [items]);

  const hasEarlier = allRows.length > visibleRootCount;

  const visibleRows = useMemo(
    () => (hasEarlier ? allRows.slice(allRows.length - visibleRootCount) : allRows),
    [allRows, hasEarlier, visibleRootCount],
  );

  const loadEarlier = useCallback(() => {
    setVisibleRootCount((current) => current + pageSize);
  }, [pageSize]);

  const addComment = useCallback((input: NewCommentInput) => {
    const record: CommentRecord = {
      kind: "comment",
      id: createId(),
      parentId: input.parentId,
      author: input.author,
      contentHtml: input.contentHtml,
      contentJson: input.contentJson,
      mentionIds: input.mentionIds,
      attachments: input.attachments,
      createdAtIso: new Date().toISOString(),
      likedByMe: false,
      likeCount: 0,
    };
    setItems((current) => [...current, record]);
    setVisibleRootCount((current) => current + 1);
  }, []);

  const editComment = useCallback((id: string, input: EditCommentInput) => {
    setItems((current) =>
      current.map((item) =>
        isComment(item) && item.id === id
          ? {
              ...item,
              contentHtml: input.contentHtml,
              contentJson: input.contentJson,
              mentionIds: input.mentionIds,
              attachments: input.attachments,
              editedAtIso: new Date().toISOString(),
            }
          : item,
      ),
    );
  }, []);

  const removeComment = useCallback((id: string) => {
    setItems((current) => {
      const target = current.find((item) => isComment(item) && item.id === id) as
        | CommentRecord
        | undefined;
      if (!target) {
        return current;
      }
      const hasReplies =
        target.parentId === null &&
        current.some((item) => isComment(item) && item.parentId === id && !item.deleted);

      if (hasReplies) {
        // Preserve the thread: turn the root into a tombstone.
        return current.map((item) =>
          isComment(item) && item.id === id
            ? {
                ...item,
                deleted: true,
                contentHtml: "",
                contentJson: { type: "doc", content: [] },
                mentionIds: [],
                attachments: [],
                likedByMe: false,
                likeCount: 0,
              }
            : item,
        );
      }

      // Leaf (reply, or root without replies): remove entirely.
      return current.filter((item) => !(isComment(item) && item.id === id));
    });
  }, []);

  const toggleLike = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) =>
        isComment(item) && item.id === id && !item.deleted
          ? {
              ...item,
              likedByMe: !item.likedByMe,
              likeCount: item.likeCount + (item.likedByMe ? -1 : 1),
            }
          : item,
      ),
    );
  }, []);

  return {
    visibleRows,
    totalCommentCount,
    hasEarlier,
    loadEarlier,
    addComment,
    editComment,
    removeComment,
    toggleLike,
  };
};
