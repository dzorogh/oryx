"use client";

import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemNotification } from "@/features/comments/comments-types";

const TONE_STYLES = {
  info: { icon: Info, ring: "text-muted-foreground" },
  success: { icon: CheckCircle2, ring: "text-emerald-600 dark:text-emerald-400" },
  warning: { icon: TriangleAlert, ring: "text-amber-600 dark:text-amber-400" },
} as const;

type CommentSystemNoticeProps = {
  notification: SystemNotification;
};

/** Author-less, centered system timeline entry. Not interactive. */
export const CommentSystemNotice = ({ notification }: CommentSystemNoticeProps) => {
  const tone = notification.tone ?? "info";
  const { icon: Icon, ring } = TONE_STYLES[tone];

  return (
    <div className="flex justify-center px-2 py-1">
      <div className="inline-flex max-w-full items-start gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-center">
        <Icon aria-hidden className={cn("mt-0.5 size-3.5 shrink-0", ring)} />
        <div className="min-w-0 text-left">
          {notification.title ? (
            <p className="text-xs font-medium text-foreground">{notification.title}</p>
          ) : null}
          {notification.description ? (
            <p className="text-xs text-muted-foreground">{notification.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
