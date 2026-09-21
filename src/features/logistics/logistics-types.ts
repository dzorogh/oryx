import type { LogisticsCodePrefixes } from "@/features/logistics/logistics-codes";

export const LOCATION_TYPES = ["warehouse", "production_order", "transfer", "customer_order"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const STOCK_STATES = ["free", "reserved", "shipped"] as const;
export type StockState = (typeof STOCK_STATES)[number];

export const DOCUMENT_STATUSES = ["draft", "posted", "cancelled"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const CUSTOMER_ORDER_STATUSES = ["open", "closed"] as const;
export type CustomerOrderStatus = (typeof CUSTOMER_ORDER_STATUSES)[number];

export const PRODUCTION_STATUSES = ["draft", "planned", "in_progress", "done", "closed", "cancelled"] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const TRANSFER_STATUSES = ["sent", "delivered", "cancelled"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const OUTPUT_STATUSES = ["planned", "done", "cancelled"] as const;
export type OutputStatus = (typeof OUTPUT_STATUSES)[number];

export const ADJUSTMENT_OPERATIONS = ["write_off", "decrease", "increase"] as const;
export type AdjustmentOperation = (typeof ADJUSTMENT_OPERATIONS)[number];

export const ADJUSTMENT_STATUSES = ["posted"] as const;
export type AdjustmentStatus = (typeof ADJUSTMENT_STATUSES)[number];

export const OWNER_TYPES = ["order", "region"] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

export const RESERVATION_DIRECTIONS = ["reserve", "release", "reassign"] as const;
export type ReservationDirection = (typeof RESERVATION_DIRECTIONS)[number];

/** Derived list-filter values. `?operation=release` still means the release direction. */
export const RESERVATION_OPERATIONS = RESERVATION_DIRECTIONS;
export type ReservationOperation = ReservationDirection;

export const RESERVATION_ORIGINS = ["manual", "order_close"] as const;
export type ReservationOrigin = (typeof RESERVATION_ORIGINS)[number];

export const RESERVATION_STATUSES = ["draft", "posted"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_LOCATION_TYPES = ["warehouse", "production_order", "transfer"] as const;
export type ReservationLocationType = (typeof RESERVATION_LOCATION_TYPES)[number];

export const DOCUMENT_TYPES = [
  "reservation",
  "shipment",
  "return",
  "transfer",
  "production_order",
  "output",
  "adjustment",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** @deprecated Use DocumentType. Kept so leftover source filters compile during the cutover. */
export const SOURCE_TYPES = DOCUMENT_TYPES;
export type SourceType = DocumentType;

export const HISTORY_DOCUMENT_TYPES = [
  "reservation",
  "shipment",
  "return",
  "transfer",
  "production_order",
  "output",
  "adjustment",
  "customer_order",
] as const;
export type HistoryDocumentType = (typeof HISTORY_DOCUMENT_TYPES)[number];

export const DOCUMENT_HISTORY_EVENT_TYPES = ["created", "status_changed", "expected_end_changed"] as const;
export type DocumentHistoryEventType = (typeof DOCUMENT_HISTORY_EVENT_TYPES)[number];

export const STORE_CURRENT_USER_ID = "1";

export type StoreUser = {
  id: string;
  name: string;
};

export type DocumentHistoryEntry = {
  id: string;
  documentType: HistoryDocumentType;
  documentId: string;
  eventType: DocumentHistoryEventType;
  status: string;
  expectedEndOn: string | null;
  createdAt: string;
  createdBy: string;
};

export type LogisticsProduct = {
  id: string;
  code: string;
  sku: string;
  name: string;
  unit: string;
  imageUrl?: string | null;
  manufacturerId: string | null;
};

export type LogisticsManufacturer = {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
};

export type LogisticsWarehouse = {
  id: string;
  code: string;
  name: string;
  manufacturerId: string | null;
};

export type LogisticsRegion = {
  id: string;
  code: string;
  name: string;
};

export type LogisticsSetting = {
  id: string;
  codePrefixes: LogisticsCodePrefixes;
};

export type CustomerOrder = {
  id: string;
  number: string;
  status: CustomerOrderStatus;
  createdAt: string;
  createdBy: string;
  expectedEndOn: string | null;
  description: string;
};

export type CustomerOrderLine = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
};

export type ProductionOrder = {
  id: string;
  number: string;
  manufacturerId: string;
  status: ProductionStatus;
  createdAt: string;
  createdBy: string;
  expectedEndOn: string | null;
};

export type ProductionOrderLine = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  activatedQuantity: number;
};

export type Reservation = {
  id: string;
  number: string;
  locationType: ReservationLocationType;
  locationId: string;
  toOwnerType: OwnerType | null;
  toOwnerId: string | null;
  status: ReservationStatus;
  origin: ReservationOrigin;
  note: string;
  createdAt: string;
  createdBy: string;
};

export type ReservationLine = {
  id: string;
  reservationId: string;
  productId: string;
  quantity: number;
  fromOwnerType: OwnerType | null;
  fromOwnerId: string | null;
};

export type Transfer = {
  id: string;
  number: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: TransferStatus;
  createdAt: string;
  createdBy: string;
  expectedEndOn: string | null;
};

export type TransferLine = {
  id: string;
  transferId: string;
  productId: string;
  quantity: number;
};

export type TransferAllocation = {
  id: string;
  lineId: string;
  ownerType: OwnerType;
  ownerId: string;
  quantity: number;
};

export const SHIPMENT_DIRECTIONS = ["shipment", "return"] as const;
export type ShipmentDirection = (typeof SHIPMENT_DIRECTIONS)[number];

export type Shipment = {
  id: string;
  number: string;
  customerOrderId: string;
  fromLocationType: LocationType;
  fromLocationId: string;
  toLocationType: LocationType;
  toLocationId: string;
  createdAt: string;
  createdBy: string;
};

export type ShipmentLine = {
  id: string;
  shipmentId: string;
  productId: string;
  quantity: number;
  toOwnerType: OwnerType | null;
  toOwnerId: string | null;
};

export type ProductionOutput = {
  id: string;
  number: string;
  productionOrderId: string;
  status: OutputStatus;
  createdAt: string;
  createdBy: string;
  expectedEndOn: string | null;
};

export type ProductionOutputLine = {
  id: string;
  outputId: string;
  productionOrderLineId: string;
  productId: string;
  quantity: number;
};

export type ProductionOutputAllocation = {
  id: string;
  lineId: string;
  ownerType: OwnerType;
  ownerId: string;
  quantity: number;
};

export type StockAdjustment = {
  id: string;
  number: string;
  operation: AdjustmentOperation;
  warehouseId: string;
  explanation: string;
  sourceDocumentType: DocumentType | null;
  sourceDocumentId: string | null;
  status: AdjustmentStatus;
  createdAt: string;
  createdBy: string;
};

export type StockAdjustmentLine = {
  id: string;
  adjustmentId: string;
  productId: string;
  quantity: number;
};

export type StockTransaction = {
  id: string;
  createdAt: string;
  productId: string;
  quantity: number;
  locationType: LocationType;
  locationId: string;
  assignedToType: OwnerType | null;
  assignedToId: string | null;
  documentType: DocumentType;
  documentId: string;
  stockState: StockState;
  ownerType: OwnerType | null;
  ownerId: string | null;
};

export type StockBalance = {
  productId: string;
  locationType: LocationType;
  locationId: string;
  assignedToType?: OwnerType | null;
  assignedToId?: string | null;
  stockState: StockState;
  ownerType: OwnerType | null;
  ownerId: string | null;
  quantity: number;
};

export type LogisticsSnapshot = {
  products: LogisticsProduct[];
  manufacturers: LogisticsManufacturer[];
  warehouses: LogisticsWarehouse[];
  regions: LogisticsRegion[];
  settings: LogisticsSetting;
  customerOrders: CustomerOrder[];
  customerOrderLines: CustomerOrderLine[];
  productionOrders: ProductionOrder[];
  productionOrderLines: ProductionOrderLine[];
  reservations: Reservation[];
  reservationLines: ReservationLine[];
  transfers: Transfer[];
  transferLines: TransferLine[];
  transferAllocations: TransferAllocation[];
  shipments: Shipment[];
  shipmentLines: ShipmentLine[];
  outputs: ProductionOutput[];
  outputLines: ProductionOutputLine[];
  outputAllocations: ProductionOutputAllocation[];
  adjustments: StockAdjustment[];
  adjustmentLines: StockAdjustmentLine[];
  transactions: StockTransaction[];
  users: StoreUser[];
  documentHistory: DocumentHistoryEntry[];
};

export type OwnerRef = {
  ownerType: OwnerType | null;
  ownerId: string | null;
};

const emptyId = (id: string | null | undefined): boolean => id == null || id === "";

export const isFreeOwner = (
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): boolean => ownerType == null && emptyId(ownerId);

export const ownersEqual = (
  aType: OwnerType | null | undefined,
  aId: string | null | undefined,
  bType: OwnerType | null | undefined,
  bId: string | null | undefined,
): boolean => {
  const aFree = isFreeOwner(aType, aId);
  const bFree = isFreeOwner(bType, bId);
  if (aFree || bFree) {
    return aFree && bFree;
  }
  return aType === bType && String(aId) === String(bId);
};

export const ownerKey = (
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): string => (isFreeOwner(ownerType, ownerId) ? "free" : `${ownerType}:${ownerId}`);

export const shipmentDirection = (
  fromLocationType: LocationType,
  toLocationType: LocationType,
): ShipmentDirection => {
  if (fromLocationType === "warehouse" && toLocationType === "customer_order") {
    return "shipment";
  }
  if (fromLocationType === "customer_order" && toLocationType === "warehouse") {
    return "return";
  }
  throw new Error("Допустимы только маршруты склад → заказ клиента и заказ клиента → склад");
};

export const shipmentWarehouseId = (doc: Pick<Shipment, "fromLocationType" | "fromLocationId" | "toLocationType" | "toLocationId">): string =>
  doc.fromLocationType === "warehouse" ? doc.fromLocationId : doc.toLocationId;

export const reservationDirection = (
  doc: Pick<Reservation, "toOwnerType" | "toOwnerId">,
  lines: Array<Pick<ReservationLine, "fromOwnerType" | "fromOwnerId">>,
): ReservationDirection => {
  if (isFreeOwner(doc.toOwnerType, doc.toOwnerId)) {
    return "release";
  }
  if (lines.length > 0 && lines.every((line) => isFreeOwner(line.fromOwnerType, line.fromOwnerId))) {
    return "reserve";
  }
  return "reassign";
};

export const reservationTouchesOrder = (
  doc: Pick<Reservation, "id" | "toOwnerType" | "toOwnerId">,
  lines: Array<Pick<ReservationLine, "reservationId" | "fromOwnerType" | "fromOwnerId">>,
  orderId: string,
): boolean => {
  if (ownersEqual(doc.toOwnerType, doc.toOwnerId, "order", orderId)) {
    return true;
  }
  return lines.some(
    (line) =>
      line.reservationId === doc.id && ownersEqual(line.fromOwnerType, line.fromOwnerId, "order", orderId),
  );
};

export const orderLineForProduct = (
  lines: CustomerOrderLine[],
  orderId: string,
  productId: string,
): CustomerOrderLine | undefined =>
  lines.find((line) => line.orderId === orderId && line.productId === productId);

export const isOrderOwner = (
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): ownerType is "order" => ownerType === "order" && !emptyId(ownerId);

export const derivedStockState = (
  locationType: LocationType,
  assignedToType: OwnerType | null | undefined,
  assignedToId?: string | null,
): StockState => {
  if (locationType === "customer_order") {
    return "shipped";
  }
  if (isFreeOwner(assignedToType, assignedToId)) {
    return "free";
  }
  return "reserved";
};

export const documentKey = (documentType: DocumentType, documentId: string): string =>
  `${documentType}:${documentId}`;

export const documentKeysForAssignedEntity = (
  transactions: Array<Pick<StockTransaction, "assignedToType" | "assignedToId" | "documentType" | "documentId">>,
  assignedToType: OwnerType,
  assignedToId: string,
): Set<string> =>
  new Set(
    transactions
      .filter((entry) => ownersEqual(entry.assignedToType, entry.assignedToId, assignedToType, assignedToId))
      .map((entry) => documentKey(entry.documentType, entry.documentId)),
  );
