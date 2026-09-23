// english-ui:ignore-file
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ListToolbar } from "@/features/logistics/ui/list/list-toolbar";
import { StockFiltersSheet } from "@/features/logistics/ui/stock-filters-panel";
import { StockProductsMatrix, type StockMatrixColumnsView } from "@/features/logistics/ui/stock-products-matrix";
import { ListColumnsSheet } from "@/features/logistics/ui/list/list-columns-sheet";
import { ListSortMenu } from "@/features/logistics/ui/list/list-view-menu";
import type { ListColumnDef, ListSortDef } from "@/features/logistics/ui/list/list-types";
import { useListView } from "@/features/logistics/ui/list/use-list-view";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const GROUP_TABS: Array<{ id: StockGroup; label: string }> = [
  { id: "products", label: "Товары" },
  { id: "warehouses", label: "Склады" },
  { id: "regions", label: "Регионы" },
];

const STOCK_FILTERS_PANEL_ID = "stock-filters-panel";

type StockSortRow = { productId: string; name: string; total: number | null; free: number | null };

const STOCK_COLUMNS: ListColumnDef<StockSortRow>[] = [
  { id: "product", label: "Товар", locked: true, render: () => null },
  { id: "owner", label: "Закреплено за", render: () => null },
  { id: "location", label: "Место", render: () => null },
  { id: "total", label: "Всего", render: () => null },
];

const STOCK_SORTS: ListSortDef<StockSortRow>[] = [
  { id: "name", label: "Название", type: "text", value: (row) => row.name },
  { id: "code", label: "Код", type: "number", defaultDirection: "asc", value: (row) => Number(row.productId) },
  { id: "total", label: "Всего", type: "number", value: (row) => row.total },
  { id: "free", label: "Свободно", type: "number", value: (row) => row.free },
];

const productName = (snapshot: LogisticsSnapshot, productId: string) =>
  snapshot.products.find((product) => product.id === productId)?.name ?? productId;

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

  const view = useListView({
    listId: "stock",
    columns: STOCK_COLUMNS,
    sortDefs: STOCK_SORTS,
  });
  const [columnsOpen, setColumnsOpen] = useState(false);

  const sortBy = <TRow extends { productId: string }>(
    rows: TRow[],
    measure: (row: TRow) => { total: number | null; free: number | null },
  ) => {
    const byId = new Map(rows.map((row) => [row.productId, row]));
    return view
      .applySortedRows(rows.map((row) => ({ productId: row.productId, name: productName(snapshot, row.productId), ...measure(row) })))
      .map((row) => byId.get(row.productId)!);
  };

  const matrixColumns: StockMatrixColumnsView = {
    isVisible: view.isColumnVisible,
    isCollapsed: view.isColumnCollapsed,
    toggleCollapsed: view.toggleCollapsed,
    hide: view.toggleColumn,
    expandAll: view.collapsedColumnIds.length > 0 ? view.expandAllColumns : undefined,
  };

  const matrixFilter = stockMatrixFilterForGroup(filters);
  const hasActiveFilters = !isDefaultStockViewFilter(filters);

  const productRows = sortBy(
    filterRowsByProductQuery(projectProductStockMatrix(balances, matrixFilter), snapshot, filters.query),
    (row) => ({
      total: row.location.warehouses + row.location.production + row.location.transfers,
      free: row.owner.free,
    }),
  );

  const warehouseSections = filterSectionsByProductQuery(
    projectWarehouseProductMatrix(balances, matrixFilter),
    snapshot,
    filters.query,
  )
    .map((section) => ({
      ...section,
      rows: sortBy(section.rows, (row) => ({ total: row.onHand, free: row.free })),
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
      rows: sortBy(section.rows, (row) => ({ total: row.warehouses + row.production + row.transfers, free: null })),
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
      <ListToolbar
        title="Остатки"
        toggleOptions={GROUP_TABS.map((item) => ({ value: item.id, label: item.label }))}
        toggleValue={filters.group}
        onToggleChange={(value) => replaceFilters(stockFilterForGroup(filtersRef.current, value as StockGroup))}
        toggleAriaLabel="Группировка остатков"
        search={{ value: filters.query, onChange: (value) => updateFilters({ query: value }), placeholder: "Поиск: товар или код" }}
        viewControls={<ListSortMenu view={view} />}
        filtersActive={hasActiveFilters}
        onOpenFilters={dataReady ? () => setFiltersOpen(true) : undefined}
        columnsActive={view.hasCustomColumns}
        onOpenColumns={filters.group === "products" ? () => setColumnsOpen(true) : undefined}
      />

      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}

      {dataReady ? (
        <div className="min-w-0">
          <StockProductsMatrix
            snapshot={snapshot}
            group={filters.group}
            productRows={productRows}
            warehouseSections={warehouseSections}
            regionSections={regionSections}
            empty={emptyMessage}
            columns={matrixColumns}
          />
        </div>
      ) : null}

      <StockFiltersSheet
        {...filtersPanelProps}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        id={STOCK_FILTERS_PANEL_ID}
      />
      <ListColumnsSheet open={columnsOpen} onOpenChange={setColumnsOpen} columns={STOCK_COLUMNS} view={view} />
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
