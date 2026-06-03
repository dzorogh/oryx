import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getScopeColumns } from "./pricelists-columns";
import type { PricelistScope } from "./pricelists-demo-data";
import { isSystemParameter, type ParameterDef } from "./pricelists-parameters";
import { PricelistParameterMenu } from "./pricelist-parameter-menu";
import type { PricelistParameters } from "./use-pricelist-parameters";
import type { PricelistColumns } from "./use-pricelist-columns";

type ParameterAction =
  | { kind: "create"; atIndex?: number }
  | { kind: "edit"; def: ParameterDef }
  | { kind: "resetAll"; def: ParameterDef }
  | { kind: "delete"; def: ParameterDef };

type RowDragMeta = {
  paramId: string;
  pointerOffsetY: number;
  left: number;
  width: number;
  height: number;
};

type RowDragState = {
  paramId: string;
  label: string;
  width: number;
  height: number;
  top: number;
  left: number;
  swapTargetId: string | null;
};

type PricelistsColumnsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: PricelistScope;
  columns: PricelistColumns;
  parameters: PricelistParameters;
  onParameterAction: (action: ParameterAction) => void;
};

export const PricelistsColumnsSheet = ({
  open,
  onOpenChange,
  scope,
  columns,
  parameters,
  onParameterAction,
}: PricelistsColumnsSheetProps) => {
  const [rowDrag, setRowDrag] = useState<RowDragState | null>(null);
  const rowDragMetaRef = useRef<RowDragMeta | null>(null);
  const lastSwapTargetRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Keep the latest swap action in a ref so the drag listeners can read it
  // without re-subscribing. Updated in an effect to avoid writing during render.
  const swapParameterRef = useRef(parameters.swapParameter);
  useEffect(() => {
    swapParameterRef.current = parameters.swapParameter;
  });

  const scopeColumns = getScopeColumns(scope);
  const leadingColumns = scopeColumns.filter((column) => !column.afterParameters);
  const trailingColumns = scopeColumns.filter((column) => column.afterParameters);

  const renderColumnToggle = (column: (typeof scopeColumns)[number]) => {
    const checkboxId = `pricelist-column-${column.id}`;

    return (
      <label
        key={column.id}
        htmlFor={checkboxId}
        className="flex items-center gap-3 rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2.5"
      >
        <Checkbox
          id={checkboxId}
          checked={columns.isVisible(column.id)}
          disabled={column.locked}
          onCheckedChange={(checked) => {
            if (typeof checked !== "boolean" || column.locked) {
              return;
            }

            if (checked !== columns.isVisible(column.id)) {
              columns.toggle(column.id);
            }
          }}
          aria-label={`Toggle ${column.label} column`}
        />
        <span className="text-sm font-medium text-foreground">{column.label}</span>
      </label>
    );
  };

  const isRowDragging = rowDrag !== null;

  // Custom pointer drag for the parameter list: a fixed-position preview that
  // moves only vertically (its left is pinned to the row column) with a solid
  // background, and Notion-style swap as the pointer passes over neighbors.
  useEffect(() => {
    if (!isRowDragging) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      const meta = rowDragMetaRef.current;
      const list = listRef.current;
      if (!meta || !list) {
        return;
      }

      const draggableRows = Array.from(
        list.querySelectorAll<HTMLElement>("[data-param-id]"),
      ).filter((row) => row.dataset.system !== "true");
      if (draggableRows.length === 0) {
        return;
      }

      let minTop = Infinity;
      let maxBottom = -Infinity;
      let targetId: string | null = null;
      for (const row of draggableRows) {
        const rect = row.getBoundingClientRect();
        if (rect.top < minTop) {
          minTop = rect.top;
        }
        if (rect.bottom > maxBottom) {
          maxBottom = rect.bottom;
        }
        if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
          targetId = row.dataset.paramId ?? null;
        }
      }

      const maxTop = Math.max(minTop, maxBottom - meta.height);
      const top = Math.min(Math.max(event.clientY - meta.pointerOffsetY, minTop), maxTop);

      let swapTargetId: string | null = null;
      if (targetId && targetId !== meta.paramId) {
        swapTargetId = targetId;
        if (lastSwapTargetRef.current !== targetId) {
          lastSwapTargetRef.current = targetId;
          swapParameterRef.current(meta.paramId, targetId);
        }
      } else {
        lastSwapTargetRef.current = null;
      }

      setRowDrag((current) => (current ? { ...current, top, swapTargetId } : current));
    };

    const endDrag = () => {
      rowDragMetaRef.current = null;
      lastSwapTargetRef.current = null;
      setRowDrag(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isRowDragging]);

  const startRowDrag = (def: ParameterDef, event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSystemParameter(def.id) || event.button !== 0) {
      return;
    }
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    rowDragMetaRef.current = {
      paramId: def.id,
      pointerOffsetY: event.clientY - rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
    lastSwapTargetRef.current = null;
    setRowDrag({
      paramId: def.id,
      label: def.label,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      swapTargetId: null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Columns</SheetTitle>
          <SheetDescription>Choose which columns appear in the pricelist table.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          <div className="grid gap-2 px-4">
            {leadingColumns.map((column) => renderColumnToggle(column))}
          </div>

          {parameters.enabled && parameters.defs.length > 0 ? (
            <div className="px-4">
              <div className="my-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Parameters</span>
                <span className="h-px flex-1 border-t border-dashed border-[var(--corportal-border-grey)]" />
              </div>

              <div ref={listRef} className="grid gap-1.5">
                {parameters.defs.map((def, index) => {
                  const system = isSystemParameter(def.id);

                  return (
                    <div
                      key={def.id}
                      data-param-id={def.id}
                      data-system={system}
                      onPointerDown={system ? undefined : (event) => startRowDrag(def, event)}
                      className={cn(
                        "group/row relative flex items-center gap-2 rounded-lg border border-[var(--corportal-border-grey)] bg-background px-3 py-2.5 transition-[box-shadow,background-color,opacity] select-none",
                        !system && "cursor-grab active:cursor-grabbing",
                        rowDrag?.paramId === def.id && "opacity-40",
                        rowDrag?.swapTargetId === def.id &&
                        "border-primary bg-primary/5 ring-2 ring-primary ring-inset",
                      )}
                    >
                      <Checkbox
                        id={`pricelist-param-${def.id}`}
                        checked={parameters.isVisible(def.id)}
                        onCheckedChange={() => parameters.toggleVisibility(def.id)}
                        aria-label={`Toggle ${def.label} parameter`}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      />

                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={def.label}>
                        {def.label}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`${def.label} parameter options`}
                          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/60 opacity-0 transition-all hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group-hover/row:opacity-100"
                        >
                          <MoreHorizontal className="size-3.5" aria-hidden />
                        </DropdownMenuTrigger>
                        <PricelistParameterMenu
                          isSystem={system}
                          onEdit={() => onParameterAction({ kind: "edit", def })}
                          onInsertBefore={() => onParameterAction({ kind: "create", atIndex: index })}
                          onInsertAfter={() => onParameterAction({ kind: "create", atIndex: index + 1 })}
                          onResetAll={() => parameters.resetAllOverrides(def.id)}
                          onDelete={() => {
                            parameters.removeParameter(def.id);
                          }}
                        />
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {trailingColumns.length > 0 ? (
            <div className="px-4">
              {/* Same dashed divider that precedes the parameter group separates
                  Total Expenses from the trailing Retail Markup column. */}
              <div className="my-2 flex items-center">
                <span className="h-px flex-1 border-t border-dashed border-[var(--corportal-border-grey)]" />
              </div>

              <div className="grid gap-2">
                {trailingColumns.map((column) => renderColumnToggle(column))}
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t bg-muted/30">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              columns.onReset();
              parameters.resetVisibility();
            }}
            disabled={!columns.hasCustom && !parameters.hasHiddenParameters}
            aria-label="Reset columns and parameter visibility to default"
          >
            Reset columns
          </Button>
        </SheetFooter>
      </SheetContent>

      {rowDrag
        ? createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-[60] flex items-center gap-2 rounded-lg border border-[var(--corportal-border-grey)] bg-background px-3 py-2.5 text-sm font-medium text-foreground shadow-lg"
            style={{
              left: rowDrag.left,
              top: rowDrag.top,
              width: rowDrag.width,
              height: rowDrag.height,
            }}
          >
            <span className="min-w-0 flex-1 truncate">{rowDrag.label}</span>
          </div>,
          document.body,
        )
        : null}
    </Sheet>
  );
};
