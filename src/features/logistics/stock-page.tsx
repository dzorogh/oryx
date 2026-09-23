// english-ui:ignore-file
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { StockFiltersSheet } from "@/features/logistics/ui/stock-filters-panel";
import { StockProductsMatrix } from "@/features/logistics/ui/stock-products-matrix";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const GROUP_TABS: Array<{ id: StockGroup; label: string }> = [
  { id: "products", label: "Товары" },
  { id: "warehouses", label: "Склады" },
  { id: "regions", label: "Регионы" },
];

const STOCK_TABPANEL_ID = "stock-tabpanel";
const STOCK_FILTERS_PANEL_ID = "stock-filters-panel";

const stockTabId = (group: StockGroup) => `stock-tab-${group}`;

const compareProductName = (snapshot: LogisticsSnapshot, leftId: string, rightId: string) => {
  const name = (productId: string) =>
    snapshot.products.find((product) => product.id === productId)?.name ?? productId;
  return name(leftId).localeCompare(name(rightId), "en");
};

const StockPageContent = () => {
  const { snapshot, balances, isLoading, error } = useLogisticsStore({ kind: "stock" });
  const searchParams = useSearchParams();
  const router = useRouter();
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
    ? "Нет наличия по выбранным фильтрам."
    : "Пока нет наличия.";

  const filtersPanelProps = {
    snapshot,
    group: filters.group,
    filters,
    hasActiveFilters,
    onChange: updateFilters,
    onReset: resetFilters,
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Остатки" }]}>
      <LogisticsToolbar
        title="Остатки"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex gap-0.5 rounded-[9px] bg-muted p-[3px]"
            role="tablist"
            aria-label="Группировка остатков"
          >
            {GROUP_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                id={stockTabId(item.id)}
                role="tab"
                aria-selected={filters.group === item.id}
                aria-controls={STOCK_TABPANEL_ID}
                onClick={() => replaceFilters(stockFilterForGroup(filtersRef.current, item.id))}
                className={
                  filters.group === item.id
                    ? "rounded-[7px] bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm"
                    : "rounded-[7px] px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="ml-auto gap-1 text-muted-foreground"
              aria-label="Сбросить фильтры остатков"
            >
              <X aria-hidden className="size-3.5" />
              Сбросить
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Поиск по названию или коду</span>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder="Поиск по названию или коду"
                className="pl-8"
                aria-label="Поиск остатков по названию или коду"
              />
            </div>
          </label>
          <Button
            type="button"
            variant={filtersOpen || hasActiveFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltersOpen(true)}
            disabled={!dataReady}
            aria-expanded={filtersOpen}
            aria-controls={STOCK_FILTERS_PANEL_ID}
            aria-haspopup="dialog"
            aria-label="Открыть фильтры остатков"
          >
            <SlidersHorizontal aria-hidden className="size-3.5" />
            Фильтры
          </Button>
        </div>
      </LogisticsToolbar>

      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}

      {dataReady ? (
        <div
          id={STOCK_TABPANEL_ID}
          role="tabpanel"
          aria-labelledby={stockTabId(filters.group)}
          className="min-w-0"
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
      ) : null}

      <StockFiltersSheet
        {...filtersPanelProps}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        id={STOCK_FILTERS_PANEL_ID}
      />
    </LogisticsPageShell>
  );
};

export const StockPage = () => (
  <Suspense
    fallback={
      <LogisticsPageShell crumbs={[{ label: "Остатки" }]}>
        <LogisticsLoading />
      </LogisticsPageShell>
    }
  >
    <StockPageContent />
  </Suspense>
);
