import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import {
  ProductionFromOrderForm,
  productionDraftActionLabel,
  relativeDayLabel,
} from "@/features/logistics/order-action-forms";

afterEach(() => {
  cleanup();
});

const snapshot = (partial: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  ({
    products: [
      {
        id: "p-hummer",
        code: "PRD-46",
        sku: "HUMMER-320",
        name: "Hummer 320 RX LTD",
        unit: "pcs",
        manufacturerId: "m-12",
      },
    ],
    manufacturers: [
      { id: "m-12", code: "SH-12", name: "Zhejiang Long Legal Name Co", warehouseId: "wh-12" },
    ],
    warehouses: [{ id: "wh-12", code: "WH-12", name: "Plant warehouse", manufacturerId: "m-12" }],
    regions: [],
    settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
    customerOrders: [
      {
        id: "co-1",
        number: "OMS-1048",
        status: "open",
        createdAt: "",
        createdBy: "1",
      expectedEndOn: null,
        description: "",
      },
    ],
    customerOrderLines: [{ id: "col-1", orderId: "co-1", productId: "p-hummer", quantity: 8 }],
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

const reservedBalances: StockBalance[] = [
  {
    productId: "p-hummer",
    locationType: "warehouse",
    locationId: "wh-12",
    stockState: "reserved",
    ownerType: "order",
    ownerId: "co-1",
    quantity: 5,
  },
];

describe("relativeDayLabel", () => {
  const now = new Date("2026-09-18T12:00:00");

  it("describes a future date from today", () => {
    expect(relativeDayLabel("2026-09-18", now)).toBe("today");
    expect(relativeDayLabel("2026-09-19", now)).toBe("in 1 day");
    expect(relativeDayLabel("2026-09-25", now)).toBe("in 7 days");
    expect(relativeDayLabel("2026-09-17", now)).toBe("yesterday");
    expect(relativeDayLabel("2026-09-11", now)).toBe("7 days ago");
    expect(relativeDayLabel("", now)).toBeNull();
  });
});

describe("productionDraftActionLabel", () => {
  it("sums a shared unit and otherwise counts products", () => {
    const data = snapshot({
      products: [
        { id: "p-a", code: "PRD-1", sku: "A", name: "Chair", unit: "pcs", manufacturerId: "m-12" },
        { id: "p-b", code: "PRD-2", sku: "B", name: "Fabric", unit: "m", manufacturerId: "m-12" },
      ],
    });
    expect(productionDraftActionLabel([], data)).toBe("Create order");
    expect(productionDraftActionLabel([{ productId: "p-a", quantity: 3 }], data)).toBe("Create order · 3 pcs");
    expect(
      productionDraftActionLabel(
        [
          { productId: "p-a", quantity: 3 },
          { productId: "p-b", quantity: 2 },
        ],
        data,
      ),
    ).toBe("Create order · 2 products");
  });
});

describe("ProductionFromOrderForm", () => {
  it("renders the compact table with remaining demand and a summary footer", () => {
    const data = snapshot();
    render(
      <ProductionFromOrderForm
        snapshot={data}
        balances={reservedBalances}
        open
        onOpenChange={() => undefined}
        reload={async () => undefined}
        customerOrderId="co-1"
        lines={data.customerOrderLines}
      />,
    );

    expect(screen.getByText("Launch production")).toBeTruthy();
    expect(screen.getByText("Customer order OMS-1048")).toBeTruthy();
    expect(screen.getByText("Need")).toBeTruthy();
    expect(screen.getByText("Make")).toBeTruthy();
    expect(screen.getByText("3 pcs")).toBeTruthy();
    expect(screen.getByText("remaining")).toBeTruthy();
    expect(screen.getByText(/Ordered 8 pcs/)).toBeTruthy();
    expect(screen.getByText("Quantity will be reserved automatically")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create order · 3 pcs" })).toBeTruthy();
    expect(screen.queryByText("Live order preview")).toBeNull();
    expect(screen.getByText("Optional")).toBeTruthy();
  });

  it("explains a fully covered order instead of asking for a manufacturer", () => {
    const data = snapshot();
    const covered: StockBalance[] = [
      {
        productId: "p-hummer",
        locationType: "warehouse",
        locationId: "wh-12",
        stockState: "reserved",
        ownerType: "order",
        ownerId: "co-1",
        quantity: 8,
      },
    ];
    render(
      <ProductionFromOrderForm
        snapshot={data}
        balances={covered}
        open
        onOpenChange={() => undefined}
        reload={async () => undefined}
        customerOrderId="co-1"
        lines={data.customerOrderLines}
      />,
    );

    expect(screen.getAllByText("This order is already fully covered.")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Create order" })).toHaveProperty("disabled", true);
  });
});
