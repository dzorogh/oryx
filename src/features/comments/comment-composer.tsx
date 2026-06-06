"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, SendHorizontal } from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  CommentAttachment,
  CommentUser,
} from "@/features/comments/comments-types";
import {
  CommentEditor,
  collectMentionIds,
  isDocEmpty,
  type CommentEditorHandle,
} from "@/features/comments/comment-editor";
import { CommentAttachmentList } from "@/features/comments/comment-attachments";

export type CommentSubmitPayload = {
  contentHtml: string;
  contentJson: JSONContent;
  mentionIds: string[];
  attachments: CommentAttachment[];
};

type ComposerVariant = "root" | "reply" | "edit";

type CommentComposerProps = {
  currentUser: CommentUser;
  mentionableUsers: CommentUser[];
  variant?: ComposerVariant;
  initialContent?: JSONContent;
  initialAttachments?: CommentAttachment[];
  autoFocus?: boolean;
  submitLabel?: string;
  placeholder?: string;
  onSubmit: (payload: CommentSubmitPayload) => void;
  onCancel?: () => void;
};

const createAttachmentId = (): string =>
  `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const CommentComposer = ({
  currentUser,
  mentionableUsers,
  variant = "root",
  initialContent,
  initialAttachments = [],
  autoFocus,
  submitLabel,
  placeholder = "Write a comment…  Use @ to mention someone.",
  onSubmit,
  onCancel,
}: CommentComposerProps) => {
  const editorRef = useRef<CommentEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<CommentAttachment[]>(initialAttachments);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(
    () => () => {
      for (const url of createdUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    },
    [],
  );

  const canSubmit = !isEmpty || attachments.length > 0;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }
    const next: CommentAttachment[] = [];
    for (const file of Array.from(fileList)) {
      const url = URL.createObjectURL(file);
      createdUrlsRef.current.add(url);
      next.push({
        id: createAttachmentId(),
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        url,
        kind: file.type.startsWith("image/") ? "image" : "file",
      });
    }
    setAttachments((current) => [...current, ...next]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  };

  const handleSubmit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const contentJson = editor.getJson();
    const hasText = !isDocEmpty(contentJson);
    if (!hasText && attachments.length === 0) {
      return;
    }
    onSubmit({
      contentHtml: editor.getHtml(),
      contentJson,
      mentionIds: collectMentionIds(contentJson),
      attachments,
    });
    if (variant !== "edit") {
      editor.clear();
      setAttachments([]);
      createdUrlsRef.current.clear();
    }
  }, [attachments, onSubmit, variant]);

  return (
    <div
      className={cn(
        "flex gap-3",
        variant === "edit" && "flex-col gap-2",
      )}
    >
      {variant === "root" ? (
        <Image
          src={currentUser.avatarUrl}
          alt=""
          width={36}
          height={36}
          className="hidden size-9 shrink-0 rounded-full object-cover sm:block"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <CommentEditor
          ref={editorRef}
          placeholder={placeholder}
          mentionableUsers={mentionableUsers}
          initialContent={initialContent}
          autoFocus={autoFocus}
          onSubmit={handleSubmit}
          onChange={setIsEmpty}
        />

        {attachments.length > 0 ? (
          <CommentAttachmentList attachments={attachments} onRemove={removeAttachment} />
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={(event) => handleFiles(event.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip />
              <span className="hidden sm:inline">Attach</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onCancel ? (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button type="button" size="sm" disabled={!canSubmit} onClick={handleSubmit}>
              <SendHorizontal />
              {submitLabel ?? (variant === "edit" ? "Save" : "Send")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
