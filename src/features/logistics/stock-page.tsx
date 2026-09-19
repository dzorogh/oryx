"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { regionCode, warehouseCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import {
  defaultStockViewFilter,
  filterRowsByProductQuery,
  filterSectionsByProductQuery,
  isDefaultStockViewFilter,
  normalizeStockViewFilter,
  parseStockViewFilter,
  stockFilterForGroup,
  stockHref,
  stockMatrixFilterForGroup,
  type StockGroup,
  type StockViewFilter,
} from "@/features/logistics/stock-filters";
import {
  projectProductStockMatrix,
  projectRegionProductMatrix,
  projectWarehouseProductMatrix,
} from "@/features/logistics/stock-product-matrix";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { StockFiltersPanel } from "@/features/logistics/ui/stock-filters-panel";
import { StockProductsMatrix } from "@/features/logistics/ui/stock-products-matrix";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const GROUP_TABS: Array<{ id: StockGroup; label: string }> = [
  { id: "products", label: "Products" },
  { id: "warehouses", label: "Warehouses" },
  { id: "regions", label: "Regions" },
];

const STOCK_TABPANEL_ID = "stock-tabpanel";
const STOCK_FILTERS_PANEL_ID = "stock-filters-panel";

const stockTabId = (group: StockGroup) => `stock-tab-${group}`;

const compareProductName = (snapshot: LogisticsSnapshot, leftId: string, rightId: string) => {
  const name = (productId: string) =>
    snapshot.products.find((product) => product.id === productId)?.name ?? productId;
  return name(leftId).localeCompare(name(rightId), "en");
};

const useDesktopFilters = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    media.addEventListener("change", sync);
    const frame = requestAnimationFrame(sync);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", sync);
    };
  }, []);

  return isDesktop;
};

