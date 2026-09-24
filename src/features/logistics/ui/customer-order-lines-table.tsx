"use client";

import { Check, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ALLOCATION_ATLAS_EPSILON,
  isLineFullyShipped,
  lineLocationAllocations,
  sumProducedForLine,
  warehouseIdsWithReservedForOrder,
} from "@/features/logistics/allocation-atlas";
import {
  draftOutputHoldsForOrderProduct,
  freePlacesForProduct,
  reservedInActiveOutputsForOrderProduct,
  hrefForProduct,
  hrefForWarehouse,
  remainingToReserveForLine,
  reservedPlacesForLine,
  type DraftOutputHold,
} from "@/features/logistics/logistics-availability";
import { sumReservedForLine, sumShippedForLine } from "@/features/logistics/logistics-balances";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { locationIdentity, productById, productCode, warehouseCode } from "@/features/logistics/logistics-lookups";
import type {
  CustomerOrderLine,
  LocationType,
  LogisticsSnapshot,
  StockBalance,
} from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { cn } from "@/lib/utils";

const Qty = ({ quantity, className }: { quantity: number; className?: string }) => {
  if (quantity <= ALLOCATION_ATLAS_EPSILON) {
    return <span className={cn("tabular-nums text-muted-foreground/50", className)}>—</span>;
  }
  return <span className={cn("font-semibold tabular-nums", className)}>{formatQuantity(quantity)}</span>;
};

const ATLAS_HELP =
  "«В производстве» — назначение потребности по этой строке заказа. «Выпущено» — накопленный завершённый выпуск. Не складывайте «Выпущено» с колонками текущих мест: у них разные базы и они могут пересекаться.";

const IN_PRODUCTION_HELP =
  "Назначение потребности этому заказу на производстве. Не складывайте с «Выпущено».";
const PRODUCED_HELP =
  "Накопленный завершённый выпуск по этой строке. Не складывайте с колонками текущих мест.";

const CompactProduct = ({
  snapshot,
  productId,
  productName,
}: {
  snapshot: LogisticsSnapshot;
  productId: string;
  productName?: string | null;
}) => {
  const product = productById(snapshot, productId);
  const name = productName || product?.name || productId;
  const code = productCode(snapshot, productId);
  return (
    <div className="flex min-w-0 flex-col items-start gap-0.5">
      <Link
        href={hrefForProduct(productId)}
        className="font-medium text-foreground hover:underline hover:underline-offset-2"
      >
        {name}
      </Link>
      {code ? <LogisticsCodeBadge code={code} href={hrefForProduct(productId)} /> : null}
    </div>
  );
};

