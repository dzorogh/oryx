"use client";

import Image from "next/image";
import { forwardRef, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";
import type { CommentUser } from "@/features/comments/comments-types";

export type MentionListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type MentionListProps = {
  items: CommentUser[];
  command: (item: { id: string; label: string }) => void;
};

/** Keyboard-navigable mention suggestion popup (used by the Tiptap mention extension). */
export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [trackedItems, setTrackedItems] = useState(items);

    // Reset the highlight to the top whenever the suggestion list changes (new query).
    if (items !== trackedItems) {
      setTrackedItems(items);
      setSelectedIndex(0);
    }

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.name });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: (event) => {
        if (items.length === 0) {
          return false;
        }
        if (event.key === "ArrowUp") {
          setSelectedIndex((current) => (current + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((current) => (current + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-lg bg-popover p-2 text-sm text-muted-foreground shadow-md ring-1 ring-foreground/10">
          No people found
        </div>
      );
    }

    return (
      <div
        role="listbox"
        className="max-h-64 w-64 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted",
            )}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => selectItem(index)}
          >
            <Image
              src={item.avatarUrl}
              alt=""
              width={24}
              height={24}
              className="size-6 shrink-0 rounded-full object-cover"
            />
            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
            {item.role ? (
              <span className="shrink-0 truncate text-xs text-muted-foreground">
                {item.role}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    );
  },
);

MentionList.displayName = "MentionList";
