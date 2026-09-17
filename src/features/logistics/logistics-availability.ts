import { getBalanceQuantity, remainingToReserve, sumShippedForLine } from "@/features/logistics/logistics-balances";
import { hrefForStoreProduct, logisticsPath } from "@/features/logistics/logistics-paths";
import type {
  CustomerOrderLine,
  LocationType,
  LogisticsSnapshot,
  SourceType,
  StockBalance,
  StockState,
} from "@/features/logistics/logistics-types";

export type StockPlaceQty = {
  locationType: LocationType;
  locationId: string;
  productId: string;
  quantity: number;
  customerOrderId: string | null;
  customerOrderLineId: string | null;
};

export type LocationStateSplit = {
  locationType: LocationType;
  locationId: string;
  free: number;
  reserved: number;
  shipped: number;
  total: number;
};

export type ProductionLineReservation = {
  customerOrderId: string;
  customerOrderLineId: string | null;
  quantity: number;
};

export type ProductionLineReservationBreakdown = {
  free: number;
  reserved: ProductionLineReservation[];
};

export type PlaceStockBreakdown = {
  free: number;
  reserved: ProductionLineReservation[];
  shipped: ProductionLineReservation[];
};

const positive = (quantity: number): boolean => quantity > 1e-9;

export const sumFreeForProduct = (balances: StockBalance[], productId: string): number =>
  balances
    .filter((entry) => entry.productId === productId && entry.stockState === "free")
    .reduce((sum, entry) => sum + entry.quantity, 0);

export const freePlacesForProduct = (balances: StockBalance[], productId: string): StockPlaceQty[] =>
  balances
    .filter(
      (entry) =>
        entry.productId === productId &&
        entry.stockState === "free" &&
        positive(entry.quantity) &&
        (entry.locationType === "warehouse" ||
          entry.locationType === "production_order_line" ||
          entry.locationType === "transfer"),
    )
    .map((entry) => ({
      locationType: entry.locationType,
      locationId: entry.locationId,
      productId: entry.productId,
      quantity: entry.quantity,
      customerOrderId: entry.customerOrderId,
      customerOrderLineId: entry.customerOrderLineId,
    }))
    .sort((left, right) => right.quantity - left.quantity);

export const reservedPlacesForLine = (balances: StockBalance[], customerOrderLineId: string): StockPlaceQty[] =>
  balances
    .filter(
      (entry) =>
        entry.stockState === "reserved" &&
        entry.customerOrderLineId === customerOrderLineId &&
        positive(entry.quantity),
    )
    .map((entry) => ({
      locationType: entry.locationType,
      locationId: entry.locationId,
      productId: entry.productId,
      quantity: entry.quantity,
      customerOrderId: entry.customerOrderId,
      customerOrderLineId: entry.customerOrderLineId,
    }))
    .sort((left, right) => right.quantity - left.quantity);

export const freeTransfersForProduct = (balances: StockBalance[], productId: string): StockPlaceQty[] =>
  freePlacesForProduct(balances, productId).filter((place) => place.locationType === "transfer");

export const freeProductionLinesForProduct = (
  balances: StockBalance[],
  productId: string,
  productionLineIds: string[] = [],
): StockPlaceQty[] => {
  const extraLocations = new Set(productionLineIds);
  const totals = new Map<string, StockPlaceQty>();

  for (const entry of balances) {
    if (
      entry.locationType !== "production_order_line" ||
      entry.stockState !== "free" ||
      !positive(entry.quantity)
    ) {
      continue;
    }
    if (entry.productId !== productId && !extraLocations.has(entry.locationId)) {
      continue;
    }
    const current = totals.get(entry.locationId);
    if (current) {
      current.quantity += entry.quantity;
      continue;
    }
    totals.set(entry.locationId, {
      locationType: entry.locationType,
      locationId: entry.locationId,
      productId,
      quantity: entry.quantity,
      customerOrderId: entry.customerOrderId,
      customerOrderLineId: entry.customerOrderLineId,
    });
  }

  return [...totals.values()].sort((left, right) => right.quantity - left.quantity);
};

export const reservedPlacesForOrder = (balances: StockBalance[], customerOrderId: string): StockPlaceQty[] =>
  balances
    .filter(
      (entry) =>
        entry.stockState === "reserved" &&
        entry.customerOrderId === customerOrderId &&
        positive(entry.quantity),
    )
    .map((entry) => ({
      locationType: entry.locationType,
      locationId: entry.locationId,
      productId: entry.productId,
      quantity: entry.quantity,
      customerOrderId: entry.customerOrderId,
      customerOrderLineId: entry.customerOrderLineId,
    }))
    .sort((left, right) => right.quantity - left.quantity);

export const freeAtPlace = (
  balances: StockBalance[],
  productId: string,
  locationType: LocationType,
  locationId: string,
): number =>
  getBalanceQuantity(balances, {
    productId,
    locationType,
    locationId,
    stockState: "free",
    customerOrderId: null,
    customerOrderLineId: null,
  });

