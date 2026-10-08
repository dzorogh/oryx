"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { ListColumnsSheet } from "./list-columns-sheet";
import { ListActiveFilterChips, ListFilterFields, ListQuickFilters } from "./list-filter-controls";
import type { ListFilterDef } from "./list-filters";
import { ListFiltersSheet } from "./list-filters-sheet";
import { ListTable } from "./list-table";
import { ListToolbar } from "./list-toolbar";
import { ListGroupMenu, ListSortMenu } from "./list-view-menu";
import type { ListColumnDef, ListGroupDef, ListSortDef, ListSortState, ListToggleOption } from "./list-types";
import { sumProductQuantities } from "./list-view-state";
import { useListFilters } from "./use-list-filters";
import { useListView } from "./use-list-view";

type LogisticsListPageContentProps<TRow> = {
  listId: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actions?: ReactNode;
  columns: ListColumnDef<TRow>[];
  sortDefs: ListSortDef<TRow>[];
  groupDefs?: ListGroupDef<TRow>[];
  defaultSort?: ListSortState;
  rows: TRow[];
  rowKey: (row: TRow) => string;
  rowHref?: (row: TRow) => string;
  isLoading?: boolean;
  error?: string | null;
  toggleOptions?: ListToggleOption[];
  toggleValue?: string;
  onToggleChange?: (value: string) => void;
  toggleAriaLabel?: string;
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  quickControls?: ReactNode;
  /** Declarative filters: rendered in the sheet (and toolbar when `quick`), applied after `rows`. */
  filters?: ListFilterDef<TRow>[];
  /** Called whenever a declarative filter changes, e.g. to reset pagination. */
  onFiltersChange?: () => void;
  /** Extra custom fields rendered in the filter sheet after `filters`. */
  filterSheet?: ReactNode;
  /** Page-level filters (search, custom fields) are active. */
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  /** Defaults to the sum of `products` / `lines` quantities when the row has them. */
  groupQuantity?: ((row: TRow) => number | null) | null;
  groupUnitLabel?: string;
  /** A function receives rows after all filters and sorting, before `paginate`. */
  footer?: ReactNode | ((rows: TRow[]) => ReactNode);
  emptyMessage?: string;
  /** Receives rows after filtering and sorting, e.g. for pagination. Return the rows to render. */
  paginate?: (rows: TRow[]) => TRow[];
};

const NO_FILTERS: never[] = [];

const lineQuantity = (row: unknown): number | null => {
  const record = row as { products?: Array<{ quantity: number }>; lines?: Array<{ quantity: number }> };
  const lines = record.products ?? record.lines;
  return lines ? sumProductQuantities(lines) : null;
};

export const LogisticsListPageContent = <TRow,>({
  listId,
  title,
  actionLabel,
  onAction,
  actions,
  columns,
  sortDefs,
  groupDefs = [],
  defaultSort,
  rows,
  rowKey,
  rowHref,
  isLoading = false,
  error = null,
  toggleOptions,
  toggleValue,
  onToggleChange,
  toggleAriaLabel,
  search,
  quickControls,
  filters = NO_FILTERS,
  onFiltersChange,
  filterSheet,
  hasActiveFilters = false,
  onResetFilters,
  groupQuantity = lineQuantity,
  groupUnitLabel,
  footer,
  emptyMessage,
  paginate,
}: LogisticsListPageContentProps<TRow>) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const filterState = useListFilters(filters, rows, onFiltersChange);
  const view = useListView({ listId, columns, sortDefs, groupDefs, defaultSort });
  const sorted = view.applySortedRows(filterState.filteredRows);
  const visible = paginate ? paginate(sorted) : sorted;

  const anyActive = hasActiveFilters || filterState.activeCount > 0;
  const resetAll = () => {
    filterState.reset();
    onResetFilters?.();
  };
  const hasSheet = filters.length > 0 || Boolean(filterSheet);

  return (
    <>
      <ListToolbar
        title={title}
        actionLabel={actionLabel}
        onAction={onAction}
        actions={actions}
        toggleOptions={toggleOptions}
        toggleValue={toggleValue}
        onToggleChange={onToggleChange}
        toggleAriaLabel={toggleAriaLabel}
        search={search}
        quickControls={
          <>
            <ListQuickFilters filters={filterState} />
            {quickControls}
          </>
        }
        viewControls={
          <>
            <ListSortMenu view={view} />
            {groupDefs.length > 0 ? <ListGroupMenu view={view} groupDefs={groupDefs} /> : null}
          </>
        }
        filtersActive={anyActive}
        filtersCount={filterState.activeCount}
        columnsActive={view.hasCustomColumns}
        onOpenFilters={hasSheet ? () => setFiltersOpen(true) : undefined}
        onOpenColumns={() => setColumnsOpen(true)}
        activeFilters={<ListActiveFilterChips filters={filterState} onResetAll={resetAll} />}
      />

      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}

      {!isLoading && !error ? (
        <ListTable
          columns={columns}
          rows={visible}
          view={view}
          groupDefs={groupDefs}
          rowKey={rowKey}
          rowHref={rowHref}
          groupQuantity={groupQuantity ?? undefined}
          groupUnitLabel={groupUnitLabel}
          onResetFilters={anyActive ? resetAll : undefined}
          footer={typeof footer === "function" ? footer(sorted) : footer}
          emptyMessage={emptyMessage}
        />
      ) : null}

      {hasSheet ? (
        <ListFiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} hasActive={anyActive} onReset={resetAll}>
          <ListFilterFields filters={filterState} />
          {filterSheet}
        </ListFiltersSheet>
      ) : null}

      <ListColumnsSheet open={columnsOpen} onOpenChange={setColumnsOpen} columns={columns} view={view} />
    </>
  );
};
