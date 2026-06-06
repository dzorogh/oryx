"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { ListTodo, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommentEntityRef } from "@/features/comments/comments-types";

export type EntityListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type EntityListProps = {
  items: CommentEntityRef[];
  command: (item: { id: string; label: string; href: string; entityType: string }) => void;
};

/** Keyboard-navigable `#` entity suggestion popup (tasks / orders). */
export const EntityList = forwardRef<EntityListHandle, EntityListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [trackedItems, setTrackedItems] = useState(items);

    if (items !== trackedItems) {
      setTrackedItems(items);
      setSelectedIndex(0);
    }

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({
          id: item.id,
          label: item.label,
          href: item.href,
          entityType: item.type,
        });
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
          No tasks or orders found
        </div>
      );
    }

    return (
      <div
        role="listbox"
        className="max-h-64 w-72 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors",
              index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted",
            )}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => selectItem(index)}
          >
            {item.type === "task" ? (
              <ListTodo className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <Package className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
            <span className="shrink-0 text-xs uppercase text-muted-foreground">
              {item.type}
            </span>
          </button>
        ))}
      </div>
    );
  },
);

EntityList.displayName = "EntityList";
