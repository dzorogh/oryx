import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CatalogCategoryTreeFilter } from "../products/catalog/catalog-category-tree-filter";
import { CatalogColumnsButton } from "../products/catalog/catalog-columns-button";
import { CatalogFiltersButton, CatalogQuickSearchControl } from "../products/catalog/catalog-filters";
import { PricelistsPresence } from "./pricelists-presence";
import {
  PRICELIST_REGIONS,
  PRICELIST_SCOPE_DESCRIPTIONS,
  PRICELIST_SCOPE_LABELS,
  PRICELIST_SCOPES,
  parsePricelistScope,
  scopeHasRegion,
  type PricelistScope,
} from "./pricelists-demo-data";
import type { PricelistFilters } from "./use-pricelists-controller";
import type { PricelistColumns } from "./use-pricelist-columns";
import type { CollabUser } from "./collab/collab-config";

type PricelistsToolbarProps = {
  scope: PricelistScope;
  onScopeChange: (scope: PricelistScope) => void;
  regionId: string;
  onRegionChange: (regionId: string) => void;
  filters: PricelistFilters;
  columns: PricelistColumns;
  onlineUsers: CollabUser[];
  connected: boolean;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
};

export const PricelistsToolbar = ({
  scope,
  onScopeChange,
  regionId,
  onRegionChange,
  filters,
  columns,
  onlineUsers,
  connected,
  onOpenFilters,
  onOpenColumns,
}: PricelistsToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 space-y-2 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Pricelists</h1>
          <p className="text-xs text-muted-foreground">
            Manage product prices together in real time.
          </p>
        </div>

        <PricelistsPresence users={onlineUsers} connected={connected} />
      </div>

      <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <TooltipProvider delay={300}>
          <ToggleGroup
            value={[scope]}
            variant="outline"
            size="default"
            spacing={0}
            onValueChange={(value) => {
              const [nextValue] = value;
              if (nextValue) {
                onScopeChange(parsePricelistScope(nextValue));
              }
            }}
            aria-label="Pricelist type"
          >
            {PRICELIST_SCOPES.map((scopeOption) => (
              <Tooltip key={scopeOption}>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem value={scopeOption} aria-label={PRICELIST_SCOPE_LABELS[scopeOption]} />
                  }
                >
                  {PRICELIST_SCOPE_LABELS[scopeOption]}
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-xs text-left">
                  {PRICELIST_SCOPE_DESCRIPTIONS[scopeOption]}
                </TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
        </TooltipProvider>

        {scopeHasRegion(scope) ? (
          <Select
            items={PRICELIST_REGIONS.map((region) => ({
              value: region.id,
              label: region.label,
            }))}
            value={regionId}
            onValueChange={(value) => {
              if (value) {
                onRegionChange(value);
              }
            }}
          >
            <SelectTrigger size="default" className="w-[220px] bg-background" aria-label="Select region">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PRICELIST_REGIONS.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}

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
        <CatalogColumnsButton hasCustomColumns={columns.hasCustom} onClick={onOpenColumns} />

        <Button type="button" variant="outline" size="default" aria-label="Export pricelist">
          <Download aria-hidden className="size-3.5" />
          Export
        </Button>
      </div>
    </CardHeader>
  </Card>
);
