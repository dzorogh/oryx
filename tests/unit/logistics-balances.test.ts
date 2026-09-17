import { describe, expect, it } from "vitest";
import {
  computeStockBalances,
  remainingToReserve,
  sumLocationState,
  summarizeProductStock,
  sumReservedForLine,
  sumShippedForLine,
} from "@/features/logistics/logistics-balances";
import {
  freePlacesForProduct,
  freeProductionLinesForProduct,
  remainingToReturnForLine,
  remainingToShipForLine,
  reservationCap,
  reservedPlacesForLine,
  warehousesWithReservedForOrder,
} from "@/features/logistics/logistics-availability";
import {
  assertAllocationWithinLine,
  assertCustomerCapacity,
  assertDocumentCanBeCancelled,
  assertEnoughStock,
  assertShipmentCapacity,
  RESERVATION_CANCEL_FORBIDDEN,
} from "@/features/logistics/logistics-rules";
import type { StockTransaction } from "@/features/logistics/logistics-types";

const tx = (partial: Partial<StockTransaction> & Pick<StockTransaction, "quantity" | "stockState">): StockTransaction => ({
  transactionId: partial.transactionId ?? `tx-${Math.random()}`,
  occurredAt: "2026-09-16T10:00:00.000Z",
  postedAt: "2026-09-16T10:00:00.000Z",
  productId: partial.productId ?? "p-chair",
  unit: "pcs",
  quantity: partial.quantity,
  locationType: partial.locationType ?? "warehouse",
  locationId: partial.locationId ?? "wh-nordic",
  stockState: partial.stockState,
  customerOrderId: partial.customerOrderId ?? null,
  customerOrderLineId: partial.customerOrderLineId ?? null,
  sourceType: partial.sourceType ?? "reservation",
  sourceId: partial.sourceId ?? "rsv-1",
  sourceLineId: null,
  operationId: "op",
  idempotencyKey: partial.idempotencyKey ?? `key-${Math.random()}`,
  reversesTransactionId: partial.reversesTransactionId ?? null,
});

