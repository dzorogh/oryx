"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  CommentScope,
  CommentThreadGroup,
  CommentUser,
} from "@/features/comments/comments-types";
import { CommentItem } from "@/features/comments/comment-item";
import {
  CommentComposer,
  type CommentSubmitPayload,
} from "@/features/comments/comment-composer";
import {
  buildQuotedHtmlMany,
  seedFromComment,
  type QuoteSeed,
} from "@/features/comments/comment-quote";

/** Replies beyond this count collapse the older ones behind a "show more" toggle. */
const REPLY_COLLAPSE_THRESHOLD = 4;
const REPLY_COLLAPSE_VISIBLE = 2;

type CommentThreadProps = {
  thread: CommentThreadGroup;
  scope: CommentScope;
  currentUser: CommentUser;
  mentionableUsers: CommentUser[];
  resolveName: (id: string) => string;
  /** Controlled reply state (owned by the panel so the selection-quote button can drive it). */
  isReplying: boolean;
  quoteSeeds: QuoteSeed[];
  replyKey: number;
  onOpenReply: (rootId: string) => void;
  onOpenQuote: (rootId: string, seed: QuoteSeed) => void;
  onCloseReply: () => void;
  onAddReply: (parentId: string, payload: CommentSubmitPayload) => void;
  onEdit: (id: string, payload: CommentSubmitPayload) => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onTogglePin: (id: string) => void;
  onConvertToTask: (id: string) => void;
  onRetry: (id: string) => void;
  searchQuery?: string;
};

/** One root comment, its single-level replies, and an inline reply composer. */
export const CommentThread = ({
  thread,
  scope,
  currentUser,
  mentionableUsers,
  resolveName,
  isReplying,
  quoteSeeds,
  replyKey,
  onOpenReply,
  onOpenQuote,
  onCloseReply,
  onAddReply,
  onEdit,
  onDelete,
  onToggleLike,
  onToggleReaction,
  onTogglePin,
  onConvertToTask,
  onRetry,
  searchQuery,
}: CommentThreadProps) => {
  const { root, replies } = thread;
  const canReply = !root.deleted;

  const [expanded, setExpanded] = useState(false);
  const collapsible = replies.length > REPLY_COLLAPSE_THRESHOLD && !expanded;
  const hiddenCount = collapsible ? replies.length - REPLY_COLLAPSE_VISIBLE : 0;
  const shownReplies = collapsible ? replies.slice(replies.length - REPLY_COLLAPSE_VISIBLE) : replies;

  return (
    <div className="flex flex-col gap-3" data-thread-root={root.id}>
      <CommentItem
        comment={root}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        resolveName={resolveName}
        canReply={canReply}
        pinned={canReply ? (root.pinned ?? false) : undefined}
        onReply={canReply ? () => onOpenReply(root.id) : undefined}
        onQuote={canReply ? () => onOpenQuote(root.id, seedFromComment(root)) : undefined}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleLike={onToggleLike}
        onToggleReaction={onToggleReaction}
        onTogglePin={canReply ? () => onTogglePin(root.id) : undefined}
        onConvertToTask={canReply ? () => onConvertToTask(root.id) : undefined}
        onRetry={() => onRetry(root.id)}
        searchQuery={searchQuery}
      />

      {replies.length > 0 || isReplying ? (
        <div className="flex flex-col gap-3 border-l border-border pl-3 sm:ml-4 sm:pl-4">
          {collapsible ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="-ml-1 w-fit text-muted-foreground"
              onClick={() => setExpanded(true)}
            >
              <ChevronDown />
              Show {hiddenCount} earlier {hiddenCount === 1 ? "reply" : "replies"}
            </Button>
          ) : null}

          {shownReplies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              mentionableUsers={mentionableUsers}
              resolveName={resolveName}
              isReply
              onQuote={
                canReply && !reply.deleted
                  ? () => onOpenQuote(root.id, seedFromComment(reply))
                  : undefined
              }
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleLike={onToggleLike}
              onToggleReaction={onToggleReaction}
              onRetry={() => onRetry(reply.id)}
              searchQuery={searchQuery}
            />
          ))}

          {isReplying ? (
            <CommentComposer
              // Remount when the reply target/quote changes so the draft resets correctly.
              key={replyKey}
              variant="reply"
              currentUser={currentUser}
              mentionableUsers={mentionableUsers}
              scope={scope}
              draftTarget={`reply:${root.id}`}
              initialContent={
                quoteSeeds.length > 0 ? buildQuotedHtmlMany(quoteSeeds) : undefined
              }
              autoFocus
              submitLabel="Reply"
              placeholder={`Reply to ${root.author.name}…`}
              onSubmit={(payload) => {
                onAddReply(root.id, payload);
                onCloseReply();
              }}
              onCancel={onCloseReply}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