const LineActionsMenu = ({
  productName,
  canReserve,
  canShip,
  releasePlaces,
  outputHolds,
  onReserve,
  onShip,
  onRelease,
  onReleaseOutput,
  onEdit,
}: {
  productName: string;
  canReserve: boolean;
  canShip: boolean;
  releasePlaces: Array<{
    locationType: LocationType;
    locationId: string;
    title: string;
    hint: string | null;
    quantity: number;
  }>;
  outputHolds: DraftOutputHold[];
  onReserve: () => void;
  onShip: () => void;
  onRelease: (place: { locationType: LocationType; locationId: string }) => void;
  onReleaseOutput: (hold: DraftOutputHold) => void;
  onEdit: () => void;
}) => {
  return (
    <DropdownMenu>
      <div
        className={cn(
          "opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 has-[[aria-expanded=true]]:opacity-100 motion-reduce:transition-none",
        )}
      >
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Действия для ${productName}`}
              className="shrink-0 text-muted-foreground"
            />
          }
        >
          <MoreHorizontal className="size-3.5" aria-hidden />
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onClick={onEdit}>Изменить количество</DropdownMenuItem>
        {canReserve ? <DropdownMenuItem onClick={onReserve}>Зарезервировать</DropdownMenuItem> : null}
        {canShip ? <DropdownMenuItem onClick={onShip}>Отгрузить</DropdownMenuItem> : null}
        {releasePlaces.map((place) => {
          const details = [place.title, formatQuantity(place.quantity)];
          if (place.hint) {
            details.push(place.hint);
          }
          return (
            <DropdownMenuItem
              key={`${place.locationType}:${place.locationId}`}
              onClick={() => onRelease({ locationType: place.locationType, locationId: place.locationId })}
            >
              Снять {details.join(" · ")}
            </DropdownMenuItem>
          );
        })}
        {outputHolds.map((hold) => (
          <DropdownMenuItem key={`output:${hold.outputId}`} onClick={() => onReleaseOutput(hold)}>
            Снять в выпуске {hold.outputNumber} · {formatQuantity(hold.quantity)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const th = "px-3 pt-2 pb-2 text-xs font-medium whitespace-nowrap text-muted-foreground align-bottom";
const thNum = cn(th, "text-right");
const thGroup =
  "px-3 pt-2 pb-0 text-center text-xs font-medium tracking-[0.06em] whitespace-nowrap text-muted-foreground/70 uppercase";
const td = "px-3 py-2.5 align-middle";
const tdNum = cn(td, "text-right tabular-nums");
const sep = "border-l border-border/60";
const book = "bg-[#fcfcfc]";

export const CustomerOrderLinesTable = ({
  snapshot,
  balances,
  lines,
  canAct,
  onReserve,
  onShip,
  onRelease,
  onReleaseOutput,
  onEditQuantity,
  bare = false,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  lines: CustomerOrderLine[];
  canAct: boolean;
  onReserve: (line: CustomerOrderLine) => void;
  onShip: () => void;
  onRelease: (place: {
    line: CustomerOrderLine;
    locationType: LocationType;
    locationId: string;
  }) => void;
  onReleaseOutput: (line: CustomerOrderLine, hold: DraftOutputHold) => void;
  onEditQuantity: (line: CustomerOrderLine) => void;
  /** When true, render only the table (DocumentSection provides the card). */
  bare?: boolean;
}) => {
  const warehouseIds = warehouseIdsWithReservedForOrder(snapshot, balances, lines);
  const colSpan = 6 + warehouseIds.length;

  const table = (
    <div className="overflow-x-auto">
      <Table className="w-max min-w-full border-separate border-spacing-0">
        <TableCaption className="sr-only">{ATLAS_HELP}</TableCaption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead rowSpan={2} className={cn(th, "sticky left-0 z-20 min-w-44 bg-card")}>
              Товар
            </TableHead>
            <TableHead rowSpan={2} className={cn(thNum, book)}>
              Заказано
            </TableHead>
            <TableHead colSpan={3} className={cn(thGroup, sep)}>
              Поток
            </TableHead>
            {warehouseIds.length > 0 ? (
              <TableHead colSpan={warehouseIds.length} className={cn(thGroup, sep)}>
                Резерв на складах
              </TableHead>
            ) : null}
            <TableHead rowSpan={2} className={cn(thNum, book, sep)}>
              Отгружено
            </TableHead>
          </TableRow>
          <TableRow className="hover:bg-transparent">
            <TableHead title={IN_PRODUCTION_HELP} className={cn(thNum, sep)}>
              В производстве
            </TableHead>
            <TableHead title={PRODUCED_HELP} className={thNum}>
              Выпущено
            </TableHead>
            <TableHead className={thNum}>В пути</TableHead>
            {warehouseIds.map((warehouseId, index) => (
              <TableHead key={warehouseId} className={cn(thNum, index === 0 && sep)}>
                <Link
                  href={hrefForWarehouse(warehouseId)}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {warehouseCode(snapshot, warehouseId)}
                </Link>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpan} className="px-4 py-8 text-center text-sm text-muted-foreground">
                В этом заказе нет товаров.
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line) => {
              const product = productById(snapshot, line.productId);
              const productName = line.productName || product?.name || line.productId;
              const reserved = reservedPlacesForLine(balances, line);
              const freePlaces = freePlacesForProduct(balances, line.productId);
              const shippedQty = sumShippedForLine(balances, line);
              const reserveExcess =
                sumReservedForLine(balances, line) +
                reservedInActiveOutputsForOrderProduct(snapshot, line.orderId, line.productId) +
                shippedQty -
                line.quantity;
              const producedQty = sumProducedForLine(snapshot, line);
              const locations = lineLocationAllocations(balances, line, snapshot);
              const toReserve = remainingToReserveForLine(line, balances);
              const warehouseReserved = reserved.filter((place) => place.locationType === "warehouse");
              const canReserve = canAct && toReserve > 0 && freePlaces.length > 0;
              const canShipLine = canAct && warehouseReserved.length > 0;
              const complete = isLineFullyShipped(line.quantity, shippedQty);
              const pct = Math.min(100, Math.round((shippedQty / Math.max(line.quantity, 1)) * 100));

              return (
                <TableRow key={line.id} className="group/row hover:bg-muted/40">
                  <TableCell className={cn(td, "sticky left-0 z-10 min-w-44 bg-card")}>
                    <div className="flex items-center justify-between gap-2">
                      <CompactProduct
                        snapshot={snapshot}
                        productId={line.productId}
                        productName={line.productName}
                      />
                      <LineActionsMenu
                        productName={productName}
                        canReserve={canReserve}
                        canShip={canShipLine}
                        releasePlaces={
                          canAct
                            ? reserved.map((place) => {
                                const identity = locationIdentity(snapshot, place.locationType, place.locationId);
                                return {
                                  locationType: place.locationType,
                                  locationId: place.locationId,
                                  title: identity.title,
                                  hint: identity.hint,
                                  quantity: place.quantity,
                                };
                              })
                            : []
                        }
                        outputHolds={
                          canAct ? draftOutputHoldsForOrderProduct(snapshot, line.orderId, line.productId) : []
                        }
                        onReserve={() => onReserve(line)}
                        onShip={onShip}
                        onRelease={(place) => onRelease({ line, ...place })}
                        onReleaseOutput={(hold) => onReleaseOutput(line, hold)}
                        onEdit={() => onEditQuantity(line)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className={cn(tdNum, book)}>
                    <span className="font-semibold tabular-nums">{formatQuantity(line.quantity)}</span>
                    {reserveExcess > 1e-9 ? (
                      <span className="mt-0.5 block text-xs text-amber-700">
                        резерв больше заказа на {formatQuantity(reserveExcess)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className={cn(tdNum, sep)}>
                    <Qty quantity={locations.inProduction} />
                  </TableCell>
                  <TableCell className={tdNum}>
                    <Qty quantity={producedQty} className="font-medium text-muted-foreground" />
                  </TableCell>
                  <TableCell className={tdNum}>
                    <Qty quantity={locations.inTransit} />
                  </TableCell>
                  {warehouseIds.map((warehouseId, index) => (
                    <TableCell key={warehouseId} className={cn(tdNum, index === 0 && sep)}>
                      <Qty quantity={locations.byWarehouseId[warehouseId] ?? 0} />
                    </TableCell>
                  ))}
                  <TableCell className={cn(tdNum, book, sep)}>
                    <div
                      className={cn(
                        "flex flex-col items-end gap-1",
                        complete && "text-green-700",
                      )}
                    >
                      <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                        {complete ? <Check className="size-3.5" aria-label="Выполнено" /> : null}
                        {formatQuantity(shippedQty)}{" "}
                        <span className="font-normal text-muted-foreground">из {formatQuantity(line.quantity)}</span>
                      </span>
                      <span className="h-1 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span
                          className={cn("block h-full rounded-full", complete ? "bg-green-700" : "bg-foreground/70")}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (bare) {
    return table;
  }

  return <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">{table}</div>;
};
