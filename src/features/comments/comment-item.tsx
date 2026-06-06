"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Ban,
  Clock3,
  CloudOff,
  Eye,
  Languages,
  Loader2,
  Pin,
  Reply,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  CommentBadge,
  CommentRecord,
  CommentUser,
} from "@/features/comments/comments-types";
import { CommentActionsMenu } from "@/features/comments/comment-actions-menu";
import {
  CommentReactionBar,
  ReactionPicker,
} from "@/features/comments/comment-reactions";
import {
  CommentLinkPreview,
  firstPreviewableLink,
} from "@/features/comments/comment-link-preview";
import { runAiAction } from "@/features/comments/comments-ai-service";
import { highlightHtml, htmlToText } from "@/features/comments/comment-text";
import {
  attachCodeCopy,
  enhanceCodeHtml,
} from "@/features/comments/comment-code-enhance";
import { CommentAttachmentList } from "@/features/comments/comment-attachments";
import {
  CommentComposer,
  type CommentSubmitPayload,
} from "@/features/comments/comment-composer";

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const BADGE_LABELS: Record<CommentBadge, string> = {
  author: "Author",
  reporter: "Reporter",
  assignee: "Assignee",
};

// Deterministic (fixed locale + UTC) label used on the server and the first client
// render so hydration matches; the live relative/local time is swapped in after mount.
const absoluteTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const formatAbsoluteTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : `${absoluteTimeFormatter.format(date)} UTC`;
};

// Bake `disabled` onto task-list checkboxes in the rendered HTML so they are read-only
// status markers. Pure string transform → SSR-safe and survives React re-applying the
// body's innerHTML. Tiptap serializes task items as `<input type="checkbox" ...>`.
const withReadOnlyCheckboxes = (html: string): string =>
  html.includes('type="checkbox"')
    ? html.replace(/<input type="checkbox"(?! disabled)/g, '<input type="checkbox" disabled tabindex="-1"')
    : html;

const emptySubscribe = () => () => { };

/** False on the server and the first client render, true afterwards (hydration-safe). */
const useHydrated = (): boolean =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

export const formatRelativeTime = (iso: string): string => {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) {
    return "";
  }
  const deltaSeconds = Math.round((target - Date.now()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);
  if (absSeconds < 45) {
    return "just now";
  }
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (absSeconds >= secondsInUnit) {
      return relativeTimeFormatter.format(Math.round(deltaSeconds / secondsInUnit), unit);
    }
  }
  return "just now";
};

const scheduleFormatter =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", weekday: "short" })
    : null;

/** Short "when will it publish" label for a scheduled comment badge. */
const scheduleLabel = (iso: string): string => {
  try {
    return scheduleFormatter?.format(new Date(iso)) ?? "";
  } catch {
    return "";
  }
};

type CommentItemProps = {
  comment: CommentRecord;
  currentUser: CommentUser;
  mentionableUsers: CommentUser[];
  isReply?: boolean;
  canReply?: boolean;
  resolveName: (id: string) => string;
  onReply?: () => void;
  onQuote?: () => void;
  onEdit: (id: string, payload: CommentSubmitPayload) => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  /** Root-only moderation state + handlers (undefined hides the affordance). */
  pinned?: boolean;
  onTogglePin?: () => void;
  onConvertToTask?: () => void;
  /** Re-attempt delivery for queued/failed comments (author-only). */
  onRetry?: () => void;
  /** Active search query — highlights matches in the rendered body. */
  searchQuery?: string;
};

