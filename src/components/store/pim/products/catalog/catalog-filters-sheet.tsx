import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CatalogQuickSelectControl } from "./catalog-filters";
import { CatalogCategoryTreeFilter } from "./catalog-category-tree-filter";
import type { CatalogFilters } from "./use-catalog-controller";

type CatalogFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CatalogFilters;
};

export const CatalogFiltersSheet = ({ open, onOpenChange, filters }: CatalogFiltersSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Filters</SheetTitle>
        <SheetDescription>Advanced filtering for precise catalog item selection.</SheetDescription>
      </SheetHeader>

      <div className="grid gap-4 px-4 pb-4">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Search by name</span>
          <Input
            value={filters.search.value}
            onChange={(event) => filters.search.onChange(event.target.value)}
            placeholder="Name or SKU"
            aria-label="Search by name or SKU in the full filters panel"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Category</span>
          <CatalogCategoryTreeFilter
            value={filters.category.value}
            onValueChange={filters.category.onChange}
            ariaLabel="Filter by category"
            placeholder="All categories"
            allLabel="All categories"
            widthClassName="w-full"
          />
        </div>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Dealer status</span>
          <CatalogQuickSelectControl
            value={filters.dealerStatus.value}
            onValueChange={filters.dealerStatus.onChange}
            ariaLabel="Filter by dealer status"
            placeholder="Any status"
            allLabel="Any status"
            options={filters.dealerStatus.options}
            widthClassName="w-full"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Retail status</span>
          <CatalogQuickSelectControl
            value={filters.retailStatus.value}
            onValueChange={filters.retailStatus.onChange}
            ariaLabel="Filter by retail status"
            placeholder="Any status"
            allLabel="Any status"
            options={filters.retailStatus.options}
            widthClassName="w-full"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Production site</span>
          <CatalogQuickSelectControl
            value={filters.site.value}
            onValueChange={filters.site.onChange}
            ariaLabel="Filter by production site"
            placeholder="All sites"
            allLabel="All sites"
            options={filters.site.options}
            widthClassName="w-full"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Family</span>
          <CatalogQuickSelectControl
            value={filters.family.value}
            onValueChange={filters.family.onChange}
            ariaLabel="Filter by product family"
            placeholder="All families"
            allLabel="All families"
            options={filters.family.options}
            widthClassName="w-full"
          />
        </label>
      </div>

      <SheetFooter className="border-t bg-muted/30">
        {filters.hasActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={filters.onReset}
            aria-label="Reset all catalog filters"
          >
            <X aria-hidden className="size-3.5" />
            Reset filters
          </Button>
        ) : null}
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
