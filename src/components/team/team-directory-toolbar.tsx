"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

type TeamDirectoryToolbarProps = {
  totalCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onOpenFilters: () => void;
};

export const TeamDirectoryToolbar = ({
  totalCount,
  filteredCount,
  hasActiveFilters,
  onOpenFilters,
}: TeamDirectoryToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 space-y-3 pb-0">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">Users</h1>
        <p className="text-xs text-muted-foreground">
          Search and filter the employee directory. Open a profile to view contact details and org
          context.
        </p>
      </div>

      <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Total records: {totalCount}</span>
          <span className="hidden text-[var(--corportal-border-grey)] sm:inline" aria-hidden>
            •
          </span>
          <span>Showing: {filteredCount}</span>
        </div>

        <Button
          type="button"
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          onClick={onOpenFilters}
          aria-label="Open employee filters"
          className="shrink-0"
        >
          <SlidersHorizontal aria-hidden className="size-3.5" />
          Filters
        </Button>
      </div>
    </CardHeader>
  </Card>
);
