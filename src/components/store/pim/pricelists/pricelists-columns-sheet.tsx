import { GripVertical, MoreHorizontal } from "lucide-react";
import { useState, type DragEvent } from "react";
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragOver = (event: DragEvent<HTMLDivElement>, paramIndex: number, isSystem: boolean) => {
    if (draggedIndex === null || isSystem) {
      return;
    }
    event.preventDefault();
    const systemIndex = parameters.defs.length - 1;
    const target = systemIndex >= 0 && paramIndex >= systemIndex ? systemIndex - 1 : paramIndex;
    setDropIndex(target);
  };

  const handleDrop = (paramIndex: number, isSystem: boolean) => {
    if (draggedIndex !== null) {
      const systemIndex = parameters.defs.length - 1;
      const target = isSystem
        ? Math.max(0, systemIndex - 1)
        : systemIndex >= 0 && paramIndex >= systemIndex
          ? systemIndex - 1
          : paramIndex;
      parameters.reorderParameter(draggedIndex, target);
    }
    setDraggedIndex(null);
    setDropIndex(null);
  };

  const resolveDropIndex = (paramIndex: number, isSystem: boolean): number => {
    const systemIndex = parameters.defs.length - 1;
    if (isSystem) {
      return Math.max(0, systemIndex - 1);
    }
    if (systemIndex >= 0 && paramIndex >= systemIndex) {
      return systemIndex - 1;
    }
    return paramIndex;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Columns</SheetTitle>
          <SheetDescription>Choose which columns appear in the pricelist table.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-2 px-4 pb-4">
            {getScopeColumns(scope).map((column) => {
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
            })}
          </div>

          {parameters.enabled && parameters.defs.length > 0 ? (
            <div className="px-4 pb-4">
              <div className="mb-2 flex items-center gap-2 border-t border-dashed border-[var(--corportal-border-grey)] pt-4">
                <span className="text-xs font-semibold text-muted-foreground">Parameters</span>
                <span className="flex-1 border-t border-dashed border-[var(--corportal-border-grey)]" />
              </div>

              <div className="grid gap-1.5">
                {parameters.defs.map((def, index) => {
                  const system = isSystemParameter(def.id);
                  const effectiveDropIndex = draggedIndex !== null ? resolveDropIndex(index, system) : null;
                  const isDropTarget =
                    effectiveDropIndex !== null &&
                    effectiveDropIndex === dropIndex &&
                    draggedIndex !== null &&
                    draggedIndex !== dropIndex;

                  return (
                    <div
                      key={def.id}
                      className={cn(
                        "group/row relative flex items-center gap-2 rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2.5",
                        draggedIndex === index && "opacity-40",
                      )}
                      onDragOver={(event) => handleDragOver(event, index, system)}
                      onDrop={() => handleDrop(index, system)}
                    >
                      {isDropTarget ? (
                        <span className="absolute inset-y-0 -left-0.5 w-0.5 rounded-full bg-primary" aria-hidden />
                      ) : null}

                      {!system ? (
                        <span
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            setDraggedIndex(index);
                          }}
                          onDragEnd={() => {
                            setDraggedIndex(null);
                            setDropIndex(null);
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Drag to reorder ${def.label}`}
                          title="Drag to reorder"
                          className="flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
                        >
                          <GripVertical className="size-3.5" aria-hidden />
                        </span>
                      ) : (
                        <span className="size-5 shrink-0" />
                      )}

                      <Checkbox
                        id={`pricelist-param-${def.id}`}
                        checked={parameters.isVisible(def.id)}
                        onCheckedChange={() => parameters.toggleVisibility(def.id)}
                        aria-label={`Toggle ${def.label} parameter`}
                      />

                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={def.label}>
                        {def.label}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger
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
    </Sheet>
  );
};
