"use client";

import Image from "next/image";
import { CornerDownRight, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommentRecord } from "@/features/comments/comments-types";
import { buildHighlightedSnippet } from "@/features/comments/comment-text";
import { formatRelativeTime } from "@/features/comments/comment-item";

export type CommentSearchMatch = {
  comment: CommentRecord;
  /** True when this match is a reply rather than a root comment. */
  isReply: boolean;
};

type CommentSearchResultsProps = {
  query: string;
  matches: CommentSearchMatch[];
  onSelect: (id: string) => void;
};

/**
 * Compact, snippet-only list of comments matching the toolbar search. Each row
 * shows the author, time, and a short highlighted excerpt instead of the full
 * comment body, and jumps to the comment in the thread when clicked.
 */
export const CommentSearchResults = ({
  query,
  matches,
  onSelect,
}: CommentSearchResultsProps) => {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <SearchX aria-hidden className="size-5" />
        No comments match “{query.trim()}”.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 pb-1 text-xs text-muted-foreground">
        {matches.length} {matches.length === 1 ? "result" : "results"} for “{query.trim()}”
      </p>
      {matches.map(({ comment, isReply }) => (
        <button
          key={comment.id}
          type="button"
          onClick={() => onSelect(comment.id)}
          className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <Image
            src={comment.author.avatarUrl}
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs">
              {isReply ? (
                <CornerDownRight
                  aria-hidden
                  className="size-3 shrink-0 text-muted-foreground"
                />
              ) : null}
              <span className="truncate font-medium text-foreground">
                {comment.author.name}
              </span>
              <span aria-hidden className="text-muted-foreground/50">
                ·
              </span>
              <time
                dateTime={comment.createdAtIso}
                className="shrink-0 text-muted-foreground"
              >
                {formatRelativeTime(comment.createdAtIso)}
              </time>
            </div>
            <p
              className={cn(
                "comment-prose mt-0.5 line-clamp-2 text-sm leading-5 text-foreground/80",
              )}
              dangerouslySetInnerHTML={{
                __html: buildHighlightedSnippet(comment.contentHtml, query),
              }}
            />
          </div>
        </button>
      ))}
    </div>
  );
};
