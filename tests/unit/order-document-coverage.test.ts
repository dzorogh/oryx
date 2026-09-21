import { describe, expect, it } from "vitest";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import {
  calculateOrderDocumentCoverage,
  normalizedOrderCoverage,
  withOrderCoverage,
} from "@/features/logistics/order-document-coverage";

const snapshot = (partial: Partial<LogisticsSnapshot>): LogisticsSnapshot =>
  ({
    products: [],
    manufacturers: [],
    warehouses: [],
    regions: [],
    settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
    customerOrders: [
      {
        id: "co-1",
        number: "OMS-1",
        status: "open",
        createdAt: "",
        createdBy: "1",
      expectedEndOn: null,
        description: "",
      },
    ],
    customerOrderLines: [
      { id: "col-a", orderId: "co-1", productId: "p-a", quantity: 10 },
      { id: "col-b", orderId: "co-1", productId: "p-b", quantity: 5 },
    ],
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
    ...partial,
  }) as LogisticsSnapshot;

describe("normalizedOrderCoverage", () => {
  const lines = [
    { id: "col-a", orderId: "co-1", productId: "p-a", quantity: 10 },
    { id: "col-b", orderId: "co-1", productId: "p-b", quantity: 5 },
  ];

  it("averages line ratios so mixed units do not mix", () => {
    expect(normalizedOrderCoverage(lines, new Map([["col-a", 8]]))).toBe(40);
    expect(normalizedOrderCoverage(lines, new Map([["col-a", 10], ["col-b", 5]]))).toBe(100);
  });

  it("treats a missing line as zero and clamps over-coverage", () => {
    expect(normalizedOrderCoverage(lines, new Map())).toBe(0);
    expect(normalizedOrderCoverage(lines, new Map([["col-a", 50], ["col-b", 50]]))).toBe(100);
  });

  it("uses a single line as the whole order", () => {
    expect(
      normalizedOrderCoverage(
        [{ id: "col-a", orderId: "co-1", productId: "p-a", quantity: 10 }],
        new Map([["col-a", 8]]),
      ),
    ).toBe(80);
  });
});

describe("calculateOrderDocumentCoverage", () => {
  it("covers production from reserve lines and shipment from shipment lines", () => {
    const data = snapshot({
      productionOrders: [
        {
          id: "po-1",
          number: "PO-1",
          manufacturerId: "m-1",
          status: "in_progress",
          createdAt: "",
          createdBy: "1",
      expectedEndOn: null,
        },
      ],
      productionOrderLines: [
        { id: "pol-1", orderId: "po-1", productId: "p-a", quantity: 10, activatedQuantity: 10 },
      ],
      reservations: [
        {
          id: "rsv-1",
          number: "RSV-1",
          locationType: "production_order",
          locationId: "pol-1",
          toOwnerType: "order",
          toOwnerId: "co-1",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "",
        createdBy: "1",
      },
      ],
      reservationLines: [{ id: "rsvl-1", reservationId: "rsv-1", productId: "p-a", quantity: 8, fromOwnerType: null, fromOwnerId: null }],
      shipments: [
        {
          id: "shp-1",
          number: "SHP-1",
          customerOrderId: "co-1",
          warehouseId: "wh-1",
          status: "posted",
          createdAt: "",
        createdBy: "1",
      },
      ],
      shipmentLines: [
        { id: "shl-1", shipmentId: "shp-1", productId: "p-b", quantity: 1 },
      ],
    });

    const coverage = calculateOrderDocumentCoverage(data, "co-1");
    expect(coverage.production.get("po-1")).toBe(40);
    expect(coverage.reservation.get("rsv-1")).toBe(40);
    expect(coverage.shipment.get("shp-1")).toBe(10);
  });

  it("covers production from a reservation on the production order id", () => {
    const data = snapshot({
      productionOrders: [
        {
          id: "po-1",
          number: "PO-1",
          manufacturerId: "m-1",
          status: "in_progress",
          createdAt: "",
          createdBy: "1",
          expectedEndOn: null,
        },
        {
          id: "po-other",
          number: "PO-OTHER",
          manufacturerId: "m-1",
          status: "in_progress",
          createdAt: "",
          createdBy: "1",
          expectedEndOn: null,
        },
      ],
      productionOrderLines: [
        { id: "po-1", orderId: "po-other", productId: "p-a", quantity: 10, activatedQuantity: 10 },
      ],
      reservations: [
        {
          id: "rsv-1",
          number: "RSV-1",
          locationType: "production_order",
          locationId: "po-1",
          toOwnerType: "order",
          toOwnerId: "co-1",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "",
          createdBy: "1",
        },
      ],
      reservationLines: [
        { id: "rsvl-1", reservationId: "rsv-1", productId: "p-a", quantity: 8, fromOwnerType: null, fromOwnerId: null },
      ],
    });

    const coverage = calculateOrderDocumentCoverage(data, "co-1");
    expect(coverage.production.get("po-1")).toBe(40);
    expect(coverage.production.has("po-other")).toBe(false);
  });
});

describe("withOrderCoverage", () => {
  it("attaches percents by document id", () => {
    expect(
      withOrderCoverage([{ id: "po-1" }, { id: "po-2" }], new Map([["po-1", 80]])),
    ).toEqual([
      { id: "po-1", coveragePercent: 80 },
      { id: "po-2", coveragePercent: 0 },
    ]);
  });
});
