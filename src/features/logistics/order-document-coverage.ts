import {
  orderLineForProduct,
  ownersEqual,
  reservationDirection,
  reservationTouchesOrder,
  shipmentDirection,
  type CustomerOrderLine,
  type LogisticsSnapshot,
  type Reservation,
} from "@/features/logistics/logistics-types";

export const ORDER_DOCUMENT_KINDS = [
  "production",
  "output",
  "transfer",
  "shipment",
  "reservation",
  "return",
] as const;

export type OrderDocumentKind = (typeof ORDER_DOCUMENT_KINDS)[number];

export type OrderDocumentCoverage = Record<OrderDocumentKind, ReadonlyMap<string, number>>;

type DocumentLineQuantities = Map<string, Map<string, number>>;

const createCoverageQuantities = (): Record<OrderDocumentKind, DocumentLineQuantities> => ({
  production: new Map(),
  output: new Map(),
  transfer: new Map(),
  shipment: new Map(),
  reservation: new Map(),
  return: new Map(),
});

const addQuantity = (
  quantities: DocumentLineQuantities,
  documentId: string,
  orderLineId: string,
  quantity: number,
) => {
  const lineQuantities = quantities.get(documentId) ?? new Map<string, number>();
  lineQuantities.set(orderLineId, (lineQuantities.get(orderLineId) ?? 0) + quantity);
  quantities.set(documentId, lineQuantities);
};

const addForProduct = (
  quantities: DocumentLineQuantities,
  documentId: string,
  orderLines: CustomerOrderLine[],
  orderId: string,
  productId: string,
  quantity: number,
) => {
  const orderLine = orderLineForProduct(orderLines, orderId, productId);
  if (!orderLine) {
    return;
  }
  addQuantity(quantities, documentId, orderLine.id, quantity);
};

export const withOrderCoverage = <T extends { id: string }>(
  items: T[],
  percents: ReadonlyMap<string, number>,
): Array<T & { coveragePercent: number }> =>
  items.map((item) => ({
    ...item,
    coveragePercent: percents.get(item.id) ?? 0,
  }));

export const normalizedOrderCoverage = (
  orderLines: CustomerOrderLine[],
  lineQuantities: ReadonlyMap<string, number>,
): number => {
  if (orderLines.length === 0) {
    return 0;
  }

  const averageRatio =
    orderLines.reduce((sum, line) => {
      if (line.quantity <= 0) {
        return sum;
      }
      return sum + (lineQuantities.get(line.id) ?? 0) / line.quantity;
    }, 0) / orderLines.length;

  return Math.round(Math.min(100, Math.max(0, averageRatio * 100)));
};

const coverageForKind = (
  orderLines: CustomerOrderLine[],
  quantities: DocumentLineQuantities,
): ReadonlyMap<string, number> =>
  new Map(
    [...quantities.entries()].map(([documentId, lineQuantities]) => [
      documentId,
      normalizedOrderCoverage(orderLines, lineQuantities),
    ]),
  );

const reservationById = (snapshot: LogisticsSnapshot, customerOrderId: string): Map<string, Reservation> =>
  new Map(
    snapshot.reservations
      .filter((reservation) => reservationTouchesOrder(reservation, snapshot.reservationLines, customerOrderId))
      .map((reservation) => [reservation.id, reservation]),
  );

