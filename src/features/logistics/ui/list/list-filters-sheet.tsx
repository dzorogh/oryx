// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type ListFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  hasActive?: boolean;
  onReset?: () => void;
};

export const ListFiltersSheet = ({
  open,
  onOpenChange,
  children,
  hasActive = false,
  onReset,
}: ListFiltersSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Фильтры</SheetTitle>
        <SheetDescription className="sr-only">Параметры отбора строк списка</SheetDescription>
      </SheetHeader>

      <div className="grid gap-4 pb-4">{children}</div>

      <SheetFooter className="border-t bg-muted/30">
        {hasActive && onReset ? (
          <Button type="button" variant="ghost" size="sm" onClick={onReset} aria-label="Сбросить фильтры">
            <X aria-hidden className="size-3.5" />
            Сбросить фильтры
          </Button>
        ) : null}
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
