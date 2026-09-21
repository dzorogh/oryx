import { describe, expect, it } from "vitest";
import { computeStockBalances } from "@/features/logistics/logistics-balances";
import {
  freePlacesForProduct,
  openOrderLinesForProduct,
  placeStockBreakdown,
  productionLineReservationBreakdown,
  reservationCap,
} from "@/features/logistics/logistics-availability";
import { sourceLabel } from "@/features/logistics/logistics-lookups";
import {
  productActivity,
  relatedOutputsForOrder,
  relatedProductionsForOrder,
  relatedReservationsForRegion,
  relatedTransfersForOrder,
} from "@/features/logistics/logistics-related";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { tx } from "./logistics-test-fixtures";

const snapshot = (partial: Partial<LogisticsSnapshot>): LogisticsSnapshot =>
  ({
    products: [],
    manufacturers: [],
    warehouses: [],
    regions: [],
    settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
    customerOrders: [{ id: "co-101", number: "CO-101", status: "open", createdAt: "", createdBy: "1",
      expectedEndOn: "2026-10-15", description: "" }],
    customerOrderLines: [{ id: "col-101-chair", orderId: "co-101", productId: "p-chair", quantity: 10 }],
    productionOrders: [
      { id: "po-100", number: "PO-100", manufacturerId: "m-1", status: "in_progress", createdAt: "", createdBy: "1",
      expectedEndOn: "2026-09-25" },
    ],
    productionOrderLines: [{ id: "pol-100-chair", orderId: "po-100", productId: "p-chair", quantity: 20, activatedQuantity: 20 }],
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
    users: [],
    documentHistory: [],
    transactions: [],
    ...partial,
  }) as LogisticsSnapshot;

describe("related productions and movements", () => {
  it("keeps a production on the order after the reserved stock is outputted", () => {
    const data = snapshot({
      reservations: [
        {
          id: "rsv-1",
          number: "RSV-1",
          locationType: "production_order",
          locationId: "pol-100-chair",
          toOwnerType: "order",
          toOwnerId: "co-101",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "",
        createdBy: "1",
      },
      ],
      reservationLines: [
        {
          id: "rsvl-1",
          reservationId: "rsv-1",
          productId: "p-chair",
          quantity: 6,
          fromOwnerType: null,
          fromOwnerId: null,
        },
      ],
      outputs: [
        { id: "out-1", number: "OUT-1", productionOrderId: "po-100", status: "done", createdAt: "", createdBy: "1",
      expectedEndOn: "2026-09-20" },
      ],
      transactions: [
        tx({
          quantity: 6,
          stockState: "reserved",
          locationType: "warehouse",
          locationId: "wh-nordic",
          customerOrderId: "co-101",
          customerOrderLineId: "col-101-chair",
          sourceType: "production_output",
          sourceId: "out-1",
        }),
      ],
    });

    expect(relatedProductionsForOrder(data, "co-101").map((item) => item.label)).toEqual(["PO-100"]);
    expect(relatedProductionsForOrder(data, "co-101")[0]?.meta).toContain("выпущено 6");
    expect(relatedProductionsForOrder(data, "co-101")[0]?.meta).toContain("2026");
    expect(relatedOutputsForOrder(data, "co-101").map((item) => item.label)).toEqual(["OUT-1"]);
    expect(relatedOutputsForOrder(data, "co-101")[0]?.meta).toContain("done");
    expect(relatedOutputsForOrder(data, "co-101")[0]?.meta).toContain("2026");
  });

  it("links a production from a reservation on the production order id", () => {
    const data = snapshot({
      reservations: [
        {
          id: "rsv-po",
          number: "RSV-PO",
          locationType: "production_order",
          locationId: "po-100",
          toOwnerType: "order",
          toOwnerId: "co-101",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "",
          createdBy: "1",
        },
      ],
      reservationLines: [
        {
          id: "rsvl-po",
          reservationId: "rsv-po",
          productId: "p-chair",
          quantity: 6,
          fromOwnerType: null,
          fromOwnerId: null,
        },
      ],
    });

    expect(relatedProductionsForOrder(data, "co-101").map((item) => item.label)).toEqual(["PO-100"]);
  });

  it("links a transfer after an in-transit reservation", () => {
    const data = snapshot({
      transfers: [
        {
          id: "tr-3",
          number: "TR-3",
          fromWarehouseId: "wh-nordic",
          toWarehouseId: "wh-retail",
          status: "sent",
          createdAt: "",
          createdBy: "1",
      expectedEndOn: "2026-09-28",
        },
      ],
      reservations: [
        {
          id: "rsv-sea",
          number: "RSV-SEA",
          locationType: "transfer",
          locationId: "tr-3",
          toOwnerType: "order",
          toOwnerId: "co-101",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "",
        createdBy: "1",
      },
      ],
      reservationLines: [
        {
          id: "rsvl-sea",
          reservationId: "rsv-sea",
          productId: "p-chair",
          quantity: 2,
          fromOwnerType: null,
          fromOwnerId: null,
        },
      ],
    });

    expect(relatedTransfersForOrder(data, "co-101").map((item) => item.label)).toEqual(["TR-3"]);
    expect(relatedTransfersForOrder(data, "co-101")[0]?.meta).toContain("sent");
    expect(relatedTransfersForOrder(data, "co-101")[0]?.meta).toContain("2026");
  });

  it("links reservations that destination or source a region", () => {
    const data = snapshot({
      reservations: [
        {
          id: "rsv-reg",
          number: "RSV-REG",
          locationType: "warehouse",
          locationId: "wh-nordic",
          toOwnerType: "region",
          toOwnerId: "reg-1",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "",
        createdBy: "1",
      },
        {
          id: "rsv-out",
          number: "RSV-OUT",
          locationType: "warehouse",
          locationId: "wh-nordic",
          toOwnerType: "order",
          toOwnerId: "co-101",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "",
        createdBy: "1",
      },
      ],
      reservationLines: [
        {
          id: "rsvl-reg",
          reservationId: "rsv-reg",
          productId: "p-chair",
          quantity: 2,
          fromOwnerType: null,
          fromOwnerId: null,
        },
        {
          id: "rsvl-out",
          reservationId: "rsv-out",
          productId: "p-chair",
          quantity: 1,
          fromOwnerType: "region",
          fromOwnerId: "reg-1",
        },
      ],
    });

    expect(relatedReservationsForRegion(data, "reg-1").map((item) => item.label)).toEqual(["RSV-REG", "RSV-OUT"]);
    expect(relatedReservationsForRegion(data, "reg-1")[0]?.operation).toBe("reserve");
    expect(relatedReservationsForRegion(data, "reg-1")[1]?.operation).toBe("reassign");
  });
});

