"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownUp,
  ChevronUp,
  Loader2,
  MessagesSquare,
  Paperclip,
  Pin,
  Search,
  Sparkle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  CommentFeedItem,
  CommentFeedRow,
  CommentScope,
  CommentSort,
  CommentUser,
} from "@/features/comments/comments-types";
import { isComment } from "@/features/comments/comments-types";
import {
  useCommentsState,
  type NewCommentInput,
} from "@/features/comments/use-comments-state";
import {
  useCommentPrefs,
  useLastVisit,
} from "@/features/comments/comments-storage";
import { useCommentsCollab } from "@/features/comments/comments-collab";
import { runAiAction } from "@/features/comments/comments-ai-service";
import { htmlToText } from "@/features/comments/comment-text";
import { CommentThread } from "@/features/comments/comment-thread";
import {
  CommentPresenceBar,
  CommentTypingLine,
} from "@/features/comments/comment-presence";
import { CommentSystemNotice } from "@/features/comments/comment-system-notice";
import {
  CommentComposer,
  type CommentSubmitPayload,
} from "@/features/comments/comment-composer";
import { CommentQuoteSelectionButton } from "@/features/comments/comment-quote-selection";
import type { QuoteSeed } from "@/features/comments/comment-quote";

// Avoid the SSR warning while still scrolling synchronously before paint on the client.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const SCROLL_LOAD_THRESHOLD_PX = 48;
const LOAD_EARLIER_DELAY_MS = 650;
/** Above this many root rows we let the browser skip off-screen layout work. */
const WINDOWING_THRESHOLD = 30;

const SORT_LABELS: Record<CommentSort, string> = {
  oldest: "Oldest first",
  newest: "Newest first",
  popular: "Most liked",
};

const rowKey = (row: CommentFeedRow): string =>
  row.kind === "system" ? row.notification.id : row.thread.root.id;

const rowTime = (row: CommentFeedRow): string =>
  row.kind === "system" ? row.notification.createdAtIso : row.thread.root.createdAtIso;

