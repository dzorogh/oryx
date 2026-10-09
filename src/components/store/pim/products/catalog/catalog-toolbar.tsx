// english-ui:ignore-file
import { ChevronsDownUp, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CatalogColumnsButton } from "./catalog-columns-button";
import { CatalogFiltersButton, CatalogQuickSearchControl } from "./catalog-filters";
import { CatalogCategoryTreeFilter } from "./catalog-category-tree-filter";
import { RegionSwitcher } from "@/features/store/region-switcher";
import {
  CATALOG_LISTING_MODE_DESCRIPTIONS,
  CATALOG_LISTING_MODE_LABELS,
  CATALOG_LISTING_MODES,
  STORE_CATALOG_PAGE,
  type CatalogListingMode,
} from "./catalog-helpers";
import type { CatalogFilters, CatalogColumns } from "./use-catalog-controller";

type CatalogToolbarProps = {
  listingMode: CatalogListingMode;
  onListingModeChange: (mode: CatalogListingMode) => void;
  addButtonAriaLabel: string;
  canAdd: boolean;
  filters: CatalogFilters;
  columns: CatalogColumns;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onCollapseAllSites: () => void;
  onExpandAllSites: () => void;
};

export const CatalogToolbar = ({
  listingMode,
  onListingModeChange,
  addButtonAriaLabel,
  canAdd,
  filters,
  columns,
  onOpenFilters,
  onOpenColumns,
  onCollapseAllSites,
  onExpandAllSites,
}: CatalogToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 space-y-2 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground">{STORE_CATALOG_PAGE.pageTitle}</h1>
        </div>

        {canAdd ? (
          <Button type="button" size="default" className="shrink-0" aria-label={addButtonAriaLabel}>
            <Plus aria-hidden className="size-3.5" />
            Добавить
          </Button>
        ) : null}
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
            aria-label="Тип списка каталога"
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

        <RegionSwitcher className="w-full lg:w-auto" />

        <CatalogCategoryTreeFilter
          value={filters.category.value}
          onValueChange={filters.category.onChange}
          ariaLabel="Быстрый фильтр по категории"
          placeholder="Категория"
          allLabel="Все категории"
          widthClassName="w-[220px]"
        />

        <CatalogFiltersButton hasActiveFilters={filters.hasActive} onClick={onOpenFilters} />
        <CatalogColumnsButton hasCustomColumns={columns.hasCustom} onClick={onOpenColumns} />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onCollapseAllSites}
          >
            <ChevronsDownUp aria-hidden className="size-3.5" />
            Свернуть все
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onExpandAllSites}
          >
            <ChevronsUpDown aria-hidden className="size-3.5" />
            Развернуть все
          </Button>
        </div>
      </div>
    </CardHeader>
  </Card>
);
