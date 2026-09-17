import type { LogisticsCodePrefixes } from "@/features/logistics/logistics-codes";

export const LOCATION_TYPES = ["warehouse", "production_order_line", "transfer", "customer_order"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const STOCK_STATES = ["free", "reserved", "shipped"] as const;
export type StockState = (typeof STOCK_STATES)[number];

export const DOCUMENT_STATUSES = ["draft", "posted", "cancelled"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const CUSTOMER_ORDER_STATUSES = ["open", "closed"] as const;
export type CustomerOrderStatus = (typeof CUSTOMER_ORDER_STATUSES)[number];

export const PRODUCTION_STATUSES = ["draft", "planned", "in_progress", "done", "closed", "cancelled"] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const TRANSFER_STATUSES = ["draft", "sent", "delivered", "cancelled"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const OUTPUT_STATUSES = ["planned", "done", "cancelled"] as const;
export type OutputStatus = (typeof OUTPUT_STATUSES)[number];

export const RESERVATION_OPERATIONS = ["reserve", "release"] as const;
export type ReservationOperation = (typeof RESERVATION_OPERATIONS)[number];

export const RESERVATION_ORIGINS = ["manual", "order_close"] as const;
export type ReservationOrigin = (typeof RESERVATION_ORIGINS)[number];

export const RESERVATION_STATUSES = ["draft", "posted"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const RESERVATION_LOCATION_TYPES = ["warehouse", "production_order_line", "transfer"] as const;
export type ReservationLocationType = (typeof RESERVATION_LOCATION_TYPES)[number];

export const SOURCE_TYPES = [
  "reservation",
  "shipment",
  "shipment_return",
  "production_activation",
  "production_output",
  "production_close",
  "transfer_send",
  "transfer_complete",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export type LogisticsProduct = {
  id: string;
  code: string;
  sku: string;
  name: string;
  unit: string;
  imageUrl?: string | null;
};

export type LogisticsProductManufacturer = {
  id: string;
  productId: string;
  manufacturerId: string;
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

export type LogisticsSetting = {
  id: string;
  productionActivationStatus: ProductionStatus;
  codePrefixes: LogisticsCodePrefixes;
};

export type CustomerOrder = {
  id: string;
  number: string;
  status: CustomerOrderStatus;
  createdAt: string;
  closedAt: string | null;
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
  closedAt: string | null;
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
  customerOrderId: string;
  locationType: ReservationLocationType;
  locationId: string;
  operation: ReservationOperation;
  status: ReservationStatus;
  origin: ReservationOrigin;
  note: string;
  createdAt: string;
  postedAt: string | null;
};

export type ReservationLine = {
  id: string;
  reservationId: string;
  customerOrderLineId: string;
  quantity: number;
};

export type Transfer = {
  id: string;
  number: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: TransferStatus;
  createdAt: string;
  sentAt: string | null;
  cancelledAt: string | null;
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
  customerOrderId: string;
  customerOrderLineId: string;
  quantity: number;
};

export type Shipment = {
  id: string;
  number: string;
  customerOrderId: string;
  warehouseId: string;
  status: DocumentStatus;
  createdAt: string;
  postedAt: string | null;
  cancelledAt: string | null;
};

export type ShipmentLine = {
  id: string;
  shipmentId: string;
  customerOrderLineId: string;
  productId: string;
  quantity: number;
};

export type ProductionOutput = {
  id: string;
  number: string;
  productionOrderId: string;
  status: OutputStatus;
  createdAt: string;
  doneAt: string | null;
  cancelledAt: string | null;
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
  customerOrderId: string;
  customerOrderLineId: string;
  quantity: number;
};

export type ShipmentReturn = {
  id: string;
  number: string;
  shipmentId: string;
  status: DocumentStatus;
  createdAt: string;
  postedAt: string | null;
  cancelledAt: string | null;
};

export type ShipmentReturnLine = {
  id: string;
  returnId: string;
  shipmentLineId: string;
  quantity: number;
};

export type StockTransaction = {
  transactionId: string;
  occurredAt: string;
  postedAt: string;
  productId: string;
  unit: string;
  quantity: number;
  locationType: LocationType;
  locationId: string;
  stockState: StockState;
  customerOrderId: string | null;
  customerOrderLineId: string | null;
  sourceType: SourceType;
  sourceId: string;
  sourceLineId: string | null;
  operationId: string;
  idempotencyKey: string;
  reversesTransactionId: string | null;
};

export type StockBalance = {
  productId: string;
  locationType: LocationType;
  locationId: string;
  stockState: StockState;
  customerOrderId: string | null;
  customerOrderLineId: string | null;
  quantity: number;
};

export type LogisticsSnapshot = {
  products: LogisticsProduct[];
  manufacturers: LogisticsManufacturer[];
  productManufacturers: LogisticsProductManufacturer[];
  warehouses: LogisticsWarehouse[];
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
  returns: ShipmentReturn[];
  returnLines: ShipmentReturnLine[];
  transactions: StockTransaction[];
};
