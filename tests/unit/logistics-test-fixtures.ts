import { derivedStockState } from "@/features/logistics/logistics-types";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import type {
  CustomerOrder,
  DocumentType,
  LocationType,
  LogisticsSnapshot,
  ProductionOrder,
  ProductionOutput,
  Reservation,
  Shipment,
  ShipmentReturn,
  StockBalance,
  StockState,
  StockTransaction,
  Transfer,
} from "@/features/logistics/logistics-types";

export const DEMO_USER_ID = "1";

type TxInput = Partial<StockTransaction> &
  Pick<StockTransaction, "quantity"> & {
    stockState?: StockState;
    customerOrderId?: string | null;
    customerOrderLineId?: string | null;
    transactionId?: string;
    postedAt?: string;
    sourceType?: DocumentType | string;
    sourceId?: string;
  };

export const tx = (partial: TxInput): StockTransaction => {
  const assignedToType =
    partial.assignedToType ??
    partial.ownerType ??
    (partial.customerOrderId ? "order" : null);
  const assignedToId = partial.assignedToId ?? partial.ownerId ?? partial.customerOrderId ?? null;
  const locationType = (partial.locationType ?? "warehouse") as LocationType;
  const stockState = partial.stockState ?? derivedStockState(locationType, assignedToType, assignedToId);
  const documentType = (partial.documentType ??
    (partial.sourceType === "shipment_return"
      ? "return"
      : partial.sourceType === "production_output"
        ? "output"
        : partial.sourceType === "transfer_send" || partial.sourceType === "transfer_complete"
          ? "transfer"
          : partial.sourceType === "production_activation" || partial.sourceType === "production_close"
            ? "production_order"
            : partial.sourceType) ??
    "reservation") as DocumentType;
  return {
    id: partial.id ?? partial.transactionId ?? `tx-${Math.random()}`,
    createdAt: partial.createdAt ?? partial.postedAt ?? "2026-09-16T10:00:00.000Z",
    productId: partial.productId ?? "p-chair",
    quantity: partial.quantity,
    locationType,
    locationId: partial.locationId ?? "wh-nordic",
    assignedToType,
    assignedToId,
    documentType,
    documentId: partial.documentId ?? partial.sourceId ?? "rsv-1",
    stockState,
    ownerType: assignedToType,
    ownerId: assignedToId,
  };
};

export const balance = (
  partial: Omit<StockBalance, "assignedToType" | "assignedToId"> & Partial<StockBalance>,
): StockBalance => ({
  ...partial,
  assignedToType: partial.assignedToType ?? partial.ownerType,
  assignedToId: partial.assignedToId ?? partial.ownerId,
});

export const snapshot = (partial: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot => ({
  products: [],
  manufacturers: [],
  warehouses: [],
  regions: [],
  settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
  customerOrders: [],
  customerOrderLines: [],
  productionOrders: [],
  productionOrderLines: [],
  reservations: [],
  reservationLines: [],
  transfers: [],
  transferLines: [],
  transferAllocations: [],
  shipments: [],
  shipmentLines: [],
  outputs: [],
  outputLines: [],
  outputAllocations: [],
  returns: [],
  returnLines: [],
  transactions: [],
  users: [],
  documentHistory: [],
  ...partial,
});

export const customerOrder = (partial: Partial<CustomerOrder> & Pick<CustomerOrder, "id">): CustomerOrder => ({
  number: partial.number ?? `OMS-${partial.id}`,
  status: partial.status ?? "open",
  createdAt: partial.createdAt ?? "",
  createdBy: DEMO_USER_ID,
  expectedEndOn: partial.expectedEndOn ?? null,
  description: partial.description ?? "",
  ...partial,
});

export const productionOrder = (
  partial: Partial<ProductionOrder> & Pick<ProductionOrder, "id">,
): ProductionOrder => ({
  number: partial.number ?? `PO-${partial.id}`,
  manufacturerId: partial.manufacturerId ?? "1",
  status: partial.status ?? "in_progress",
  createdAt: partial.createdAt ?? "",
  createdBy: DEMO_USER_ID,
  expectedEndOn: partial.expectedEndOn ?? null,
  ...partial,
});

export const reservation = (partial: Partial<Reservation> & Pick<Reservation, "id">): Reservation => ({
  number: partial.number ?? `RSV-${partial.id}`,
  locationType: partial.locationType ?? "warehouse",
  locationId: partial.locationId ?? "1",
  toOwnerType: partial.toOwnerType ?? null,
  toOwnerId: partial.toOwnerId ?? null,
  status: partial.status ?? "posted",
  origin: partial.origin ?? "manual",
  note: partial.note ?? "",
  createdAt: partial.createdAt ?? "",
  createdBy: DEMO_USER_ID,
  ...partial,
});

export const transferDoc = (partial: Partial<Transfer> & Pick<Transfer, "id">): Transfer => ({
  number: partial.number ?? `TR-${partial.id}`,
  fromWarehouseId: partial.fromWarehouseId ?? "1",
  toWarehouseId: partial.toWarehouseId ?? "2",
  status: partial.status ?? "sent",
  createdAt: partial.createdAt ?? "",
  createdBy: DEMO_USER_ID,
  expectedEndOn: partial.expectedEndOn ?? null,
  ...partial,
});

export const shipment = (
  partial: Partial<Shipment> & Pick<Shipment, "id" | "customerOrderId" | "warehouseId">,
): Shipment => ({
  number: partial.number ?? `SHP-${partial.id}`,
  status: partial.status ?? "posted",
  createdAt: partial.createdAt ?? "",
  createdBy: DEMO_USER_ID,
  ...partial,
});

export const outputDoc = (
  partial: Partial<ProductionOutput> & Pick<ProductionOutput, "id" | "productionOrderId">,
): ProductionOutput => ({
  number: partial.number ?? `OUT-${partial.id}`,
  status: partial.status ?? "done",
  createdAt: partial.createdAt ?? "",
  createdBy: DEMO_USER_ID,
  expectedEndOn: partial.expectedEndOn ?? null,
  ...partial,
});

export const shipmentReturn = (
  partial: Partial<ShipmentReturn> & Pick<ShipmentReturn, "id" | "shipmentId">,
): ShipmentReturn => ({
  number: partial.number ?? `RET-${partial.id}`,
  status: partial.status ?? "posted",
  createdAt: partial.createdAt ?? "",
  createdBy: DEMO_USER_ID,
  ...partial,
});