export const reservedAtWarehouseForLine = (
  balances: StockBalance[],
  line: CustomerOrderLine,
  warehouseId: string,
): number =>
  getBalanceQuantity(balances, {
    productId: line.productId,
    locationType: "warehouse",
    locationId: warehouseId,
    stockState: "reserved",
    customerOrderId: line.orderId,
    customerOrderLineId: line.id,
  });

export const warehousesWithReservedForOrder = (
  balances: StockBalance[],
  lines: CustomerOrderLine[],
): Array<{ warehouseId: string; quantity: number }> => {
  const lineIds = new Set(lines.map((line) => line.id));
  const orderIds = new Set(lines.map((line) => line.orderId));
  const totals = new Map<string, number>();
  for (const entry of balances) {
    if (
      entry.stockState !== "reserved" ||
      entry.locationType !== "warehouse" ||
      !positive(entry.quantity)
    ) {
      continue;
    }
    const matchesLine = entry.customerOrderLineId != null && lineIds.has(entry.customerOrderLineId);
    const matchesOrder = entry.customerOrderId != null && orderIds.has(entry.customerOrderId);
    if (!matchesLine && !matchesOrder) {
      continue;
    }
    totals.set(entry.locationId, (totals.get(entry.locationId) ?? 0) + entry.quantity);
  }
  return [...totals.entries()]
    .map(([warehouseId, quantity]) => ({ warehouseId, quantity }))
    .sort((left, right) => right.quantity - left.quantity);
};

export const reservedLinesAtWarehouse = (
  balances: StockBalance[],
  warehouseId: string,
  lines: CustomerOrderLine[],
): Array<{ line: CustomerOrderLine; reserved: number }> =>
  lines
    .map((line) => ({
      line,
      reserved: reservedAtWarehouseForLine(balances, line, warehouseId),
    }))
    .filter((item) => positive(item.reserved));

export const remainingToShipForLine = (
  line: CustomerOrderLine,
  balances: StockBalance[],
  warehouseId?: string,
): number => {
  const remainingOrdered = line.quantity - sumShippedForLine(balances, line.id);
  const reserved = warehouseId
    ? reservedAtWarehouseForLine(balances, line, warehouseId)
    : reservedPlacesForLine(balances, line.id).reduce((sum, place) => sum + place.quantity, 0);
  return Math.max(0, Math.min(remainingOrdered, reserved));
};

export const remainingToReserveForLine = (line: CustomerOrderLine, balances: StockBalance[]): number =>
  Math.max(0, remainingToReserve(line.quantity, balances, line.id));

export const openOrderLinesForProduct = (
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
  productId: string,
): CustomerOrderLine[] =>
  snapshot.customerOrderLines.filter((line) => {
    if (line.productId !== productId) {
      return false;
    }
    const order = snapshot.customerOrders.find((item) => item.id === line.orderId);
    return order?.status === "open" && remainingToReserveForLine(line, balances) > 0;
  });

export const reservationCap = (
  line: CustomerOrderLine,
  balances: StockBalance[],
  locationType: LocationType,
  locationId: string,
): number => {
  const free = freeAtPlace(balances, line.productId, locationType, locationId);
  return Math.max(0, Math.min(free, remainingToReserveForLine(line, balances)));
};

export const returnedForShipmentLine = (snapshot: LogisticsSnapshot, shipmentLineId: string): number =>
  snapshot.returnLines
    .filter((line) => {
      if (line.shipmentLineId !== shipmentLineId) {
        return false;
      }
      const doc = snapshot.returns.find((item) => item.id === line.returnId);
      return doc?.status === "posted";
    })
    .reduce((sum, line) => sum + line.quantity, 0);

export const remainingToReturnForLine = (
  snapshot: LogisticsSnapshot,
  shipmentLineId: string,
  shippedQuantity: number,
): number => Math.max(0, shippedQuantity - returnedForShipmentLine(snapshot, shipmentLineId));

const groupBalancesByOrder = (entries: StockBalance[]): ProductionLineReservation[] => {
  const reservedByOrderLine = new Map<string, ProductionLineReservation>();
  for (const entry of entries) {
    if (!entry.customerOrderId) {
      continue;
    }
    const key = `${entry.customerOrderId}|${entry.customerOrderLineId ?? ""}`;
    const current = reservedByOrderLine.get(key);
    reservedByOrderLine.set(key, {
      customerOrderId: entry.customerOrderId,
      customerOrderLineId: entry.customerOrderLineId ?? current?.customerOrderLineId ?? null,
      quantity: (current?.quantity ?? 0) + entry.quantity,
    });
  }
  return [...reservedByOrderLine.values()].sort((left, right) =>
    left.customerOrderId.localeCompare(right.customerOrderId),
  );
};

