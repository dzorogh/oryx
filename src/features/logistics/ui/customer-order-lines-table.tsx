import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  freePlacesForProduct,
  remainingToReserveForLine,
  reservedPlacesForLine,
  type StockPlaceQty,
} from "@/features/logistics/logistics-availability";
import { sumReservedForLine, sumShippedForLine } from "@/features/logistics/logistics-balances";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { locationIdentity, productById } from "@/features/logistics/logistics-lookups";
import type {
  CustomerOrderLine,
  LocationType,
  LogisticsSnapshot,
  StockBalance,
} from "@/features/logistics/logistics-types";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { cn } from "@/lib/utils";

const PLACE_KIND: Record<LocationType, string> = {
  warehouse: "Warehouse",
  production_order_line: "Production order",
  transfer: "In transit",
  customer_order: "At customer",
};

const HEADERS = [
  "Product",
  "Ordered",
  "Reserved",
  "Warehouse",
  "Production orders",
  "In transit",
  "Shipped",
  "To reserve",
  "Free",
  "Short",
  "Actions",
] as const;

const Qty = ({
  quantity,
  unit,
  className,
}: {
  quantity: number;
  unit?: string;
  className?: string;
}) => {
  if (quantity <= 1e-9) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className={cn("tabular-nums font-medium", className)}>{formatQuantity(quantity, unit)}</span>
  );
};

const PlaceLines = ({
  snapshot,
  items,
}: {
  snapshot: LogisticsSnapshot;
  items: StockPlaceQty[];
}) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {items.map((item) => {
        const identity = locationIdentity(snapshot, item.locationType, item.locationId);
        return (
          <span key={`${item.locationType}:${item.locationId}`} className="inline-flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <LocationLink
              snapshot={snapshot}
              locationType={item.locationType}
              locationId={item.locationId}
            />
            <span className="tabular-nums">· {formatQuantity(item.quantity)}</span>
            {identity.hint ? <span>· {identity.hint}</span> : null}
          </span>
        );
      })}
    </div>
  );
};

const PlaceQtyCell = ({
  snapshot,
  items,
  unit,
}: {
  snapshot: LogisticsSnapshot;
  items: StockPlaceQty[];
  unit?: string;
}) => {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <TableCell className="px-3 py-2 align-top text-sm">
      <Qty quantity={total} unit={unit} />
      <PlaceLines snapshot={snapshot} items={items} />
    </TableCell>
  );
};

const ofType = (places: StockPlaceQty[], locationType: LocationType): StockPlaceQty[] =>
  places.filter((place) => place.locationType === locationType);

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
}) => (
  <LogisticsTableCard
    title={lines.length > 0 ? `Products · ${lines.length}` : "Products"}
    headers={canAct ? [...HEADERS] : HEADERS.filter((header) => header !== "Actions")}
    isEmpty={lines.length === 0}
    empty="No products on this order."
  >
    {lines.map((line) => {
      const product = productById(snapshot, line.productId);
      const unit = product?.unit;
      const reserved = reservedPlacesForLine(balances, line.id);
      const freePlaces = freePlacesForProduct(balances, line.productId);
      const reservedQty = sumReservedForLine(balances, line.id);
      const shippedQty = sumShippedForLine(balances, line.id);
      const toReserve = remainingToReserveForLine(line, balances);
      const freeQty = freePlaces.reduce((sum, place) => sum + place.quantity, 0);
      const shortQty = Math.max(0, toReserve - freeQty);
      const warehouseReserved = ofType(reserved, "warehouse");
      const canReserve = canAct && toReserve > 0 && freePlaces.length > 0;
      const canShip = canAct && warehouseReserved.length > 0;

      return (
        <TableRow key={line.id}>
          <TableCell className="px-3 py-2 align-top">
            <ProductIdentity snapshot={snapshot} productId={line.productId} />
          </TableCell>
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={line.quantity} unit={unit} />
          </TableCell>
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={reservedQty} unit={unit} />
          </TableCell>
          <PlaceQtyCell snapshot={snapshot} items={warehouseReserved} unit={unit} />
          <PlaceQtyCell snapshot={snapshot} items={ofType(reserved, "production_order_line")} unit={unit} />
          <PlaceQtyCell snapshot={snapshot} items={ofType(reserved, "transfer")} unit={unit} />
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={shippedQty} unit={unit} />
          </TableCell>
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={toReserve} unit={unit} />
          </TableCell>
          <PlaceQtyCell snapshot={snapshot} items={freePlaces} unit={unit} />
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={shortQty} unit={unit} className="text-destructive" />
          </TableCell>
          {canAct ? (
            <TableCell className="px-3 py-2 align-top">
              <div className="flex flex-col items-start gap-1">
                {canReserve ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onReserve(line)}>
                    Reserve
                  </Button>
                ) : null}
                {canShip ? (
                  <Button type="button" size="sm" variant="outline" onClick={onShip}>
                    Ship
                  </Button>
                ) : null}
                {reserved.map((place) => {
                  const identity = locationIdentity(snapshot, place.locationType, place.locationId);
                  return (
                    <Button
                      key={`${place.locationType}:${place.locationId}`}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-auto whitespace-normal px-2 text-left"
                      aria-label={`Release ${PLACE_KIND[place.locationType]} ${identity.title}`}
                      onClick={() =>
                        onRelease({
                          line,
                          locationType: place.locationType,
                          locationId: place.locationId,
                        })
                      }
                    >
                      Release {identity.title}
                    </Button>
                  );
                })}
              </div>
            </TableCell>
          ) : null}
        </TableRow>
      );
    })}
  </LogisticsTableCard>
);
