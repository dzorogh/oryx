"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookmarkPlus,
  CalendarClock,
  ChevronDown,
  MessageSquareText,
  Paperclip,
  SendHorizontal,
} from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  CommentAttachment,
  CommentSavedReply,
  CommentScope,
  CommentUser,
} from "@/features/comments/comments-types";
import {
  CommentEditor,
  collectEntityRefs,
  collectMentionIds,
  isDocEmpty,
  type CommentEditorHandle,
} from "@/features/comments/comment-editor";
import { CommentAttachmentList } from "@/features/comments/comment-attachments";
import { CommentRecorder } from "@/features/comments/comment-recorder";
import type { CommentEntityRef } from "@/features/comments/comments-types";
import {
  clearDraft,
  readDraft,
  useSavedReplies,
  writeDraft,
  writeSavedReplies,
} from "@/features/comments/comments-storage";
import { looksHostile, runAiAction } from "@/features/comments/comments-ai-service";
import { htmlToText } from "@/features/comments/comment-text";

export type CommentSubmitPayload = {
  contentHtml: string;
  contentJson: JSONContent;
  mentionIds: string[];
  attachments: CommentAttachment[];
  entityRefs: CommentEntityRef[];
  /** Optional future publish time; when set the comment is sent as "scheduled". */
  scheduledAtIso?: string;
};

type ComposerVariant = "root" | "reply" | "edit";

type CommentComposerProps = {
  currentUser: CommentUser;
  mentionableUsers: CommentUser[];
  variant?: ComposerVariant;
  initialContent?: JSONContent | string;
  initialAttachments?: CommentAttachment[];
  autoFocus?: boolean;
  submitLabel?: string;
  placeholder?: string;
  /** Scope enables draft autosave + saved replies persistence. */
  scope?: CommentScope;
  /** Draft bucket key within the scope (e.g. "root" or `reply:<id>`). */
  draftTarget?: string;
  /** Allow scheduling a future send (root composer only). */
  allowSchedule?: boolean;
  /** Fired (debounced by the editor's change cadence) while the user is typing. */
  onTyping?: (typing: boolean) => void;
  onSubmit: (payload: CommentSubmitPayload) => void;
  onCancel?: () => void;
};