export const placeStockBreakdown = (
  balances: StockBalance[],
  productId: string,
  locationType: LocationType,
  locationId: string,
): PlaceStockBreakdown => {
  let free = 0;
  const reserved: StockBalance[] = [];
  const shipped: StockBalance[] = [];

  for (const entry of balances) {
    if (
      entry.productId !== productId ||
      entry.locationType !== locationType ||
      entry.locationId !== locationId ||
      !positive(entry.quantity)
    ) {
      continue;
    }
    if (entry.stockState === "free") {
      free += entry.quantity;
      continue;
    }
    if (entry.stockState === "reserved") {
      reserved.push(entry);
      continue;
    }
    if (entry.stockState === "shipped") {
      shipped.push(entry);
    }
  }

  return {
    free,
    reserved: groupBalancesByOrder(reserved),
    shipped: groupBalancesByOrder(shipped),
  };
};

export const productionLineReservationBreakdown = (
  line: { id: string; productId: string },
  balances: StockBalance[],
): ProductionLineReservationBreakdown => {
  const breakdown = placeStockBreakdown(balances, line.productId, "production_order_line", line.id);
  return { free: breakdown.free, reserved: breakdown.reserved };
};

export const outputtedForProductionLine = (snapshot: LogisticsSnapshot, productionOrderLineId: string): number =>
  snapshot.outputLines
    .filter((line) => {
      if (line.productionOrderLineId !== productionOrderLineId) {
        return false;
      }
      const doc = snapshot.outputs.find((item) => item.id === line.outputId);
      return doc?.status === "done";
    })
    .reduce((sum, line) => sum + line.quantity, 0);

export const remainingToOutputForLine = (
  snapshot: LogisticsSnapshot,
  productionOrderLineId: string,
  plannedQuantity: number,
): number => Math.max(0, plannedQuantity - outputtedForProductionLine(snapshot, productionOrderLineId));

export const productPlacesByState = (balances: StockBalance[], productId: string): LocationStateSplit[] => {
  const grouped = new Map<string, LocationStateSplit>();
  for (const entry of balances) {
    if (entry.productId !== productId || !positive(entry.quantity)) {
      continue;
    }
    const key = `${entry.locationType}:${entry.locationId}`;
    const current = grouped.get(key) ?? {
      locationType: entry.locationType,
      locationId: entry.locationId,
      free: 0,
      reserved: 0,
      shipped: 0,
      total: 0,
    };
    current[entry.stockState] += entry.quantity;
    current.total += entry.quantity;
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((left, right) => right.total - left.total);
};

export const reservedOrderLinesAtWarehouse = (
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
  warehouseId: string,
  productId: string,
): Array<{ line: CustomerOrderLine; reserved: number }> =>
  snapshot.customerOrderLines
    .filter((line) => {
      const order = snapshot.customerOrders.find((item) => item.id === line.orderId);
      return order?.status === "open" && line.productId === productId;
    })
    .map((line) => ({
      line,
      reserved: reservedAtWarehouseForLine(balances, line, warehouseId),
    }))
    .filter((item) => positive(item.reserved));

export const hrefForSource = (sourceType: SourceType, sourceId: string): string | null => {
  switch (sourceType) {
    case "reservation":
      return logisticsPath("reservations", sourceId);
    case "shipment":
      return logisticsPath("shipments", sourceId);
    case "shipment_return":
      return logisticsPath("returns", sourceId);
    case "production_output":
      return logisticsPath("outputs", sourceId);
    case "production_activation":
    case "production_close":
      return logisticsPath("production-orders", sourceId);
    case "transfer_send":
    case "transfer_complete":
      return logisticsPath("transfers", sourceId);
    default:
      return null;
  }
};

export const hrefForCustomerOrder = (id: string): string => logisticsPath("customer-orders", id);
export const hrefForProduct = (id: string): string => hrefForStoreProduct(id);
export const hrefForWarehouse = (id: string): string => logisticsPath("warehouses", id);
export const hrefForManufacturer = (id: string): string => logisticsPath("manufacturers", id);
export const hrefForTransfer = (id: string): string => logisticsPath("transfers", id);
export const hrefForProductionOrder = (id: string): string => logisticsPath("production-orders", id);

export const hrefForLocation = (
  snapshot: LogisticsSnapshot,
  locationType: LocationType,
  locationId: string,
): string | null => {
  if (locationType === "warehouse") {
    return hrefForWarehouse(locationId);
  }
  if (locationType === "transfer") {
    return hrefForTransfer(locationId);
  }
  if (locationType === "customer_order") {
    return hrefForCustomerOrder(locationId);
  }
  const line = snapshot.productionOrderLines.find((item) => item.id === locationId);
  return line ? hrefForProductionOrder(line.orderId) : null;
};

export const stateQty = (split: LocationStateSplit, state: StockState): number => split[state];
