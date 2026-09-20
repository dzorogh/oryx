"use client";

import { Check, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  freePlacesForProduct,
  hrefForProduct,
  hrefForWarehouse,
  remainingToReserveForLine,
  reservedPlacesForLine,
} from "@/features/logistics/logistics-availability";
import { sumShippedForLine } from "@/features/logistics/logistics-balances";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { locationIdentity, productById, warehouseCode } from "@/features/logistics/logistics-lookups";
import type {
  CustomerOrderLine,
  LocationType,
  LogisticsSnapshot,
  StockBalance,
} from "@/features/logistics/logistics-types";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

const Qty = ({ quantity, className }: { quantity: number; className?: string }) => {
  if (quantity <= ALLOCATION_ATLAS_EPSILON) {
    return <span className="font-medium text-muted-foreground">—</span>;
  }
  return <span className={cn("font-semibold tabular-nums", className)}>{formatQuantity(quantity)}</span>;
};

const ATLAS_HELP =
  "In production is current WIP reserved for this order line. Produced is cumulative completed output for this line. Do not add Produced to current location columns; they use different bases and may overlap.";

const IN_PRODUCTION_HELP =
  "Current WIP reserved for this order line. Do not add to Produced.";
const PRODUCED_HELP =
  "Cumulative completed output for this line. Do not add to current location columns.";

const CompactProduct = ({
  snapshot,
  productId,
}: {
  snapshot: LogisticsSnapshot;
  productId: string;
}) => {
  const product = productById(snapshot, productId);
  const name = product?.name ?? productId;
  return (
    <div className="min-w-0">
      <Link
        href={hrefForProduct(productId)}
        className="block truncate text-sm font-medium text-primary hover:underline"
      >
        {name}
      </Link>
      {product?.sku ? <div className="truncate text-[10px] text-muted-foreground">{product.sku}</div> : null}
    </div>
  );
};

