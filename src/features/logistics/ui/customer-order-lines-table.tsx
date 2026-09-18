// english-ui:ignore-file
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { StockPlaceQty } from "@/features/logistics/logistics-availability";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { locationIdentity } from "@/features/logistics/logistics-lookups";
import type {
  CustomerOrderLine,
  LocationType,
  LogisticsSnapshot,
  StockBalance,
} from "@/features/logistics/logistics-types";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import {
  buildCustomerOrderLineView,
  type CustomerOrderLineView,
} from "@/features/logistics/ui/customer-order-line-view";
import { cn } from "@/lib/utils";

export const PLACE_KIND: Record<LocationType, string> = {
  warehouse: "Склад",
  production_order_line: "Заказ на производство",
  transfer: "В пути",
  customer_order: "У клиента",
};

const HEADERS = [
  "Товар",
  "Заказано",
  "Зарезервировано",
  "Склад",
  "Заказы на производство",
  "В пути",
  "Отгружено",
  "К резерву",
  "Свободно",
  "Нехватка",
  "Действия",
] as const;

export type CustomerOrderLinesActionProps = {
  onReserve: (line: CustomerOrderLine) => void;
  onShip: () => void;
  onRelease: (place: {
    line: CustomerOrderLine;
    locationType: LocationType;
    locationId: string;
  }) => void;
};

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

export const LineActions = ({
  view,
  snapshot,
  onReserve,
  onShip,
  onRelease,
  className,
}: CustomerOrderLinesActionProps & {
  view: CustomerOrderLineView;
  snapshot: LogisticsSnapshot;
  className?: string;
}) => (
  <div className={cn("flex flex-col items-start gap-1", className)}>
    {view.canReserve ? (
      <Button type="button" size="sm" variant="outline" onClick={() => onReserve(view.line)}>
        Зарезервировать
      </Button>
    ) : null}
    {view.canShip ? (
      <Button type="button" size="sm" variant="outline" onClick={onShip}>
        Отгрузить
      </Button>
    ) : null}
    {view.reservedPlaces.map((place) => {
      const identity = locationIdentity(snapshot, place.locationType, place.locationId);
      return (
        <Button
          key={`${place.locationType}:${place.locationId}`}
          type="button"
          size="sm"
          variant="ghost"
          className="h-auto whitespace-normal px-2 text-left"
          aria-label={`Снять ${PLACE_KIND[place.locationType]} ${identity.title}`}
          onClick={() =>
            onRelease({
              line: view.line,
              locationType: place.locationType,
              locationId: place.locationId,
            })
          }
        >
          Снять {identity.title}
        </Button>
      );
    })}
  </div>
);

export const CustomerOrderLinesTable = ({
  snapshot,
  balances,
  lines,
  canAct,
  action,
  onReserve,
  onShip,
  onRelease,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  lines: CustomerOrderLine[];
  canAct: boolean;
  action?: React.ReactNode;
} & CustomerOrderLinesActionProps) => (
  <LogisticsTableCard
    title={lines.length > 0 ? `Товары · ${lines.length}` : "Товары"}
    action={action}
    headers={canAct ? [...HEADERS] : HEADERS.filter((header) => header !== "Действия")}
    isEmpty={lines.length === 0}
    empty="В этом заказе клиента нет товаров."
  >
    {lines.map((line) => {
      const view = buildCustomerOrderLineView(snapshot, balances, line, canAct);
      return (
        <TableRow key={line.id}>
          <TableCell className="px-3 py-2 align-top">
            <ProductIdentity snapshot={snapshot} productId={line.productId} />
          </TableCell>
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={view.ordered} unit={view.unit} />
          </TableCell>
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={view.produced + view.inTransit + view.inWarehouse} unit={view.unit} />
          </TableCell>
          <PlaceQtyCell snapshot={snapshot} items={view.warehousePlaces} unit={view.unit} />
          <PlaceQtyCell snapshot={snapshot} items={view.productionPlaces} unit={view.unit} />
          <PlaceQtyCell snapshot={snapshot} items={view.transitPlaces} unit={view.unit} />
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={view.shipped} unit={view.unit} />
          </TableCell>
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={view.toReserve} unit={view.unit} />
          </TableCell>
          <PlaceQtyCell snapshot={snapshot} items={view.freePlaces} unit={view.unit} />
          <TableCell className="px-3 py-2 align-top text-sm">
            <Qty quantity={view.shortQty} unit={view.unit} className="text-destructive" />
          </TableCell>
          {canAct ? (
            <TableCell className="px-3 py-2 align-top">
              <LineActions
                view={view}
                snapshot={snapshot}
                onReserve={onReserve}
                onShip={onShip}
                onRelease={onRelease}
              />
            </TableCell>
          ) : null}
        </TableRow>
      );
    })}
  </LogisticsTableCard>
);
