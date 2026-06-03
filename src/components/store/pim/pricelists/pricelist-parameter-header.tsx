"use client";

import { ChevronDown, GripVertical, Plus } from "lucide-react";
import { type DragEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PricelistParameterMenu } from "./pricelist-parameter-menu";
import type { ParameterDef } from "./pricelists-parameters";

type PricelistParameterHeaderCellProps = {
  def: ParameterDef;
  isSystem: boolean;
  isFirstParameter: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onEdit: () => void;
  onResetAll: () => void;
  onDelete: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
};

export const PricelistParameterHeaderCell = ({
  def,
  isSystem,
  isFirstParameter,
  isDragging,
  isDropTarget,
  onInsertBefore,
  onInsertAfter,
  onEdit,
  onResetAll,
  onDelete,
  onDragStart,
  onDragEnd,
}: PricelistParameterHeaderCellProps) => (
  <div
    className={cn(
      "relative flex w-full flex-col gap-1 py-1 transition-opacity",
      isDragging && "opacity-40",
    )}
  >
    {isDropTarget ? (
      <span className="absolute inset-y-0 -left-1 w-0.5 rounded-full bg-primary" aria-hidden />
    ) : null}

    {/* Insert-between handle: a thin hover zone revealing a + on the left edge. */}
    {!isFirstParameter && !isSystem ? (
      <button
        type="button"
        onClick={onInsertBefore}
        aria-label={`Insert parameter before ${def.label}`}
        title="Insert parameter here"
        className="group/insert absolute inset-y-0 -left-2 z-10 flex w-3 items-center justify-center"
      >
        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-sm transition-opacity group-hover/insert:opacity-100">
          <Plus className="size-3" aria-hidden />
        </span>
      </button>
    ) : null}

    <div className="flex items-center gap-0.5">
      {!isSystem ? (
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          role="button"
          tabIndex={0}
          aria-label={`Drag to reorder ${def.label}`}
          title="Drag to reorder"
          className="flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" aria-hidden />
        </span>
      ) : null}

      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground" title={def.label}>
        {def.label}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`${def.label} parameter options`}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ChevronDown className="size-3.5" aria-hidden />
        </DropdownMenuTrigger>
        <PricelistParameterMenu
          isSystem={isSystem}
          onEdit={onEdit}
          onInsertBefore={onInsertBefore}
          onInsertAfter={onInsertAfter}
          onResetAll={onResetAll}
          onDelete={onDelete}
        />
      </DropdownMenu>
    </div>
  </div>
);
