import {
  getBalanceQuantity,
  remainingToReserve,
  remainingToReserveForOrderProduct,
  sumShippedForLine,
  sumShippedForOrderProduct,
} from "@/features/logistics/logistics-balances";
import { hrefForStoreProduct, logisticsPath } from "@/features/logistics/logistics-paths";
import {
  isFreeOwner,
  isOrderOwner,
  ownersEqual,
  type CustomerOrderLine,
  type LocationType,
  type LogisticsSnapshot,
  type OwnerType,
  type SourceType,
  type StockBalance,
  type StockState,
} from "@/features/logistics/logistics-types";

export type StockPlaceQty = {
  locationType: LocationType;
  locationId: string;
  productId: string;
  quantity: number;
  ownerType: OwnerType | null;
  ownerId: string | null;
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
  ownerType: OwnerType;
  ownerId: string;
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

const toPlace = (entry: StockBalance): StockPlaceQty => ({
  locationType: entry.locationType,
  locationId: entry.locationId,
  productId: entry.productId,
  quantity: entry.quantity,
  ownerType: entry.ownerType,
  ownerId: entry.ownerId,
});

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
        isFreeOwner(entry.ownerType, entry.ownerId) &&
        (entry.locationType === "warehouse" ||
          entry.locationType === "production_order" ||
          entry.locationType === "transfer"),
    )
    .map(toPlace)
    .sort((left, right) => right.quantity - left.quantity);

export const reservedPlacesForOwner = (
  balances: StockBalance[],
  ownerType: OwnerType,
  ownerId: string,
  productId?: string,
): StockPlaceQty[] =>
  balances
    .filter(
      (entry) =>
        entry.stockState === "reserved" &&
        ownersEqual(entry.ownerType, entry.ownerId, ownerType, ownerId) &&
        (productId == null || entry.productId === productId) &&
        positive(entry.quantity),
    )
    .map(toPlace)
    .sort((left, right) => right.quantity - left.quantity);

export const reservedPlacesForLine = (balances: StockBalance[], line: CustomerOrderLine): StockPlaceQty[] =>
  reservedPlacesForOwner(balances, "order", line.orderId, line.productId);

export const reservedPlacesForOrderProduct = (
  balances: StockBalance[],
  orderId: string,
  productId: string,
): StockPlaceQty[] => reservedPlacesForOwner(balances, "order", orderId, productId);

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
      entry.locationType !== "production_order" ||
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
      ownerType: entry.ownerType,
      ownerId: entry.ownerId,
    });
  }

  return [...totals.values()].sort((left, right) => right.quantity - left.quantity);
};

export const reservedPlacesForOrder = (balances: StockBalance[], customerOrderId: string): StockPlaceQty[] =>
  reservedPlacesForOwner(balances, "order", customerOrderId);

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
    ownerType: null,
    ownerId: null,
  });

export const onHandAtPlace = (
  balances: StockBalance[],
  productId: string,
  locationType: LocationType,
  locationId: string,
): number =>
  balances
    .filter(
      (entry) =>
        entry.productId === productId &&
        entry.locationType === locationType &&
        entry.locationId === locationId &&
        entry.stockState !== "shipped",
    )
    .reduce((sum, entry) => sum + entry.quantity, 0);

export const reservedAtPlaceForOwner = (
  balances: StockBalance[],
  productId: string,
  locationType: LocationType,
  locationId: string,
  ownerType: OwnerType | null,
  ownerId: string | null,
): number =>
  getBalanceQuantity(balances, {
    productId,
    locationType,
    locationId,
    stockState: "reserved",
    ownerType,
    ownerId,
  });

export const reservedAtWarehouseForLine = (
  balances: StockBalance[],
  line: CustomerOrderLine,
  warehouseId: string,
): number => reservedAtPlaceForOwner(balances, line.productId, "warehouse", warehouseId, "order", line.orderId);

