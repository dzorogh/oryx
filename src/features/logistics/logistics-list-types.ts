import type {
  AdjustmentOperation,
  CustomerOrderStatus,
  OwnerType,
  OutputStatus,
  ProductionStatus,
  ReservationDirection,
  ReservationLocationType,
  ReservationStatus,
  ShipmentDirection,
  TransferStatus,
} from "@/features/logistics/logistics-types";

/** Product line preview as returned by list RPCs (ready for DocumentProductLines). */
export type LogisticsListProductLine = {
  productId: string;
  quantity: number;
  productName?: string | null;
  productUnit?: string | null;
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
  reserved: number;
  shipped: number;
  openToReserve: number;
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
  products: LogisticsListProductLine[];
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
  status: ReservationStatus;
  postedAt: string | null;
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
};
