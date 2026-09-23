import {
  hrefForCustomerOrder,
  hrefForProductionOrder,
  hrefForTransfer,
  productionDemandAssigned,
} from "@/features/logistics/logistics-availability";
import { plantCode, warehouseCode } from "@/features/logistics/logistics-lookups";
import { computeStockBalances } from "@/features/logistics/logistics-balances";
import {
  expectedEndMeta,
  formatQuantity,
  RESERVATION_DIRECTION_LABELS,
  SHIPMENT_DIRECTION_LABELS,
} from "@/features/logistics/logistics-labels";
import {
  ownersEqual,
  reservationDirection,
  reservationTouchesOrder,
  shipmentDirection,
  shipmentWarehouseId,
  publicDocumentParam,
  type DocumentStatus,
  type LogisticsSnapshot,
  type ReservationDirection,
  type Shipment,
  type StockBalance,
  type TransferStatus,
} from "@/features/logistics/logistics-types";

export type RelatedDocumentItem = {
  id: string;
  href: string;
  label: string;
  meta: string;
  statusKey?: string;
  expectedEndOn?: string | null;
  operation?: ReservationDirection;
  coveragePercent?: number;
};

const statusMeta = (status: DocumentStatus | TransferStatus | string): string => status;

const uniqueRelated = (items: RelatedDocumentItem[]): RelatedDocumentItem[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

const activeReservation = (snapshot: LogisticsSnapshot, reservationId: string): boolean => {
  const status = snapshot.reservations.find((item) => item.id === reservationId)?.status;
  return status === "draft" || status === "posted";
};

export const relatedReservations = (snapshot: LogisticsSnapshot, customerOrderId: string): RelatedDocumentItem[] =>
  snapshot.reservations
    .filter((item) => reservationTouchesOrder(item, snapshot.reservationLines, customerOrderId))
    .map((item) => {
      const lines = snapshot.reservationLines.filter((line) => line.reservationId === item.id);
      const direction = reservationDirection(item, lines);
      return {
        id: item.id,
        href: `/store/logistics/reservations/${publicDocumentParam(item)}`,
        label: item.number,
        meta: `${statusMeta(item.status)} · ${RESERVATION_DIRECTION_LABELS[direction]}`,
        statusKey: item.status,
        operation: direction,
      };
    });

const shipmentItem = (item: Shipment): RelatedDocumentItem => ({
  id: item.id,
  href: `/store/logistics/shipments/${publicDocumentParam(item)}`,
  label: item.number,
  meta: SHIPMENT_DIRECTION_LABELS[shipmentDirection(item.fromLocationType, item.toLocationType)],
  statusKey: "posted",
});

export const relatedShipments = (snapshot: LogisticsSnapshot, customerOrderId: string): RelatedDocumentItem[] =>
  snapshot.shipments
    .filter(
      (item) =>
        item.customerOrderId === customerOrderId &&
        shipmentDirection(item.fromLocationType, item.toLocationType) === "shipment",
    )
    .map(shipmentItem);

export const relatedReturnsForOrder = (snapshot: LogisticsSnapshot, customerOrderId: string): RelatedDocumentItem[] =>
  snapshot.shipments
    .filter(
      (item) =>
        item.customerOrderId === customerOrderId &&
        shipmentDirection(item.fromLocationType, item.toLocationType) === "return",
    )
    .map(shipmentItem);

export const relatedTransfersForOrder = (snapshot: LogisticsSnapshot, customerOrderId: string): RelatedDocumentItem[] => {
  const transferIds = new Set<string>();
  for (const allocation of snapshot.transferAllocations) {
    if (!ownersEqual(allocation.ownerType, allocation.ownerId, "order", customerOrderId)) {
      continue;
    }
    const transferId = snapshot.transferLines.find((line) => line.id === allocation.lineId)?.transferId;
    if (transferId) {
      transferIds.add(transferId);
    }
  }
  for (const reservation of snapshot.reservations) {
    if (reservation.locationType !== "transfer" || !activeReservation(snapshot, reservation.id)) {
      continue;
    }
    if (reservationTouchesOrder(reservation, snapshot.reservationLines, customerOrderId)) {
      transferIds.add(reservation.locationId);
    }
  }
  for (const entry of snapshot.transactions) {
    if (
      entry.locationType === "transfer" &&
      ownersEqual(entry.ownerType, entry.ownerId, "order", customerOrderId) &&
      Math.abs(entry.quantity) > 1e-9
    ) {
      transferIds.add(entry.locationId);
    }
  }
  return snapshot.transfers
    .filter((item) => transferIds.has(item.id))
    .map((item) => ({
      id: item.id,
      href: `/store/logistics/transfers/${publicDocumentParam(item)}`,
      label: item.number,
      meta: expectedEndMeta(item.status, item.expectedEndOn),
      statusKey: item.status,
      expectedEndOn: item.expectedEndOn,
    }));
};

export const relatedOutputsForOrder = (snapshot: LogisticsSnapshot, customerOrderId: string): RelatedDocumentItem[] => {
  const outputIds = new Set<string>();
  for (const entry of snapshot.transactions) {
    if (
      entry.documentType === "output" &&
      ownersEqual(entry.ownerType, entry.ownerId, "order", customerOrderId)
    ) {
      outputIds.add(entry.documentId);
    }
  }
  for (const allocation of snapshot.outputAllocations) {
    if (!ownersEqual(allocation.ownerType, allocation.ownerId, "order", customerOrderId)) {
      continue;
    }
    const outputId = snapshot.outputLines.find((line) => line.id === allocation.lineId)?.outputId;
    if (outputId) {
      outputIds.add(outputId);
    }
  }
  return snapshot.outputs
    .filter((item) => outputIds.has(item.id))
    .map((item) => ({
      id: item.id,
      href: `/store/logistics/outputs/${publicDocumentParam(item)}`,
      label: item.number,
      meta: expectedEndMeta(item.status, item.expectedEndOn),
      statusKey: item.status,
      expectedEndOn: item.expectedEndOn,
    }));
};

export const relatedProductionsForOrder = (
  snapshot: LogisticsSnapshot,
  customerOrderId: string,
  balances?: StockBalance[],
): RelatedDocumentItem[] => {
  const stock = balances ?? computeStockBalances(snapshot.transactions);
  const productionIds = new Set<string>();
  for (const reservation of snapshot.reservations) {
    if (
      reservation.locationType !== "production_order" ||
      !activeReservation(snapshot, reservation.id) ||
      !reservationTouchesOrder(reservation, snapshot.reservationLines, customerOrderId)
    ) {
      continue;
    }
    const orderId =
      snapshot.productionOrders.some((item) => item.id === reservation.locationId)
        ? reservation.locationId
        : snapshot.productionOrderLines.find((line) => line.id === reservation.locationId)?.orderId;
    if (orderId) {
      productionIds.add(orderId);
    }
  }
  return snapshot.productionOrders
    .filter((item) => productionIds.has(item.id))
    .map((item) => {
      const reserved = snapshot.productionOrderLines
        .filter((line) => line.orderId === item.id)
        .reduce((sum, line) => {
          const assigned = productionDemandAssigned(snapshot, item.id, line.productId)
            .filter((entry) => ownersEqual(entry.ownerType, entry.ownerId, "order", customerOrderId))
            .reduce((inner, entry) => inner + entry.quantity, 0);
          return sum + assigned;
        }, 0);
      const outputted = snapshot.outputLines
        .filter((line) => {
          if (!ownersEqual(line.toOwnerType, line.toOwnerId, "order", customerOrderId)) {
            return false;
          }
          const output = snapshot.outputs.find((doc) => doc.id === line.outputId);
          return output?.productionOrderId === item.id && output.status === "done";
        })
        .reduce((sum, line) => sum + line.quantity, 0);
      const extras = [
        reserved > 0 ? `занято ${formatQuantity(reserved)}` : null,
        outputted > 0 ? `выпущено ${formatQuantity(outputted)}` : null,
      ].filter((part): part is string => Boolean(part));
      return {
        id: item.id,
        href: `/store/logistics/production-orders/${publicDocumentParam(item)}`,
        label: item.number,
        meta: expectedEndMeta(item.status, item.expectedEndOn, extras),
        statusKey: item.status,
        expectedEndOn: item.expectedEndOn,
      };
    });
};

export const relatedOrdersForOutput = (
  snapshot: LogisticsSnapshot,
  outputId: string,
): RelatedDocumentItem[] => {
  const fromLedger = snapshot.transactions
    .filter(
      (entry) =>
        entry.documentType === "output" &&
        entry.documentId === outputId &&
        entry.ownerType === "order" &&
        entry.ownerId &&
        entry.quantity > 0,
    )
    .map((entry) => ({
      orderId: entry.ownerId as string,
      quantity: entry.quantity,
    }));
  const fromAllocations = snapshot.outputAllocations
    .filter(
      (item) =>
        item.ownerType === "order" &&
        snapshot.outputLines.some((line) => line.id === item.lineId && line.outputId === outputId),
    )
    .map((item) => ({ orderId: item.ownerId, quantity: item.quantity }));
  const totals = new Map<string, number>();
  for (const item of [...fromLedger, ...fromAllocations]) {
    totals.set(item.orderId, (totals.get(item.orderId) ?? 0) + item.quantity);
  }
  return uniqueRelated(
    [...totals.entries()].map(([orderId, quantity]) => {
      const order = snapshot.customerOrders.find((item) => item.id === orderId);
      return {
        id: orderId,
        href: hrefForCustomerOrder(orderId),
        label: order?.number ?? orderId,
        meta: formatQuantity(quantity),
      };
    }),
  );
};

export const relatedReservationsForRegion = (
  snapshot: LogisticsSnapshot,
  regionId: string,
): RelatedDocumentItem[] =>
  snapshot.reservations
    .filter((item) => {
      if (ownersEqual(item.toOwnerType, item.toOwnerId, "region", regionId)) {
        return true;
      }
      return snapshot.reservationLines.some(
        (line) =>
          line.reservationId === item.id && ownersEqual(line.fromOwnerType, line.fromOwnerId, "region", regionId),
      );
    })
    .map((item) => {
      const lines = snapshot.reservationLines.filter((line) => line.reservationId === item.id);
      const direction = reservationDirection(item, lines);
      return {
        id: item.id,
        href: `/store/logistics/reservations/${publicDocumentParam(item)}`,
        label: item.number,
        meta: `${statusMeta(item.status)} · ${RESERVATION_DIRECTION_LABELS[direction]}`,
        statusKey: item.status,
        operation: direction,
      };
    });

export const relatedReservationsForProduction = (
  snapshot: LogisticsSnapshot,
  productionOrderId: string,
): RelatedDocumentItem[] => {
  const lineIds = new Set(
    snapshot.productionOrderLines.filter((line) => line.orderId === productionOrderId).map((line) => line.id),
  );
  const reservationIds = new Set(
    snapshot.reservations
      .filter((item) => item.locationType === "production_order" && item.locationId === productionOrderId)
      .map((item) => item.id),
  );
  return snapshot.reservations
    .filter((item) => reservationIds.has(item.id))
    .map((item) => {
      const lines = snapshot.reservationLines.filter((line) => line.reservationId === item.id);
      const direction = reservationDirection(item, lines);
      return {
        id: item.id,
        href: `/store/logistics/reservations/${publicDocumentParam(item)}`,
        label: item.number,
        meta: `${statusMeta(item.status)} · ${RESERVATION_DIRECTION_LABELS[direction]}`,
        statusKey: item.status,
        operation: direction,
      };
    });
};

export const relatedTransfersForWarehouse = (
  snapshot: LogisticsSnapshot,
  warehouseId: string,
): RelatedDocumentItem[] =>
  snapshot.transfers
    .filter((item) => item.fromWarehouseId === warehouseId || item.toWarehouseId === warehouseId)
    .map((item) => ({
      id: item.id,
      href: `/store/logistics/transfers/${publicDocumentParam(item)}`,
      label: item.number,
      meta: expectedEndMeta(
        item.status,
        item.expectedEndOn,
        [item.fromWarehouseId === warehouseId ? "исходящее" : "входящее"],
      ),
    }));

export const relatedShipmentsForWarehouse = (
  snapshot: LogisticsSnapshot,
  warehouseId: string,
): RelatedDocumentItem[] =>
  snapshot.shipments
    .filter((item) => shipmentWarehouseId(item) === warehouseId)
    .map(shipmentItem);

export const relatedAdjustmentsForWarehouse = (
  snapshot: LogisticsSnapshot,
  warehouseId: string,
): RelatedDocumentItem[] =>
  snapshot.adjustments
    .filter((item) => item.warehouseId === warehouseId)
    .map((item) => ({
      id: item.id,
      href: `/store/logistics/adjustments/${publicDocumentParam(item)}`,
      label: item.number,
      meta: statusMeta(item.status),
    }));

export const relatedProductionsForPlant = (
  snapshot: LogisticsSnapshot,
  plantId: string,
): RelatedDocumentItem[] =>
  snapshot.productionOrders
    .filter((item) => item.plantId === plantId)
    .map((item) => ({
      id: item.id,
      href: `/store/logistics/production-orders/${publicDocumentParam(item)}`,
      label: item.number,
      meta: expectedEndMeta(item.status, item.expectedEndOn),
    }));

export const relatedProductionsForWarehouse = (
  snapshot: LogisticsSnapshot,
  warehouseId: string,
): RelatedDocumentItem[] => {
  const plant = snapshot.plants.find((item) => item.warehouseId === warehouseId);
  if (!plant) {
    return [];
  }
  return relatedProductionsForPlant(snapshot, plant.id);
};

export const relatedOrderItem = (snapshot: LogisticsSnapshot, customerOrderId: string): RelatedDocumentItem | null => {
  const order = snapshot.customerOrders.find((item) => item.id === customerOrderId);
  if (!order) {
    return null;
  }
  return {
    id: order.id,
    href: hrefForCustomerOrder(order.id),
    label: order.number,
    meta: order.status,
  };
};

export const PRODUCT_ACTIVITY_KINDS = [
  "customer_order",
  "production_order",
  "transfer",
  "output",
  "shipment",
] as const;

export type ProductActivityKind = (typeof PRODUCT_ACTIVITY_KINDS)[number];

export type ProductActivityRow = {
  id: string;
  href: string;
  number: string;
  quantity: number;
  status: string;
  expectedEndOn: string | null;
  hasExpectedEnd: boolean;
  hint: string | null;
  plantId: string | null;
};

export type ProductActivityGroup = {
  kind: ProductActivityKind;
  items: ProductActivityRow[];
};

const ACTIVE_ACTIVITY_STATUSES = new Set([
  "open",
  "draft",
  "planned",
  "in_progress",
  "sent",
  "posted",
]);

const sortActivityRows = (left: ProductActivityRow, right: ProductActivityRow): number => {
  const leftActive = ACTIVE_ACTIVITY_STATUSES.has(left.status) ? 0 : 1;
  const rightActive = ACTIVE_ACTIVITY_STATUSES.has(right.status) ? 0 : 1;
  if (leftActive !== rightActive) {
    return leftActive - rightActive;
  }
  return left.number.localeCompare(right.number);
};

const addQuantity = (totals: Map<string, number>, id: string, quantity: number) => {
  totals.set(id, (totals.get(id) ?? 0) + quantity);
};

export const productActivity = (snapshot: LogisticsSnapshot, productId: string): ProductActivityGroup[] => {
  const orderQty = new Map<string, number>();
  for (const line of snapshot.customerOrderLines) {
    if (line.productId === productId) {
      addQuantity(orderQty, line.orderId, line.quantity);
    }
  }
  const productionQty = new Map<string, number>();
  for (const line of snapshot.productionOrderLines) {
    if (line.productId === productId) {
      addQuantity(productionQty, line.orderId, line.quantity);
    }
  }
  const transferQty = new Map<string, number>();
  for (const line of snapshot.transferLines) {
    if (line.productId === productId) {
      addQuantity(transferQty, line.transferId, line.quantity);
    }
  }
  const outputQty = new Map<string, number>();
  for (const line of snapshot.outputLines) {
    if (line.productId === productId) {
      addQuantity(outputQty, line.outputId, line.quantity);
    }
  }
  const shipmentQty = new Map<string, number>();
  for (const line of snapshot.shipmentLines) {
    if (line.productId === productId) {
      addQuantity(shipmentQty, line.shipmentId, line.quantity);
    }
  }

  const orders: ProductActivityRow[] = snapshot.customerOrders
    .filter((item) => orderQty.has(item.id))
    .map((item) => ({
      id: item.id,
      href: hrefForCustomerOrder(item.id, snapshot),
      number: item.number,
      quantity: orderQty.get(item.id) ?? 0,
      status: item.status,
      expectedEndOn: item.expectedEndOn,
      hasExpectedEnd: true,
      hint: null,
      plantId: null,
    }))
    .sort(sortActivityRows);

  const productions: ProductActivityRow[] = snapshot.productionOrders
    .filter((item) => productionQty.has(item.id))
    .map((item) => ({
      id: item.id,
      href: hrefForProductionOrder(item.id, snapshot),
      number: item.number,
      quantity: productionQty.get(item.id) ?? 0,
      status: item.status,
      expectedEndOn: item.expectedEndOn,
      hasExpectedEnd: true,
      hint: plantCode(snapshot, item.plantId ?? ""),
      plantId: item.plantId ?? "",
    }))
    .sort(sortActivityRows);

  const transfers: ProductActivityRow[] = snapshot.transfers
    .filter((item) => transferQty.has(item.id))
    .map((item) => ({
      id: item.id,
      href: hrefForTransfer(item.id, snapshot),
      number: item.number,
      quantity: transferQty.get(item.id) ?? 0,
      status: item.status,
      expectedEndOn: item.expectedEndOn,
      hasExpectedEnd: true,
      hint: `${warehouseCode(snapshot, item.fromWarehouseId)} → ${warehouseCode(snapshot, item.toWarehouseId)}`,
      plantId: null,
    }))
    .sort(sortActivityRows);

  const outputs: ProductActivityRow[] = snapshot.outputs
    .filter((item) => outputQty.has(item.id))
    .map((item) => {
      const production = snapshot.productionOrders.find((order) => order.id === item.productionOrderId);
      return {
        id: item.id,
        href: `/store/logistics/outputs/${publicDocumentParam(item)}`,
        number: item.number,
        quantity: outputQty.get(item.id) ?? 0,
        status: item.status,
        expectedEndOn: item.expectedEndOn,
        hasExpectedEnd: true,
        hint: production ? production.number : null,
        plantId: null,
      };
    })
    .sort(sortActivityRows);

  const shipments: ProductActivityRow[] = snapshot.shipments
    .filter((item) => shipmentQty.has(item.id))
    .map((item) => {
      const order = snapshot.customerOrders.find((entry) => entry.id === item.customerOrderId);
      return {
        id: item.id,
        href: `/store/logistics/shipments/${publicDocumentParam(item)}`,
        number: item.number,
        quantity: shipmentQty.get(item.id) ?? 0,
        status: "posted",
        expectedEndOn: null,
        hasExpectedEnd: false,
        hint: `${SHIPMENT_DIRECTION_LABELS[shipmentDirection(item.fromLocationType, item.toLocationType)]}${order ? ` · ${order.number}` : ""}`,
        plantId: null,
      };
    })
    .sort(sortActivityRows);

  return [
    { kind: "customer_order", items: orders },
    { kind: "production_order", items: productions },
    { kind: "transfer", items: transfers },
    { kind: "output", items: outputs },
    { kind: "shipment", items: shipments },
  ];
};
