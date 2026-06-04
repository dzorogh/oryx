import { Coins, Columns3, Download, SlidersHorizontal } from "lucide-react";
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
import { CatalogQuickSearchControl } from "../products/catalog/catalog-filters";
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
import { CURRENCY_CODES, type CurrencyCode } from "./pricelists-helpers";
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
  displayCurrency: CurrencyCode;
  onDisplayCurrencyChange: (currency: CurrencyCode) => void;
  onlineUsers: CollabUser[];
  connected: boolean;
  onOpenFilters: () => void;
  onOpenColumns: () => void;
  onExport: () => void;
  isExporting: boolean;
};

export const PricelistsToolbar = ({
  scope,
  onScopeChange,
  regionId,
  onRegionChange,
  filters,
  columns,
  displayCurrency,
  onDisplayCurrencyChange,
  onlineUsers,
  connected,
  onOpenFilters,
  onOpenColumns,
  onExport,
  isExporting,
}: PricelistsToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 space-y-2 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Pricelists</h1>
          <p className="text-xs text-muted-foreground">
            Review and update product prices across regions, compare them side by side, and
            collaborate with your team in real time.
          </p>
        </div>

        <PricelistsPresence users={onlineUsers} connected={connected} />
      </div>

      <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

      <TooltipProvider delay={300}>
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex flex-wrap items-center gap-2 lg:contents">
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
                <SelectTrigger
                  size="default"
                  className="min-w-[140px] flex-1 bg-background lg:w-[180px] lg:flex-none"
                  aria-label="Select region"
                >
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

            <Select
              items={CURRENCY_CODES.map((currency) => ({ value: currency, label: currency }))}
              value={displayCurrency}
              onValueChange={(value) => {
                if (value) {
                  onDisplayCurrencyChange(value as CurrencyCode);
                }
              }}
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <SelectTrigger
                      size="default"
                      className="w-[90px] shrink-0 gap-1 bg-background"
                      aria-label="Display currency"
                    />
                  }
                >
                  <Coins aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-xs text-left">
                  Display currency for every row. Prices are converted on the fly — only the
                  source-currency price is stored.
                </TooltipContent>
              </Tooltip>
              <SelectContent>
                <SelectGroup>
                  {CURRENCY_CODES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 lg:contents">
            <CatalogQuickSearchControl
              value={filters.search.value}
              onChange={filters.search.onChange}
              className="min-w-0 lg:min-w-[180px]"
            />

            <CatalogCategoryTreeFilter
              value={filters.category.value}
              onValueChange={filters.category.onChange}
              ariaLabel="Quick filter by category"
              placeholder="Category"
              allLabel="All categories"
              widthClassName="w-[120px] shrink-0 lg:w-[176px]"
            />
          </div>

          <div className="flex items-center gap-2 lg:contents">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant={filters.hasActive ? "default" : "outline"}
                    size="icon"
                    aria-label="Open catalog filters panel"
                    onClick={onOpenFilters}
                  />
                }
              >
                <SlidersHorizontal aria-hidden />
              </TooltipTrigger>
              <TooltipContent side="bottom">Filters</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant={columns.hasCustom ? "default" : "outline"}
                    size="icon"
                    aria-label="Open catalog columns panel"
                    onClick={onOpenColumns}
                  />
                }
              >
                <Columns3 aria-hidden />
              </TooltipTrigger>
              <TooltipContent side="bottom">Columns</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Export pricelist"
                    onClick={onExport}
                    disabled={isExporting}
                  />
                }
              >
                <Download aria-hidden />
              </TooltipTrigger>
              <TooltipContent side="bottom">{isExporting ? "Exporting…" : "Export"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    </CardHeader>
  </Card>
);