describe("logistics balances", () => {
  it("nets signed ledger rows into place and state totals", () => {
    const balances = computeStockBalances([
      tx({ quantity: 12, stockState: "free" }),
      tx({ quantity: -4, stockState: "free" }),
      tx({
        quantity: 4,
        stockState: "reserved",
        customerOrderId: "co-205",
        customerOrderLineId: "col-205-chair",
      }),
    ]);

    expect(balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stockState: "free", quantity: 8 }),
        expect.objectContaining({ stockState: "reserved", quantity: 4, customerOrderId: "co-205" }),
      ]),
    );
  });

  it("keeps open customer quantity as ordered minus shipped minus reserved", () => {
    const balances = computeStockBalances([
      tx({
        quantity: 6,
        stockState: "reserved",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-chair",
      }),
      tx({
        quantity: 3,
        stockState: "shipped",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-chair",
        locationType: "customer_order",
        locationId: "co-101",
      }),
    ]);

    expect(sumReservedForLine(balances, "col-101-chair")).toBe(6);
    expect(sumShippedForLine(balances, "col-101-chair")).toBe(3);
    expect(remainingToReserve(10, balances, "col-101-chair")).toBe(1);
  });

  it("sums reserved stock on a production line across customer orders", () => {
    const balances = computeStockBalances([
      tx({
        quantity: 5,
        stockState: "free",
        locationType: "production_order_line",
        locationId: "pol-100-chair",
      }),
      tx({
        quantity: 3,
        stockState: "reserved",
        locationType: "production_order_line",
        locationId: "pol-100-chair",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-chair",
      }),
      tx({
        quantity: 2,
        stockState: "reserved",
        locationType: "production_order_line",
        locationId: "pol-100-chair",
        customerOrderId: "co-205",
        customerOrderLineId: "col-205-chair",
      }),
    ]);

    expect(
      sumLocationState(balances, {
        locationType: "production_order_line",
        locationId: "pol-100-chair",
        stockState: "reserved",
      }),
    ).toBe(5);
    expect(
      sumLocationState(balances, {
        locationType: "production_order_line",
        locationId: "pol-100-chair",
        stockState: "free",
      }),
    ).toBe(5);
  });

  it("summarizes each product by location type and named place", () => {
    const balances = computeStockBalances([
      tx({ quantity: 12, stockState: "free", locationId: "wh-nordic" }),
      tx({
        quantity: 4,
        stockState: "reserved",
        locationId: "wh-central",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-chair",
      }),
      tx({
        quantity: 5,
        stockState: "free",
        locationType: "production_order_line",
        locationId: "pol-100-chair",
      }),
      tx({
        productId: "p-desk",
        quantity: 3,
        stockState: "shipped",
        locationType: "customer_order",
        locationId: "co-205",
        customerOrderId: "co-205",
        customerOrderLineId: "col-205-desk",
      }),
    ]);

    const all = summarizeProductStock(balances);
    const chair = all.find((row) => row.productId === "p-chair");
    const desk = all.find((row) => row.productId === "p-desk");

    expect(chair?.total).toBe(21);
    expect(chair?.byType.warehouse).toBe(16);
    expect(chair?.byType.production_order_line).toBe(5);
    expect(chair?.locations.map((item) => item.locationId)).toEqual(["wh-nordic", "pol-100-chair", "wh-central"]);
    expect(chair?.locations.find((item) => item.locationId === "wh-nordic")).toEqual(
      expect.objectContaining({ free: 12, reserved: 0, shipped: 0 }),
    );
    expect(chair?.locations.find((item) => item.locationId === "wh-central")).toEqual(
      expect.objectContaining({ free: 0, reserved: 4, shipped: 0 }),
    );
    expect(desk?.total).toBe(3);
    expect(desk?.byType.customer_order).toBe(3);

    const nordicOnly = summarizeProductStock(balances, {
      place: { kind: "warehouse", warehouseId: "wh-nordic" },
      stockState: "all",
    });
    expect(nordicOnly).toEqual([
      expect.objectContaining({ productId: "p-chair", total: 12, byType: expect.objectContaining({ warehouse: 12 }) }),
    ]);

    const freeOnly = summarizeProductStock(balances, {
      place: { kind: "all" },
      stockState: "free",
    });
    expect(freeOnly.find((row) => row.productId === "p-chair")?.total).toBe(17);
    expect(freeOnly.find((row) => row.productId === "p-desk")).toBeUndefined();

    const orderOnly = summarizeProductStock(balances, {
      place: { kind: "all" },
      stockState: "all",
      customerOrderId: "co-101",
    });
    expect(orderOnly).toEqual([
      expect.objectContaining({ productId: "p-chair", total: 4, byType: expect.objectContaining({ warehouse: 4 }) }),
    ]);
  });
});

describe("logistics posting rules", () => {
  it("rejects over-allocation and over-shipment", () => {
    expect(() => assertAllocationWithinLine(10, 11)).toThrow(/exceed/);
    expect(() =>
      assertShipmentCapacity(
        { id: "col-1", orderId: "co-1", productId: "p-chair", quantity: 5 },
        computeStockBalances([
          tx({
            quantity: 5,
            stockState: "shipped",
            customerOrderLineId: "col-1",
            customerOrderId: "co-1",
          }),
        ]),
        1,
      ),
    ).toThrow(/ship/);
    expect(() => assertEnoughStock(2, 3, "free")).toThrow(/Not enough/);
    expect(() =>
      assertCustomerCapacity(
        { id: "col-1", orderId: "co-1", productId: "p-chair", quantity: 4 },
        computeStockBalances([
          tx({
            quantity: 4,
            stockState: "reserved",
            customerOrderLineId: "col-1",
            customerOrderId: "co-1",
          }),
        ]),
        1,
      ),
    ).toThrow(/reserve/);
  });
});

