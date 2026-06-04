import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getCatalogItemDetailHref, getDisplayProductName, SKELETON_ROW_COUNT } from "../products/catalog/catalog-helpers";
import { ColumnHeaderLabel } from "./pricelist-column-header";
import { DerivedValueCell, useDerivedTarget } from "./pricelist-derived-cell";
import { PricelistParameterCell } from "./pricelist-parameter-cell";
import { PricelistParameterHeaderCell } from "./pricelist-parameter-header";
import { PricelistParameterDialog } from "./pricelist-parameter-dialog";
import { PricelistPriceCell } from "./pricelist-price-cell";
import { PricelistPriceUsdCell } from "./pricelist-price-usd-cell";
import { PricelistsExpandedRegions } from "./pricelists-expanded-regions";
import {
  buildParamComputedTargetId,
  markupDerivedTargetId,
  type RecalcDeps,
} from "./pricelist-recalc";
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
  buildParamOverrideId,
  isSystemParameter,
  type ParameterDef,
} from "./pricelists-parameters";
import {
  buildPriceCellId,
  buildStatusCellId,
  formatMarkupValue,
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

type ParameterRowCellProps = {
  collab: PricelistsCollab;
  deps: RecalcDeps;
  parameters: PricelistParameters;
  regionId: string;
  paramId: string;
  label: string;
  row: PricelistRow;
};

// Inherited (non-overridden) parameter values are computed by the backend, so
// they show a skeleton while a recompute is in flight. Overridden cells hold a
// direct user value and never wait on the backend.
const ParameterRowCell = ({
  collab,
  deps,
  parameters,
  regionId,
  paramId,
  label,
  row,
}: ParameterRowCellProps) => {
  const { value, isOverridden } = parameters.resolveCell(paramId, row.id);
  const overrideId = buildParamOverrideId(regionId, paramId, row.id);
  const targetId = buildParamComputedTargetId(regionId, paramId, row.id);
  const { loading } = useDerivedTarget(collab, targetId, deps, !isOverridden);
  const displayName = getDisplayProductName(row.name);

  return (
    <PricelistParameterCell
      value={value}
      isOverridden={isOverridden}
      baseValue={parameters.getBaseValue(paramId)}
      parameterLabel={label}
      productName={displayName}
      editors={collab.getEditors(overrideId)}
      ariaLabel={`${label} for ${displayName}`}
      columnKey={`param:${paramId}`}
      isLoading={loading}
      onEditingChange={(editing) => collab.setEditing(editing ? overrideId : null)}
      onSetOverride={(next) => parameters.setOverride(paramId, row.id, next)}
      onClearOverride={() => parameters.clearOverride(paramId, row.id)}
    />
  );
};

type PricelistTableRowProps = {
  row: PricelistRow;
  columns: PricelistColumnDefinition[];
  firstParameterIndex: number;
  scope: PricelistScope;
  regionId: string;
  collab: PricelistsCollab;
  deps: RecalcDeps;
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
  deps,
  parameters,
  isExpandable,
  isExpanded,
  onToggleExpand,
}: PricelistTableRowProps) => {
  const region = getRegionById(regionId);
  const isReadOnly = scope === "dealer";

  const resolveCell = (field: PriceField): EffectiveCell => {
    const cellId = buildPriceCellId(field === "purchase" ? null : regionId, row.id, field);
    const value = collab.getCell(cellId) ?? getSeedCellValue(row, field, region);
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
            return (
              <TableCell
                key={column.id}
                className={cn(
                  getCellClassName(column),
                  PARAMETER_GROUP_TINT,
                  index === firstParameterIndex && PARAMETER_GROUP_DIVIDER,
                )}
              >
                <ParameterRowCell
                  collab={collab}
                  deps={deps}
                  parameters={parameters}
                  regionId={regionId}
                  paramId={column.paramId}
                  label={column.label}
                  row={row}
                />
              </TableCell>
            );
          }

          if (column.kind === "markup") {
            return (
              <TableCell
                key={column.id}
                className={cn(getCellClassName(column), column.afterParameters && PARAMETER_GROUP_DIVIDER)}
              >
                <DerivedValueCell
                  collab={collab}
                  deps={deps}
                  targetId={markupDerivedTargetId(column.markup ?? "dealer", regionId, row.id)}
                  format={formatMarkupValue}
                />
              </TableCell>
            );
          }

          const field = column.field as PriceField;
          const { cellId, value } = resolveCell(field);

          if (column.kind === "usd") {
            if (isReadOnly) {
              return (
                <TableCell key={column.id} className={getCellClassName(column)}>
                  <span className={PRICE_USD_DISPLAY_CLASS}>
                    {formatUsdValue(toUsd(value.amount, value.currency))}
                  </span>
                </TableCell>
              );
            }

            // The USD column edits the same source-currency cell: typing a USD
            // amount converts it back to the original currency on the front end.
            // Editing presence uses a column-scoped id so the badge stays on the
            // USD input rather than lighting up the source-currency input.
            const usdEditingId = `${cellId}:usd`;
            return (
              <TableCell key={column.id} className={getCellClassName(column)}>
                <PricelistPriceUsdCell
                  value={value}
                  editors={collab.getEditors(usdEditingId)}
                  ariaLabel={`${column.label} for ${displayName}`}
                  columnKey={`usd:${field}`}
                  onEditingChange={(editing) => collab.setEditing(editing ? usdEditingId : null)}
                  onChange={(next) => collab.setCell(cellId, next)}
                />
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
                columnKey={`price:${field}`}
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
            <PricelistsExpandedRegions row={row} collab={collab} deps={deps} />
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

  // Markup columns and read-only prices render as plain text, so their skeleton
  // is a short line; editable prices (including the editable USD conversion) and
  // parameters use a full-width input shape.
  if (column.kind === "markup" || (isReadOnly && column.kind !== "parameter")) {
    return <Skeleton className="h-4 w-16" />;
  }

  return <Skeleton className="h-7 w-full rounded-lg" />;
};

type DialogState =
  | { mode: "create"; atIndex?: number }
  | { mode: "edit"; def: ParameterDef };

// Fixed at pointerdown; the listeners read it without re-subscribing.
type HeaderDragMeta = {
  paramId: string;
  pointerOffsetX: number;
  width: number;
};

// Drives the floating preview and the swap-target highlight while dragging.
type HeaderDragState = {
  paramId: string;
  label: string;
  width: number;
  height: number;
  top: number;
  left: number;
};

export type PricelistsTableHandle = {
  openCreateParameterDialog: (atIndex?: number) => void;
  openEditParameterDialog: (def: ParameterDef) => void;
};

type PricelistsTableProps = {
  rows: PricelistRow[];
  columns: PricelistColumnDefinition[];
  isLoading: boolean;
  scope: PricelistScope;
  regionId: string;
  collab: PricelistsCollab;
  deps: RecalcDeps;
  parameters: PricelistParameters;
  footer?: ReactNode;
};

export const PricelistsTable = forwardRef<PricelistsTableHandle, PricelistsTableProps>(function PricelistsTable(
  { rows, columns, isLoading, scope, regionId, collab, deps, parameters, footer },
  ref,
) {
  const isExpandable = scope === "global";
  const showParameters = parameters.enabled;
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());
  const [headerDrag, setHeaderDrag] = useState<HeaderDragState | null>(null);
  const headerDragMetaRef = useRef<HeaderDragMeta | null>(null);
  const lastSwapTargetRef = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Always read the latest swap action without re-subscribing the drag listeners.
  // Updated in an effect to avoid writing a ref during render.
  const swapParameterRef = useRef(parameters.swapParameter);
  useEffect(() => {
    swapParameterRef.current = parameters.swapParameter;
  });
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  useImperativeHandle(ref, () => ({
    openCreateParameterDialog: (atIndex?: number) => setDialogState({ mode: "create", atIndex }),
    openEditParameterDialog: (def: ParameterDef) => setDialogState({ mode: "edit", def }),
  }));

  const isHeaderDragging = headerDrag !== null;

  // Custom pointer drag for parameter headers: a fixed-position preview that
  // moves only horizontally (its top is pinned to the header row) with a solid
  // background, and Notion-style swap as the pointer passes over neighbors.
  useEffect(() => {
    if (!isHeaderDragging) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      const meta = headerDragMetaRef.current;
      const container = cardRef.current;
      if (!meta || !container) {
        return;
      }

      const draggableHeaders = Array.from(
        container.querySelectorAll<HTMLElement>("th[data-param-id]"),
      ).filter((header) => header.dataset.system !== "true");
      if (draggableHeaders.length === 0) {
        return;
      }

      let minLeft = Infinity;
      let maxRight = -Infinity;
      let targetId: string | null = null;
      for (const header of draggableHeaders) {
        const rect = header.getBoundingClientRect();
        if (rect.left < minLeft) {
          minLeft = rect.left;
        }
        if (rect.right > maxRight) {
          maxRight = rect.right;
        }
        if (event.clientX >= rect.left && event.clientX <= rect.right) {
          targetId = header.dataset.paramId ?? null;
        }
      }

      const maxLeft = Math.max(minLeft, maxRight - meta.width);
      const left = Math.min(Math.max(event.clientX - meta.pointerOffsetX, minLeft), maxLeft);

      if (targetId && targetId !== meta.paramId) {
        if (lastSwapTargetRef.current !== targetId) {
          lastSwapTargetRef.current = targetId;
          swapParameterRef.current(meta.paramId, targetId);
        }
      } else {
        lastSwapTargetRef.current = null;
      }

      setHeaderDrag((current) => (current ? { ...current, left } : current));
    };

    const endDrag = () => {
      headerDragMetaRef.current = null;
      lastSwapTargetRef.current = null;
      setHeaderDrag(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isHeaderDragging]);

  const startHeaderDrag = (def: ParameterDef, event: ReactPointerEvent<HTMLDivElement>) => {
    if (isSystemParameter(def.id) || event.button !== 0) {
      return;
    }
    const cell = event.currentTarget.closest("th");
    if (!cell) {
      return;
    }
    event.preventDefault();
    const rect = cell.getBoundingClientRect();
    headerDragMetaRef.current = {
      paramId: def.id,
      pointerOffsetX: event.clientX - rect.left,
      width: rect.width,
    };
    lastSwapTargetRef.current = null;
    setHeaderDrag({
      paramId: def.id,
      label: def.label,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
    });
  };

  const parameterColumns = showParameters ? parameters.visibleColumns : [];
  // Markup columns flagged `afterParameters` (Retail Markup) sit behind the
  // dynamic parameter group, separated by the same dashed group divider.
  const leadingColumns = columns.filter((column) => !column.afterParameters);
  const trailingColumns = columns.filter((column) => column.afterParameters);
  const allColumns = [...leadingColumns, ...parameterColumns, ...trailingColumns];
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

  return (
    <Fragment>
      <Card ref={cardRef} size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0">
        <TooltipProvider delay={0} closeDelay={0}>
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
                      const paramId = column.paramId;
                      const def = parameters.defs.find((entry) => entry.id === paramId);
                      if (!def) {
                        return <TableHead key={column.id} aria-hidden />;
                      }
                      const paramIndex = parameters.defs.indexOf(def);
                      const isFirst = index === firstParameterIndex;
                      const isSystem = isSystemParameter(def.id);
                      return (
                        <TableHead
                          key={column.id}
                          data-param-id={def.id}
                          data-system={isSystem}
                          className={cn(
                            "h-9 min-w-0 overflow-visible px-2 align-middle text-left text-xs",
                            PARAMETER_GROUP_TINT,
                            isFirst && PARAMETER_GROUP_DIVIDER,
                          )}
                        >
                          <PricelistParameterHeaderCell
                            def={def}
                            isSystem={isSystem}
                            isFirstParameter={isFirst}
                            isDragSource={headerDrag?.paramId === def.id}
                            onInsertBefore={() => setDialogState({ mode: "create", atIndex: paramIndex })}
                            onInsertAfter={() => setDialogState({ mode: "create", atIndex: paramIndex + 1 })}
                            onEdit={() => setDialogState({ mode: "edit", def })}
                            onResetAll={() => parameters.resetAllOverrides(def.id)}
                            onDelete={() => parameters.removeParameter(def.id)}
                            onPointerDownDrag={(event) => startHeaderDrag(def, event)}
                          />
                        </TableHead>
                      );
                    }

                    return (
                      <TableHead
                        key={column.id}
                        className={cn(getHeadClassName(column), column.afterParameters && PARAMETER_GROUP_DIVIDER)}
                      >
                        <ColumnHeaderLabel label={column.label} description={column.description} />
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
                            (columnIndex === firstParameterIndex || column.afterParameters) && PARAMETER_GROUP_DIVIDER,
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
                      deps={deps}
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
        </TooltipProvider>
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
            parameterDefs={parameters.defs}
            editingParamId={dialogState.mode === "edit" ? dialogState.def.id : undefined}
            lockIdentity={dialogState.mode === "edit" && isSystemParameter(dialogState.def.id)}
            initialLabel={dialogState.mode === "edit" ? dialogState.def.label : ""}
            initialSlug={dialogState.mode === "edit" ? (dialogState.def.slug ?? "") : ""}
            initialFormula={dialogState.mode === "edit" ? (dialogState.def.formula ?? "") : ""}
            onSubmit={(values) => {
              if (dialogState.mode === "create") {
                parameters.addParameter({
                  label: values.label,
                  baseValue: values.baseValue,
                  slug: values.slug,
                  formula: values.formula,
                  atIndex: dialogState.atIndex,
                });
              } else {
                parameters.updateParameter(dialogState.def.id, {
                  label: values.label,
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

      {headerDrag ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 flex items-center rounded-md border border-[var(--corportal-border-grey)] bg-background px-2 text-xs font-semibold text-foreground shadow-lg"
          style={{
            left: headerDrag.left,
            top: headerDrag.top,
            width: headerDrag.width,
            height: headerDrag.height,
          }}
        >
          <span className="min-w-0 flex-1 truncate">{headerDrag.label}</span>
        </div>
      ) : null}
    </Fragment>
  );
});
