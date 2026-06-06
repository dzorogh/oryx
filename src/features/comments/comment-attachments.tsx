"use client";

import Image from "next/image";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CommentAttachment } from "@/features/comments/comments-types";

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || Number.isInteger(value) ? 0 : 1)} ${units[unitIndex]}`;
};

const FileChip = ({
  attachment,
  onRemove,
}: {
  attachment: CommentAttachment;
  onRemove?: () => void;
}) => {
  const uploading = attachment.status === "uploading";
  const percent = Math.round(attachment.progress ?? 0);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 py-1.5 pr-1.5 pl-2.5">
      <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col leading-tight">
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          download={attachment.name}
          className="max-w-44 truncate text-xs font-medium text-foreground hover:underline"
        >
          {attachment.name}
        </a>
        {uploading ? (
          <span className="mt-1 flex w-40 items-center gap-1.5">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">{percent}%</span>
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {formatBytes(attachment.sizeBytes)}
          </span>
        )}
      </div>
      {onRemove ? <RemoveButton onRemove={onRemove} name={attachment.name} /> : null}
    </div>
  );
};

const ImageChip = ({
  attachment,
  onRemove,
}: {
  attachment: CommentAttachment;
  onRemove?: () => void;
}) => {
  const uploading = attachment.status === "uploading";
  const percent = Math.round(attachment.progress ?? 0);
  return (
    <div className="group/att relative overflow-hidden rounded-lg border border-border bg-muted">
      <a href={attachment.url} target="_blank" rel="noreferrer" className="block">
        <Image
          src={attachment.url}
          alt={attachment.name}
          width={160}
          height={120}
          unoptimized
          className="h-24 w-32 object-cover"
        />
      </a>
      {uploading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/65 backdrop-blur-[1px]">
          <span className="h-1 w-20 overflow-hidden rounded-full bg-border">
            <span
              className="block h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
              style={{ width: `${percent}%` }}
            />
          </span>
          <span className="text-[11px] font-medium tabular-nums text-foreground">{percent}%</span>
        </div>
      ) : null}
      {onRemove ? (
        <div className="absolute right-1 top-1">
          <RemoveButton onRemove={onRemove} name={attachment.name} />
        </div>
      ) : null}
    </div>
  );
};

const AudioChip = ({
  attachment,
  onRemove,
}: {
  attachment: CommentAttachment;
  onRemove?: () => void;
}) => (
  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
    <audio controls src={attachment.url} className="h-8 max-w-60">
      <track kind="captions" />
    </audio>
    {onRemove ? <RemoveButton onRemove={onRemove} name={attachment.name} /> : null}
  </div>
);

const VideoChip = ({
  attachment,
  onRemove,
}: {
  attachment: CommentAttachment;
  onRemove?: () => void;
}) => (
  <div className="group/att relative overflow-hidden rounded-lg border border-border bg-black/90">
    <video controls src={attachment.url} className="h-40 w-auto max-w-72">
      <track kind="captions" />
    </video>
    {onRemove ? (
      <div className="absolute right-1 top-1">
        <RemoveButton onRemove={onRemove} name={attachment.name} />
      </div>
    ) : null}
  </div>
);

const RemoveButton = ({ onRemove, name }: { onRemove: () => void; name: string }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon-xs"
    aria-label={`Remove ${name}`}
    className="bg-background/80 text-muted-foreground hover:text-foreground"
    onClick={onRemove}
  >
    <X />
  </Button>
);

type CommentAttachmentListProps = {
  attachments: CommentAttachment[];
  className?: string;
  onRemove?: (id: string) => void;
};

/** Renders attachment chips — image thumbnails and file chips — for display or editing. */
export const CommentAttachmentList = ({
  attachments,
  className,
  onRemove,
}: CommentAttachmentListProps) => {
  if (attachments.length === 0) {
    return null;
  }
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((attachment) => {
        const remove = onRemove ? () => onRemove(attachment.id) : undefined;
        if (attachment.kind === "image") {
          return <ImageChip key={attachment.id} attachment={attachment} onRemove={remove} />;
        }
        if (attachment.kind === "audio") {
          return <AudioChip key={attachment.id} attachment={attachment} onRemove={remove} />;
        }
        if (attachment.kind === "video") {
          return <VideoChip key={attachment.id} attachment={attachment} onRemove={remove} />;
        }
        return <FileChip key={attachment.id} attachment={attachment} onRemove={remove} />;
      })}
    </div>
  );
};
