import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getCatalogItemDetailHref, getDisplayProductName, SKELETON_ROW_COUNT } from "../products/catalog/catalog-helpers";
import { PricelistPriceCell } from "./pricelist-price-cell";
import { PricelistsExpandedRegions } from "./pricelists-expanded-regions";
import type { PricelistColumnDefinition } from "./pricelists-columns";
import {
  getRegionById,
  getSeedCellValue,
  getSeedDealerStatus,
  PRICELIST_REGIONS,
  type PricelistRow,
  type PricelistScope,
} from "./pricelists-demo-data";
import {
  buildPriceCellId,
  buildStatusCellId,
  formatMoney,
  formatUsdValue,
  PRICE_AMOUNT_DISPLAY_CLASS,
  PRICE_USD_DISPLAY_CLASS,
  toUsd,
  type PriceField,
  type PricelistCellValue,
} from "./pricelists-helpers";
import type { PricelistsCollab } from "./collab/use-yjs-pricelists";

// Shared horizontal padding keeps each header aligned with its column cells.
const getColumnPadding = (column: PricelistColumnDefinition) => (column.kind === "name" ? "px-3" : "px-2");

const getCellClassName = (column: PricelistColumnDefinition) =>
  cn("max-w-0 min-w-0 overflow-hidden py-2 align-middle", getColumnPadding(column));

const getHeadClassName = (column: PricelistColumnDefinition) =>
  cn("h-9 min-w-0 overflow-hidden text-left text-xs", getColumnPadding(column));