export const CommentItem = ({
  comment,
  currentUser,
  mentionableUsers,
  isReply = false,
  canReply = false,
  resolveName,
  onReply,
  onQuote,
  onEdit,
  onDelete,
  onToggleLike,
  onToggleReaction,
  pinned,
  onTogglePin,
  onConvertToTask,
  onRetry,
  searchQuery,
}: CommentItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const mounted = useHydrated();

  const stableTimeLabel = useMemo(
    () => formatAbsoluteTime(comment.createdAtIso),
    [comment.createdAtIso],
  );

  // Task-list checkboxes are baked read-only and code blocks are highlighted + given a
  // Copy button — both as pure string transforms rather than post-mount DOM mutations.
  // An imperative mutation gets wiped whenever React re-applies this body's
  // `dangerouslySetInnerHTML` (e.g. when a sibling comment is added) and would not
  // re-run (deps unchanged). Baking into the string survives re-renders and is SSR-safe.
  // Editing seeds the editor from `contentJson`, so editor checkboxes stay interactive.
  const displayHtml = useMemo(() => {
    const base = enhanceCodeHtml(withReadOnlyCheckboxes(comment.contentHtml));
    return searchQuery ? highlightHtml(base, searchQuery) : base;
  }, [comment.contentHtml, searchQuery]);

  const handleTranslate = useCallback(() => {
    if (translation !== null) {
      setTranslation(null);
      return;
    }
    setTranslating(true);
    void runAiAction("translate", htmlToText(comment.contentHtml), {
      targetLang: "English",
    })
      .then(({ result }) => setTranslation(result))
      .finally(() => setTranslating(false));
  }, [translation, comment.contentHtml]);

  const previewLink = useMemo(
    () => firstPreviewableLink(comment.contentHtml),
    [comment.contentHtml],
  );

  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = bodyRef.current;
    return node ? attachCodeCopy(node) : undefined;
  }, []);

  if (comment.deleted) {
    return (
      <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground italic">
        <Ban aria-hidden className="size-3.5 shrink-0" />
        Comment deleted
      </div>
    );
  }

  const isAuthor = comment.author.id === currentUser.id;
  const avatarSize = isReply ? 28 : 36;

  const handleCopy = async () => {
    const text = new DOMParser()
      .parseFromString(comment.contentHtml, "text/html")
      .body.textContent?.trim();
    try {
      await navigator.clipboard.writeText(text ?? "");
      toast.success("Comment copied");
    } catch {
      toast.error("Could not copy comment");
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setMenuOpen(true);
  };

  return (
    <div
      id={`comment-${comment.id}`}
      data-comment-id={comment.id}
      className="group/comment flex scroll-mt-16 gap-2.5 rounded-md transition-colors data-flash:bg-amber-100/70 dark:data-flash:bg-amber-400/15"
      onContextMenu={handleContextMenu}
    >
      <Image
        src={comment.author.avatarUrl}
        alt=""
        width={avatarSize}
        height={avatarSize}
        className={cn(
          "shrink-0 rounded-full object-cover ring-1 ring-foreground/10",
          isReply ? "size-7" : "size-9",
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-foreground">{comment.author.name}</span>
            {comment.badge ? (
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide"
              >
                {BADGE_LABELS[comment.badge]}
              </Badge>
            ) : null}
            {comment.author.role ? (
              <span className="text-xs text-muted-foreground">{comment.author.role}</span>
            ) : null}
            <span aria-hidden className="text-xs text-muted-foreground/50">
              ·
            </span>
            <time
              dateTime={comment.createdAtIso}
              className="text-xs text-muted-foreground"
              title={mounted ? new Date(comment.createdAtIso).toLocaleString() : undefined}
            >
              {mounted ? formatRelativeTime(comment.createdAtIso) : stableTimeLabel}
            </time>
            {comment.editedAtIso ? (
              <span className="text-xs text-muted-foreground/70">(edited)</span>
            ) : null}
            {pinned ? (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Pin aria-hidden className="size-3" />
                Pinned
              </span>
            ) : null}
            {comment.delivery === "scheduled" ? (
              <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
                <Clock3 aria-hidden className="size-3" />
                {comment.scheduledAtIso ? `Scheduled · ${scheduleLabel(comment.scheduledAtIso)}` : "Scheduled"}
              </Badge>
            ) : null}
            {comment.delivery === "sending" ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 aria-hidden className="size-3 animate-spin" />
                Sending…
              </span>
            ) : null}
            {comment.delivery === "queued" ? (
              <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] text-muted-foreground">
                <CloudOff aria-hidden className="size-3" />
                Queued
              </Badge>
            ) : null}
            {comment.delivery === "failed" ? (
              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                <TriangleAlert aria-hidden className="size-3" />
                Failed to send
              </span>
            ) : null}
            {onRetry && (comment.delivery === "failed" || comment.delivery === "queued") ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-5 px-1.5 text-xs text-primary"
                onClick={onRetry}
              >
                <RotateCcw className="size-3" />
                Retry
              </Button>
            ) : null}
          </div>

          {!isEditing ? (
            <div className="flex shrink-0 items-center">
              <div className="flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/comment:opacity-100 max-sm:opacity-100">
                <ReactionPicker onPick={(emoji) => onToggleReaction(comment.id, emoji)} />
                {canReply && onReply ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Reply"
                    className="text-muted-foreground"
                    onClick={onReply}
                  >
                    <Reply />
                  </Button>
                ) : null}
              </div>
              <CommentActionsMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                canReply={canReply}
                canEdit={isAuthor}
                canDelete={isAuthor}
                pinned={pinned}
                onReply={onReply}
                onQuote={onQuote}
                onEdit={() => setIsEditing(true)}
                onDelete={() => setConfirmOpen(true)}
                onCopy={handleCopy}
                onTogglePin={onTogglePin}
                onConvertToTask={onConvertToTask}
                onTranslate={handleTranslate}
                translated={translation !== null}
              />
            </div>
          ) : null}
        </div>

        {isEditing ? (
          <div className="mt-1.5">
            <CommentComposer
              variant="edit"
              currentUser={currentUser}
              mentionableUsers={mentionableUsers}
              initialContent={comment.contentJson}
              initialAttachments={comment.attachments}
              autoFocus
              submitLabel="Save changes"
              onSubmit={(payload) => {
                onEdit(comment.id, payload);
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : (
          <>
            <div
              ref={bodyRef}
              data-comment-body
              data-comment-author={comment.author.name}
              className="comment-prose mt-1 text-sm leading-6 text-foreground/90"
              // contentHtml is produced by our own Tiptap editor (trusted, no remote input).
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />

            {translating ? (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Translating…
              </p>
            ) : null}
            {translation !== null ? (
              <div className="mt-1.5 rounded-md border border-dashed border-border bg-muted/40 p-2 text-sm leading-6 text-foreground/90">
                <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Languages className="size-3" />
                  Translation
                </p>
                <p className="whitespace-pre-wrap">{translation}</p>
              </div>
            ) : null}

            {previewLink ? <CommentLinkPreview url={previewLink} /> : null}

            {comment.attachments.length > 0 ? (
              <CommentAttachmentList attachments={comment.attachments} className="mt-2" />
            ) : null}

            <CommentReactionBar
              reactions={comment.reactions}
              currentUserId={currentUser.id}
              resolveName={resolveName}
              onToggle={(emoji) => onToggleReaction(comment.id, emoji)}
              likedByMe={comment.likedByMe}
              likeCount={comment.likeCount}
              onToggleLike={() => onToggleLike(comment.id)}
            />

            <div className="mt-1.5 flex items-center gap-1">
              {canReply && onReply ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="-ml-2 text-muted-foreground"
                  onClick={onReply}
                >
                  Reply
                </Button>
              ) : null}
              {comment.readBy && comment.readBy.length > 0 ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs text-muted-foreground/70",
                    !(canReply && onReply) && "ml-0",
                    canReply && onReply && "ml-1",
                  )}
                  title={comment.readBy.map(resolveName).filter(Boolean).join(", ")}
                >
                  <Eye aria-hidden className="size-3" />
                  Read by {comment.readBy.length}
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. The comment will be removed from the discussion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onDelete(comment.id);
                setConfirmOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
