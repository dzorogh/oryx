"use client";

import { useState } from "react";
import { Heart, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CommentReactions } from "@/features/comments/comments-types";

// The "like" is the heart reaction, so ❤️ is intentionally absent from the palette
// to avoid two competing hearts. Kept short so the picker stays a single compact row.
export const REACTION_EMOJIS = ["👍", "😂", "🎉", "🚀", "👀", "😟", "🙏"] as const;

type ReactionBarProps = {
  reactions: CommentReactions | undefined;
  currentUserId: string;
  resolveName: (id: string) => string;
  onToggle: (emoji: string) => void;
  /** The like is rendered as the leading heart chip in the same strip. */
  likedByMe: boolean;
  likeCount: number;
  likedBy?: string[];
  onToggleLike: () => void;
};

/**
 * Single reactions strip: a leading heart "like" chip followed by emoji reaction
 * chips, each with a count and a "who reacted" title. The like and emoji reactions
 * share one row so they no longer read as two competing systems.
 */
export const CommentReactionBar = ({
  reactions,
  currentUserId,
  resolveName,
  onToggle,
  likedByMe,
  likeCount,
  likedBy,
  onToggleLike,
}: ReactionBarProps) => {
  const entries = Object.entries(reactions ?? {}).filter(([, ids]) => ids.length > 0);
  const likeWho = (likedBy ?? []).map(resolveName).filter(Boolean).join(", ");
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <button
        type="button"
        title={likeWho || undefined}
        aria-pressed={likedByMe}
        aria-label={likedByMe ? "Remove like" : "Like comment"}
        onClick={onToggleLike}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-none transition-colors",
          likedByMe
            ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400"
            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
        )}
      >
        <Heart className={cn("size-3", likedByMe && "fill-current")} />
        {likeCount > 0 ? <span className="tabular-nums">{likeCount}</span> : null}
      </button>
      {entries.map(([emoji, ids]) => {
        const mine = ids.includes(currentUserId);
        const who = ids.map(resolveName).filter(Boolean).join(", ");
        return (
          <button
            key={emoji}
            type="button"
            title={who || undefined}
            aria-pressed={mine}
            onClick={() => onToggle(emoji)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-none transition-colors",
              mine
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
            )}
          >
            <span aria-hidden>{emoji}</span>
            <span className="tabular-nums">{ids.length}</span>
          </button>
        );
      })}
    </div>
  );
};

type ReactionPickerProps = {
  onPick: (emoji: string) => void;
  className?: string;
};

/** Emoji palette popover; the trigger is a compact ghost icon button. */
export const ReactionPicker = ({ onPick, className }: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Add reaction"
            className={cn("text-muted-foreground", className)}
          />
        }
      >
        <SmilePlus />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto flex-row gap-0.5 p-1">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`React ${emoji}`}
            className="rounded-md px-1.5 py-1 text-base leading-none transition-transform hover:scale-125 hover:bg-muted"
            onClick={() => {
              onPick(emoji);
              setOpen(false);
            }}
          >
            {emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};