const ProductNameCell = ({ row }: { row: PricelistRow }) => {
  const displayName = getDisplayProductName(row.name);

  return (
    <div className="flex w-full max-w-full min-w-0 items-center gap-2.5" title={displayName}>
      <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-[var(--corportal-border-grey)] bg-white">
        <Image src={row.imageSrc} alt={row.imageAlt} fill sizes="36px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1 basis-0 overflow-hidden">
        <Link
          href={getCatalogItemDetailHref(row.id, "variants")}
          className="block truncate text-sm font-semibold text-foreground outline-none hover:underline focus-visible:underline"
        >
          {displayName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          #{row.numericId} <span className="text-[11px]">· {row.brand}</span>
        </p>
      </div>
    </div>
  );
};

const countAvailableRegions = (row: PricelistRow, collab: PricelistsCollab): number =>
  PRICELIST_REGIONS.reduce((available, region) => {
    const status = collab.getStatus(buildStatusCellId(region.id, row.id)) ?? getSeedDealerStatus(row, region.id);
    return status === "available" ? available + 1 : available;
  }, 0);

type DealerStatusSummaryCellProps = {
  row: PricelistRow;
  collab: PricelistsCollab;
  isExpandable: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

const DealerStatusSummaryCell = ({
  row,
  collab,
  isExpandable,
  isExpanded,
  onToggleExpand,
}: DealerStatusSummaryCellProps) => {
  const total = PRICELIST_REGIONS.length;
  const available = countAvailableRegions(row, collab);
  const ratio = total === 0 ? 0 : available / total;
  const percent = Math.round(ratio * 100);
  const isSold = available > 0;
  const displayName = getDisplayProductName(row.name);

  const content = (
    <>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            isSold ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
          aria-hidden
        />
        <span className="truncate text-xs text-foreground">
          Sold in <span className="font-semibold tabular-nums">{available}</span> of{" "}
          <span className="tabular-nums">{total}</span> regions
        </span>
        {isExpandable ? (
          <ChevronRight
            className={cn(
              "ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform",
              isExpanded && "rotate-90",
            )}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", isSold ? "bg-emerald-500" : "bg-transparent")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </>
  );

  if (!isExpandable) {
    return (
      <div className="flex w-full flex-col gap-1" title={`Sold in ${available} of ${total} regions`}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggleExpand}
      aria-expanded={isExpanded}
      aria-label={
        isExpanded
          ? `Collapse regional dealer status for ${displayName}`
          : `Expand regional dealer status for ${displayName}`
      }
      title={`Sold in ${available} of ${total} regions`}
      className="flex w-full cursor-pointer flex-col gap-1 rounded-md p-1 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {content}
    </button>
  );
};

type EffectiveCell = {
  cellId: string;
  value: PricelistCellValue;
};

type PricelistTableRowProps = {
  row: PricelistRow;
  columns: PricelistColumnDefinition[];
  scope: PricelistScope;
  regionId: string;
  collab: PricelistsCollab;
  isExpandable: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

const PricelistTableRow = ({
  row,
  columns,
  scope,
  regionId,
  collab,
  isExpandable,
  isExpanded,
  onToggleExpand,
}: PricelistTableRowProps) => {
  const regionCurrency = getRegionById(regionId).currency;
  const isReadOnly = scope === "dealer";

  const resolveCell = (field: PriceField): EffectiveCell => {
    const cellId = buildPriceCellId(field === "purchase" ? null : regionId, row.id, field);
    const value = collab.getCell(cellId) ?? getSeedCellValue(row, field, regionCurrency);
    return { cellId, value };
  };

  const displayName = getDisplayProductName(row.name);

  return (
    <Fragment>
    <TableRow className="hover:bg-muted/40">
      {columns.map((column) => {
        if (column.kind === "name") {
          return (
            <TableCell key={column.id} className={getCellClassName(column)}>
              <div className="flex w-full min-w-0 items-center gap-1.5">
                {isExpandable ? (
                  <button
                    type="button"
                    onClick={onToggleExpand}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? `Collapse ${displayName}` : `Expand ${displayName}`}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <ChevronRight className={cn("size-4 transition-transform", isExpanded && "rotate-90")} />
                  </button>
                ) : null}
                <div className="min-w-0 flex-1">
                  <ProductNameCell row={row} />
                </div>
              </div>
            </TableCell>
          );
        }

        if (column.kind === "statusSummary") {
          return (
            <TableCell key={column.id} className={getCellClassName(column)}>
              <DealerStatusSummaryCell
                row={row}
                collab={collab}
                isExpandable={isExpandable}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
              />
            </TableCell>
          );
        }

        const field = column.field as PriceField;
        const { cellId, value } = resolveCell(field);

        if (column.kind === "usd") {
          return (
            <TableCell key={column.id} className={getCellClassName(column)}>
              <span className={PRICE_USD_DISPLAY_CLASS}>
                {formatUsdValue(toUsd(value.amount, value.currency))}
              </span>
            </TableCell>
          );
        }

        if (isReadOnly) {
          return (
            <TableCell key={column.id} className={getCellClassName(column)}>
              <span className={PRICE_AMOUNT_DISPLAY_CLASS}>
                {formatMoney(value.amount, value.currency)}
              </span>
            </TableCell>
          );
        }

        return (
          <TableCell key={column.id} className={getCellClassName(column)}>
            <PricelistPriceCell
              value={value}
              editors={collab.getEditors(cellId)}
              ariaLabel={`${column.label} for ${displayName}`}
              onEditingChange={(editing) => collab.setEditing(editing ? cellId : null)}
              onChange={(next) => collab.setCell(cellId, next)}
            />
          </TableCell>
        );
      })}
      <TableCell aria-hidden />
    </TableRow>
      {isExpandable && isExpanded ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={columns.length + 1} className="bg-muted/20 p-3">
            <PricelistsExpandedRegions row={row} collab={collab} />
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
};

const renderSkeletonCell = (column: PricelistColumnDefinition, isReadOnly: boolean) => {
  if (column.kind === "name") {
    return (
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  if (column.kind === "statusSummary") {
    return (
      <div className="flex w-full flex-col gap-1">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    );
  }

  // USD columns and read-only prices render as plain text, so their skeleton is
  // a short line; editable prices use a full-width input-shaped skeleton.
  if (column.kind === "usd" || isReadOnly) {
    return <Skeleton className="h-4 w-16" />;
  }

  return <Skeleton className="h-7 w-full rounded-lg" />;
};

type PricelistsTableProps = {
  rows: PricelistRow[];
  columns: PricelistColumnDefinition[];
  isLoading: boolean;
  scope: PricelistScope;
  regionId: string;
  collab: PricelistsCollab;
  footer?: ReactNode;
};

export const PricelistsTable = ({
  rows,
  columns,
  isLoading,
  scope,
  regionId,
  collab,
  footer,
}: PricelistsTableProps) => {
  const isExpandable = scope === "global";
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());

  const toggleExpanded = (rowId: string) =>
    setExpandedRowIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });

  return (
  <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0">
    <div className="overflow-x-auto">
      <Table className="table-fixed">
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} className={column.widthClass} />
          ))}
          {/* Flexible trailing column keeps data columns at their fixed widths. */}
          <col />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.id} className={getHeadClassName(column)}>
                {column.label}
              </TableHead>
            ))}
            <TableHead aria-hidden />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableCell key={column.id} className={getCellClassName(column)}>
                    {renderSkeletonCell(column, scope === "dealer")}
                  </TableCell>
                ))}
                <TableCell aria-hidden />
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="px-3 py-8 text-center text-sm text-muted-foreground"
              >
                No products match the selected filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <PricelistTableRow
                key={row.id}
                row={row}
                columns={columns}
                scope={scope}
                regionId={regionId}
                collab={collab}
                isExpandable={isExpandable}
                isExpanded={expandedRowIds.has(row.id)}
                onToggleExpand={() => toggleExpanded(row.id)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
    {footer}
  </Card>
  );
};