describe("logistics availability", () => {
  const line = { id: "col-101-chair", orderId: "co-101", productId: "p-chair", quantity: 10 };

  it("lists current free and reserved places and caps a reservation", () => {
    const balances = computeStockBalances([
      tx({ quantity: 8, stockState: "free", locationId: "wh-nordic" }),
      tx({
        quantity: 3,
        stockState: "reserved",
        locationId: "wh-central",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-chair",
      }),
      tx({
        quantity: 2,
        stockState: "free",
        locationType: "production_order_line",
        locationId: "pol-100-chair",
      }),
    ]);

    expect(freePlacesForProduct(balances, "p-chair").map((item) => item.locationId)).toEqual([
      "wh-nordic",
      "pol-100-chair",
    ]);
    const withTransit = computeStockBalances([
      ...[
        tx({ quantity: 8, stockState: "free", locationId: "wh-nordic" }),
        tx({
          quantity: 2,
          stockState: "free",
          locationType: "production_order_line",
          locationId: "pol-100-chair",
        }),
      ],
      tx({
        quantity: 5,
        stockState: "free",
        locationType: "transfer",
        locationId: "tr-3",
      }),
    ]);
    expect(freePlacesForProduct(withTransit, "p-chair").map((item) => item.locationId)).toEqual([
      "wh-nordic",
      "tr-3",
      "pol-100-chair",
    ]);
    expect(reservedPlacesForLine(balances, "col-101-chair")).toEqual([
      expect.objectContaining({ locationId: "wh-central", quantity: 3 }),
    ]);
    expect(reservationCap(line, balances, "warehouse", "wh-nordic")).toBe(7);
    expect(remainingToShipForLine(line, balances, "wh-central")).toBe(3);
    expect(warehousesWithReservedForOrder(balances, [line])).toEqual([{ warehouseId: "wh-central", quantity: 3 }]);
  });

  it("finds free production qty by line location when the ledger product id differs", () => {
    const balances = computeStockBalances([
      tx({
        productId: "108",
        quantity: 12,
        stockState: "free",
        locationType: "production_order_line",
        locationId: "pol-enduro",
      }),
    ]);

    expect(freeProductionLinesForProduct(balances, "p-6314")).toEqual([]);
    expect(freeProductionLinesForProduct(balances, "p-6314", ["pol-enduro"])).toEqual([
      expect.objectContaining({ locationId: "pol-enduro", productId: "p-6314", quantity: 12 }),
    ]);
  });

  it("finds reserved warehouses by order id when the line id differs", () => {
    const balances = computeStockBalances([
      tx({
        quantity: 4,
        stockState: "reserved",
        locationId: "wh-central",
        customerOrderId: "co-101",
        customerOrderLineId: "36",
      }),
    ]);

    expect(warehousesWithReservedForOrder(balances, [line])).toEqual([{ warehouseId: "wh-central", quantity: 4 }]);
  });

  it("computes remaining return from posted return lines", () => {
    const remaining = remainingToReturnForLine(
      {
        returnLines: [
          { id: "retl-1", returnId: "ret-1", shipmentLineId: "shl-1", quantity: 2 },
          { id: "retl-2", returnId: "ret-2", shipmentLineId: "shl-1", quantity: 1 },
        ],
        returns: [
          { id: "ret-1", status: "posted" },
          { id: "ret-2", status: "draft" },
        ],
      } as never,
      "shl-1",
      6,
    );
    expect(remaining).toBe(4);
  });

  it("forbids cancelling reservation documents", () => {
    expect(() => assertDocumentCanBeCancelled("reservation")).toThrow(RESERVATION_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("reservation_release")).toThrow(RESERVATION_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("shipment")).not.toThrow();
    expect(() => assertDocumentCanBeCancelled("transfer")).not.toThrow();
  });
});