const StockPageContent = () => {
  const { snapshot, balances, isLoading, error } = useLogisticsStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDesktop = useDesktopFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dataReady = !isLoading && !error;
  const snapshotOptions = dataReady ? snapshot : undefined;
  const filters = normalizeStockViewFilter(parseStockViewFilter(searchParams), snapshotOptions);
  const filtersRef = useRef(filters);
  const lastWrittenHref = useRef<string | null>(null);

  useEffect(() => {
    const fromUrl = normalizeStockViewFilter(parseStockViewFilter(searchParams), snapshotOptions);
    const href = stockHref(fromUrl);
    if (lastWrittenHref.current != null && href !== lastWrittenHref.current) {
      return;
    }
    lastWrittenHref.current = null;
    filtersRef.current = fromUrl;
  }, [searchParams, snapshotOptions]);

  const replaceFilters = (next: StockViewFilter) => {
    const normalized = normalizeStockViewFilter(next, snapshotOptions);
    filtersRef.current = normalized;
    lastWrittenHref.current = stockHref(normalized);
    router.replace(lastWrittenHref.current, { scroll: false });
  };

  const updateFilters = (patch: Partial<StockViewFilter>) => {
    replaceFilters({ ...filtersRef.current, ...patch });
  };

  const resetFilters = () => {
    replaceFilters(defaultStockViewFilter(filtersRef.current.group));
  };

  const matrixFilter = stockMatrixFilterForGroup(filters);
  const hasActiveFilters = !isDefaultStockViewFilter(filters);

  const productRows = filterRowsByProductQuery(
    projectProductStockMatrix(balances, matrixFilter),
    snapshot,
    filters.query,
  ).sort((left, right) => compareProductName(snapshot, left.productId, right.productId));

  const warehouseSections = filterSectionsByProductQuery(
    projectWarehouseProductMatrix(balances, matrixFilter),
    snapshot,
    filters.query,
  )
    .map((section) => ({
      ...section,
      rows: [...section.rows].sort((left, right) =>
        compareProductName(snapshot, left.productId, right.productId),
      ),
    }))
    .sort((left, right) =>
      warehouseCode(snapshot, left.warehouseId).localeCompare(warehouseCode(snapshot, right.warehouseId), "en"),
    );

  const regionSections = filterSectionsByProductQuery(
    projectRegionProductMatrix(balances, matrixFilter),
    snapshot,
    filters.query,
  )
    .map((section) => ({
      ...section,
      rows: [...section.rows].sort((left, right) =>
        compareProductName(snapshot, left.productId, right.productId),
      ),
    }))
    .sort((left, right) =>
      regionCode(snapshot, left.regionId).localeCompare(regionCode(snapshot, right.regionId), "en"),
    );

  const emptyMessage = hasActiveFilters
    ? "No on-hand stock matches the selected filters."
    : "No on-hand stock yet.";

  const filtersPanelProps = {
    snapshot,
    group: filters.group,
    filters,
    hasActiveFilters,
    onChange: updateFilters,
    onReset: resetFilters,
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Stock" }]}>
      <LogisticsToolbar
        title="Stock"
        description="On-hand stock by owner and location. Shipped customer quantity is not included."
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Stock grouping">
            {GROUP_TABS.map((item) => (
              <HomeFilterChip
                key={item.id}
                id={stockTabId(item.id)}
                active={filters.group === item.id}
                role="tab"
                aria-selected={filters.group === item.id}
                aria-controls={STOCK_TABPANEL_ID}
                onClick={() => replaceFilters(stockFilterForGroup(filtersRef.current, item.id))}
              >
                {item.label}
              </HomeFilterChip>
            ))}
          </div>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="ml-auto gap-1 text-muted-foreground"
              aria-label="Reset stock filters"
            >
              <X aria-hidden className="size-3.5" />
              Reset
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search by name or SKU</span>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder="Search by name or SKU"
                className="pl-8"
                aria-label="Search stock by name or SKU"
              />
            </div>
          </label>
          <Button
            type="button"
            variant={filtersOpen || hasActiveFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltersOpen((open) => !open)}
            disabled={!dataReady}
            aria-expanded={filtersOpen}
            aria-controls={STOCK_FILTERS_PANEL_ID}
            aria-label={filtersOpen ? "Close stock filters" : "Open stock filters"}
          >
            <SlidersHorizontal aria-hidden className="size-3.5" />
            Filters
          </Button>
        </div>
      </LogisticsToolbar>

      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}

      {dataReady ? (
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start">
          <div
            id={STOCK_TABPANEL_ID}
            role="tabpanel"
            aria-labelledby={stockTabId(filters.group)}
            className="min-w-0 flex-1"
          >
            <StockProductsMatrix
              snapshot={snapshot}
              group={filters.group}
              productRows={productRows}
              warehouseSections={warehouseSections}
              regionSections={regionSections}
              empty={emptyMessage}
            />
          </div>
          {filtersOpen && isDesktop ? (
            <StockFiltersPanel
              {...filtersPanelProps}
              id={STOCK_FILTERS_PANEL_ID}
              variant="aside"
              onClose={() => setFiltersOpen(false)}
            />
          ) : null}
        </div>
      ) : null}

      <Sheet open={filtersOpen && !isDesktop} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md"
          id={!isDesktop ? STOCK_FILTERS_PANEL_ID : undefined}
        >
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              {filters.group === "products"
                ? "Owner, location, and region for the product matrix."
                : filters.group === "warehouses"
                  ? "Warehouse, owner, and region for warehouse sections."
                  : "Region, location, and warehouse for region reserve."}
            </SheetDescription>
          </SheetHeader>
          <StockFiltersPanel {...filtersPanelProps} variant="sheet" />
        </SheetContent>
      </Sheet>
    </LogisticsPageShell>
  );
};

export const StockPage = () => (
  <Suspense
    fallback={
      <LogisticsPageShell crumbs={[{ label: "Stock" }]}>
        <LogisticsLoading />
      </LogisticsPageShell>
    }
  >
    <StockPageContent />
  </Suspense>
);
