import type { LogisticsCodePrefixes } from "@/features/logistics/logistics-codes";

export const LOCATION_KINDS = ["warehouse", "production_order", "transfer", "customer_order"] as const;
export const LOCATION_TYPES = LOCATION_KINDS;
export type LocationKind = (typeof LOCATION_KINDS)[number];
/** @deprecated Use LocationKind */
export type LocationType = LocationKind;

export const OWNER_KINDS = ["free", "customer_order", "region"] as const;
export type OwnerKind = (typeof OWNER_KINDS)[number];

/** UI owner projection: free = null pair; customer_order → order */
export const OWNER_TYPES = ["order", "region"] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

export const STOCK_STATES = ["free", "reserved", "shipped"] as const;
export type StockState = (typeof STOCK_STATES)[number];

export const LIFECYCLE_STATUSES = ["draft", "in_progress", "done", "cancelled"] as const;
/** Legacy UI values still compared in screens; map to lifecycle in API/DB. */
export const LEGACY_LIFECYCLE_STATUSES = [
  "open",
  "closed",
  "planned",
  "posted",
  "sent",
  "delivered",
] as const;
export type LifecycleStatus =
  | (typeof LIFECYCLE_STATUSES)[number]
  | (typeof LEGACY_LIFECYCLE_STATUSES)[number];
export type DocumentStatus = LifecycleStatus;

/** DB lifecycle is `in_progress`; `open` is the legacy UI value some fixtures still use. */
export const isOpenCustomerOrderStatus = (status: string | null | undefined): boolean =>
  status === "in_progress" || status === "open";

