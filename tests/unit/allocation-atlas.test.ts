import { describe, expect, it } from "vitest";
import {
  isLineFullyShipped,
  lineLocationAllocations,
  sumProducedForLine,
  warehouseIdsWithReservedForOrder,
} from "@/features/logistics/allocation-atlas";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import type { LogisticsSnapshot, StockBalance, StockTransaction } from "@/features/logistics/logistics-types";

const snapshot = (partial: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  ({
    products: [],
    manufacturers: [],
    warehouses: [
      { id: "wh-10", code: "WH-10", name: "Ten", manufacturerId: null },
      { id: "wh-2", code: "WH-2", name: "Two", manufacturerId: null },
      { id: "wh-1", code: "WH-1", name: "One", manufacturerId: null },
    ],
    settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
    customerOrders: [
      {
        id: "co-1",
        number: "OMS-1",
        status: "open",
        createdAt: "",
        closedAt: null,
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

const tx = (
  partial: Partial<StockTransaction> & Pick<StockTransaction, "quantity" | "stockState">,
): StockTransaction => ({
  transactionId: partial.transactionId ?? `tx-${Math.random()}`,
  occurredAt: "2026-09-16T10:00:00.000Z",
  postedAt: "2026-09-16T10:00:00.000Z",
  productId: partial.productId ?? "p-a",
  unit: "pcs",
  quantity: partial.quantity,
  locationType: partial.locationType ?? "warehouse",
  locationId: partial.locationId ?? "wh-1",
  stockState: partial.stockState,
  customerOrderId: partial.customerOrderId === undefined ? "co-1" : partial.customerOrderId,
  customerOrderLineId: partial.customerOrderLineId === undefined ? "col-a" : partial.customerOrderLineId,
  sourceType: partial.sourceType ?? "production_output",
  sourceId: partial.sourceId ?? "out-1",
  sourceLineId: partial.sourceLineId ?? "outl-1",
  operationId: "op",
  idempotencyKey: partial.idempotencyKey ?? `key-${Math.random()}`,
  reversesTransactionId: partial.reversesTransactionId ?? null,
});

describe("sumProducedForLine", () => {
  it("sums positive warehouse production_output ledger rows for this line", () => {
    const data = snapshot({
      transactions: [
        tx({ quantity: 8, stockState: "reserved", sourceId: "out-1" }),
        tx({
          quantity: -8,
          stockState: "reserved",
          locationType: "production_order_line",
          locationId: "pol-1",
          sourceId: "out-1",
        }),
        tx({ quantity: 3, stockState: "free", customerOrderId: null, customerOrderLineId: null, sourceId: "out-2" }),
        tx({
          quantity: 4,
          stockState: "reserved",
          customerOrderLineId: "col-b",
          sourceId: "out-3",
        }),
      ],
    });

    expect(sumProducedForLine(data, "col-a")).toBe(8);
    expect(sumProducedForLine(data, "col-b")).toBe(4);
  });

  it("ignores free-state warehouse production_output even when tagged to the same line", () => {
    const data = snapshot({
      transactions: [
        tx({ quantity: 8, stockState: "reserved", sourceId: "out-1" }),
        tx({ quantity: 9, stockState: "free", sourceId: "out-free", customerOrderLineId: "col-a" }),
      ],
    });

    expect(sumProducedForLine(data, "col-a")).toBe(8);
  });

  it("does not let a zero-quantity ledger row block a done legacy allocation fallback", () => {
    const data = snapshot({
      outputs: [
        {
          id: "out-legacy",
          number: "OUT-9",
          productionOrderId: "po-1",
          status: "done",
          createdAt: "",
          doneAt: "",
          cancelledAt: null,
          expectedEndOn: null,
        },
      ],
      outputLines: [
        { id: "outl-legacy", outputId: "out-legacy", productionOrderLineId: "pol-1", productId: "p-a", quantity: 6 },
      ],
      outputAllocations: [
        { id: "oua-1", lineId: "outl-legacy", customerOrderId: "co-1", customerOrderLineId: "col-a", quantity: 6 },
      ],
      transactions: [tx({ quantity: 0, stockState: "reserved", sourceId: "out-legacy" })],
    });

    expect(sumProducedForLine(data, "col-a")).toBe(6);
  });

  it("falls back to legacy output allocations when the ledger has no warehouse rows for that output", () => {
    const data = snapshot({
      outputs: [
        {
          id: "out-legacy",
          number: "OUT-9",
          productionOrderId: "po-1",
          status: "done",
          createdAt: "",
          doneAt: "",
          cancelledAt: null,
          expectedEndOn: null,
        },
      ],
      outputLines: [{ id: "outl-legacy", outputId: "out-legacy", productionOrderLineId: "pol-1", productId: "p-a", quantity: 6 }],
      outputAllocations: [
        { id: "oua-1", lineId: "outl-legacy", customerOrderId: "co-1", customerOrderLineId: "col-a", quantity: 6 },
      ],
    });

    expect(sumProducedForLine(data, "col-a")).toBe(6);
  });

  it("does not treat planned output allocations as produced", () => {
    const data = snapshot({
      outputs: [
        {
          id: "out-planned",
          number: "OUT-3",
          productionOrderId: "po-1",
          status: "planned",
          createdAt: "",
          doneAt: null,
          cancelledAt: null,
          expectedEndOn: null,
        },
      ],
      outputLines: [
        { id: "outl-planned", outputId: "out-planned", productionOrderLineId: "pol-1", productId: "p-a", quantity: 4 },
      ],
      outputAllocations: [
        {
          id: "oua-planned",
          lineId: "outl-planned",
          customerOrderId: "co-1",
          customerOrderLineId: "col-a",
          quantity: 4,
        },
      ],
    });

    expect(sumProducedForLine(data, "col-a")).toBe(0);
  });

  it("does not double-count ledger warehouse output and the matching allocation", () => {
    const data = snapshot({
      outputs: [
        {
          id: "out-1",
          number: "OUT-1",
          productionOrderId: "po-1",
          status: "done",
          createdAt: "",
          doneAt: "",
          cancelledAt: null,
          expectedEndOn: null,
        },
      ],
      outputLines: [{ id: "outl-1", outputId: "out-1", productionOrderLineId: "pol-1", productId: "p-a", quantity: 8 }],
      outputAllocations: [
        { id: "oua-1", lineId: "outl-1", customerOrderId: "co-1", customerOrderLineId: "col-a", quantity: 8 },
      ],
      transactions: [tx({ quantity: 8, stockState: "reserved", sourceId: "out-1", sourceLineId: "outl-1" })],
    });

    expect(sumProducedForLine(data, "col-a")).toBe(8);
  });

  it("nets warehouse reversals and still uses allocation fallback for a different output", () => {
    const data = snapshot({
      outputs: [
        {
          id: "out-1",
          number: "OUT-1",
          productionOrderId: "po-1",
          status: "cancelled",
          createdAt: "",
          doneAt: "",
          cancelledAt: "",
          expectedEndOn: null,
        },
        {
          id: "out-legacy",
          number: "OUT-2",
          productionOrderId: "po-1",
          status: "done",
          createdAt: "",
          doneAt: "",
          cancelledAt: null,
          expectedEndOn: null,
        },
      ],
      outputLines: [
        { id: "outl-1", outputId: "out-1", productionOrderLineId: "pol-1", productId: "p-a", quantity: 5 },
        { id: "outl-legacy", outputId: "out-legacy", productionOrderLineId: "pol-1", productId: "p-a", quantity: 2 },
      ],
      outputAllocations: [
        { id: "oua-1", lineId: "outl-1", customerOrderId: "co-1", customerOrderLineId: "col-a", quantity: 5 },
        { id: "oua-2", lineId: "outl-legacy", customerOrderId: "co-1", customerOrderLineId: "col-a", quantity: 2 },
      ],
      transactions: [
        tx({ quantity: 5, stockState: "reserved", sourceId: "out-1" }),
        tx({ quantity: -5, stockState: "reserved", sourceId: "out-1", transactionId: "tx-rev" }),
      ],
    });

    expect(sumProducedForLine(data, "col-a")).toBe(2);
  });
});

describe("lineLocationAllocations", () => {
  const balances: StockBalance[] = [
    {
      productId: "p-a",
      locationType: "warehouse",
      locationId: "wh-1",
      stockState: "reserved",
      customerOrderId: "co-1",
      customerOrderLineId: "col-a",
      quantity: 3,
    },
    {
      productId: "p-a",
      locationType: "warehouse",
      locationId: "wh-1",
      stockState: "free",
      customerOrderId: null,
      customerOrderLineId: null,
      quantity: 40,
    },
    {
      productId: "p-a",
      locationType: "warehouse",
      locationId: "wh-2",
      stockState: "reserved",
      customerOrderId: "co-other",
      customerOrderLineId: "col-other",
      quantity: 9,
    },
    {
      productId: "p-a",
      locationType: "transfer",
      locationId: "tr-1",
      stockState: "reserved",
      customerOrderId: "co-1",
      customerOrderLineId: "col-a",
      quantity: 2,
    },
    {
      productId: "p-a",
      locationType: "production_order_line",
      locationId: "pol-1",
      stockState: "reserved",
      customerOrderId: "co-1",
      customerOrderLineId: "col-a",
      quantity: 4,
    },
    {
      productId: "p-a",
      locationType: "warehouse",
      locationId: "wh-10",
      stockState: "reserved",
      customerOrderId: "co-1",
      customerOrderLineId: "col-b",
      quantity: 1,
    },
  ];

  it("counts only this line's reserved transfer and warehouse qty", () => {
    expect(lineLocationAllocations(balances, "col-a")).toEqual({
      inTransit: 2,
      byWarehouseId: { "wh-1": 3 },
    });
  });

  it("ignores free stock, other orders, and production-order reservations", () => {
    const result = lineLocationAllocations(balances, "col-a");
    expect(result.byWarehouseId["wh-2"]).toBeUndefined();
    expect(result.byWarehouseId["wh-10"]).toBeUndefined();
    expect(Object.keys(result.byWarehouseId)).toEqual(["wh-1"]);
  });
});

describe("warehouseIdsWithReservedForOrder", () => {
  it("includes only warehouses reserved for this order and sorts by warehouse code", () => {
    const balances: StockBalance[] = [
      {
        productId: "p-a",
        locationType: "warehouse",
        locationId: "wh-10",
        stockState: "reserved",
        customerOrderId: "co-1",
        customerOrderLineId: "col-a",
        quantity: 1,
      },
      {
        productId: "p-a",
        locationType: "warehouse",
        locationId: "wh-2",
        stockState: "reserved",
        customerOrderId: "co-1",
        customerOrderLineId: "col-b",
        quantity: 2,
      },
      {
        productId: "p-a",
        locationType: "warehouse",
        locationId: "wh-1",
        stockState: "free",
        customerOrderId: null,
        customerOrderLineId: null,
        quantity: 50,
      },
      {
        productId: "p-a",
        locationType: "warehouse",
        locationId: "wh-1",
        stockState: "reserved",
        customerOrderId: "co-other",
        customerOrderLineId: "col-other",
        quantity: 7,
      },
    ];
    const lines = snapshot().customerOrderLines;

    expect(warehouseIdsWithReservedForOrder(snapshot(), balances, lines)).toEqual(["wh-2", "wh-10"]);
  });
});

describe("isLineFullyShipped", () => {
  it("treats shipped >= ordered as complete with epsilon", () => {
    expect(isLineFullyShipped(10, 10)).toBe(true);
    expect(isLineFullyShipped(10, 10 - 1e-12)).toBe(true);
    expect(isLineFullyShipped(10, 9.5)).toBe(false);
  });
});