export const warehousesWithReservedForOrder = (
  balances: StockBalance[],
  lines: CustomerOrderLine[],
): Array<{ warehouseId: string; quantity: number }> => {
  const orderIds = new Set(lines.map((line) => line.orderId));
  const productIds = new Set(lines.map((line) => line.productId));
  const totals = new Map<string, number>();
  for (const entry of balances) {
    if (
      entry.stockState !== "reserved" ||
      entry.locationType !== "warehouse" ||
      !positive(entry.quantity) ||
      !isOrderOwner(entry.ownerType, entry.ownerId) ||
      !orderIds.has(entry.ownerId ?? "")
    ) {
      continue;
    }
    if (productIds.size > 0 && !productIds.has(entry.productId)) {
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
  const remainingOrdered = line.quantity - sumShippedForOrderProduct(balances, line.orderId, line.productId);
  const reserved = warehouseId
    ? reservedAtWarehouseForLine(balances, line, warehouseId)
    : reservedPlacesForLine(balances, line).reduce((sum, place) => sum + place.quantity, 0);
  return Math.max(0, Math.min(remainingOrdered, reserved));
};

export const remainingToReserveForLine = (line: CustomerOrderLine, balances: StockBalance[]): number =>
  Math.max(0, remainingToReserveForOrderProduct(line.quantity, balances, line.orderId, line.productId));

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

export const reservationCapForOwner = (
  balances: StockBalance[],
  productId: string,
  locationType: LocationType,
  locationId: string,
  fromOwnerType: OwnerType | null,
  fromOwnerId: string | null,
  toOwnerType: OwnerType | null,
  toOwnerId: string | null,
  orderedQuantity?: number,
): number => {
  const sourceQty = isFreeOwner(fromOwnerType, fromOwnerId)
    ? freeAtPlace(balances, productId, locationType, locationId)
    : reservedAtPlaceForOwner(balances, productId, locationType, locationId, fromOwnerType, fromOwnerId);
  if (toOwnerType === "order" && toOwnerId && orderedQuantity != null) {
    return Math.max(
      0,
      Math.min(sourceQty, remainingToReserveForOrderProduct(orderedQuantity, balances, toOwnerId, productId)),
    );
  }
  return Math.max(0, sourceQty);
};

export const remainingToReturnForOrderProduct = (
  balances: StockBalance[],
  orderId: string,
  productId: string,
): number => Math.max(0, sumShippedForOrderProduct(balances, orderId, productId));

const groupBalancesByOwner = (entries: StockBalance[]): ProductionLineReservation[] => {
  const reservedByOwner = new Map<string, ProductionLineReservation>();
  for (const entry of entries) {
    if (!entry.ownerType || !entry.ownerId) {
      continue;
    }
    const key = `${entry.ownerType}|${entry.ownerId}`;
    const current = reservedByOwner.get(key);
    reservedByOwner.set(key, {
      ownerType: entry.ownerType,
      ownerId: entry.ownerId,
      quantity: (current?.quantity ?? 0) + entry.quantity,
    });
  }
  return [...reservedByOwner.values()].sort((left, right) =>
    `${left.ownerType}:${left.ownerId}`.localeCompare(`${right.ownerType}:${right.ownerId}`),
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
    reserved: groupBalancesByOwner(reserved),
    shipped: groupBalancesByOwner(shipped),
  };
};

export const isActiveProductionOutputStatus = (status: string | null | undefined): boolean =>
  status === "draft" || status === "planned" || status === "in_progress";

export const isUncancelledProductionOutputStatus = (status: string | null | undefined): boolean =>
  status != null && status !== "cancelled";

/** Qty already reserved for a CO product in active (draft/in_progress) outputs. */
export const reservedInActiveOutputsForOrderProduct = (
  snapshot: LogisticsSnapshot,
  orderId: string,
  productId: string,
): number => {
  let total = 0;
  for (const line of snapshot.outputLines) {
    if (line.productId !== productId) {
      continue;
    }
    if (!ownersEqual(line.toOwnerType, line.toOwnerId, "order", orderId)) {
      continue;
    }
    const output = snapshot.outputs.find((item) => item.id === line.outputId);
    if (!output || !isActiveProductionOutputStatus(output.status)) {
      continue;
    }
    total += line.quantity;
  }
  return total;
};

/** Free (unowned) qty of a product inside one draft output. */
export const freeInDraftOutput = (
  snapshot: LogisticsSnapshot,
  outputId: string,
  productId: string,
): number => {
  const output = snapshot.outputs.find((item) => item.id === outputId);
  if (!output || (output.status !== "draft" && output.status !== "planned")) {
    return 0;
  }
  return snapshot.outputLines
    .filter(
      (line) =>
        line.outputId === outputId &&
        line.productId === productId &&
        isFreeOwner(line.toOwnerType, line.toOwnerId),
    )
    .reduce((sum, line) => sum + line.quantity, 0);
};

/** Plan minus all uncancelled output lines for the PO product. */
export const remainingPlanForProductionProduct = (
  snapshot: LogisticsSnapshot,
  productionOrderId: string,
  productId: string,
  planQuantity: number,
): number => {
  const committed = snapshot.outputLines
    .filter((line) => {
      if (line.productId !== productId) {
        return false;
      }
      const output = snapshot.outputs.find((item) => item.id === line.outputId);
      return (
        output?.productionOrderId === productionOrderId &&
        isUncancelledProductionOutputStatus(output.status)
      );
    })
    .reduce((sum, line) => sum + line.quantity, 0);
  return Math.max(0, planQuantity - committed);
};

/** Form cap: warehouse remaining-to-reserve minus already reserved in active outputs. */
export const remainingToReserveInProductionOutputsForLine = (
  line: CustomerOrderLine,
  balances: StockBalance[],
  snapshot: LogisticsSnapshot,
): number =>
  Math.max(
    0,
    remainingToReserveForLine(line, balances) -
      reservedInActiveOutputsForOrderProduct(snapshot, line.orderId, line.productId),
  );

export const productionDemandAssigned = (
  snapshot: LogisticsSnapshot,
  productionOrderId: string,
  productId: string,
): ProductionLineReservation[] => {
  const byOwner = new Map<string, ProductionLineReservation>();

  for (const line of snapshot.outputLines) {
    if (line.productId !== productId) {
      continue;
    }
    if (isFreeOwner(line.toOwnerType, line.toOwnerId) || !line.toOwnerType || !line.toOwnerId) {
      continue;
    }
    const output = snapshot.outputs.find((item) => item.id === line.outputId);
    if (
      !output ||
      output.productionOrderId !== productionOrderId ||
      !isActiveProductionOutputStatus(output.status)
    ) {
      continue;
    }
    const key = `${line.toOwnerType}:${line.toOwnerId}`;
    const current = byOwner.get(key);
    if (current) {
      current.quantity += line.quantity;
    } else {
      byOwner.set(key, {
        ownerType: line.toOwnerType,
        ownerId: line.toOwnerId,
        quantity: line.quantity,
      });
    }
  }

  return [...byOwner.values()].filter((item) => item.quantity > 1e-9);
};

export const producedForProductionProduct = (
  snapshot: LogisticsSnapshot,
  productionOrderId: string,
  productId: string,
): number =>
  snapshot.outputLines
    .filter((line) => {
      if (line.productId !== productId) {
        return false;
      }
      const doc = snapshot.outputs.find((item) => item.id === line.outputId);
      return doc?.productionOrderId === productionOrderId && doc.status === "done";
    })
    .reduce((sum, line) => sum + line.quantity, 0);

export const productionLineReservationBreakdown = (
  line: { id: string; productId: string; orderId?: string; quantity?: number },
  balancesOrSnapshot: StockBalance[] | LogisticsSnapshot,
  maybeSnapshot?: LogisticsSnapshot,
): ProductionLineReservationBreakdown => {
  // Backward-compatible: (line, balances) used stock; (line, snapshot) or (line, balances, snapshot) uses demand.
  const snapshot =
    maybeSnapshot ??
    (Array.isArray(balancesOrSnapshot) ? null : (balancesOrSnapshot as LogisticsSnapshot));
  if (!snapshot) {
    const breakdown = placeStockBreakdown(
      balancesOrSnapshot as StockBalance[],
      line.productId,
      "production_order",
      line.orderId ?? line.id,
    );
    return { free: breakdown.free, reserved: breakdown.reserved };
  }

  const productionOrderId = line.orderId ?? line.id;
  const reserved = productionDemandAssigned(snapshot, productionOrderId, line.productId);
  const plan = line.quantity ?? 0;
  const free = remainingPlanForProductionProduct(
    snapshot,
    productionOrderId,
    line.productId,
    plan,
  );
  return { free, reserved };
};

export const outputtedForProductionLine = (snapshot: LogisticsSnapshot, productionOrderLineId: string): number => {
  const planLine = snapshot.productionOrderLines.find((line) => line.id === productionOrderLineId);
  if (planLine) {
    return producedForProductionProduct(snapshot, planLine.orderId, planLine.productId);
  }
  // Output detail context may omit sibling plan lines — still count done outputs for this line id.
  return snapshot.outputLines
    .filter((line) => {
      if (line.productionOrderLineId !== productionOrderLineId) {
        return false;
      }
      const doc = snapshot.outputs.find((item) => item.id === line.outputId);
      return doc?.status === "done";
    })
    .reduce((sum, line) => sum + line.quantity, 0);
};

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

const resolveDocumentPublicId = (
  snapshot: LogisticsSnapshot | undefined,
  documentType: SourceType | "customer_order",
  documentId: string,
): string => {
  if (!snapshot) {
    return documentId;
  }
  if (documentType === "customer_order") {
    return snapshot.customerOrders.find((item) => item.id === documentId)?.sequenceNumber ?? documentId;
  }
  if (documentType === "reservation") {
    return snapshot.reservations.find((item) => item.id === documentId)?.sequenceNumber ?? documentId;
  }
  if (documentType === "shipment" || documentType === "return") {
    return snapshot.shipments.find((item) => item.id === documentId)?.sequenceNumber ?? documentId;
  }
  if (documentType === "output") {
    return snapshot.outputs.find((item) => item.id === documentId)?.sequenceNumber ?? documentId;
  }
  if (documentType === "production_order") {
    return snapshot.productionOrders.find((item) => item.id === documentId)?.sequenceNumber ?? documentId;
  }
  if (documentType === "transfer") {
    return snapshot.transfers.find((item) => item.id === documentId)?.sequenceNumber ?? documentId;
  }
  if (documentType === "adjustment") {
    return snapshot.adjustments.find((item) => item.id === documentId)?.sequenceNumber ?? documentId;
  }
  return documentId;
};

export const hrefForDocument = (
  documentType: SourceType,
  documentId: string,
  snapshot?: LogisticsSnapshot,
): string | null => {
  const publicId = resolveDocumentPublicId(snapshot, documentType, documentId);
  switch (documentType) {
    case "reservation":
      return logisticsPath("reservations", publicId);
    case "shipment":
      return logisticsPath("shipments", publicId);
    case "return":
      return logisticsPath("shipments", publicId);
    case "output":
      return logisticsPath("outputs", publicId);
    case "production_order":
      return logisticsPath("production-orders", publicId);
    case "transfer":
      return logisticsPath("transfers", publicId);
    case "adjustment":
      return logisticsPath("adjustments", publicId);
    default:
      return null;
  }
};

export const hrefForSource = hrefForDocument;

export const hrefForCustomerOrder = (id: string, snapshot?: LogisticsSnapshot): string =>
  logisticsPath("customer-orders", resolveDocumentPublicId(snapshot, "customer_order", id));
export const hrefForProduct = (id: string): string => hrefForStoreProduct(id);
export const hrefForWarehouse = (id: string): string => logisticsPath("warehouses", id);
export const hrefForRegion = (id: string): string => logisticsPath("regions", id);
export const hrefForPlant = (id: string): string => logisticsPath("plants", id);
export const hrefForTransfer = (id: string, snapshot?: LogisticsSnapshot): string =>
  logisticsPath("transfers", resolveDocumentPublicId(snapshot, "transfer", id));
export const hrefForProductionOrder = (id: string, snapshot?: LogisticsSnapshot): string =>
  logisticsPath("production-orders", resolveDocumentPublicId(snapshot, "production_order", id));

export const hrefForOwner = (
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
  snapshot?: LogisticsSnapshot,
): string | null => {
  if (!ownerId) {
    return null;
  }
  if (ownerType === "order") {
    return hrefForCustomerOrder(ownerId, snapshot);
  }
  if (ownerType === "region") {
    return hrefForRegion(ownerId);
  }
  return null;
};

export const hrefForLocation = (
  snapshot: LogisticsSnapshot,
  locationType: LocationType,
  locationId: string,
): string | null => {
  if (locationType === "warehouse") {
    return hrefForWarehouse(locationId);
  }
  if (locationType === "transfer") {
    return hrefForTransfer(locationId, snapshot);
  }
  if (locationType === "customer_order") {
    return hrefForCustomerOrder(locationId, snapshot);
  }
  if (locationType === "production_order") {
    const orderId = snapshot.productionOrders.some((item) => item.id === locationId)
      ? locationId
      : snapshot.productionOrderLines.find((item) => item.id === locationId)?.orderId;
    return orderId ? hrefForProductionOrder(orderId, snapshot) : null;
  }
  return null;
};

export const stateQty = (split: LocationStateSplit, state: StockState): number => split[state];

export { remainingToReserve, sumShippedForLine };