const SCHEDULE_PRESETS: { label: string; minutes: number }[] = [
  { label: "In 1 hour", minutes: 60 },
  { label: "In 3 hours", minutes: 180 },
  { label: "Tomorrow morning", minutes: 60 * 16 },
];


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
  placeholder = "Write a comment…  Use @ to mention, / for blocks.",
  scope,
  draftTarget,
  allowSchedule = false,
  onTyping,
  onSubmit,
  onCancel,
}: CommentComposerProps) => {
  const editorRef = useRef<CommentEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());
  const uploadTimersRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragDepthRef = useRef(0);
  const [attachments, setAttachments] = useState<CommentAttachment[]>(initialAttachments);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [softenOpen, setSoftenOpen] = useState(false);
  const [softening, setSoftening] = useState(false);
  const softenAckRef = useRef(false);
  const pendingScheduleRef = useRef<string | undefined>(undefined);
  const savedReplies = useSavedReplies(scope);

  // Restore a saved draft (only when the composer has no seeded content, e.g. a quote).
  const restoredDraft = useRef(false);
  const restoreDraft = useCallback(() => {
    if (restoredDraft.current || !scope || !draftTarget || variant === "edit" || initialContent) {
      return;
    }
    restoredDraft.current = true;
    const draft = readDraft(scope, draftTarget);
    if (draft?.contentJson) {
      editorRef.current?.setContent(draft.contentJson, false);
      setIsEmpty(isDocEmpty(draft.contentJson));
    }
  }, [variant, initialContent, scope, draftTarget]);

  useEffect(
    () => () => {
      for (const timer of uploadTimersRef.current) {
        clearInterval(timer);
      }
      for (const url of createdUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
    },
    [],
  );

  const hasUploading = attachments.some((item) => item.status === "uploading");
  const canSubmit = (!isEmpty || attachments.length > 0) && !hasUploading;

  const scheduleDraftSave = useCallback(() => {
    if (!scope || !draftTarget || variant === "edit") {
      return;
    }
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = setTimeout(() => {
      const json = editorRef.current?.getJson();
      if (!json) {
        return;
      }
      if (isDocEmpty(json)) {
        clearDraft(scope, draftTarget);
      } else {
        writeDraft(scope, draftTarget, json);
      }
    }, 600);
  }, [variant, scope, draftTarget]);

  const handleEditorChange = useCallback(
    (empty: boolean) => {
      restoreDraft();
      setIsEmpty(empty);
      scheduleDraftSave();
      onTyping?.(!empty);
    },
    [restoreDraft, scheduleDraftSave, onTyping],
  );

  const insertSavedReply = useCallback((reply: CommentSavedReply) => {
    editorRef.current?.insertContent(reply.contentJson);
  }, []);

  const saveCurrentAsReply = useCallback(() => {
    if (!scope) {
      return;
    }
    const json = editorRef.current?.getJson();
    if (!json || isDocEmpty(json)) {
      return;
    }
    const title = (editorRef.current?.getHtml() ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48);
    const next: CommentSavedReply[] = [
      { id: `sr-${Date.now().toString(36)}`, title: title || "Saved reply", contentJson: json },
      ...savedReplies,
    ].slice(0, 12);
    writeSavedReplies(scope, next);
  }, [scope, savedReplies]);

  const removeSavedReply = useCallback(
    (id: string) => {
      if (!scope) {
        return;
      }
      writeSavedReplies(scope, savedReplies.filter((reply) => reply.id !== id));
    },
    [scope, savedReplies],
  );

  // Demo-only: animate a freshly added attachment from 0→100% then mark it ready.
  const simulateUpload = (id: string) => {
    const timer = setInterval(() => {
      setAttachments((current) => {
        let finished = false;
        const next = current.map((item) => {
          if (item.id !== id || item.status !== "uploading") {
            return item;
          }
          const progress = Math.min(100, (item.progress ?? 0) + Math.random() * 22 + 9);
          if (progress >= 100) {
            finished = true;
            return { ...item, progress: 100, status: "ready" as const };
          }
          return { ...item, progress };
        });
        if (finished) {
          clearInterval(timer);
          uploadTimersRef.current.delete(timer);
        }
        return next;
      });
    }, 170);
    uploadTimersRef.current.add(timer);
  };

  const attachmentKind = (mime: string): CommentAttachment["kind"] => {
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    return "file";
  };

  const addFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    const next: CommentAttachment[] = files.map((file) => {
      const url = URL.createObjectURL(file);
      createdUrlsRef.current.add(url);
      return {
        id: createAttachmentId(),
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        url,
        kind: attachmentKind(file.type),
        status: "uploading",
        progress: 0,
      };
    });
    setAttachments((current) => [...current, ...next]);
    next.forEach((attachment) => simulateUpload(attachment.id));
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }
    addFiles(Array.from(fileList));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  };

  const handleDragEnter = (event: React.DragEvent) => {
    if (!Array.from(event.dataTransfer.types).includes("Files")) {
      return;
    }
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (Array.from(event.dataTransfer.types).includes("Files")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = () => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!Array.from(event.dataTransfer.types).includes("Files")) {
      return;
    }
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const emit = useCallback(
    (scheduledAtIso?: string) => {
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
        entityRefs: collectEntityRefs(contentJson),
        scheduledAtIso,
        // Drop transient upload state so persisted attachments stay clean.
        attachments: attachments.map((item) => ({
          id: item.id,
          name: item.name,
          sizeBytes: item.sizeBytes,
          mimeType: item.mimeType,
          url: item.url,
          kind: item.kind,
        })),
      });
      if (variant !== "edit") {
        editor.clear();
        setAttachments([]);
        createdUrlsRef.current.clear();
        onTyping?.(false);
        softenAckRef.current = false;
        setSoftenOpen(false);
        if (scope && draftTarget) {
          clearDraft(scope, draftTarget);
        }
      }
    },
    [attachments, onSubmit, variant, scope, draftTarget, onTyping],
  );

  const handleSubmit = useCallback(
    (scheduledAtIso?: string) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }
      // Nudge toward a more constructive tone before sending (new comments only).
      if (variant !== "edit" && !softenAckRef.current) {
        const text = htmlToText(editor.getHtml());
        if (looksHostile(text)) {
          pendingScheduleRef.current = scheduledAtIso;
          setSoftenOpen(true);
          return;
        }
      }
      emit(scheduledAtIso);
    },
    [emit, variant],
  );

  const softenDraft = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    setSoftening(true);
    void runAiAction("soften", htmlToText(editor.getHtml()))
      .then(({ result }) => {
        editor.setContent(result, true);
        softenAckRef.current = true;
        setSoftenOpen(false);
      })
      .finally(() => setSoftening(false));
  }, []);

  const sendAnyway = useCallback(() => {
    softenAckRef.current = true;
    setSoftenOpen(false);
    emit(pendingScheduleRef.current);
  }, [emit]);

  const handleCancel = useCallback(() => {
    onTyping?.(false);
    if (scope && draftTarget) {
      clearDraft(scope, draftTarget);
    }
    onCancel?.();
  }, [scope, draftTarget, onCancel, onTyping]);

  const scheduleSend = useCallback(
    (minutes: number) => {
      handleSubmit(new Date(Date.now() + minutes * 60_000).toISOString());
    },
    [handleSubmit],
  );

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
        {softenOpen ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs dark:border-amber-500/40 dark:bg-amber-400/10">
            <span className="flex-1 text-amber-800 dark:text-amber-300">
              This message reads a little harsh. Want to soften the tone before sending?
            </span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={softening}
              onClick={softenDraft}
            >
              {softening ? "Softening…" : "Soften"}
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={sendAnyway}>
              Send anyway
            </Button>
          </div>
        ) : null}
        <div
          className="relative"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CommentEditor
            ref={editorRef}
            placeholder={placeholder}
            mentionableUsers={mentionableUsers}
            initialContent={initialContent}
            autoFocus={autoFocus}
            onSubmit={() => handleSubmit()}
            onChange={handleEditorChange}
          />

          {isDragging ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-ring bg-background/85 text-sm font-medium text-foreground backdrop-blur-[1px]">
              <span className="flex items-center gap-2">
                <Paperclip className="size-4" />
                Drop files to attach
              </span>
            </div>
          ) : null}
        </div>

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
            <CommentRecorder onRecorded={(file) => addFiles([file])} />
            {scope ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      nativeButton={false}
                    >
                      <MessageSquareText />
                      <span className="hidden sm:inline">Saved</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Saved replies</DropdownMenuLabel>
                  {savedReplies.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      No saved replies yet.
                    </p>
                  ) : (
                    savedReplies.map((reply) => (
                      <DropdownMenuItem
                        key={reply.id}
                        onClick={() => insertSavedReply(reply)}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{reply.title}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete saved reply"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeSavedReply(reply.id);
                          }}
                        >
                          ✕
                        </button>
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={saveCurrentAsReply} disabled={isEmpty}>
                    <BookmarkPlus />
                    Save current as reply
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {onCancel ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            ) : null}
            <div className="flex items-center">
              <Button
                type="button"
                size="sm"
                disabled={!canSubmit}
                onClick={() => handleSubmit()}
                className={cn(allowSchedule && "rounded-r-none")}
              >
                <SendHorizontal />
                {submitLabel ?? (variant === "edit" ? "Save" : "Send")}
              </Button>
              {allowSchedule ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        size="sm"
                        disabled={!canSubmit}
                        aria-label="Schedule send"
                        className="rounded-l-none border-l border-primary-foreground/20 px-2"
                        nativeButton={false}
                      >
                        <ChevronDown />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Schedule send</DropdownMenuLabel>
                    {SCHEDULE_PRESETS.map((preset) => (
                      <DropdownMenuItem
                        key={preset.minutes}
                        onClick={() => scheduleSend(preset.minutes)}
                      >
                        <CalendarClock />
                        {preset.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
