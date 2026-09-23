"use client";

import { Fragment, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { DOCUMENT_TABLE_HEAD_CLASS, FLUSH_TABLE_CLASS } from "@/features/logistics/ui/logistics-table-card";
import { cn } from "@/lib/utils";
import { ListCollapsedColumnHeader, ListColumnHeader } from "./list-column-header";
import type { ListColumnDef, ListGroupDef } from "./list-types";
import { COLLAPSED_COLUMN_WIDTH, groupRows } from "./list-view-state";
import type { ListViewController } from "./use-list-view";

type ListTableProps<TRow> = {
  columns: ListColumnDef<TRow>[];
  rows: TRow[];
  view: ListViewController<TRow>;
  groupDefs?: ListGroupDef<TRow>[];
  rowKey: (row: TRow) => string;
  /** Quantity summed into each group header, e.g. total pieces of the group's documents. */
  groupQuantity?: (row: TRow) => number | null;
  groupUnitLabel?: string;
  emptyMessage?: string;
  onResetFilters?: () => void;
  footer?: ReactNode;
};

const collapsedStyle = { width: COLLAPSED_COLUMN_WIDTH, minWidth: COLLAPSED_COLUMN_WIDTH, maxWidth: COLLAPSED_COLUMN_WIDTH };

export const ListTable = <TRow,>({
  columns,
  rows,
  view,
  groupDefs = [],
  rowKey,
  groupQuantity,
  groupUnitLabel = "док.",
  emptyMessage = "Ничего не найдено",
  onResetFilters,
  footer,
}: ListTableProps<TRow>) => {
  const displayColumns = columns
    .filter((column) => view.isColumnVisible(column.id))
    .map((column) => ({ column, collapsed: view.isColumnCollapsed(column.id) }));
  const hasCollapsed = displayColumns.some((item) => item.collapsed);
  const groupDef = view.groupId ? groupDefs.find((item) => item.id === view.groupId) : undefined;

  const renderRow = (row: TRow) => (
    <TableRow key={rowKey(row)}>
      {displayColumns.map(({ column, collapsed }) =>
        collapsed ? (
          <TableCell key={column.id} className="bg-muted/40 p-0" style={collapsedStyle} aria-hidden />
        ) : (
          <TableCell
            key={column.id}
            className={cn(
              "px-3 py-2 align-top text-sm whitespace-normal",
              column.align === "right" && "text-right tabular-nums",
            )}
            style={column.minWidth ? { minWidth: column.minWidth } : undefined}
          >
            {column.render(row)}
          </TableCell>
        ),
      )}
    </TableRow>
  );

  const renderGroups = () =>
    groupRows(rows, view.groupId, groupDefs).map((group) => {
      const collapsed = view.collapsedGroups.has(group.key);
      const quantity = groupQuantity
        ? (() => {
            let sum = 0;
            let hasQuantity = false;
            for (const row of group.rows) {
              const value = groupQuantity(row);
              if (value != null) {
                sum += value;
                hasQuantity = true;
              }
            }
            return hasQuantity ? sum : null;
          })()
        : null;
      return (
        <Fragment key={`group-${group.key}`}>
          <TableRow className="bg-muted/40 hover:bg-muted/60">
            <TableCell colSpan={displayColumns.length} className="px-3 py-2 text-sm font-semibold">
              <button
                type="button"
                aria-expanded={!collapsed}
                className="inline-flex w-full cursor-pointer items-center gap-2 text-left"
                onClick={() => view.toggleGroupCollapsed(group.key)}
              >
                <ChevronRight
                  aria-hidden
                  className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", !collapsed && "rotate-90")}
                />
                {groupDef!.renderHeader(group.key, group.rows)}
                <span className="text-xs font-normal text-muted-foreground">
                  {group.rows.length} {groupUnitLabel}
                  {quantity != null ? (
                    <>
                      {" · "}
                      <span className="whitespace-nowrap">{formatQuantity(quantity)} шт</span>
                    </>
                  ) : null}
                </span>
              </button>
            </TableCell>
          </TableRow>
          {collapsed ? null : group.rows.map(renderRow)}
        </Fragment>
      );
    });

  return (
    <Card
      size="sm"
      className={cn(logisticsCardClass, "gap-0 overflow-hidden py-0 data-[size=sm]:gap-0 data-[size=sm]:py-0")}
    >
      <CardContent className={cn("overflow-x-auto px-0 group-data-[size=sm]/card:px-0", FLUSH_TABLE_CLASS)}>
        <TooltipProvider delay={0}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {displayColumns.map(({ column, collapsed }) => {
                  const onHide = column.locked ? undefined : () => view.toggleColumn(column.id);
                  const onExpandAll = hasCollapsed ? view.expandAllColumns : undefined;
                  if (collapsed) {
                    return (
                      <TableHead key={column.id} className={cn(DOCUMENT_TABLE_HEAD_CLASS, "p-0 text-center")} style={collapsedStyle}>
                        <ListCollapsedColumnHeader
                          label={column.label}
                          onExpand={() => view.toggleCollapsed(column.id)}
                          onHide={onHide}
                          onExpandAll={onExpandAll}
                        />
                      </TableHead>
                    );
                  }
                  const sortable = view.isSortable(column.id);
                  return (
                    <TableHead
                      key={column.id}
                      className={cn(DOCUMENT_TABLE_HEAD_CLASS, column.align === "right" && "text-right")}
                      style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                    >
                      <ListColumnHeader
                        label={column.label}
                        description={column.description}
                        align={column.align}
                        sortType={column.sortType}
                        sortDirection={view.sortState?.field === column.id ? view.sortState.direction : null}
                        onHeaderClick={sortable ? () => view.cycleHeaderSort(column.id) : undefined}
                        onSort={sortable ? (direction) => view.setSortField(column.id, direction) : undefined}
                        onCollapse={() => view.toggleCollapsed(column.id)}
                        onHide={onHide}
                        onExpandAll={onExpandAll}
                      />
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={Math.max(displayColumns.length, 1)}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <span>{emptyMessage}</span>
                      {onResetFilters ? (
                        <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
                          Сбросить фильтры
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : groupDef ? (
                renderGroups()
              ) : (
                rows.map(renderRow)
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
        {footer}
      </CardContent>
    </Card>
  );
};
