"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Ban, Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  CommentRecord,
  CommentUser,
} from "@/features/comments/comments-types";
import { CommentActionsMenu } from "@/features/comments/comment-actions-menu";
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

type CommentItemProps = {
  comment: CommentRecord;
  currentUser: CommentUser;
  mentionableUsers: CommentUser[];
  isReply?: boolean;
  canReply?: boolean;
  onReply?: () => void;
  onEdit: (id: string, payload: CommentSubmitPayload) => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string) => void;
};

export const CommentItem = ({
  comment,
  currentUser,
  mentionableUsers,
  isReply = false,
  canReply = false,
  onReply,
  onEdit,
  onDelete,
  onToggleLike,
}: CommentItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mounted = useHydrated();

  const stableTimeLabel = useMemo(
    () => formatAbsoluteTime(comment.createdAtIso),
    [comment.createdAtIso],
  );

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
    <div className="flex gap-2.5" onContextMenu={handleContextMenu}>
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
          </div>

          {!isEditing ? (
            <div className="shrink-0">
              <CommentActionsMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                canReply={canReply}
                canEdit={isAuthor}
                canDelete={isAuthor}
                onReply={onReply}
                onEdit={() => setIsEditing(true)}
                onDelete={() => setConfirmOpen(true)}
                onCopy={handleCopy}
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
              className="comment-prose mt-1 text-sm leading-6 text-foreground/90"
              // contentHtml is produced by our own Tiptap editor (trusted, no remote input).
              dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
            />

            {comment.attachments.length > 0 ? (
              <CommentAttachmentList attachments={comment.attachments} className="mt-2" />
            ) : null}

            <div className="mt-1.5 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                aria-pressed={comment.likedByMe}
                aria-label={comment.likedByMe ? "Remove like" : "Like comment"}
                className={cn(
                  "-ml-2 text-muted-foreground",
                  comment.likedByMe && "text-rose-600 dark:text-rose-400",
                )}
                onClick={() => onToggleLike(comment.id)}
              >
                <Heart className={cn("size-3.5", comment.likedByMe && "fill-current")} />
                {comment.likeCount > 0 ? (
                  <span className="tabular-nums">{comment.likeCount}</span>
                ) : null}
              </Button>
              {canReply && onReply ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={onReply}
                >
                  Reply
                </Button>
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
