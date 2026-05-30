import { LayoutGrid, List, Plus } from "lucide-react";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CatalogColumnsButton } from "./catalog-columns-button";
import { CatalogFiltersButton, CatalogQuickSearchControl, CatalogQuickSelectControl } from "./catalog-filters";
import { CatalogCategoryTreeFilter } from "./catalog-category-tree-filter";
import {
  CATALOG_LISTING_MODE_LABELS,
  CATALOG_LISTING_MODES,
  STORE_CATALOG_PAGE,
  type CatalogListingMode,
  type CatalogViewMode,
} from "./catalog-helpers";
import type { CatalogFilters, CatalogColumns } from "./use-catalog-controller";

type CatalogToolbarProps = {
  listingMode: CatalogListingMode;
  onListingModeChange: (mode: CatalogListingMode) => void;
  addButtonAriaLabel: string;
  filters: CatalogFilters;
  columns: CatalogColumns;
  viewMode: CatalogViewMode;
  onViewModeChange: (mode: CatalogViewMode) => void;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
};

export const CatalogToolbar = ({
  listingMode,
  onListingModeChange,
  addButtonAriaLabel,
  filters,
  columns,
  viewMode,
  onViewModeChange,
  onOpenFilters,
  onOpenColumns,
}: CatalogToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 space-y-2 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold text-foreground">{STORE_CATALOG_PAGE.pageTitle}</h1>
          <p className="text-xs text-muted-foreground">{STORE_CATALOG_PAGE.pageDescription}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Catalog listing type">
            {CATALOG_LISTING_MODES.map((mode) => {
              const isActive = listingMode === mode;
              return (
                <HomeFilterChip
                  key={mode}
                  active={isActive}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onListingModeChange(mode)}
                >
                  {CATALOG_LISTING_MODE_LABELS[mode]}
                </HomeFilterChip>
              );
            })}
          </div>

          <Button type="button" size="sm" className="shrink-0" aria-label={addButtonAriaLabel}>
            <Plus aria-hidden className="size-3.5" />
            Add
          </Button>
        </div>
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
        <CatalogColumnsButton
          hasCustomColumns={columns.hasCustom}
          disabled={viewMode === "cards"}
          onClick={onOpenColumns}
        />

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