const LineActionsMenu = ({
  productName,
  canReserve,
  canShip,
  releasePlaces,
  onReserve,
  onShip,
  onRelease,
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
  onReserve: () => void;
  onShip: () => void;
  onRelease: (place: { locationType: LocationType; locationId: string }) => void;
}) => {
  if (!canReserve && !canShip && releasePlaces.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${productName}`}
            className="shrink-0 text-muted-foreground"
          />
        }
      >
        <MoreHorizontal className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {canReserve ? <DropdownMenuItem onClick={onReserve}>Reserve</DropdownMenuItem> : null}
        {canShip ? <DropdownMenuItem onClick={onShip}>Ship</DropdownMenuItem> : null}
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
              Release {details.join(" · ")}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const headClass = "h-8 px-2 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap";
const cellClass = "px-2 py-1.5 text-center";

export const CustomerOrderLinesTable = ({
  snapshot,
  balances,
  lines,
  canAct,
  onReserve,
  onShip,
  onRelease,
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
}) => {
  const warehouseIds = warehouseIdsWithReservedForOrder(snapshot, balances, lines);
  const title = lines.length > 0 ? `Products · ${lines.length}` : "Products";

  return (
    <Card size="sm" className={logisticsCardClass}>
      <div className="space-y-1 px-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {lines.length > 0 ? <p className="text-[11px] text-muted-foreground">{ATLAS_HELP}</p> : null}
      </div>
      <CardContent className="px-0">
        <Table className="w-max min-w-full">
          <TableCaption className="sr-only">{ATLAS_HELP}</TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headClass, "sticky left-0 z-20 min-w-44 max-w-56 bg-muted text-left")}>
                Product
              </TableHead>
              <TableHead className={cn(headClass, "bg-muted text-center text-foreground")}>Ordered</TableHead>
              <TableHead
                title={IN_PRODUCTION_HELP}
                className={cn(headClass, "bg-muted/40 text-center text-muted-foreground")}
              >
                In production
              </TableHead>
              <TableHead
                title={PRODUCED_HELP}
                className={cn(headClass, "bg-muted/30 text-center text-muted-foreground")}
              >
                Produced
              </TableHead>
              <TableHead className={cn(headClass, "bg-muted/40 text-center text-muted-foreground")}>
                In transit
              </TableHead>
              {warehouseIds.map((warehouseId) => (
                <TableHead
                  key={warehouseId}
                  className={cn(headClass, "bg-muted/40 text-center text-muted-foreground")}
                >
                  <Link
                    href={hrefForWarehouse(warehouseId)}
                    className="whitespace-nowrap font-semibold text-muted-foreground hover:underline"
                  >
                    {warehouseCode(snapshot, warehouseId)}
                  </Link>
                </TableHead>
              ))}
              <TableHead className={cn(headClass, "bg-muted text-center text-foreground")}>Shipped</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6 + warehouseIds.length}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  This customer order has no products.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line) => {
                const product = productById(snapshot, line.productId);
                const productName = product?.name ?? line.productId;
                const reserved = reservedPlacesForLine(balances, line);
                const freePlaces = freePlacesForProduct(balances, line.productId);
                const shippedQty = sumShippedForLine(balances, line);
                const producedQty = sumProducedForLine(snapshot, line);
                const locations = lineLocationAllocations(balances, line);
                const toReserve = remainingToReserveForLine(line, balances);
                const warehouseReserved = reserved.filter((place) => place.locationType === "warehouse");
                const canReserve = canAct && toReserve > 0 && freePlaces.length > 0;
                const canShip = canAct && warehouseReserved.length > 0;
                const complete = isLineFullyShipped(line.quantity, shippedQty);
                const completeCell = complete ? "bg-emerald-50" : undefined;
                const bookendCell = complete ? completeCell : "bg-muted/30";
                const locationCell = complete ? completeCell : "bg-muted/10";
                const productCell = complete ? "bg-emerald-50" : "bg-card";

                return (
                  <TableRow
                    key={line.id}
                    className={cn("hover:bg-transparent", complete && "bg-emerald-50 hover:bg-emerald-50")}
                  >
                    <TableCell
                      className={cn(cellClass, "sticky left-0 z-10 min-w-44 max-w-56 text-left", productCell)}
                    >
                      <div className="flex min-w-0 items-center gap-1">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <CompactProduct snapshot={snapshot} productId={line.productId} />
                        </div>
                        {canAct ? (
                          <LineActionsMenu
                            productName={productName}
                            canReserve={canReserve}
                            canShip={canShip}
                            releasePlaces={reserved.map((place) => {
                              const identity = locationIdentity(snapshot, place.locationType, place.locationId);
                              return {
                                locationType: place.locationType,
                                locationId: place.locationId,
                                title: identity.title,
                                hint: identity.hint,
                                quantity: place.quantity,
                              };
                            })}
                            onReserve={() => onReserve(line)}
                            onShip={onShip}
                            onRelease={(place) => onRelease({ line, ...place })}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className={cn(cellClass, bookendCell)}>
                      <Qty quantity={line.quantity} className="text-sm font-extrabold" />
                    </TableCell>
                    <TableCell className={cn(cellClass, locationCell)}>
                      <Qty quantity={locations.inProduction} />
                    </TableCell>
                    <TableCell className={cn(cellClass, complete ? completeCell : "bg-muted/5")}>
                      <Qty quantity={producedQty} className="font-medium text-muted-foreground" />
                    </TableCell>
                    <TableCell className={cn(cellClass, locationCell)}>
                      <Qty quantity={locations.inTransit} />
                    </TableCell>
                    {warehouseIds.map((warehouseId) => (
                      <TableCell key={warehouseId} className={cn(cellClass, locationCell)}>
                        <Qty quantity={locations.byWarehouseId[warehouseId] ?? 0} />
                      </TableCell>
                    ))}
                    <TableCell
                      className={cn(
                        cellClass,
                        complete ? "bg-emerald-50 text-emerald-800" : bookendCell,
                      )}
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        <Qty
                          quantity={shippedQty}
                          className={cn("text-sm font-extrabold", complete && "text-emerald-800")}
                        />
                        {complete ? <Check className="size-3.5" aria-label="Complete" /> : null}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
