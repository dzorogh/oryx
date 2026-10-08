import type {
  AdjustmentOperation,
  CustomerOrderStatus,
  OwnerType,
  OutputStatus,
  ProductionStatus,
  ReservationDirection,
  ReservationLocationType,
  ShipmentDirection,
  TransferStatus,
} from "@/features/logistics/logistics-types";
import type { MoneyLineTotal, OrderRates, PaymentStatus } from "@/features/logistics/order-money";

/** Product line preview as returned by list RPCs (ready for DocumentProductLines). */
export type LogisticsListProductLine = {
  productId: string;
  quantity: number;
  productName?: string | null;
  productUnit?: string | null;
};

/** Money snapshot for a customer-order list row. Null when the order has no money record. */
export type CustomerOrderListMoney = {
  currencyCode: string;
  /** Manual order amount; null — use `lineTotals`. */
  amount: number | null;
  rates: OrderRates;
  lineTotals: MoneyLineTotal[];
};

export type CustomerOrderListRow = {
  id: string;
  sequenceNumber: string;
  number: string;
  status: CustomerOrderStatus;
  expectedEndOn: string | null;
  createdAt: string;
  description: string;
  products: LogisticsListProductLine[];
  ordered: number;
  reserved: number;
  shipped: number;
  openToReserve: number;
  createdBy: string;
  regionId: string;
  regionCode: string;
  tenants: { id: string; name: string }[];
  sourceKind: "plant" | "hub" | null;
  sourceId: string | null;
  payments: { dueOn: string; status: PaymentStatus; amount: number }[];
  money: CustomerOrderListMoney | null;
  /** First done/closed/delivered snapshot of the latest terminal run; null while the order is open. */
  completedAt: string | null;
  /** Number of order lines. */
  positions: number;
};

export type ProductionOrderListRow = {
  id: string;
  sequenceNumber: string;
  number: string;
  status: ProductionStatus;
  expectedEndOn: string | null;
  createdAt: string;
  plantId: string;
  products: LogisticsListProductLine[];
  createdBy: string;
};

export type TransferListRow = {
  id: string;
  sequenceNumber: string;
  number: string;
  status: TransferStatus;
  expectedEndOn: string | null;
  createdAt: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  products: LogisticsListProductLine[];
  createdBy: string;
};

export type ShipmentListRow = {
  id: string;
  sequenceNumber: string;
  number: string;
  createdAt: string;
  fromLocationType: string;
  fromLocationId: string;
  toLocationType: string;
  toLocationId: string;
  direction: ShipmentDirection;
  customerOrderId: string;
  customerOrderNumber: string;
  products: LogisticsListProductLine[];
  createdBy: string;
};

export type OutputListRow = {
  id: string;
  sequenceNumber: string;
  number: string;
  status: OutputStatus;
  expectedEndOn: string | null;
  createdAt: string;
  productionOrderId: string;
  productionOrderNumber: string;
  productionOrderSequenceNumber: string;
  plantId: string;
  products: LogisticsListProductLine[];
  createdBy: string;
};

export type AdjustmentListRow = {
  id: string;
  sequenceNumber: string;
  number: string;
  createdAt: string;
  description: string;
  warehouseId: string;
  products: LogisticsListProductLine[];
  signedQuantity: number;
  operation: AdjustmentOperation | "mixed";
  createdBy: string;
};

export type ReservationListLine = {
  id: string;
  productId: string;
  quantity: number;
  fromOwnerType: OwnerType | null;
  fromOwnerId: string | null;
  /** Customer order number or region code of the source owner, when it resolves. */
  fromOwnerNumber: string | null;
  productName: string | null;
  productUnit: string;
};

export type ReservationListRow = {
  id: string;
  sequenceNumber: string;
  number: string;
  createdAt: string;
  description: string;
  creationSource: string;
  locationType: ReservationLocationType;
  locationId: string;
  /** Document number and sequence of a non-warehouse location. */
  locationNumber: string | null;
  locationSequence: string | null;
  locationIsPlantWarehouse: boolean;
  toOwnerType: OwnerType | null;
  toOwnerId: string | null;
  /** Customer order number or region code of the destination owner. */
  toOwnerNumber: string | null;
  lines: ReservationListLine[];
  direction: ReservationDirection;
  createdBy: string;
};