/** Light haptic pulse on supported touch devices. */
const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const haptic = (): void => {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(8);
  }
};

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
  const markedReadRef = useRef(false);

  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [tldr, setTldr] = useState<string | null>(null);
  const [tldrBusy, setTldrBusy] = useState(false);

  const [prefs, setPrefs] = useCommentPrefs(scope);
  const lastVisit = useLastVisit(scope);

  // Resolve a user id → display name for reaction/read-receipt tooltips.
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of mentionableUsers) {
      map.set(user.id, user.name);
    }
    map.set(currentUser.id, currentUser.name);
    return map;
  }, [mentionableUsers, currentUser]);
  const resolveName = useCallback((id: string) => nameById.get(id) ?? "", [nameById]);

  // Reply/quote composer state lives here (not per-thread) so the selection-quote
  // button can open any thread's composer. Only one reply is open at a time.
  const replyKeyRef = useRef(0);
  const [reply, setReply] = useState<{
    rootId: string;
    seeds: QuoteSeed[];
    key: number;
  } | null>(null);

  const openReply = useCallback((rootId: string) => {
    setReply((current) =>
      current && current.rootId === rootId && current.seeds.length === 0
        ? null
        : { rootId, seeds: [], key: (replyKeyRef.current += 1) },
    );
  }, []);

  // Quoting while a reply is already open for the same root appends another citation
  // (multi-quote); otherwise it opens a fresh reply seeded with the one quote.
  const openQuote = useCallback((rootId: string, seed: QuoteSeed) => {
    setReply((current) =>
      current && current.rootId === rootId
        ? { rootId, seeds: [...current.seeds, seed], key: (replyKeyRef.current += 1) }
        : { rootId, seeds: [seed], key: (replyKeyRef.current += 1) },
    );
  }, []);

  const closeReply = useCallback(() => setReply(null), []);

  const {
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
  } = useCommentsState({
    initialItems,
    pageSize,
    currentUserId: currentUser.id,
    sort: prefs.sort,
    filters: prefs.filters,
  });

  // Realtime: track records already in sync so we publish only local changes
  // and never echo records that just arrived from peers.
  const syncedRef = useRef<Map<string, string>>(new Map());
  const handleRemoteRecords = useCallback(
    (records: typeof comments) => {
      for (const record of records) {
        syncedRef.current.set(record.id, JSON.stringify(record));
      }
      ingestRecords(records);
    },
    [ingestRecords],
  );

  const { connected, onlineUsers, typingUsers, setTyping, publishRecords } =
    useCommentsCollab(scope, currentUser, handleRemoteRecords);

  // Publish locally changed comment records to peers (skip "scheduled" until sent).
  useEffect(() => {
    const changed = comments.filter((record) => {
      if (record.delivery === "scheduled") {
        return false;
      }
      const serialized = JSON.stringify(record);
      if (syncedRef.current.get(record.id) === serialized) {
        return false;
      }
      syncedRef.current.set(record.id, serialized);
      return true;
    });
    if (changed.length > 0) {
      publishRecords(changed);
    }
  }, [comments, publishRecords]);

  const seedCommentIds = useMemo(
    () => initialItems.filter(isComment).map((item) => item.id),
    [initialItems],
  );

  // Mark the seeded comments as read by me once, so "read by N" reflects this view.
  useEffect(() => {
    if (markedReadRef.current) {
      return;
    }
    markedReadRef.current = true;
    markRead(seedCommentIds);
  }, [markRead, seedCommentIds]);

  useEffect(
    () => () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
    },
    [],
  );

  // Deep-link: #comment-<id> reveals the target (loads all pages), scrolls it into
  // view inside the panel, and flashes a highlight. Takes precedence over the
  // initial scroll-to-bottom.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const hash = window.location.hash;
    if (!hash.startsWith("#comment-")) {
      return;
    }
    const id = hash.slice(1);
    didInitialScrollRef.current = true;
    loadAll();
    const timer = window.setTimeout(() => {
      const target = document.getElementById(id);
      if (!target) {
        return;
      }
      target.scrollIntoView({ block: "center" });
      target.setAttribute("data-flash", "");
      window.setTimeout(() => target.removeAttribute("data-flash"), 1800);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

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

  // Keep upward scrolling "inside" the panel while earlier comments can still load.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY >= 0) {
        return;
      }
      if (!hasEarlier && !isLoadingEarlier) {
        return;
      }
      if (node.scrollTop > SCROLL_LOAD_THRESHOLD_PX) {
        return;
      }
      event.preventDefault();
      node.scrollTop = Math.max(0, node.scrollTop + event.deltaY);
      triggerLoadEarlier();
    };
    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", handleWheel);
    };
  }, [hasEarlier, isLoadingEarlier, triggerLoadEarlier]);

  const handleLoadEarlierClick = useCallback(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    if (node.scrollTop <= SCROLL_LOAD_THRESHOLD_PX) {
      triggerLoadEarlier();
      return;
    }
    node.scrollBy({ top: -Math.round(node.clientHeight * 0.8), behavior: "smooth" });
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

  const handleToggleLike = useCallback(
    (id: string) => {
      haptic();
      toggleLike(id);
    },
    [toggleLike],
  );

  const handleToggleReaction = useCallback(
    (id: string, emoji: string) => {
      haptic();
      toggleReaction(id, emoji);
    },
    [toggleReaction],
  );

  const handleConvertToTask = useCallback(
    (rootId: string) => {
      const taskId = `GP-${2400 + (Math.abs(hashString(rootId)) % 600)}`;
      const href = `/tracker/tasks/${taskId}`;
      toast.success(`Task ${taskId} created from comment`, {
        description: "Tracked in Tracker (demo).",
        action: {
          label: "Open",
          onClick: () => window.open(href, "_blank", "noopener,noreferrer"),
        },
      });
    },
    [],
  );

  const runTldr = useCallback(() => {
    if (tldrBusy) {
      return;
    }
    if (tldr !== null) {
      setTldr(null);
      return;
    }
    const transcript = comments
      .filter((record) => !record.deleted)
      .map((record) => `${record.author.name}: ${htmlToText(record.contentHtml)}`)
      .join("\n");
    if (!transcript.trim()) {
      return;
    }
    setTldrBusy(true);
    void runAiAction("tldr", transcript)
      .then(({ result }) => setTldr(result))
      .finally(() => setTldrBusy(false));
  }, [comments, tldr, tldrBusy]);

  const setSort = useCallback(
    (sort: CommentSort) => setPrefs({ ...prefs, sort }),
    [prefs, setPrefs],
  );

  const toggleFilter = useCallback(
    (key: keyof typeof prefs.filters) =>
      setPrefs({ ...prefs, filters: { ...prefs.filters, [key]: !prefs.filters[key] } }),
    [prefs, setPrefs],
  );

  const showFloatingHint = hasEarlier || isLoadingEarlier;
  const windowed = filteredRootCount > WINDOWING_THRESHOLD;
  const filtersActive =
    prefs.filters.mineOnly || prefs.filters.withAttachments;

  // Index of the first visible row that is newer than the last visit (New divider).
  const newDividerKey = useMemo(() => {
    if (!lastVisit) {
      return null;
    }
    const firstNew = visibleRows.find(
      (row) => row.kind === "thread" && rowTime(row) > lastVisit && row.thread.root.author.id !== currentUser.id,
    );
    return firstNew ? rowKey(firstNew) : null;
  }, [visibleRows, lastVisit, currentUser.id]);

  const renderThread = (row: Extract<CommentFeedRow, { kind: "thread" }>) => (
    <CommentThread
      thread={row.thread}
      scope={scope}
      currentUser={currentUser}
      mentionableUsers={mentionableUsers}
      resolveName={resolveName}
      onRetry={retryComment}
      isReplying={reply?.rootId === row.thread.root.id}
      quoteSeeds={reply?.rootId === row.thread.root.id ? reply.seeds : []}
      replyKey={reply?.rootId === row.thread.root.id ? reply.key : 0}
      onOpenReply={openReply}
      onOpenQuote={openQuote}
      onCloseReply={closeReply}
      onAddReply={handleReply}
      onEdit={editComment}
      onDelete={removeComment}
      onToggleLike={handleToggleLike}
      onToggleReaction={handleToggleReaction}
      onTogglePin={togglePinned}
      onConvertToTask={handleConvertToTask}
      searchQuery={deferredSearch}
    />
  );

  return (
    <Card
      className={cn("flex flex-col gap-0 overflow-hidden p-0", className)}
      aria-label={`Comments for ${scope.type}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessagesSquare aria-hidden className="size-4 text-muted-foreground" />
          Comments
          <span className="font-normal text-muted-foreground tabular-nums">
            {totalCommentCount}
          </span>
        </h2>

        <CommentPresenceBar connected={connected} onlineUsers={onlineUsers} />

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search…"
              aria-label="Search comments"
              className="h-7 w-28 rounded-md border border-input bg-background pl-7 pr-6 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/40 sm:w-40"
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <Button
            type="button"
            variant={tldr !== null ? "secondary" : "outline"}
            size="xs"
            className="gap-1.5"
            onClick={runTldr}
            disabled={tldrBusy}
          >
            {tldrBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkle className="size-3.5" />}
            TL;DR
          </Button>

          <FilterChip
            active={prefs.filters.mineOnly}
            onClick={() => toggleFilter("mineOnly")}
          >
            Mine
          </FilterChip>
          <FilterChip
            active={prefs.filters.withAttachments}
            onClick={() => toggleFilter("withAttachments")}
          >
            <Paperclip className="size-3" />
            Attachments
          </FilterChip>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="outline" size="xs" className="gap-1.5" />
              }
            >
              <ArrowDownUp className="size-3.5" />
              {SORT_LABELS[prefs.sort]}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {(Object.keys(SORT_LABELS) as CommentSort[]).map((sort) => (
                <DropdownMenuItem
                  key={sort}
                  data-active={prefs.sort === sort ? "" : undefined}
                  className="data-active:font-medium"
                  onClick={() => setSort(sort)}
                >
                  {SORT_LABELS[sort]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {tldr !== null ? (
        <div className="flex items-start gap-2 border-b border-border bg-violet-50/60 px-4 py-3 text-sm dark:bg-violet-400/5">
          <Sparkle className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-400">
              Thread summary
            </p>
            <p className="whitespace-pre-wrap leading-6 text-foreground/90">{tldr}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss summary"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setTldr(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {pinnedRows.length > 0 ? (
        <div className="flex flex-col gap-3 border-b border-border bg-amber-50/60 px-4 py-3 dark:bg-amber-400/5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Pin aria-hidden className="size-3.5" />
            Pinned
          </p>
          {pinnedRows.map((row) =>
            row.kind === "thread" ? (
              <div key={rowKey(row)}>{renderThread(row)}</div>
            ) : null,
          )}
        </div>
      ) : null}

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
                onClick={handleLoadEarlierClick}
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
          {isLoadingEarlier ? <CommentSkeletonRow /> : null}

          {visibleRows.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {filtersActive ? (
                <span className="inline-flex flex-col items-center gap-2">
                  No comments match the current filters.
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        filters: {
                          mineOnly: false,
                          withAttachments: false,
                        },
                      })
                    }
                  >
                    Clear filters
                  </Button>
                </span>
              ) : (
                "No comments yet. Be the first to start the discussion."
              )}
            </div>
          ) : (
            visibleRows.map((row) => {
              const key = rowKey(row);
              const animationClass =
                "animate-in fade-in-0 slide-in-from-top-1 duration-300";
              return (
                <div key={key}>
                  {newDividerKey === key ? <NewSinceDivider /> : null}
                  <div
                    className={cn(
                      animationClass,
                      windowed && "[content-visibility:auto] [contain-intrinsic-size:auto_160px]",
                    )}
                  >
                    {row.kind === "system" ? (
                      <CommentSystemNotice notification={row.notification} />
                    ) : (
                      renderThread(row)
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 px-4 py-3">
        <CommentTypingLine users={typingUsers} className="mb-2" />
        <CommentComposer
          variant="root"
          currentUser={currentUser}
          mentionableUsers={mentionableUsers}
          scope={scope}
          draftTarget="root"
          allowSchedule
          onTyping={setTyping}
          onSubmit={handleRootSubmit}
        />
      </div>

      <CommentQuoteSelectionButton containerRef={scrollRef} onQuote={openQuote} />
    </Card>
  );
};

const FilterChip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    variant={active ? "secondary" : "outline"}
    size="xs"
    aria-pressed={active}
    className={cn("gap-1", active && "border-primary/40")}
    onClick={onClick}
  >
    {children}
  </Button>
);

const NewSinceDivider = () => (
  <div className="mb-3 flex items-center gap-2" aria-label="New since your last visit">
    <span className="h-px flex-1 bg-primary/30" />
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <Sparkle className="size-3" />
      New since last visit
    </span>
    <span className="h-px flex-1 bg-primary/30" />
  </div>
);

const CommentSkeletonRow = () => (
  <div className="flex gap-2.5" aria-hidden>
    <Skeleton className="size-9 shrink-0 rounded-full" />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
);
