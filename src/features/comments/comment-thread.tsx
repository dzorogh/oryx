"use client";

import { useState } from "react";
import type {
  CommentThreadGroup,
  CommentUser,
} from "@/features/comments/comments-types";
import { CommentItem } from "@/features/comments/comment-item";
import {
  CommentComposer,
  type CommentSubmitPayload,
} from "@/features/comments/comment-composer";

type CommentThreadProps = {
  thread: CommentThreadGroup;
  currentUser: CommentUser;
  mentionableUsers: CommentUser[];
  onAddReply: (parentId: string, payload: CommentSubmitPayload) => void;
  onEdit: (id: string, payload: CommentSubmitPayload) => void;
  onDelete: (id: string) => void;
  onToggleLike: (id: string) => void;
};

/** One root comment, its single-level replies, and an inline reply composer. */
export const CommentThread = ({
  thread,
  currentUser,
  mentionableUsers,
  onAddReply,
  onEdit,
  onDelete,
  onToggleLike,
}: CommentThreadProps) => {
  const [isReplying, setIsReplying] = useState(false);
  const { root, replies } = thread;
  const canReply = !root.deleted;

  return (
    <div className="flex flex-col gap-3">
      <CommentItem
        comment={root}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        canReply={canReply}
        onReply={canReply ? () => setIsReplying((current) => !current) : undefined}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleLike={onToggleLike}
      />

      {replies.length > 0 || isReplying ? (
        <div className="flex flex-col gap-3 border-l border-border pl-3 sm:ml-4 sm:pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              mentionableUsers={mentionableUsers}
              isReply
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleLike={onToggleLike}
            />
          ))}

          {isReplying ? (
            <CommentComposer
              variant="reply"
              currentUser={currentUser}
              mentionableUsers={mentionableUsers}
              autoFocus
              submitLabel="Reply"
              placeholder={`Reply to ${root.author.name}…`}
              onSubmit={(payload) => {
                onAddReply(root.id, payload);
                setIsReplying(false);
              }}
              onCancel={() => setIsReplying(false)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
