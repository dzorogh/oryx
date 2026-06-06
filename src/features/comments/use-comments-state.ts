"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CommentAttachment,
  CommentDeliveryStatus,
  CommentEntityRef,
  CommentFeedItem,
  CommentFeedRow,
  CommentFilters,
  CommentRecord,
  CommentSort,
  CommentUser,
  SystemNotification,
} from "@/features/comments/comments-types";
import { DEFAULT_COMMENT_PREFS, isComment } from "@/features/comments/comments-types";

/** Demo delay before an optimistic "sending" comment flips to "sent". */
const SEND_SETTLE_MS = 700;

const isOffline = (): boolean =>
  typeof navigator !== "undefined" && navigator.onLine === false;

export type NewCommentInput = {
  parentId: string | null;
  author: CommentUser;
  contentHtml: string;
  contentJson: CommentRecord["contentJson"];
  mentionIds: string[];
  attachments: CommentAttachment[];
  entityRefs?: CommentEntityRef[];
  quotedRefs?: string[];
  /** ISO time to publish later; sets a "scheduled" delivery state until due. */
  scheduledAtIso?: string;
};

export type EditCommentInput = {
  contentHtml: string;
  contentJson: CommentRecord["contentJson"];
  mentionIds: string[];
  attachments: CommentAttachment[];
  entityRefs?: CommentEntityRef[];
};

