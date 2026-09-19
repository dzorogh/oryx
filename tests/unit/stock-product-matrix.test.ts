import { describe, expect, it } from "vitest";
import type { StockBalance } from "@/features/logistics/logistics-types";
import {
  projectProductStockMatrix,
  projectRegionProductMatrix,
  projectWarehouseProductMatrix,
} from "@/features/logistics/stock-product-matrix";

const balance = (partial: Partial<StockBalance> & Pick<StockBalance, "quantity">): StockBalance => ({
  productId: partial.productId ?? "p-chair",
  locationType: partial.locationType ?? "warehouse",
  locationId: partial.locationId ?? "wh-1",
  stockState: partial.stockState ?? "free",
  ownerType: partial.ownerType ?? null,
  ownerId: partial.ownerId ?? null,
  quantity: partial.quantity,
});

const matrixFixture = (): StockBalance[] => [
  balance({ quantity: 10, stockState: "free" }),
  balance({
    quantity: 4,
    stockState: "reserved",
    ownerType: "region",
    ownerId: "1",
  }),
  balance({
    quantity: 6,
    stockState: "reserved",
    ownerType: "order",
    ownerId: "oms-1",
  }),
  balance({
    quantity: 2,
    stockState: "free",
    locationType: "production_order_line",
    locationId: "pol-1",
  }),
  balance({
    quantity: 3,
    stockState: "reserved",
    locationType: "transfer",
    locationId: "tr-1",
    ownerType: "order",
    ownerId: "oms-2",
  }),
  balance({
    quantity: 5,
    stockState: "shipped",
    locationType: "customer_order",
    locationId: "oms-1",
    ownerType: "order",
    ownerId: "oms-1",
  }),
];