export const calculateOrderDocumentCoverage = (
  snapshot: LogisticsSnapshot,
  customerOrderId: string,
): OrderDocumentCoverage => {
  const orderLines = snapshot.customerOrderLines.filter((line) => line.orderId === customerOrderId);
  const quantities = createCoverageQuantities();
  const reservations = reservationById(snapshot, customerOrderId);

  for (const line of snapshot.reservationLines) {
    const reservation = reservations.get(line.reservationId);
    if (!reservation) {
      continue;
    }
    const orderLine = orderLineForProduct(orderLines, customerOrderId, line.productId);
    if (!orderLine) {
      continue;
    }

    addQuantity(quantities.reservation, reservation.id, orderLine.id, line.quantity);

    const destinationIsOrder = ownersEqual(
      reservation.toOwnerType,
      reservation.toOwnerId,
      "order",
      customerOrderId,
    );
    const direction = reservationDirection(
      reservation,
      snapshot.reservationLines.filter((item) => item.reservationId === reservation.id),
    );
    const coversLocation = destinationIsOrder || direction === "reserve";

    if (coversLocation && reservation.locationType === "transfer") {
      addQuantity(quantities.transfer, reservation.locationId, orderLine.id, line.quantity);
    }
  }

  for (const outputLine of snapshot.outputLines) {
    if (!ownersEqual(outputLine.toOwnerType, outputLine.toOwnerId, "order", customerOrderId)) {
      continue;
    }
    const output = snapshot.outputs.find((item) => item.id === outputLine.outputId);
    if (!output || output.status === "cancelled") {
      continue;
    }
    const status = output.status;
    const active = status === "draft";
    addForProduct(
      quantities.production,
      output.productionOrderId,
      orderLines,
      customerOrderId,
      outputLine.productId,
      outputLine.quantity,
    );
    if (active) {
      addForProduct(
        quantities.output,
        output.id,
        orderLines,
        customerOrderId,
        outputLine.productId,
        outputLine.quantity,
      );
    }
  }

  const outputByLine = new Map(snapshot.outputLines.map((line) => [line.id, line]));
  const outputsWithAllocations = new Set<string>();
  for (const allocation of snapshot.outputAllocations) {
    if (!ownersEqual(allocation.ownerType, allocation.ownerId, "order", customerOrderId)) {
      continue;
    }
    const outputLine = outputByLine.get(allocation.lineId);
    if (!outputLine) {
      continue;
    }
    outputsWithAllocations.add(outputLine.outputId);
    addForProduct(
      quantities.output,
      outputLine.outputId,
      orderLines,
      customerOrderId,
      outputLine.productId,
      allocation.quantity,
    );
  }

  for (const transaction of snapshot.transactions) {
    if (
      transaction.documentType !== "output" ||
      !ownersEqual(transaction.ownerType, transaction.ownerId, "order", customerOrderId) ||
      transaction.quantity <= 0 ||
      outputsWithAllocations.has(transaction.documentId)
    ) {
      continue;
    }
    addForProduct(
      quantities.output,
      transaction.documentId,
      orderLines,
      customerOrderId,
      transaction.productId,
      transaction.quantity,
    );
  }

  const transferByLine = new Map(snapshot.transferLines.map((line) => [line.id, line]));
  for (const allocation of snapshot.transferAllocations) {
    if (!ownersEqual(allocation.ownerType, allocation.ownerId, "order", customerOrderId)) {
      continue;
    }
    const transferLine = transferByLine.get(allocation.lineId);
    if (!transferLine) {
      continue;
    }
    addForProduct(
      quantities.transfer,
      transferLine.transferId,
      orderLines,
      customerOrderId,
      transferLine.productId,
      allocation.quantity,
    );
  }

  for (const line of snapshot.shipmentLines) {
    const shipment = snapshot.shipments.find(
      (item) => item.id === line.shipmentId && item.customerOrderId === customerOrderId,
    );
    if (!shipment) {
      continue;
    }
    const kind = shipmentDirection(shipment.fromLocationType, shipment.toLocationType);
    addForProduct(
      kind === "return" ? quantities.return : quantities.shipment,
      shipment.id,
      orderLines,
      customerOrderId,
      line.productId,
      line.quantity,
    );
  }

  return {
    production: coverageForKind(orderLines, quantities.production),
    output: coverageForKind(orderLines, quantities.output),
    transfer: coverageForKind(orderLines, quantities.transfer),
    shipment: coverageForKind(orderLines, quantities.shipment),
    reservation: coverageForKind(orderLines, quantities.reservation),
    return: coverageForKind(orderLines, quantities.return),
  };
};
