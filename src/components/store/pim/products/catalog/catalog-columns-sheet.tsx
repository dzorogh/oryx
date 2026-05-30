import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATALOG_COLUMNS } from "./catalog-columns";
import type { CatalogColumns } from "./use-catalog-controller";

type CatalogColumnsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: CatalogColumns;
};

export const CatalogColumnsSheet = ({ open, onOpenChange, columns }: CatalogColumnsSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Columns</SheetTitle>
        <SheetDescription>Choose which columns appear in the catalog table.</SheetDescription>
      </SheetHeader>

      <div className="grid gap-2 px-4 pb-4">
        {CATALOG_COLUMNS.map((column) => {
          const checkboxId = `catalog-column-${column.id}`;

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

                  const isVisible = columns.isVisible(column.id);
                  if (checked !== isVisible) {
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

      <SheetFooter className="border-t bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={columns.onReset}
          disabled={!columns.hasCustom}
          aria-label="Reset catalog columns to default"
        >
          <X aria-hidden className="size-3.5" />
          Reset columns
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