const createId = (): string =>
  `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const sortByCreatedAtAsc = (a: CommentFeedItem, b: CommentFeedItem): number =>
  a.createdAtIso.localeCompare(b.createdAtIso);

type UseCommentsStateOptions = {
  initialItems: CommentFeedItem[];
  pageSize: number;
  /** Used to attribute likes/reactions/read receipts. */
  currentUserId?: string;
  sort?: CommentSort;
  filters?: CommentFilters;
};

export type UseCommentsStateResult = {
  /** Root rows (system notices + thread groups) after sort/filter, paginated. */
  visibleRows: CommentFeedRow[];
  /** Pinned root threads, always shown above the feed (not paginated). */
  pinnedRows: CommentFeedRow[];
  totalCommentCount: number;
  /** Total root rows that match the current filter (before pagination). */
  filteredRootCount: number;
  hasEarlier: boolean;
  loadEarlier: () => void;
  loadAll: () => void;
  addComment: (input: NewCommentInput) => string;
  editComment: (id: string, input: EditCommentInput) => void;
  removeComment: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleReaction: (id: string, emoji: string) => void;
  togglePinned: (id: string) => void;
  markRead: (ids: string[]) => void;
  /** Re-attempt delivery of a queued/failed comment. */
  retryComment: (id: string) => void;
  /** All comment records (excludes system notices) — used to publish to peers. */
  comments: CommentRecord[];
  /** Upsert records that arrived from realtime peers (by id). */
  ingestRecords: (records: CommentRecord[]) => void;
};

const rootHasAttachments = (root: CommentRecord, replies: CommentRecord[]): boolean =>
  root.attachments.length > 0 || replies.some((reply) => reply.attachments.length > 0);

export const useCommentsState = ({
  initialItems,
  pageSize,
  currentUserId = "",
  sort = DEFAULT_COMMENT_PREFS.sort,
  filters = DEFAULT_COMMENT_PREFS.filters,
}: UseCommentsStateOptions): UseCommentsStateResult => {
  const [items, setItems] = useState<CommentFeedItem[]>(() =>
    [...initialItems].sort(sortByCreatedAtAsc),
  );
  const [visibleRootCount, setVisibleRootCount] = useState(pageSize);
  const sendTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timers = sendTimersRef.current;
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const setDelivery = useCallback((id: string, delivery: CommentDeliveryStatus) => {
    setItems((current) =>
      current.map((item) =>
        isComment(item) && item.id === id ? { ...item, delivery } : item,
      ),
    );
  }, []);

  /** Optimistically settle a "sending" comment to "sent" after a short delay. */
  const scheduleSettle = useCallback(
    (id: string) => {
      const timer = setTimeout(() => {
        sendTimersRef.current.delete(timer);
        setDelivery(id, "sent");
      }, SEND_SETTLE_MS);
      sendTimersRef.current.add(timer);
    },
    [setDelivery],
  );

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

  // Pinned threads are pulled out and shown above the (sorted/filtered) feed.
  const pinnedRows = useMemo<CommentFeedRow[]>(
    () => allRows.filter((row) => row.kind === "thread" && row.thread.root.pinned),
    [allRows],
  );

  const matchesFilters = useCallback(
    (row: CommentFeedRow): boolean => {
      if (row.kind !== "thread") {
        // System notices are kept unless a comment-only filter is active.
        return !(filters.mineOnly || filters.withAttachments);
      }
      const { root, replies } = row.thread;
      if (root.pinned) {
        return false; // shown in the pinned section instead
      }
      if (filters.mineOnly && root.author.id !== currentUserId) {
        return false;
      }
      if (filters.withAttachments && !rootHasAttachments(root, replies)) {
        return false;
      }
      return true;
    },
    [filters, currentUserId],
  );

  const sortedFilteredRows = useMemo<CommentFeedRow[]>(() => {
    const filtered = allRows.filter(matchesFilters);
    if (sort === "oldest") {
      return filtered;
    }
    const compare = (a: CommentFeedRow, b: CommentFeedRow): number => {
      const aTime = a.kind === "thread" ? a.thread.root.createdAtIso : a.notification.createdAtIso;
      const bTime = b.kind === "thread" ? b.thread.root.createdAtIso : b.notification.createdAtIso;
      if (sort === "popular") {
        const aLikes = a.kind === "thread" ? a.thread.root.likeCount : 0;
        const bLikes = b.kind === "thread" ? b.thread.root.likeCount : 0;
        if (aLikes !== bLikes) {
          return bLikes - aLikes;
        }
        return bTime.localeCompare(aTime);
      }
      // newest
      return bTime.localeCompare(aTime);
    };
    return [...filtered].sort(compare);
  }, [allRows, matchesFilters, sort]);

  const filteredRootCount = sortedFilteredRows.length;
  const hasEarlier = sortedFilteredRows.length > visibleRootCount;

  const visibleRows = useMemo(
    () =>
      hasEarlier
        ? sortedFilteredRows.slice(sortedFilteredRows.length - visibleRootCount)
        : sortedFilteredRows,
    [sortedFilteredRows, hasEarlier, visibleRootCount],
  );

  const loadEarlier = useCallback(() => {
    setVisibleRootCount((current) => current + pageSize);
  }, [pageSize]);

  const loadAll = useCallback(() => {
    setVisibleRootCount(Number.MAX_SAFE_INTEGER);
  }, []);

  const addComment = useCallback(
    (input: NewCommentInput): string => {
      const id = createId();
      const scheduled = input.scheduledAtIso
        ? new Date(input.scheduledAtIso).getTime() > Date.now()
        : false;
      const delivery: CommentDeliveryStatus = scheduled
        ? "scheduled"
        : isOffline()
          ? "queued"
          : "sending";
      const record: CommentRecord = {
        kind: "comment",
        id,
        parentId: input.parentId,
        author: input.author,
        contentHtml: input.contentHtml,
        contentJson: input.contentJson,
        mentionIds: input.mentionIds,
        attachments: input.attachments,
        createdAtIso: new Date().toISOString(),
        likedByMe: false,
        likeCount: 0,
        readBy: input.author.id ? [input.author.id] : [],
        entityRefs: input.entityRefs,
        quotedRefs: input.quotedRefs,
        scheduledAtIso: scheduled ? input.scheduledAtIso : undefined,
        delivery,
      };
      setItems((current) => [...current, record]);
      setVisibleRootCount((current) =>
        current === Number.MAX_SAFE_INTEGER ? current : current + 1,
      );
      if (delivery === "sending") {
        scheduleSettle(id);
      }
      return id;
    },
    [scheduleSettle],
  );

  const retryComment = useCallback(
    (id: string) => {
      if (isOffline()) {
        setDelivery(id, "failed");
        return;
      }
      setDelivery(id, "sending");
      scheduleSettle(id);
    },
    [setDelivery, scheduleSettle],
  );

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
            entityRefs: input.entityRefs ?? item.entityRefs,
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
              pinned: false,
              contentHtml: "",
              contentJson: { type: "doc", content: [] },
              mentionIds: [],
              attachments: [],
              reactions: undefined,
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

  const toggleReaction = useCallback(
    (id: string, emoji: string) => {
      setItems((current) =>
        current.map((item) => {
          if (!isComment(item) || item.id !== id || item.deleted) {
            return item;
          }
          const reactions = { ...(item.reactions ?? {}) };
          const users = new Set(reactions[emoji] ?? []);
          if (users.has(currentUserId)) {
            users.delete(currentUserId);
          } else {
            users.add(currentUserId);
          }
          if (users.size === 0) {
            delete reactions[emoji];
          } else {
            reactions[emoji] = [...users];
          }
          return { ...item, reactions };
        }),
      );
    },
    [currentUserId],
  );

  const togglePinned = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) =>
        isComment(item) && item.id === id && item.parentId === null && !item.deleted
          ? { ...item, pinned: !item.pinned }
          : item,
      ),
    );
  }, []);

  // Flush the offline queue when connectivity returns.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const flush = () => {
      setItems((current) => {
        let changed = false;
        const next = current.map((item) => {
          if (isComment(item) && (item.delivery === "queued" || item.delivery === "failed")) {
            changed = true;
            const timer = setTimeout(() => {
              sendTimersRef.current.delete(timer);
              setDelivery(item.id, "sent");
            }, SEND_SETTLE_MS);
            sendTimersRef.current.add(timer);
            return { ...item, delivery: "sending" as const };
          }
          return item;
        });
        return changed ? next : current;
      });
    };
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [setDelivery]);

  // Publish scheduled comments once their time arrives.
  useEffect(() => {
    const publishDue = () => {
      const now = Date.now();
      setItems((current) => {
        let changed = false;
        const next = current.map((item) => {
          if (
            isComment(item) &&
            item.delivery === "scheduled" &&
            item.scheduledAtIso &&
            new Date(item.scheduledAtIso).getTime() <= now
          ) {
            changed = true;
            return { ...item, delivery: "sent" as const, scheduledAtIso: undefined };
          }
          return item;
        });
        return changed ? next : current;
      });
    };
    publishDue();
    const interval = setInterval(publishDue, 15_000);
    return () => clearInterval(interval);
  }, []);

  const comments = useMemo(() => items.filter(isComment), [items]);

  const ingestRecords = useCallback((incoming: CommentRecord[]) => {
    if (incoming.length === 0) {
      return;
    }
    setItems((current) => {
      const byId = new Map(
        current.filter(isComment).map((item) => [item.id, item] as const),
      );
      let changed = false;
      let added = false;
      for (const record of incoming) {
        const existing = byId.get(record.id);
        if (!existing) {
          byId.set(record.id, record);
          changed = true;
          added = true;
        } else if (JSON.stringify(existing) !== JSON.stringify(record)) {
          byId.set(record.id, record);
          changed = true;
        }
      }
      if (!changed) {
        return current;
      }
      const systems = current.filter((item) => !isComment(item));
      const next = [...systems, ...byId.values()].sort(sortByCreatedAtAsc);
      if (added) {
        setVisibleRootCount((count) =>
          count === Number.MAX_SAFE_INTEGER ? count : count + 1,
        );
      }
      return next;
    });
  }, []);

  const markRead = useCallback(
    (ids: string[]) => {
      if (!currentUserId || ids.length === 0) {
        return;
      }
      const idSet = new Set(ids);
      setItems((current) => {
        let changed = false;
        const next = current.map((item) => {
          if (!isComment(item) || !idSet.has(item.id)) {
            return item;
          }
          const readBy = item.readBy ?? [];
          if (readBy.includes(currentUserId)) {
            return item;
          }
          changed = true;
          return { ...item, readBy: [...readBy, currentUserId] };
        });
        return changed ? next : current;
      });
    },
    [currentUserId],
  );

  return {
    visibleRows,
    pinnedRows,
    totalCommentCount,
    filteredRootCount,
    hasEarlier,
    loadEarlier,
    loadAll,
    addComment,
    editComment,
    removeComment,
    toggleLike,
    toggleReaction,
    togglePinned,
    markRead,
    retryComment,
    comments,
    ingestRecords,
  };
};
