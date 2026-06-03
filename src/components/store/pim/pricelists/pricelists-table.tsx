import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useState, type DragEvent, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getCatalogItemDetailHref, getDisplayProductName, SKELETON_ROW_COUNT } from "../products/catalog/catalog-helpers";
import { PricelistParameterCell } from "./pricelist-parameter-cell";
import { PricelistParameterHeaderCell } from "./pricelist-parameter-header";
import { PricelistParameterDialog } from "./pricelist-parameter-dialog";
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
import { buildParamOverrideId, isSystemParameter, type ParameterDef } from "./pricelists-parameters";
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
import type { PricelistParameters } from "./use-pricelist-parameters";

// Shared horizontal padding keeps each header aligned with its column cells.
const getColumnPadding = (column: PricelistColumnDefinition) => (column.kind === "name" ? "px-3" : "px-2");

const getCellClassName = (column: PricelistColumnDefinition) =>
  cn("max-w-0 min-w-0 overflow-hidden py-2 align-middle", getColumnPadding(column));

const getHeadClassName = (column: PricelistColumnDefinition) =>
  cn("h-9 min-w-0 overflow-hidden text-left text-xs", getColumnPadding(column));

// Parameter columns read as a distinct dynamic group: faint tint + a dashed
// divider before the first one, and visible overflow for the drag/insert/menu
// affordances.
const PARAMETER_GROUP_TINT = "bg-muted/20";
const PARAMETER_GROUP_DIVIDER = "border-l border-dashed border-[var(--corportal-border-grey)]";

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
  firstParameterIndex: number;
  scope: PricelistScope;
  regionId: string;
  collab: PricelistsCollab;
  parameters: PricelistParameters;
  isExpandable: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

