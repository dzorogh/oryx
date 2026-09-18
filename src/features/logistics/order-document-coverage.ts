import type {
  CustomerOrderLine,
  LogisticsSnapshot,
  Reservation,
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

const reservationById = (
  snapshot: LogisticsSnapshot,
  customerOrderId: string,
): Map<string, Reservation> =>
  new Map(
    snapshot.reservations
      .filter((reservation) => reservation.customerOrderId === customerOrderId)
      .map((reservation) => [reservation.id, reservation]),
  );

export const calculateOrderDocumentCoverage = (
  snapshot: LogisticsSnapshot,
  customerOrderId: string,
): OrderDocumentCoverage => {
  const orderLines = snapshot.customerOrderLines.filter(
    (line) => line.orderId === customerOrderId,
  );
  const orderLineIds = new Set(orderLines.map((line) => line.id));
  const quantities = createCoverageQuantities();
  const reservations = reservationById(snapshot, customerOrderId);
  const productionOrderByLine = new Map(
    snapshot.productionOrderLines.map((line) => [line.id, line.orderId]),
  );

  for (const line of snapshot.reservationLines) {
    const reservation = reservations.get(line.reservationId);
    if (!reservation || !orderLineIds.has(line.customerOrderLineId)) {
      continue;
    }

    addQuantity(
      quantities.reservation,
      reservation.id,
      line.customerOrderLineId,
      line.quantity,
    );

    if (
      reservation.operation === "reserve" &&
      reservation.locationType === "production_order_line"
    ) {
      const productionOrderId = productionOrderByLine.get(reservation.locationId);
      if (productionOrderId) {
        addQuantity(
          quantities.production,
          productionOrderId,
          line.customerOrderLineId,
          line.quantity,
        );
      }
    }

    if (
      reservation.operation === "reserve" &&
      reservation.locationType === "transfer"
    ) {
      addQuantity(
        quantities.transfer,
        reservation.locationId,
        line.customerOrderLineId,
        line.quantity,
      );
    }
  }

  const outputByLine = new Map(
    snapshot.outputLines.map((line) => [line.id, line.outputId]),
  );
  const outputsWithAllocations = new Set<string>();
  for (const allocation of snapshot.outputAllocations) {
    if (
      allocation.customerOrderId !== customerOrderId ||
      !orderLineIds.has(allocation.customerOrderLineId)
    ) {
      continue;
    }
    const outputId = outputByLine.get(allocation.lineId);
    if (outputId) {
      outputsWithAllocations.add(outputId);
      addQuantity(
        quantities.output,
        outputId,
        allocation.customerOrderLineId,
        allocation.quantity,
      );
    }
  }

  for (const transaction of snapshot.transactions) {
    if (
      transaction.sourceType !== "production_output" ||
      transaction.customerOrderId !== customerOrderId ||
      !transaction.customerOrderLineId ||
      !orderLineIds.has(transaction.customerOrderLineId) ||
      transaction.quantity <= 0 ||
      outputsWithAllocations.has(transaction.sourceId)
    ) {
      continue;
    }
    addQuantity(
      quantities.output,
      transaction.sourceId,
      transaction.customerOrderLineId,
      transaction.quantity,
    );
  }

  const transferByLine = new Map(
    snapshot.transferLines.map((line) => [line.id, line.transferId]),
  );
  for (const allocation of snapshot.transferAllocations) {
    if (
      allocation.customerOrderId !== customerOrderId ||
      !orderLineIds.has(allocation.customerOrderLineId)
    ) {
      continue;
    }
    const transferId = transferByLine.get(allocation.lineId);
    if (transferId) {
      addQuantity(
        quantities.transfer,
        transferId,
        allocation.customerOrderLineId,
        allocation.quantity,
      );
    }
  }

  for (const line of snapshot.shipmentLines) {
    const shipment = snapshot.shipments.find(
      (item) => item.id === line.shipmentId && item.customerOrderId === customerOrderId,
    );
    if (shipment && orderLineIds.has(line.customerOrderLineId)) {
      addQuantity(
        quantities.shipment,
        shipment.id,
        line.customerOrderLineId,
        line.quantity,
      );
    }
  }

  const shipmentLineById = new Map(
    snapshot.shipmentLines.map((line) => [line.id, line]),
  );
  for (const line of snapshot.returnLines) {
    const returnedShipmentLine = shipmentLineById.get(line.shipmentLineId);
    const returnedDocument = snapshot.returns.find(
      (item) => item.id === line.returnId,
    );
    const shipment = returnedDocument
      ? snapshot.shipments.find(
          (item) =>
            item.id === returnedDocument.shipmentId &&
            item.customerOrderId === customerOrderId,
        )
      : undefined;
    if (
      shipment &&
      returnedShipmentLine &&
      orderLineIds.has(returnedShipmentLine.customerOrderLineId)
    ) {
      addQuantity(
        quantities.return,
        line.returnId,
        returnedShipmentLine.customerOrderLineId,
        line.quantity,
      );
    }
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