describe("in-transit availability", () => {
  it("lets a reservation claim free stock sitting on a sent transfer", () => {
    const balances = computeStockBalances([
      tx({
        quantity: 3,
        stockState: "free",
        locationType: "transfer",
        locationId: "tr-3",
      }),
    ]);
    const line = { id: "col-101-chair", orderId: "co-101", productId: "p-chair", quantity: 10 };

    expect(freePlacesForProduct(balances, "p-chair").map((item) => item.locationId)).toEqual(["tr-3"]);
    expect(reservationCap(line, balances, "transfer", "tr-3")).toBe(3);
  });
});

describe("productionLineReservationBreakdown", () => {
  const line = { id: "pol-100-chair", productId: "p-chair" };

  it("splits one production line across customer orders and leftover free qty", () => {
    const balances = computeStockBalances([
      tx({
        productId: "p-chair",
        quantity: 6,
        stockState: "reserved",
        locationType: "production_order",
        locationId: "pol-100-chair",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-chair",
      }),
      tx({
        productId: "p-chair",
        quantity: 3,
        stockState: "reserved",
        locationType: "production_order",
        locationId: "pol-100-chair",
        customerOrderId: "co-205",
        customerOrderLineId: "col-205-chair",
      }),
      tx({
        productId: "p-chair",
        quantity: 4,
        stockState: "free",
        locationType: "production_order",
        locationId: "pol-100-chair",
      }),
    ]);

    expect(productionLineReservationBreakdown(line, balances)).toEqual({
      free: 4,
      reserved: [
        { ownerType: "order", ownerId: "co-101", quantity: 6 },
        { ownerType: "order", ownerId: "co-205", quantity: 3 },
      ],
    });
  });

  it("returns only free qty when nothing is reserved", () => {
    const balances = computeStockBalances([
      tx({
        productId: "p-chair",
        quantity: 8,
        stockState: "free",
        locationType: "production_order",
        locationId: "pol-100-chair",
      }),
    ]);

    expect(productionLineReservationBreakdown(line, balances)).toEqual({
      free: 8,
      reserved: [],
    });
  });

  it("returns reserved orders with zero free when the line is fully reserved", () => {
    const balances = computeStockBalances([
      tx({
        productId: "p-chair",
        quantity: 10,
        stockState: "reserved",
        locationType: "production_order",
        locationId: "pol-100-chair",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-chair",
      }),
    ]);

    expect(productionLineReservationBreakdown(line, balances)).toEqual({
      free: 0,
      reserved: [{ ownerType: "order", ownerId: "co-101", quantity: 10 }],
    });
  });
});

describe("placeStockBreakdown", () => {
  it("reuses the same reserved split for a warehouse as production lines do", () => {
    const balances = computeStockBalances([
      tx({
        productId: "p-chair",
        quantity: 5,
        stockState: "reserved",
        locationType: "warehouse",
        locationId: "wh-nordic",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-chair",
      }),
      tx({
        productId: "p-chair",
        quantity: 2,
        stockState: "free",
        locationType: "warehouse",
        locationId: "wh-nordic",
      }),
      tx({
        productId: "p-chair",
        quantity: 7,
        stockState: "shipped",
        locationType: "customer_order",
        locationId: "co-101",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-chair",
      }),
    ]);

    expect(placeStockBreakdown(balances, "p-chair", "warehouse", "wh-nordic")).toEqual({
      free: 2,
      reserved: [{ ownerType: "order", ownerId: "co-101", quantity: 5 }],
      shipped: [],
    });
    expect(placeStockBreakdown(balances, "p-chair", "customer_order", "co-101")).toEqual({
      free: 0,
      reserved: [],
      shipped: [{ ownerType: "order", ownerId: "co-101", quantity: 7 }],
    });
  });
});

