"use client";

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import type { VariantRegionStock } from "@/features/store/variant-stock";
import { cn } from "@/lib/utils";

const formatQty = (value: number): string =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);

type VariantStockSummaryProps = {
  stock: VariantRegionStock | null;
  /** When region is not selected. */
  needsRegion?: boolean;
  onRequestRegion?: () => void;
  className?: string;
  /** Compact for catalog cells / variant list. */
  compact?: boolean;
};

export const VariantStockSummary = ({
  stock,
  needsRegion = false,
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

  if (!stock) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }

  const readyLabel = stock.ready == null ? "—" : formatQty(stock.ready);
  const totalLabel = formatQty(stock.total);
  const buttonLabel = `Готово ${readyLabel} · Всего ${totalLabel}`;

  const stopRowNavigation = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={compact ? "sm" : "default"}
            className={cn(
              "h-auto px-1.5 py-0.5 font-medium tabular-nums text-foreground hover:bg-muted/60",
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
        className="w-[min(100vw-2rem,28rem)] gap-2 p-2"
        onClick={stopRowNavigation}
        onPointerDown={stopRowNavigation}
      >
        {stock.missingHub ? (
          <p className="px-1 text-xs text-amber-700">У региона не задан хаб</p>
        ) : null}
        {stock.rows.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">Нет данных по запасам</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[var(--corportal-border-grey)]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 px-2 text-[10px]">Место</TableHead>
                  <TableHead className="h-8 px-2 text-right text-[10px]">Свободно</TableHead>
                  <TableHead className="h-8 px-2 text-right text-[10px]">Резерв под регион</TableHead>
                  <TableHead className="h-8 px-2 text-right text-[10px]">Резерв всего</TableHead>
                  <TableHead className="h-8 px-2 text-right text-[10px]">В производстве</TableHead>
                  <TableHead className="h-8 px-2 text-right text-[10px]">В пути</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.rows.map((row) => (
                  <TableRow key={row.warehouseId} className="hover:bg-muted/30">
                    <TableCell className="px-2 py-1.5 text-xs font-medium tabular-nums">
                      {formatLogisticsCode("warehouse", row.warehouseId)}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right text-xs tabular-nums">
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
  );
};
