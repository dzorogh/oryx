import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CatalogColumnsButton } from "./catalog-columns-button";
import { CatalogFiltersButton, CatalogQuickSearchControl } from "./catalog-filters";
import { CatalogCategoryTreeFilter } from "./catalog-category-tree-filter";
import {
  CATALOG_LISTING_MODE_DESCRIPTIONS,
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

        <Button type="button" size="default" className="shrink-0" aria-label={addButtonAriaLabel}>
          <Plus aria-hidden className="size-3.5" />
          Add
        </Button>
      </div>

      <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <TooltipProvider delay={300}>
          <ToggleGroup
            value={[listingMode]}
            variant="outline"
            size="default"
            spacing={0}
            onValueChange={(value) => {
              const [nextValue] = value;
              if (nextValue === "products" || nextValue === "variants") {
                onListingModeChange(nextValue);
              }
            }}
            aria-label="Catalog listing type"
          >
            {CATALOG_LISTING_MODES.map((mode) => (
              <Tooltip key={mode}>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem value={mode} aria-label={CATALOG_LISTING_MODE_LABELS[mode]} />
                  }
                >
                  {CATALOG_LISTING_MODE_LABELS[mode]}
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-xs text-left">
                  {CATALOG_LISTING_MODE_DESCRIPTIONS[mode]}
                </TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
        </TooltipProvider>

        <CatalogQuickSearchControl value={filters.search.value} onChange={filters.search.onChange} />

        <CatalogCategoryTreeFilter
          value={filters.category.value}
          onValueChange={filters.category.onChange}
          ariaLabel="Quick filter by category"
          placeholder="Category"
          allLabel="All categories"
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
