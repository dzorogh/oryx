import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CatalogFiltersButton, CatalogQuickSearchControl, CatalogQuickSelectControl } from "./catalog-filters";
import { CatalogCategoryTreeFilter } from "./catalog-category-tree-filter";
import type { CatalogViewMode, StoreCatalogPageConfig } from "./catalog-helpers";
import type { CatalogFilters } from "./use-catalog-controller";

type CatalogToolbarProps = {
  config: Pick<StoreCatalogPageConfig, "pageTitle" | "pageDescription" | "addButtonAriaLabel">;
  filters: CatalogFilters;
  viewMode: CatalogViewMode;
  onViewModeChange: (mode: CatalogViewMode) => void;
  onOpenFilters: () => void;
};

export const CatalogToolbar = ({
  config,
  filters,
  viewMode,
  onViewModeChange,
  onOpenFilters,
}: CatalogToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="space-y-3 pb-0 gap-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">{config.pageTitle}</h1>
          <p className="text-xs text-muted-foreground">{config.pageDescription}</p>
        </div>

        <Button type="button" size="sm" aria-label={config.addButtonAriaLabel}>
          <Plus aria-hidden className="size-3.5" />
          Add
        </Button>
      </div>

      <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

      <div className="flex flex-wrap items-center gap-2">
        <CatalogQuickSearchControl value={filters.search.value} onChange={filters.search.onChange} />

        <CatalogCategoryTreeFilter
          value={filters.category.value}
          onValueChange={filters.category.onChange}
          ariaLabel="Quick filter by category"
          placeholder="Category"
          allLabel="All categories"
          widthClassName="w-[220px]"
        />

        <CatalogQuickSelectControl
          value={filters.dealerStatus.value}
          onValueChange={filters.dealerStatus.onChange}
          ariaLabel="Quick filter by dealer status"
          placeholder="Dealer status"
          allLabel="Any dealer status"
          options={filters.dealerStatus.options}
          widthClassName="w-[220px]"
        />

        <CatalogQuickSelectControl
          value={filters.retailStatus.value}
          onValueChange={filters.retailStatus.onChange}
          ariaLabel="Quick filter by retail status"
          placeholder="Retail status"
          allLabel="Any retail status"
          options={filters.retailStatus.options}
          widthClassName="w-[220px]"
        />

        <CatalogFiltersButton hasActiveFilters={filters.hasActive} onClick={onOpenFilters} />

        <ToggleGroup
          value={[viewMode]}
          variant="outline"
          size="default"
          spacing={0}
          onValueChange={(value) => {
            const [nextValue] = value;
            if (nextValue === "table" || nextValue === "cards") {
              onViewModeChange(nextValue);
            }
          }}
          aria-label="Switch catalog view"
        >
          <ToggleGroupItem value="table" aria-label="Table view">
            <List aria-hidden className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="cards" aria-label="Card view">
            <LayoutGrid aria-hidden className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </CardHeader>
  </Card>
);
