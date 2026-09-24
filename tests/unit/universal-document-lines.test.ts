import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hrefForDocument,
  outputtedForProductionLine,
  productionLineReservationBreakdown,
  remainingToOutputForLine,
} from "@/features/logistics/logistics-availability";
import { lineLocationAllocations } from "@/features/logistics/allocation-atlas";
import { calculateOrderDocumentCoverage } from "@/features/logistics/order-document-coverage";
import {
  productActivity,
  relatedOutputsForOrder,
  relatedProductionsForOrder,
} from "@/features/logistics/logistics-related";
import {
  documentNumber,
  matchDocumentParam,
  publicDocumentParam,
  type LogisticsSnapshot,
  type StockBalance,
} from "@/features/logistics/logistics-types";

const snapshot = (overrides: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  ({
    reservations: [],
    reservationLines: [],
    outputs: [],
    outputLines: [],
    outputAllocations: [],
    productionOrders: [],
    productionOrderLines: [],
    customerOrders: [],
    customerOrderLines: [],
    shipments: [],
    shipmentLines: [],
    transfers: [],
    transferLines: [],
    transferAllocations: [],
    adjustments: [],
    adjustmentLines: [],
    transactions: [],
    ...overrides,
  }) as LogisticsSnapshot;

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

  it("свободно на заказе производства = план − неотменённые выпуски; занято — из активных выпусков", () => {
    const view = snapshot({
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
        {
          id: "6000002",
          series: "OUT",
          sequenceNumber: "2",
          number: "OUT-2",
          productionOrderId: "2000001",
          status: "draft",
          createdAt: "2026-09-22T01:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
        {
          id: "6000003",
          series: "OUT",
          sequenceNumber: "3",
          number: "OUT-3",
          productionOrderId: "2000001",
          status: "cancelled",
          createdAt: "2026-09-22T02:00:00Z",
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
          toOwnerType: "order",
          toOwnerId: "12",
        },
        {
          id: "10",
          outputId: "6000002",
          productionOrderLineId: "",
          productId: "7",
          quantity: 4,
          productName: "Снимок",
          productUnit: "шт",
          toOwnerType: "order",
          toOwnerId: "12",
        },
        {
          id: "12",
          outputId: "6000003",
          productionOrderLineId: "",
          productId: "7",
          quantity: 5,
          productName: "Снимок",
          productUnit: "шт",
          toOwnerType: "order",
          toOwnerId: "12",
        },
      ],
    });

    const breakdown = productionLineReservationBreakdown(
      { id: "line", productId: "7", orderId: "2000001", quantity: 10 },
      [poStock(99)],
      view,
    );

    // plan 10 − done 3 − draft 4 = 3 (cancelled ignored); reserved = draft owned only
    assert.equal(breakdown.free, 3);
    assert.equal(breakdown.reserved.reduce((sum, item) => sum + item.quantity, 0), 4);
  });

  it("«В производстве» в атласе — занятое в активных выпусках, а не RSV на месте PO", () => {
    const view = snapshot({
      outputs: [
        {
          id: "out-1",
          series: "OUT",
          sequenceNumber: "1",
          number: "OUT-1",
          productionOrderId: "2000001",
          status: "draft",
          createdAt: "2026-09-22T00:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
      ],
      outputLines: [
        {
          id: "ol-1",
          outputId: "out-1",
          productionOrderLineId: "",
          productId: "7",
          quantity: 4,
          productName: "Снимок",
          productUnit: "шт",
          toOwnerType: "order",
          toOwnerId: "12",
        },
      ],
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
          status: "draft",
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

describe("связанные документы и покрытие этапов из выпусков", () => {
  const base = () =>
    snapshot({
      customerOrderLines: [
        {
          id: "col-1",
          orderId: "12",
          productId: "7",
          quantity: 10,
          productName: "A",
          productUnit: "шт",
        },
      ],
      productionOrders: [
        {
          id: "po-1",
          series: "PO",
          sequenceNumber: "1",
          number: "PO-1",
          plantId: "1",
          status: "draft",
          createdAt: "2026-09-22T00:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
      ],
      productionOrderLines: [
        {
          id: "pol-1",
          orderId: "po-1",
          productId: "7",
          quantity: 10,
          productName: "A",
          productUnit: "шт",
          plantId: "1",
          plantName: "Завод",
          plantCode: "P1",
        },
      ],
      outputs: [
        {
          id: "out-draft",
          series: "OUT",
          sequenceNumber: "1",
          number: "OUT-1",
          productionOrderId: "po-1",
          status: "draft",
          createdAt: "2026-09-22T00:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
        {
          id: "out-done",
          series: "OUT",
          sequenceNumber: "2",
          number: "OUT-2",
          productionOrderId: "po-1",
          status: "done",
          createdAt: "2026-09-22T01:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
        {
          id: "out-cancelled",
          series: "OUT",
          sequenceNumber: "3",
          number: "OUT-3",
          productionOrderId: "po-1",
          status: "cancelled",
          createdAt: "2026-09-22T02:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
      ],
      outputLines: [
        {
          id: "ol-draft",
          outputId: "out-draft",
          productionOrderLineId: "pol-1",
          productId: "7",
          quantity: 4,
          productName: "A",
          productUnit: "шт",
          toOwnerType: "order",
          toOwnerId: "12",
        },
        {
          id: "ol-done",
          outputId: "out-done",
          productionOrderLineId: "pol-1",
          productId: "7",
          quantity: 3,
          productName: "A",
          productUnit: "шт",
          toOwnerType: "order",
          toOwnerId: "12",
        },
        {
          id: "ol-cancelled",
          outputId: "out-cancelled",
          productionOrderLineId: "pol-1",
          productId: "7",
          quantity: 2,
          productName: "A",
          productUnit: "шт",
          toOwnerType: "order",
          toOwnerId: "12",
        },
      ],
      transactions: [
        {
          id: "tx-1",
          createdAt: "2026-09-22T01:00:00Z",
          productVariantId: "7",
          productId: "7",
          quantity: 3,
          stockLocationId: "wh-1",
          stockOwnerId: "12",
          documentId: "out-done",
          documentKind: "output",
          locationType: "warehouse",
          locationId: "wh-1",
          ownerKind: "customer_order",
          stockState: "reserved",
          assignedToType: "order",
          assignedToId: "12",
          documentType: "output",
          ownerType: "order",
          ownerId: "12",
        },
      ],
    });

  it("черновик выпуска под CO даёт PO и OUT в связанных и в coverage", () => {
    const view = base();
    const productions = relatedProductionsForOrder(view, "12");
    const outputs = relatedOutputsForOrder(view, "12");
    assert.ok(productions.some((item) => item.id === "po-1"));
    assert.ok(outputs.some((item) => item.id === "out-draft"));
    assert.equal(outputs.find((item) => item.id === "out-draft")?.statusLabel, "Запланирован");
    assert.equal(outputs.find((item) => item.id === "out-done")?.statusLabel, "Готов");
    assert.ok(!outputs.some((item) => item.id === "out-cancelled"));

    const coverage = calculateOrderDocumentCoverage(view, "12");
    // percents: production (4+3)/10, draft 4/10, done 3/10 via ledger
    assert.equal(coverage.production.get("po-1"), 70);
    assert.equal(coverage.output.get("out-draft"), 40);
    assert.equal(coverage.output.get("out-done"), 30);
    assert.equal(coverage.output.has("out-cancelled"), false);
  });

  it("подпись статуса выпуска в активности товара", () => {
    const view = { ...base(), productionOrders: [] };
    const outputRows = productActivity(view, "7").find((group) => group.kind === "output")?.items ?? [];
    assert.equal(outputRows.find((row) => row.id === "out-draft")?.statusLabel, "Запланирован");
  });

  it("done покрывает production, а active-loop не дублирует output", () => {
    const view = base();
    const coverage = calculateOrderDocumentCoverage(view, "12");
    assert.equal(coverage.production.get("po-1"), 70);
    assert.equal(coverage.output.get("out-draft"), 40);
    assert.equal(coverage.output.get("out-done"), 30);
  });
});