describe("stock product matrix", () => {
  it("projects one on-hand population into owner and location columns and drops shipped customer quantity", () => {
    const [row] = projectProductStockMatrix(matrixFixture());

    expect(row).toEqual({
      productId: "p-chair",
      owner: { free: 12, regionReserve: 4, orderReserve: 9 },
      location: { warehouses: 20, production: 2, transfers: 3 },
    });
    expect(row).not.toHaveProperty("shipped");
    expect(row).not.toHaveProperty("customer");
    expect(row.owner.free + row.owner.regionReserve + row.owner.orderReserve).toBe(
      row.location.warehouses + row.location.production + row.location.transfers,
    );
  });

  it("groups warehouse sections as one product row whose on hand is only that row", () => {
    const balances: StockBalance[] = [
      balance({ productId: "p-a", locationId: "wh-2", quantity: 1, stockState: "free" }),
      balance({
        productId: "p-a",
        locationId: "wh-2",
        quantity: 2,
        stockState: "reserved",
        ownerType: "region",
        ownerId: "1",
      }),
      balance({
        productId: "p-a",
        locationId: "wh-2",
        quantity: 3,
        stockState: "reserved",
        ownerType: "order",
        ownerId: "oms-1",
      }),
      balance({ productId: "p-b", locationId: "wh-2", quantity: 4, stockState: "free" }),
      balance({
        productId: "p-c",
        locationId: "wh-2",
        quantity: 5,
        stockState: "reserved",
        ownerType: "region",
        ownerId: "1",
      }),
      balance({ productId: "p-a", locationId: "wh-1", quantity: 10, stockState: "free" }),
      balance({
        productId: "p-a",
        locationType: "production_order_line",
        locationId: "pol-1",
        quantity: 8,
        stockState: "free",
      }),
    ];

    const sections = projectWarehouseProductMatrix(balances);
    const warehouseTwo = sections.find((section) => section.warehouseId === "wh-2");

    expect(warehouseTwo?.rows).toHaveLength(3);
    expect(warehouseTwo?.rows).toEqual([
      { warehouseId: "wh-2", productId: "p-a", free: 1, regionReserve: 2, orderReserve: 3, onHand: 6 },
      { warehouseId: "wh-2", productId: "p-b", free: 4, regionReserve: 0, orderReserve: 0, onHand: 4 },
      { warehouseId: "wh-2", productId: "p-c", free: 0, regionReserve: 5, orderReserve: 0, onHand: 5 },
    ]);
    expect(sections.find((section) => section.warehouseId === "wh-1")?.rows).toEqual([
      { warehouseId: "wh-1", productId: "p-a", free: 10, regionReserve: 0, orderReserve: 0, onHand: 10 },
    ]);
  });

  it("groups region sections as one product row whose region reserve is only that row", () => {
    const balances: StockBalance[] = [
      balance({
        quantity: 3,
        stockState: "reserved",
        ownerType: "region",
        ownerId: "1",
      }),
      balance({
        quantity: 4,
        stockState: "reserved",
        locationType: "production_order_line",
        locationId: "pol-1",
        ownerType: "region",
        ownerId: "1",
      }),
      balance({
        quantity: 5,
        stockState: "reserved",
        locationType: "transfer",
        locationId: "tr-1",
        ownerType: "region",
        ownerId: "1",
      }),
      balance({
        productId: "p-desk",
        quantity: 7,
        stockState: "reserved",
        ownerType: "region",
        ownerId: "2",
      }),
      balance({ quantity: 10, stockState: "free" }),
      balance({
        quantity: 2,
        stockState: "reserved",
        ownerType: "order",
        ownerId: "oms-1",
      }),
    ];

    const sections = projectRegionProductMatrix(balances);

    expect(sections).toEqual([
      {
        regionId: "1",
        rows: [
          {
            regionId: "1",
            productId: "p-chair",
            warehouses: 3,
            production: 4,
            transfers: 5,
            regionReserve: 12,
          },
        ],
      },
      {
        regionId: "2",
        rows: [
          {
            regionId: "2",
            productId: "p-desk",
            warehouses: 7,
            production: 0,
            transfers: 0,
            regionReserve: 7,
          },
        ],
      },
    ]);
  });

  it("applies owner, region, location and query-time zeros with AND", () => {
    const balances: StockBalance[] = [
      balance({
        quantity: 8,
        stockState: "reserved",
        ownerType: "region",
        ownerId: "3",
      }),
      balance({
        quantity: 4,
        stockState: "reserved",
        locationType: "production_order_line",
        locationId: "pol-1",
        ownerType: "region",
        ownerId: "3",
      }),
      balance({
        quantity: 2,
        stockState: "reserved",
        ownerType: "region",
        ownerId: "9",
      }),
      balance({ quantity: 10, stockState: "free" }),
      balance({
        productId: "p-desk",
        quantity: 6,
        stockState: "reserved",
        ownerType: "region",
        ownerId: "3",
      }),
    ];

    const [row] = projectProductStockMatrix(balances, {
      owner: "region",
      location: "warehouse",
      regionId: "3",
    });

    expect(row.productId).toBe("p-chair");
    expect(row.owner).toEqual({ free: 0, regionReserve: 8, orderReserve: 0 });
    expect(row.location).toEqual({ warehouses: 8, production: 0, transfers: 0 });
    expect(row.location.production).toBe(0);
  });

  it("returns no rows when there is no on-hand stock", () => {
    expect(projectProductStockMatrix([])).toEqual([]);
    expect(projectWarehouseProductMatrix([])).toEqual([]);
    expect(projectRegionProductMatrix([])).toEqual([]);
    expect(
      projectProductStockMatrix([
        balance({
          quantity: 5,
          stockState: "shipped",
          locationType: "customer_order",
          locationId: "oms-1",
          ownerType: "order",
          ownerId: "oms-1",
        }),
      ]),
    ).toEqual([]);
  });

  it("filters by warehouseId and excludes shipped quantity at that warehouse", () => {
    const balances: StockBalance[] = [
      balance({ locationId: "wh-1", quantity: 10, stockState: "free" }),
      balance({ locationId: "wh-2", quantity: 7, stockState: "free" }),
      balance({
        locationId: "wh-1",
        quantity: 4,
        stockState: "shipped",
        ownerType: "order",
        ownerId: "oms-1",
      }),
    ];

    const [row] = projectProductStockMatrix(balances, { warehouseId: "wh-1" });
    expect(row).toEqual({
      productId: "p-chair",
      owner: { free: 10, regionReserve: 0, orderReserve: 0 },
      location: { warehouses: 10, production: 0, transfers: 0 },
    });

    const sections = projectWarehouseProductMatrix(balances, { warehouseId: "wh-1" });
    expect(sections).toEqual([
      {
        warehouseId: "wh-1",
        rows: [{ warehouseId: "wh-1", productId: "p-chair", free: 10, regionReserve: 0, orderReserve: 0, onHand: 10 }],
      },
    ]);
  });
});
