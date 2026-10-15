// english-ui:ignore-file
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ListColumnDef } from "./list-types";
import type { ListViewController } from "./use-list-view";

type ListColumnsSheetProps<TRow> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ListColumnDef<TRow>[];
  view: ListViewController<TRow>;
};

export const ListColumnsSheet = <TRow,>({
  open,
  onOpenChange,
  columns,
  view,
}: ListColumnsSheetProps<TRow>) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Колонки</SheetTitle>
        <SheetDescription className="sr-only">Выбор видимых колонок таблицы</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="grid gap-2">
          {columns.map((column) => {
            const checkboxId = `list-column-${column.id}`;
            return (
              <label
                key={column.id}
                htmlFor={checkboxId}
                className="flex items-center gap-3 rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2.5"
              >
                <Checkbox
                  id={checkboxId}
                  checked={view.isColumnVisible(column.id)}
                  disabled={column.locked}
                  onCheckedChange={(checked) => {
                    if (typeof checked !== "boolean" || column.locked) {
                      return;
                    }
                    if (checked !== view.isColumnVisible(column.id)) {
                      view.toggleColumn(column.id);
                    }
                  }}
                  aria-label={`Показать колонку «${column.label}»`}
                />
                <span className="text-sm font-medium text-foreground">{column.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <SheetFooter className="border-t bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => view.resetColumns()}
          disabled={!view.hasCustomColumns}
          aria-label="Сбросить колонки"
        >
          Сбросить
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