describe("openOrderLinesForProduct", () => {
  it("hides fully reserved lines and keeps open remaining demand", () => {
    const data = snapshot({
      customerOrders: [
        { id: "co-101", number: "CO-101", status: "open", createdAt: "", createdBy: "1",
      expectedEndOn: null, description: "" },
        { id: "co-205", number: "CO-205", status: "open", createdAt: "", createdBy: "1",
      expectedEndOn: null, description: "" },
        { id: "co-300", number: "CO-300", status: "closed", createdAt: "", createdBy: "1",
      expectedEndOn: null, description: "" },
      ],
      customerOrderLines: [
        { id: "col-101-desk", orderId: "co-101", productId: "p-desk", quantity: 2 },
        { id: "col-205-desk", orderId: "co-205", productId: "p-desk", quantity: 6 },
        { id: "col-300-desk", orderId: "co-300", productId: "p-desk", quantity: 4 },
      ],
    });
    const balances = computeStockBalances([
      tx({
        productId: "p-desk",
        quantity: 2,
        stockState: "reserved",
        customerOrderId: "co-101",
        customerOrderLineId: "col-101-desk",
      }),
    ]);

    expect(openOrderLinesForProduct(data, balances, "p-desk").map((line) => line.id)).toEqual(["col-205-desk"]);
  });
});

describe("sourceLabel", () => {
  it("resolves ledger sources to document numbers", () => {
    const data = snapshot({
      reservations: [
        {
          id: "rsv-uuid",
          number: "RSV-104",
          locationType: "warehouse",
          locationId: "wh-nordic",
          toOwnerType: "order",
          toOwnerId: "co-101",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "",
        createdBy: "1",
      },
      ],
      outputs: [
        {
          id: "out-uuid",
          number: "OUT-2",
          productionOrderId: "po-100",
          status: "done",
          createdAt: "",
          createdBy: "1",
      expectedEndOn: null,
        },
      ],
      productionOrders: [
        {
          id: "po-100",
          number: "PO-100",
          manufacturerId: "m-1",
          status: "in_progress",
          createdAt: "",
          createdBy: "1",
      expectedEndOn: null,
        },
      ],
    });

    expect(sourceLabel(data, "reservation", "rsv-uuid")).toBe("RSV-104");
    expect(sourceLabel(data, "output", "out-uuid")).toBe("OUT-2");
    expect(sourceLabel(data, "production_order", "po-100")).toBe("PO-100");
    expect(sourceLabel(data, "reservation", "missing")).toBe("missing");
  });
});

describe("productActivity", () => {
  it("keeps orders and productions separate and carries real expected-end dates", () => {
    const data = snapshot({
      manufacturers: [{ id: "m-1", code: "SH-12", name: "Plant", warehouseId: "wh-1" }],
      customerOrders: [
        { id: "co-120", number: "OMS-120", status: "open", createdAt: "", createdBy: "1",
      expectedEndOn: null, description: "" },
      ],
      customerOrderLines: [{ id: "col-120", orderId: "co-120", productId: "p-6365", quantity: 44 }],
      productionOrders: [
        {
          id: "po-101",
          number: "PO-101",
          manufacturerId: "m-1",
          status: "draft",
          createdAt: "",
          createdBy: "1",
      expectedEndOn: "2026-09-19",
        },
      ],
      productionOrderLines: [{ id: "pol-101", orderId: "po-101", productId: "p-6365", quantity: 44, activatedQuantity: 44 }],
    });

    const groups = productActivity(data, "p-6365");
    expect(groups.map((group) => group.kind)).toEqual([
      "customer_order",
      "production_order",
      "transfer",
      "output",
      "shipment",
    ]);
    expect(groups[0]?.items).toEqual([
      {
        id: "co-120",
        href: "/store/logistics/customer-orders/co-120",
        number: "OMS-120",
        quantity: 44,
        status: "open",
        expectedEndOn: null,
        hasExpectedEnd: true,
        hint: null,
        manufacturerId: null,
      },
    ]);
    expect(groups[1]?.items).toEqual([
      {
        id: "po-101",
        href: "/store/logistics/production-orders/po-101",
        number: "PO-101",
        quantity: 44,
        status: "draft",
        expectedEndOn: "2026-09-19",
        hasExpectedEnd: true,
        hint: "SH-12",
        manufacturerId: "m-1",
      },
    ]);
  });
});

describe("store schema model", () => {
  it("keeps settings as prefixes only, without production activation", () => {
    const data = snapshot({});
    expect(data.settings).toEqual({
      id: "1",
      codePrefixes: mergeLogisticsCodePrefixes(),
    });
    expect("productionActivationStatus" in data.settings).toBe(false);
    expect("productManufacturer" in data.settings.codePrefixes).toBe(false);
  });
});
