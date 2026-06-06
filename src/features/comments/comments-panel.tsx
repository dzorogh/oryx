"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChevronUp, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type {
  CommentFeedItem,
  CommentFeedRow,
  CommentScope,
  CommentUser,
} from "@/features/comments/comments-types";
import {
  useCommentsState,
  type NewCommentInput,
} from "@/features/comments/use-comments-state";
import { CommentThread } from "@/features/comments/comment-thread";
import { CommentSystemNotice } from "@/features/comments/comment-system-notice";
import {
  CommentComposer,
  type CommentSubmitPayload,
} from "@/features/comments/comment-composer";

// Avoid the SSR warning while still scrolling synchronously before paint on the client.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const SCROLL_LOAD_THRESHOLD_PX = 48;
const LOAD_EARLIER_DELAY_MS = 650;

const rowKey = (row: CommentFeedRow): string =>
  row.kind === "system" ? row.notification.id : row.thread.root.id;

type CommentsPanelProps = {
  scope: CommentScope;
  currentUser: CommentUser;
  mentionableUsers: CommentUser[];
  initialItems: CommentFeedItem[];
  pageSize?: number;
  maxHeight?: string;
  className?: string;
};

export const CommentsPanel = ({
  scope,
  currentUser,
  mentionableUsers,
  initialItems,
  pageSize = 8,
  maxHeight = "32rem",
  className,
}: CommentsPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);
  const anchorFromBottomRef = useRef<number | null>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);

  const {
    visibleRows,
    totalCommentCount,
    hasEarlier,
    loadEarlier,
    addComment,
    editComment,
    removeComment,
    toggleLike,
  } = useCommentsState({ initialItems, pageSize });

  useEffect(
    () => () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
    },
    [],
  );

  // Land at the newest comment on first mount.
  useEffect(() => {
    const node = scrollRef.current;
    if (node && !didInitialScrollRef.current) {
      node.scrollTop = node.scrollHeight;
      didInitialScrollRef.current = true;
    }
  }, []);

  // Preserve the reading position when older comments are prepended.
  useIsomorphicLayoutEffect(() => {
    const node = scrollRef.current;
    if (node && anchorFromBottomRef.current !== null) {
      node.scrollTop = node.scrollHeight - anchorFromBottomRef.current;
      anchorFromBottomRef.current = null;
    }
  }, [visibleRows]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (node) {
        node.scrollTop = node.scrollHeight;
      }
    });
  }, []);

  const triggerLoadEarlier = useCallback(() => {
    const node = scrollRef.current;
    if (!node || isLoadingEarlier || !hasEarlier) {
      return;
    }
    anchorFromBottomRef.current = node.scrollHeight - node.scrollTop;
    setIsLoadingEarlier(true);
    loadTimerRef.current = setTimeout(() => {
      loadEarlier();
      setIsLoadingEarlier(false);
    }, LOAD_EARLIER_DELAY_MS);
  }, [hasEarlier, isLoadingEarlier, loadEarlier]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    if (node.scrollTop <= SCROLL_LOAD_THRESHOLD_PX) {
      triggerLoadEarlier();
    }
  }, [triggerLoadEarlier]);

  const submitComment = useCallback(
    (input: NewCommentInput, scroll: boolean) => {
      addComment(input);
      if (scroll) {
        scrollToBottom();
      }
    },
    [addComment, scrollToBottom],
  );

  const handleRootSubmit = useCallback(
    (payload: CommentSubmitPayload) => {
      submitComment({ parentId: null, author: currentUser, ...payload }, true);
    },
    [currentUser, submitComment],
  );

  const handleReply = useCallback(
    (parentId: string, payload: CommentSubmitPayload) => {
      submitComment({ parentId, author: currentUser, ...payload }, false);
    },
    [currentUser, submitComment],
  );

  const showFloatingHint = hasEarlier || isLoadingEarlier;

  return (
    <Card
      size="sm"
      className={cn("flex flex-col gap-0 overflow-hidden p-0", className)}
      aria-label={`Comments for ${scope.type}`}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessagesSquare aria-hidden className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          Comments
          <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
            {totalCommentCount}
          </span>
        </h2>
      </div>

      <div className="relative">
        {showFloatingHint ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center bg-gradient-to-b from-card via-card/80 to-transparent px-4 pt-2 pb-5">
            {isLoadingEarlier ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-popover px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-foreground/10">
                <Spinner className="size-3.5" />
                Loading earlier comments…
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="pointer-events-auto rounded-full bg-popover shadow-sm"
                onClick={triggerLoadEarlier}
              >
                <ChevronUp />
                Scroll up to load earlier comments
              </Button>
            )}
          </div>
        ) : null}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex flex-col gap-4 overflow-y-auto px-4 py-4"
          style={{ maxHeight }}
        >
          {visibleRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No comments yet. Be the first to start the discussion.
            </p>
          ) : (
            visibleRows.map((row) => {
              const key = rowKey(row);
              // animate-in fires once per freshly mounted row (initial load, new
              // comment, reply, and older comments revealed by lazy-load); persistent
              // rows keep their identity and do not re-animate on re-render.
              const animationClass =
                "animate-in fade-in-0 slide-in-from-top-1 duration-300";
              return row.kind === "system" ? (
                <div key={key} className={animationClass}>
                  <CommentSystemNotice notification={row.notification} />
                </div>
              ) : (
                <div key={key} className={animationClass}>
                  <CommentThread
                    thread={row.thread}
                    currentUser={currentUser}
                    mentionableUsers={mentionableUsers}
                    onAddReply={handleReply}
                    onEdit={editComment}
                    onDelete={removeComment}
                    onToggleLike={toggleLike}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 px-4 py-3">
        <CommentComposer
          variant="root"
          currentUser={currentUser}
          mentionableUsers={mentionableUsers}
          onSubmit={handleRootSubmit}
        />
      </div>
    </Card>
  );
};