const PricelistTableRow = ({
  row,
  columns,
  firstParameterIndex,
  scope,
  regionId,
  collab,
  parameters,
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
        {columns.map((column, index) => {
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

          if (column.kind === "parameter" && column.paramId) {
            const paramId = column.paramId;
            const { value, isOverridden } = parameters.resolveCell(paramId, row.id);
            const overrideId = buildParamOverrideId(regionId, paramId, row.id);
            return (
              <TableCell
                key={column.id}
                className={cn(
                  getCellClassName(column),
                  PARAMETER_GROUP_TINT,
                  index === firstParameterIndex && PARAMETER_GROUP_DIVIDER,
                )}
              >
                <PricelistParameterCell
                  value={value}
                  isOverridden={isOverridden}
                  baseValue={parameters.getBaseValue(paramId)}
                  unit={column.unit ?? ""}
                  parameterLabel={column.label}
                  productName={displayName}
                  editors={collab.getEditors(overrideId)}
                  ariaLabel={`${column.label} for ${displayName}`}
                  onEditingChange={(editing) => collab.setEditing(editing ? overrideId : null)}
                  onSetOverride={(next) => parameters.setOverride(paramId, row.id, next)}
                  onClearOverride={() => parameters.clearOverride(paramId, row.id)}
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
  // a short line; editable prices and parameters use a full-width input shape.
  if (column.kind === "usd" || (isReadOnly && column.kind !== "parameter")) {
    return <Skeleton className="h-4 w-16" />;
  }

  return <Skeleton className="h-7 w-full rounded-lg" />;
};

type DialogState =
  | { mode: "create"; atIndex?: number }
  | { mode: "edit"; def: ParameterDef };

type PricelistsTableProps = {
  rows: PricelistRow[];
  columns: PricelistColumnDefinition[];
  isLoading: boolean;
  scope: PricelistScope;
  regionId: string;
  collab: PricelistsCollab;
  parameters: PricelistParameters;
  footer?: ReactNode;
};

export const PricelistsTable = ({
  rows,
  columns,
  isLoading,
  scope,
  regionId,
  collab,
  parameters,
  footer,
}: PricelistsTableProps) => {
  const isExpandable = scope === "global";
  const showParameters = parameters.enabled;
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const parameterColumns = showParameters ? parameters.columns : [];
  const allColumns = [...columns, ...parameterColumns];
  const firstParameterIndex = allColumns.findIndex((column) => column.isParameter);

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

  const resolveDropIndex = (targetParamIndex: number, targetIsSystem: boolean): number => {
    const systemIndex = parameters.defs.length - 1;
    if (targetIsSystem) {
      return Math.max(0, systemIndex - 1);
    }
    if (systemIndex >= 0 && targetParamIndex >= systemIndex) {
      return systemIndex - 1;
    }
    return targetParamIndex;
  };

  const handleDrop = (targetParamIndex: number, targetIsSystem: boolean) => {
    if (draggedIndex !== null) {
      parameters.reorderParameter(draggedIndex, resolveDropIndex(targetParamIndex, targetIsSystem));
    }
    setDraggedIndex(null);
    setDropIndex(null);
  };

  return (
    <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0">
      <div className="overflow-x-auto">
        <Table className="table-fixed">
          <colgroup>
            {allColumns.map((column) => (
              <col key={column.id} className={column.widthClass} />
            ))}
            {/* Flexible trailing column keeps data columns at their fixed widths. */}
            <col />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {allColumns.map((column, index) => {
                if (column.kind === "parameter" && column.paramId) {
                  const paramIndex = index - columns.length;
                  const def = parameters.defs[paramIndex];
                  if (!def) {
                    return <TableHead key={column.id} aria-hidden />;
                  }
                  const isFirst = index === firstParameterIndex;
                  const isSystem = isSystemParameter(def.id);
                  return (
                    <TableHead
                      key={column.id}
                      className={cn(
                        "h-9 min-w-0 overflow-visible px-2 align-middle text-left text-xs",
                        PARAMETER_GROUP_TINT,
                        isFirst && PARAMETER_GROUP_DIVIDER,
                      )}
                      onDragOver={(event: DragEvent<HTMLTableCellElement>) => {
                        if (draggedIndex !== null) {
                          event.preventDefault();
                          setDropIndex(resolveDropIndex(paramIndex, isSystem));
                        }
                      }}
                      onDrop={(event: DragEvent<HTMLTableCellElement>) => {
                        if (draggedIndex !== null) {
                          event.preventDefault();
                          handleDrop(paramIndex, isSystem);
                        }
                      }}
                    >
                      <PricelistParameterHeaderCell
                        def={def}
                        isSystem={isSystem}
                        isFirstParameter={isFirst}
                        isDragging={draggedIndex === paramIndex}
                        isDropTarget={
                          dropIndex === resolveDropIndex(paramIndex, isSystem) &&
                          draggedIndex !== null &&
                          draggedIndex !== resolveDropIndex(paramIndex, isSystem)
                        }
                        onInsertBefore={() => setDialogState({ mode: "create", atIndex: paramIndex })}
                        onInsertAfter={() => setDialogState({ mode: "create", atIndex: paramIndex + 1 })}
                        onEdit={() => setDialogState({ mode: "edit", def })}
                        onResetAll={() => parameters.resetAllOverrides(def.id)}
                        onDelete={() => parameters.removeParameter(def.id)}
                        onDragStart={(event) => {
                          if (isSystem) {
                            return;
                          }
                          event.dataTransfer.effectAllowed = "move";
                          setDraggedIndex(paramIndex);
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDropIndex(null);
                        }}
                      />
                    </TableHead>
                  );
                }

                return (
                  <TableHead key={column.id} className={getHeadClassName(column)}>
                    {column.label}
                  </TableHead>
                );
              })}
              <TableHead aria-hidden />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                  {allColumns.map((column, columnIndex) => (
                    <TableCell
                      key={column.id}
                      className={cn(
                        getCellClassName(column),
                        column.isParameter && PARAMETER_GROUP_TINT,
                        columnIndex === firstParameterIndex && PARAMETER_GROUP_DIVIDER,
                      )}
                    >
                      {renderSkeletonCell(column, scope === "dealer")}
                    </TableCell>
                  ))}
                  <TableCell aria-hidden />
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length + 1}
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
                  columns={allColumns}
                  firstParameterIndex={firstParameterIndex}
                  scope={scope}
                  regionId={regionId}
                  collab={collab}
                  parameters={parameters}
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

      {dialogState ? (
        <PricelistParameterDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDialogState(null);
            }
          }}
          mode={dialogState.mode}
          defaultUnit={getRegionById(regionId).currency}
          parameterDefs={parameters.defs}
          editingParamId={dialogState.mode === "edit" ? dialogState.def.id : undefined}
          initialLabel={dialogState.mode === "edit" ? dialogState.def.label : ""}
          initialSlug={dialogState.mode === "edit" ? (dialogState.def.slug ?? "") : ""}
          initialUnit={dialogState.mode === "edit" ? dialogState.def.unit : undefined}
          initialFormula={dialogState.mode === "edit" ? (dialogState.def.formula ?? "") : ""}
          onSubmit={(values) => {
            if (dialogState.mode === "create") {
              parameters.addParameter({
                label: values.label,
                unit: values.unit,
                baseValue: values.baseValue,
                slug: values.slug,
                formula: values.formula,
                atIndex: dialogState.atIndex,
              });
            } else {
              parameters.updateParameter(dialogState.def.id, {
                label: values.label,
                unit: values.unit,
                slug: values.slug,
                formula: values.formula,
              });
              parameters.setBaseValue(dialogState.def.id, values.baseValue);
            }
            setDialogState(null);
          }}
        />
      ) : null}
    </Card>
  );
};
