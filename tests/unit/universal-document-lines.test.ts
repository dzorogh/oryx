import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hrefForDocument,
  outputtedForProductionLine,
  productionLineReservationBreakdown,
  remainingToOutputForLine,
} from "@/features/logistics/logistics-availability";
import { lineLocationAllocations } from "@/features/logistics/allocation-atlas";
import {
  documentNumber,
  matchDocumentParam,
  publicDocumentParam,
  type LogisticsSnapshot,
  type Reservation,
  type ReservationLine,
  type StockBalance,
} from "@/features/logistics/logistics-types";

const snapshot = (overrides: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  ({
    reservations: [],
    reservationLines: [],
    outputs: [],
    outputLines: [],
    productionOrders: [],
    customerOrders: [],
    shipments: [],
    transfers: [],
    adjustments: [],
    ...overrides,
  }) as LogisticsSnapshot;

const reservation = (overrides: Partial<Reservation> & Pick<Reservation, "id">): Reservation => ({
  series: "RSV",
  numberPrefix: "RSV",
  sequenceNumber: overrides.sequenceNumber ?? overrides.id,
  number: `RSV-${overrides.sequenceNumber ?? overrides.id}`,
  locationType: "production_order",
  locationId: "2000001",
  stockLocationId: "1",
  ownerId: "1",
  toOwnerType: "order",
  toOwnerId: "12",
  status: "posted",
  postedAt: "2026-09-22T00:00:00Z",
  origin: "manual",
  creationSource: "manual",
  description: "",
  note: "",
  createdAt: "2026-09-22T00:00:00Z",
  createdBy: "1",
  ...overrides,
});

const reservationLine = (
  overrides: Partial<ReservationLine> & Pick<ReservationLine, "id" | "reservationId">,
): ReservationLine => ({
  productId: "7",
  quantity: 4,
  fromOwnerType: null,
  fromOwnerId: null,
  productName: "Снимок",
  productUnit: "шт",
  ...overrides,
});

const poStock = (quantity: number): StockBalance => ({
  productId: "7",
  locationType: "production_order",
  locationId: "2000001",
  assignedToType: "order",
  assignedToId: "12",
  stockState: "reserved",
  ownerType: "order",
  ownerId: "12",
  quantity,
});

describe("универсальные товарные строки", () => {
  it("номер документа берётся из series и sequence, а не из внутреннего id", () => {
    assert.equal(documentNumber("PO", 12), "PO-12");
    assert.equal(publicDocumentParam({ sequenceNumber: "12" }), "12");
    const found = matchDocumentParam(
      [{ id: "2000012", sequenceNumber: "12" }],
      "12",
    );
    assert.equal(found?.id, "2000012");
    assert.equal(
      hrefForDocument("production_order", "2000012", snapshot({
        productionOrders: [
          {
            id: "2000012",
            series: "PO",
            sequenceNumber: "12",
            number: "PO-12",
            plantId: "1",
            status: "planned",
            createdAt: "2026-09-22T00:00:00Z",
            createdBy: "1",
            expectedEndOn: null,
          },
        ],
      })),
      "/store/logistics/production-orders/12",
    );
  });

  it("свободно на заказе производства = план − назначено − выпущено, журнал места не считается", () => {
    const view = snapshot({
      reservations: [reservation({ id: "3000001", locationId: "2000001" })],
      reservationLines: [reservationLine({ id: "1", reservationId: "3000001", quantity: 4 })],
      outputs: [
        {
          id: "6000001",
          series: "OUT",
          sequenceNumber: "1",
          number: "OUT-1",
          productionOrderId: "2000001",
          status: "done",
          createdAt: "2026-09-22T00:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
      ],
      outputLines: [
        {
          id: "9",
          outputId: "6000001",
          productionOrderLineId: "",
          productId: "7",
          quantity: 3,
          productName: "Снимок",
          productUnit: "шт",
          toOwnerType: null,
          toOwnerId: null,
        },
      ],
    });

    const breakdown = productionLineReservationBreakdown(
      { id: "line", productId: "7", orderId: "2000001", quantity: 10 },
      [poStock(99)],
      view,
    );

    assert.equal(breakdown.free, 3);
    assert.equal(breakdown.reserved.reduce((sum, item) => sum + item.quantity, 0), 4);
  });

  it("«В производстве» в атласе — назначение заказу, а не складской остаток на месте производства", () => {
    const view = snapshot({
      reservations: [reservation({ id: "3000001" })],
      reservationLines: [reservationLine({ id: "1", reservationId: "3000001", quantity: 4 })],
    });
    const allocation = lineLocationAllocations(
      [poStock(99)],
      { orderId: "12", productId: "7" },
      view,
    );
    assert.equal(allocation.inProduction, 4);
  });

  it("outputtedForProductionLine без строки плана считает только done-выпуски по productionOrderLineId", () => {
    const view = snapshot({
      productionOrderLines: [],
      outputs: [
        {
          id: "out-done",
          series: "OUT",
          sequenceNumber: "1",
          number: "OUT-1",
          productionOrderId: "2000001",
          status: "done",
          createdAt: "2026-09-22T00:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
        {
          id: "out-draft",
          series: "OUT",
          sequenceNumber: "2",
          number: "OUT-2",
          productionOrderId: "2000001",
          status: "planned",
          createdAt: "2026-09-22T01:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
      ],
      outputLines: [
        {
          id: "ol1",
          outputId: "out-done",
          productionOrderLineId: "missing-plan-line",
          productId: "7",
          quantity: 4,
          productName: "Снимок",
          productUnit: "шт",
          toOwnerType: null,
          toOwnerId: null,
        },
        {
          id: "ol2",
          outputId: "out-draft",
          productionOrderLineId: "missing-plan-line",
          productId: "7",
          quantity: 9,
          productName: "Снимок",
          productUnit: "шт",
          toOwnerType: null,
          toOwnerId: null,
        },
      ],
    });

    assert.equal(outputtedForProductionLine(view, "missing-plan-line"), 4);
    assert.equal(remainingToOutputForLine(view, "missing-plan-line", 10), 6);
  });
});