export const DOCUMENT_KINDS = [
  "customer_order",
  "production_order",
  "reservation",
  "shipment",
  "adjustment",
  "transfer",
  "production_output",
  /** @deprecated alias of production_output */
  "output",
  /** @deprecated shipment direction, not a kind */
  "return",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
/** @deprecated Use DocumentKind */
export type DocumentType = DocumentKind;
export const DOCUMENT_TYPES = DOCUMENT_KINDS;
export const SOURCE_TYPES = DOCUMENT_TYPES;
export type SourceType = DocumentType;
export const HISTORY_DOCUMENT_TYPES = DOCUMENT_TYPES;
export type HistoryDocumentType = DocumentType;

export const CUSTOMER_ORDER_STATUSES = LIFECYCLE_STATUSES;
export type CustomerOrderStatus = LifecycleStatus;

export const PRODUCTION_STATUSES = LIFECYCLE_STATUSES;
export type ProductionStatus = LifecycleStatus;

export const TRANSFER_STATUSES = LIFECYCLE_STATUSES;
export type TransferStatus = LifecycleStatus;

export const OUTPUT_STATUSES = LIFECYCLE_STATUSES;
export type OutputStatus = LifecycleStatus;

export const RESERVATION_DIRECTIONS = ["reserve", "release", "reassign"] as const;
export type ReservationDirection = (typeof RESERVATION_DIRECTIONS)[number];
export const RESERVATION_OPERATIONS = RESERVATION_DIRECTIONS;
export type ReservationOperation = ReservationDirection;

export const RESERVATION_ORIGINS = ["manual", "customer_order_close", "production_order_close"] as const;
export type ReservationOrigin = (typeof RESERVATION_ORIGINS)[number];
export const RESERVATION_STATUSES = ["draft", "posted"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_LOCATION_KINDS = ["warehouse", "production_order", "transfer"] as const;
export type ReservationLocationType = (typeof RESERVATION_LOCATION_KINDS)[number];

export const SHIPMENT_DIRECTIONS = ["shipment", "return"] as const;
export type ShipmentDirection = (typeof SHIPMENT_DIRECTIONS)[number];

export const ADJUSTMENT_OPERATIONS = ["write_off", "decrease", "increase"] as const;
export type AdjustmentOperation = (typeof ADJUSTMENT_OPERATIONS)[number];

export const ADJUSTMENT_STATUSES = ["posted"] as const;
export type AdjustmentStatus = (typeof ADJUSTMENT_STATUSES)[number];

export const STORE_CURRENT_USER_ID = "1";
export const FREE_OWNER_ID = "1";

export type AppUser = {
  id: string;
  name: string;
};
/** @deprecated Use AppUser */
export type StoreUser = AppUser;

export type DocumentHistoryEntry = {
  id: string;
  documentId: string;
  status: string | null;
  expectedEndOn: string | null;
  changedAt: string;
  changedBy: string;
  /** @deprecated */
  documentType?: DocumentKind | string;
  /** @deprecated */
  eventType?: string;
  createdAt?: string;
  createdBy?: string;
};

export type StockLocation = {
  id: string;
  kind: LocationKind;
};

export type StockOwner = {
  id: string;
  kind: OwnerKind;
};

export type LogisticsProduct = {
  id: string;
  productId: string;
  code: string;
  name: string;
  unit: string;
  imageUrl?: string | null;
  plantId: string | null;
};

export type LogisticsPlant = {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
};

export type LogisticsWarehouse = {
  id: string;
  code: string;
  name: string;
  stockLocationId: string;
  plantId: string | null;
};

export type LogisticsRegion = {
  id: string;
  code: string;
  name: string;
  stockOwnerId: string;
};

export type LogisticsSetting = {
  id: string;
  codePrefixes: LogisticsCodePrefixes;
};

export type DocumentProductLine = {
  id: string;
  documentId: string;
  productVariantId: string;
  quantity: number;
  fromOwnerId: string | null;
  toOwnerId: string | null;
  variantName: string;
  unitPrice: number | null;
  currencyId: string | null;
  productId: string;
  productName: string;
  productUnit: string;
  plantId: string | null;
  plantName: string | null;
  plantCode: string | null;
  fromOwnerType: OwnerType | null;
  toOwnerType: OwnerType | null;
};

export type CustomerOrder = {
  id: string;
  numberPrefix?: string;
  /** @deprecated Use numberPrefix */
  series: string;
  sequenceNumber: string;
  number: string;
  status: CustomerOrderStatus;
  regionId: string;
  stockLocationId: string;
  stockOwnerId: string;
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
  productName: string;
  productUnit: string;
  plantId?: string | null;
  plantName?: string | null;
  plantCode?: string | null;
};

export type ProductionOrder = {
  id: string;
  numberPrefix?: string;
  /** @deprecated Use numberPrefix */
  series: string;
  sequenceNumber: string;
  number: string;
  plantId?: string;
  stockLocationId?: string;
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
  productName: string;
  productUnit: string;
  plantId: string | null;
  plantName: string | null;
  plantCode: string | null;
};

export type Reservation = {
  id: string;
  numberPrefix?: string;
  /** @deprecated Use numberPrefix */
  series: string;
  sequenceNumber: string;
  number: string;
  /** Stock location registry id */
  stockLocationId?: string;
  /** Entity id (warehouse / PO / transfer) for UI */
  locationType: ReservationLocationType;
  locationId: string;
  ownerId: string;
  toOwnerType: OwnerType | null;
  toOwnerId: string | null;
  postedAt: string | null;
  creationSource: ReservationOrigin;
  description: string;
  createdAt: string;
  createdBy: string;
  status: "draft" | "posted";
  origin: ReservationOrigin;
  note: string;
};

export type ReservationLine = {
  id: string;
  reservationId: string;
  productId: string;
  quantity: number;
  fromOwnerId: string | null;
  fromOwnerType: OwnerType | null;
  productName: string;
  productUnit: string;
};

export type Transfer = {
  id: string;
  numberPrefix?: string;
  /** @deprecated Use numberPrefix */
  series: string;
  sequenceNumber: string;
  number: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  stockLocationId: string;
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
  productName: string;
  productUnit: string;
};

export type TransferAllocation = {
  id: string;
  lineId: string;
  ownerType: OwnerType;
  ownerId: string;
  quantity: number;
};

export type Shipment = {
  id: string;
  numberPrefix?: string;
  /** @deprecated Use numberPrefix */
  series: string;
  sequenceNumber: string;
  number: string;
  /** Stock location registry ids */
  fromStockLocationId?: string;
  toStockLocationId?: string;
  /** Entity ids (warehouse / customer order) for UI */
  fromLocationType: LocationKind;
  fromLocationId: string;
  toLocationType: LocationKind;
  toLocationId: string;
  customerOrderId: string;
  createdAt: string;
  createdBy: string;
};

export type ShipmentLine = {
  id: string;
  shipmentId: string;
  productId: string;
  quantity: number;
  toOwnerId: string | null;
  fromOwnerId: string | null;
  toOwnerType: OwnerType | null;
  fromOwnerType: OwnerType | null;
  productName: string;
  productUnit: string;
};

export type ProductionOutput = {
  id: string;
  numberPrefix?: string;
  /** @deprecated Use numberPrefix */
  series: string;
  sequenceNumber: string;
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
  productName: string;
  productUnit: string;
  toOwnerId: string | null;
  toOwnerType: OwnerType | null;
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
  numberPrefix?: string;
  /** @deprecated Use numberPrefix */
  series: string;
  sequenceNumber: string;
  number: string;
  locationId: string;
  warehouseId: string;
  description: string;
  createdAt: string;
  createdBy: string;
  /** Derived for UI that still groups by sign */
  operation: AdjustmentOperation | "mixed";
  explanation: string;
  sourceDocumentType: DocumentKind | null;
  sourceDocumentId: string | null;
  status: "posted";
};

export type StockAdjustmentLine = {
  id: string;
  adjustmentId: string;
  productId: string;
  quantity: number;
  productName: string;
  productUnit: string;
};

export type StockTransaction = {
  id: string;
  createdAt: string;
  productVariantId: string;
  productId: string;
  quantity: number;
  stockLocationId: string;
  stockOwnerId: string;
  documentId: string;
  documentKind: DocumentKind;
  locationType: LocationKind;
  locationId: string;
  ownerKind: OwnerKind;
  stockState: StockState;
  assignedToType: OwnerType | null;
  assignedToId: string | null;
  documentType: DocumentKind;
  ownerType: OwnerType | null;
  ownerId: string | null;
};

export type StockBalance = {
  productId: string;
  stockLocationId?: string;
  stockOwnerId?: string;
  locationType: LocationKind;
  locationId: string;
  ownerKind?: OwnerKind;
  stockState: StockState;
  quantity: number;
  assignedToType?: OwnerType | null;
  assignedToId?: string | null;
  ownerType: OwnerType | null;
  ownerId: string | null;
};

export type LogisticsSnapshot = {
  products: LogisticsProduct[];
  plants: LogisticsPlant[];
  warehouses: LogisticsWarehouse[];
  regions: LogisticsRegion[];
  stockLocations: StockLocation[];
  stockOwners: StockOwner[];
  freeOwnerId: string;
  settings: LogisticsSetting;
  documentProductLines: DocumentProductLine[];
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
  users: AppUser[];
  documentHistory: DocumentHistoryEntry[];
};

export const documentNumber = (prefix: string, sequenceNumber: string | number): string =>
  `${prefix}-${sequenceNumber}`;

export const matchDocumentParam = <T extends { id: string; sequenceNumber: string }>(
  items: T[],
  param: string,
): T | undefined =>
  items.find((item) => item.sequenceNumber === param) ?? items.find((item) => item.id === param);

export const publicDocumentParam = (doc: { sequenceNumber: string }): string => doc.sequenceNumber;

export type OwnerRef = {
  ownerType: OwnerType | null;
  ownerId: string | null;
};

const emptyId = (id: string | null | undefined): boolean => id == null || id === "";

export const isFreeOwner = (
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): boolean =>
  ownerType == null && (emptyId(ownerId) || ownerId === FREE_OWNER_ID);

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

export const ownerKindToType = (kind: OwnerKind): OwnerType | null => {
  if (kind === "free") return null;
  if (kind === "customer_order") return "order";
  return "region";
};

export const shipmentDirection = (
  fromLocationType: LocationKind,
  toLocationType: LocationKind,
): ShipmentDirection => {
  if (fromLocationType === "warehouse" && toLocationType === "customer_order") {
    return "shipment";
  }
  if (fromLocationType === "customer_order" && toLocationType === "warehouse") {
    return "return";
  }
  throw new Error("Допустимы только маршруты склад → заказ клиента и заказ клиента → склад");
};

export const shipmentWarehouseId = (
  doc: Pick<Shipment, "fromLocationType" | "fromLocationId" | "toLocationType" | "toLocationId">,
): string => (doc.fromLocationType === "warehouse" ? doc.fromLocationId : doc.toLocationId);

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
      line.reservationId === doc.id &&
      ownersEqual(line.fromOwnerType, line.fromOwnerId, "order", orderId),
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
  locationKind: LocationKind,
  ownerKind: OwnerKind,
): StockState => {
  if (locationKind === "customer_order") {
    return "shipped";
  }
  if (ownerKind === "free") {
    return "free";
  }
  return "reserved";
};

export const documentKey = (documentType: DocumentKind, documentId: string): string =>
  `${documentType}:${documentId}`;

export const documentKeysForAssignedEntity = (
  transactions: Array<
    Pick<StockTransaction, "assignedToType" | "assignedToId" | "documentType" | "documentId">
  >,
  assignedToType: OwnerType,
  assignedToId: string,
): Set<string> =>
  new Set(
    transactions
      .filter((entry) =>
        ownersEqual(entry.assignedToType, entry.assignedToId, assignedToType, assignedToId),
      )
      .map((entry) => documentKey(entry.documentType, entry.documentId)),
  );
