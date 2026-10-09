"use client";

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEntityCode } from "@/lib/entity-codes";
import type { VariantRegionStock } from "@/features/store/variant-stock";
import { cn } from "@/lib/utils";

const formatQty = (value: number): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);

type VariantStockSummaryProps = {
  stock: VariantRegionStock | null;
  /** When region is not selected. */
  needsRegion?: boolean;
  /** Stock facts are still loading or failed. Render «—», never a zero total. */
  unknown?: boolean;
  onRequestRegion?: () => void;
  className?: string;
  /** Compact for catalog cells / variant list. */
  compact?: boolean;
};

export const VariantStockSummary = ({
  stock,
  needsRegion = false,
  unknown = false,
  onRequestRegion,
  className,
  compact = false,
}: VariantStockSummaryProps) => {
  if (needsRegion) {
    return (
      <button
        type="button"
        className={cn(
          "text-left text-xs font-medium text-primary underline-offset-2 hover:underline",
          className,
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRequestRegion?.();
        }}
      >
        Выберите регион
      </button>
    );
  }

  if (unknown || !stock) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>—</span>
    );
  }

  const readyLabel = stock.ready == null ? "—" : formatQty(stock.ready);
  const totalLabel = formatQty(stock.total);
  const buttonLabel = `Готово ${readyLabel} · Всего ${totalLabel}`;

  const stopRowNavigation = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    // Base UI mounts focus guards next to the trigger; the wrapper keeps them out of the parent's layout.
    <span className="inline-flex">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size={compact ? "sm" : "default"}
              className={cn(
                "h-auto cursor-pointer border-[var(--corportal-border-grey)] bg-background px-1.5 py-0.5 font-medium tabular-nums text-foreground shadow-none",
                "hover:border-foreground/30 hover:bg-accent hover:text-accent-foreground",
                "data-popup-open:border-foreground/40 data-popup-open:bg-accent",
                compact ? "text-xs" : "text-sm",
                className,
              )}
              aria-label={buttonLabel}
              onClick={stopRowNavigation}
              onPointerDown={stopRowNavigation}
            />
          }
        >
          {buttonLabel}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(100vw-2rem,36rem)] gap-2 p-2"
          onClick={stopRowNavigation}
          onPointerDown={stopRowNavigation}
        >
          {stock.missingHub ? (
            <p className="px-1 text-xs text-amber-700">
              У региона не задан хаб
            </p>
          ) : null}
          {stock.rows.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              Нет данных по запасам
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-[var(--corportal-border-grey)]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-8 px-2 text-[10px]">
                      Место
                    </TableHead>
                    <TableHead className="h-8 px-2 text-right text-[10px]">
                      Свободно
                    </TableHead>
                    <TableHead className="h-8 px-2 text-right text-[10px]">
                      Резерв под регион
                    </TableHead>
                    <TableHead className="h-8 px-2 text-right text-[10px]">
                      Резерв всего
                    </TableHead>
                    <TableHead className="h-8 px-2 text-right text-[10px]">
                      В производстве
                    </TableHead>
                    <TableHead className="h-8 px-2 text-right text-[10px]">
                      В пути
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.rows.map((row) => (
                    <TableRow
                      key={row.warehouseId}
                      className={cn(
                        row.isHub ? "bg-sky-50 hover:bg-sky-50" : "hover:bg-muted/30",
                      )}
                    >
                      <TableCell className="px-2 py-1.5 text-xs font-medium tabular-nums">
                        {formatEntityCode("warehouse", row.warehouseId)}
                        {row.isHub ? (
                          <span className="ml-1.5 rounded bg-sky-100 px-1 py-0.5 text-[10px] font-semibold text-sky-800">
                            хаб региона
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "px-2 py-1.5 text-right text-xs tabular-nums",
                          row.isHub && "bg-sky-100 font-semibold text-sky-900",
                        )}
                      >
                        {formatQty(row.free)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">
                        {formatQty(row.regionReserve)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">
                        {formatQty(row.reserveTotal)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">
                        {formatQty(row.production)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">
                        {formatQty(row.transit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </span>
  );
};
