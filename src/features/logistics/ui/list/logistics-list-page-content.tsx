"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { ListColumnsSheet } from "./list-columns-sheet";
import { ListFiltersSheet } from "./list-filters-sheet";
import { ListTable } from "./list-table";
import { ListToolbar } from "./list-toolbar";
import { ListGroupMenu, ListSortMenu } from "./list-view-menu";
import type { ListColumnDef, ListGroupDef, ListSortDef, ListSortState, ListToggleOption } from "./list-types";
import { sumProductQuantities } from "./list-view-state";
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
  isLoading?: boolean;
  error?: string | null;
  toggleOptions?: ListToggleOption[];
  toggleValue?: string;
  onToggleChange?: (value: string) => void;
  toggleAriaLabel?: string;
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  quickControls?: ReactNode;
  filterSheet?: ReactNode;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  /** Defaults to the sum of `products` / `lines` quantities when the row has them. */
  groupQuantity?: ((row: TRow) => number | null) | null;
  groupUnitLabel?: string;
  footer?: ReactNode;
  emptyMessage?: string;
  /** Receives rows after filtering and sorting, e.g. for pagination. Return the rows to render. */
  paginate?: (rows: TRow[]) => TRow[];
};

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
  isLoading = false,
  error = null,
  toggleOptions,
  toggleValue,
  onToggleChange,
  toggleAriaLabel,
  search,
  quickControls,
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

  const view = useListView({ listId, columns, sortDefs, groupDefs, defaultSort });
  const sorted = view.applySortedRows(rows);
  const visible = paginate ? paginate(sorted) : sorted;

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
        quickControls={quickControls}
        viewControls={
          <>
            <ListSortMenu view={view} />
            {groupDefs.length > 0 ? <ListGroupMenu view={view} groupDefs={groupDefs} /> : null}
          </>
        }
        filtersActive={hasActiveFilters}
        columnsActive={view.hasCustomColumns}
        onOpenFilters={filterSheet ? () => setFiltersOpen(true) : undefined}
        onOpenColumns={() => setColumnsOpen(true)}
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
          groupQuantity={groupQuantity ?? undefined}
          groupUnitLabel={groupUnitLabel}
          onResetFilters={hasActiveFilters ? onResetFilters : undefined}
          footer={footer}
          emptyMessage={emptyMessage}
        />
      ) : null}

      {filterSheet ? (
        <ListFiltersSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          hasActive={hasActiveFilters}
          onReset={onResetFilters}
        >
          {filterSheet}
        </ListFiltersSheet>
      ) : null}

      <ListColumnsSheet open={columnsOpen} onOpenChange={setColumnsOpen} columns={columns} view={view} />
    </>
  );
};
