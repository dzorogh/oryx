import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CatalogQuickSelectControl } from "../products/catalog/catalog-filters";
import { CatalogCategoryTreeFilter } from "../products/catalog/catalog-category-tree-filter";
import type { PricelistFilters } from "./use-pricelists-controller";

type PricelistsFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PricelistFilters;
};

export const PricelistsFiltersSheet = ({ open, onOpenChange, filters }: PricelistsFiltersSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Filters</SheetTitle>
        <SheetDescription>Narrow down products before editing prices.</SheetDescription>
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
          <span className="text-xs font-medium text-muted-foreground">Brand</span>
          <CatalogQuickSelectControl
            value={filters.brand.value}
            onValueChange={filters.brand.onChange}
            ariaLabel="Filter by brand"
            placeholder="All brands"
            allLabel="All brands"
            options={filters.brand.options}
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
            aria-label="Reset all pricelist filters"
          >
            <X aria-hidden className="size-3.5" />
            Reset filters
          </Button>
        ) : null}
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
