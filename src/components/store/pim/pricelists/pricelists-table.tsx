import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getCatalogItemDetailHref, getDisplayProductName, SKELETON_ROW_COUNT } from "../products/catalog/catalog-helpers";
import { PricelistPriceCell } from "./pricelist-price-cell";
import {
  PRICELIST_COLUMNS_BY_SCOPE,
  type PricelistColumnDefinition,
} from "./pricelists-columns";
import {
  getRegionById,
  getSeedCellValue,
  type PricelistRow,
  type PricelistScope,
} from "./pricelists-demo-data";
import {
  buildPriceCellId,
  formatMoney,
  formatUsd,
  PRICE_AMOUNT_DISPLAY_CLASS,
  toUsd,
  type PriceField,
  type PricelistCellValue,
} from "./pricelists-helpers";
import type { PricelistsCollab } from "./collab/use-yjs-pricelists";

const COLUMN_BORDER = "border-l border-[var(--corportal-border-grey)]";

const getCellClassName = (column: PricelistColumnDefinition) =>
  cn(
    "max-w-0 min-w-0 overflow-hidden py-2 align-middle",
    column.kind === "name" ? "px-3" : "px-2",
    column.kind === "editable" && COLUMN_BORDER,
  );

const getHeadClassName = (column: PricelistColumnDefinition) =>
  cn(
    "h-9 min-w-0 overflow-hidden px-3 text-xs",
    column.kind === "editable" && COLUMN_BORDER,
    column.headerAlign === "right" && "text-right",
  );

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
};

const PricelistTableRow = ({ row, columns, scope, regionId, collab }: PricelistTableRowProps) => {
  const regionCurrency = getRegionById(regionId).currency;
  const isReadOnly = scope === "dealer";

  const resolveCell = (field: PriceField): EffectiveCell => {
    const cellId = buildPriceCellId(field === "purchase" ? null : regionId, row.id, field);
    const value = collab.getCell(cellId) ?? getSeedCellValue(row, field, regionCurrency);
    return { cellId, value };
  };

  const displayName = getDisplayProductName(row.name);

  return (
    <TableRow className="hover:bg-muted/40">
      {columns.map((column) => {
        if (column.kind === "name") {
          return (
            <TableCell key={column.id} className={getCellClassName(column)}>
              <ProductNameCell row={row} />
            </TableCell>
          );
        }

        if (column.kind === "spacer") {
          return <TableCell key={column.id} className={getCellClassName(column)} aria-hidden />;
        }

        const field = column.field as PriceField;
        const { cellId, value } = resolveCell(field);

        if (column.kind === "usd") {
          return (
            <TableCell key={column.id} className={getCellClassName(column)}>
              <span className={PRICE_AMOUNT_DISPLAY_CLASS}>
                {formatUsd(toUsd(value.amount, value.currency))}
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
    </TableRow>
  );
};

const renderSkeletonCell = (column: PricelistColumnDefinition) => {
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

  if (column.kind === "usd") {
    return <Skeleton className="ml-auto h-4 w-16" />;
  }

  if (column.kind === "spacer") {
    return null;
  }

  return <Skeleton className="h-8 w-full rounded-lg" />;
};

type PricelistsTableProps = {
  rows: PricelistRow[];
  isLoading: boolean;
  scope: PricelistScope;
  regionId: string;
  collab: PricelistsCollab;
  footer?: ReactNode;
};

export const PricelistsTable = ({ rows, isLoading, scope, regionId, collab, footer }: PricelistsTableProps) => {
  const columns = PRICELIST_COLUMNS_BY_SCOPE[scope];

  return (
    <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0">
      <div className="overflow-x-auto">
        <Table className="table-fixed">
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} className={column.widthClass} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                if (column.kind === "usd") {
                  return null;
                }

                const colSpan = column.kind === "editable" ? 2 : 1;

                return (
                  <TableHead
                    key={column.id}
                    colSpan={colSpan}
                    className={getHeadClassName(column)}
                  >
                    {column.label}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableCell key={column.id} className={getCellClassName(column)}>
                      {renderSkeletonCell(column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
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
