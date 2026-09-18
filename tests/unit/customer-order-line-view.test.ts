import { describe, expect, it } from "vitest";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import { buildCustomerOrderLineView } from "@/features/logistics/ui/customer-order-line-view";

const snapshot = (partial: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  ({
    products: [
      {
        id: "36",
        code: "PRD-36",
        sku: "CRU-300",
        name: "Cruiser 300 FJ",
        unit: "pcs",
        imageUrl: null,
        manufacturerId: null,
      },
    ],
    manufacturers: [],
    warehouses: [{ id: "48", code: "WH-48", name: "Nordic", manufacturerId: null }],
    settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
    customerOrders: [
      {
        id: "1",
        number: "OMS-1",
        status: "open",
        createdAt: "",
        closedAt: null,
        expectedEndOn: null,
        description: "",
      },
    ],
    customerOrderLines: [{ id: "col-1", orderId: "1", productId: "36", quantity: 6 }],
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

const balance = (partial: Partial<StockBalance> & Pick<StockBalance, "quantity" | "stockState">): StockBalance => ({
  productId: "36",
  locationType: "warehouse",
  locationId: "48",
  customerOrderId: null,
  customerOrderLineId: null,
  ...partial,
});

describe("buildCustomerOrderLineView", () => {
  it("splits shipped, open, and free warehouse stock for an order line", () => {
    const view = buildCustomerOrderLineView(
      snapshot(),
      [
        balance({ stockState: "shipped", quantity: 4, locationType: "customer_order", locationId: "1", customerOrderId: "1", customerOrderLineId: "col-1" }),
        balance({ stockState: "free", quantity: 2, locationType: "warehouse", locationId: "48" }),
      ],
      snapshot().customerOrderLines[0],
      true,
    );

    expect(view.ordered).toBe(6);
    expect(view.shipped).toBe(4);
    expect(view.toReserve).toBe(2);
    expect(view.produced).toBe(0);
    expect(view.inTransit).toBe(0);
    expect(view.inWarehouse).toBe(0);
    expect(view.freeQty).toBe(2);
    expect(view.shortQty).toBe(0);
    expect(view.warehouseStock).toEqual([{ locationId: "48", reserved: 0, free: 2 }]);
    expect(view.canReserve).toBe(true);
    expect(view.canShip).toBe(false);
  });

  it("keeps production, transit, and warehouse buckets separate", () => {
    const view = buildCustomerOrderLineView(
      snapshot({
        productionOrderLines: [{ id: "pol-1", orderId: "po-1", productId: "36", quantity: 3, activatedQuantity: 3 }],
        productionOrders: [
          {
            id: "po-1",
            number: "PO-1",
            manufacturerId: "7",
            status: "in_progress",
            createdAt: "",
            closedAt: null,
            expectedEndOn: null,
          },
        ],
        transfers: [
          {
            id: "tr-1",
            number: "TR-1",
            fromWarehouseId: "48",
            toWarehouseId: "48",
            status: "sent",
            createdAt: "",
            expectedEndOn: null,
            sentAt: "",
            cancelledAt: null,
          },
        ],
      }),
      [
        balance({
          stockState: "reserved",
          quantity: 3,
          locationType: "production_order_line",
          locationId: "pol-1",
          customerOrderId: "1",
          customerOrderLineId: "col-1",
        }),
        balance({
          stockState: "reserved",
          quantity: 1,
          locationType: "transfer",
          locationId: "tr-1",
          customerOrderId: "1",
          customerOrderLineId: "col-1",
        }),
        balance({
          stockState: "reserved",
          quantity: 2,
          locationType: "warehouse",
          locationId: "48",
          customerOrderId: "1",
          customerOrderLineId: "col-1",
        }),
        balance({ stockState: "shipped", quantity: 0, locationType: "customer_order", locationId: "1" }),
      ],
      snapshot().customerOrderLines[0],
      true,
    );

    expect(view.produced).toBe(3);
    expect(view.inTransit).toBe(1);
    expect(view.inWarehouse).toBe(2);
    expect(view.covered).toBe(6);
    expect(view.toReserve).toBe(0);
    expect(view.canShip).toBe(true);
    expect(view.warehouseStock).toEqual([{ locationId: "48", reserved: 2, free: 0 }]);
  });
});
