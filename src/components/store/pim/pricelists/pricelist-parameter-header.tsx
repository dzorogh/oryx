"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { type PointerEvent as ReactPointerEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PricelistParameterMenu } from "./pricelist-parameter-menu";
import type { ParameterDef } from "./pricelists-parameters";

type PricelistParameterHeaderCellProps = {
  def: ParameterDef;
  isSystem: boolean;
  isFirstParameter: boolean;
  isDragSource: boolean;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onEdit: () => void;
  onResetAll: () => void;
  onDelete: () => void;
  onPointerDownDrag: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export const PricelistParameterHeaderCell = ({
  def,
  isSystem,
  isFirstParameter,
  isDragSource,
  onInsertBefore,
  onInsertAfter,
  onEdit,
  onResetAll,
  onDelete,
  onPointerDownDrag,
}: PricelistParameterHeaderCellProps) => (
  <div className="relative flex w-full flex-col gap-1 py-1">
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

    <div
      onPointerDown={isSystem ? undefined : onPointerDownDrag}
      className={cn(
        "flex items-center gap-0.5 rounded-md px-0.5 transition-opacity select-none",
        !isSystem && "cursor-grab active:cursor-grabbing",
        isDragSource && "opacity-40",
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={<span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground" />}
        >
          {def.label}
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="flex max-w-xs flex-col items-start gap-0.5 text-left"
        >
          <span className="font-semibold">{def.label}</span>
          {def.formula ? (
            <span className="font-mono text-background/80">{def.formula}</span>
          ) : null}
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`${def.label} parameter options`}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <MoreHorizontal className="size-3.5" aria-hidden />
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
