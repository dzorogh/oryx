import { describe, expect, it } from "vitest";
import { hrefForLocation } from "@/features/logistics/logistics-availability";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import {
  defaultStockViewFilter,
  filterRowsByProductQuery,
  filterSectionsByProductQuery,
  isDefaultStockViewFilter,
  matchesProductQuery,
  normalizeStockViewFilter,
  parseStockPlace,
  parseStockViewFilter,
  serializeStockPlace,
  stockFilterForGroup,
  stockHref,
  stockMatrixFilterForGroup,
} from "@/features/logistics/stock-filters";

describe("stock filters", () => {
  it("round-trips group, owner, location, warehouse, region and query in the stock URL", () => {
    const href = stockHref({
      group: "warehouses",
      owner: "region",
      location: "warehouse",
      warehouseId: "wh-nordic",
      regionId: "3",
      query: "  chair  ",
    });

    expect(href).toBe(
      "/store/logistics/stock?group=warehouses&owner=region&location=warehouse&warehouse=wh-nordic&region=3&q=chair",
    );

    const parsed = parseStockViewFilter(new URLSearchParams(href.split("?")[1]));
    expect(parsed).toEqual({
      group: "warehouses",
      owner: "region",
      location: "warehouse",
      warehouseId: "wh-nordic",
      regionId: "3",
      query: "chair",
    });
  });

  it("parses the compact matrix filter example and ignores unknown params", () => {
    const parsed = parseStockViewFilter(
      new URLSearchParams("owner=region&region=3&location=warehouse&q=chair&state=reserved&place=warehouse:wh-1&order=co-101&group=ledger"),
    );

    expect(parsed).toEqual({
      group: "products",
      owner: "region",
      location: "warehouse",
      warehouseId: null,
      regionId: "3",
      query: "chair",
    });
    expect(stockHref(parsed)).toBe("/store/logistics/stock?owner=region&location=warehouse&region=3&q=chair");
    expect(stockMatrixFilterForGroup(parsed)).toEqual({
      owner: "region",
      location: "warehouse",
      regionId: "3",
    });
  });

  it("keeps card stockHref compatible for query and warehouse place", () => {
    expect(stockHref({ query: "PRD-1" })).toBe("/store/logistics/stock?q=PRD-1");
    expect(stockHref({ place: { kind: "warehouse", warehouseId: "wh-nordic" } })).toBe(
      "/store/logistics/stock?group=warehouses&warehouse=wh-nordic",
    );
    expect(stockHref({ place: { kind: "locationType", locationType: "production_order_line" } })).toBe(
      "/store/logistics/stock?location=production",
    );
    expect(stockHref({ place: { kind: "locationType", locationType: "customer_order" } })).toBe(
      "/store/logistics/stock",
    );
  });

  it("treats unknown warehouse and region ids as null without clearing known ids", () => {
    const snapshot = {
      warehouses: [{ id: "wh-2" }],
      regions: [{ id: "3" }],
    } as LogisticsSnapshot;

    const staleWarehouse = parseStockViewFilter(new URLSearchParams("warehouse=ghost&region=3"));
    expect(staleWarehouse.warehouseId).toBe("ghost");
    expect(normalizeStockViewFilter(staleWarehouse)).toEqual(staleWarehouse);
    expect(normalizeStockViewFilter(staleWarehouse, snapshot)).toEqual({
      ...defaultStockViewFilter(),
      warehouseId: null,
      regionId: "3",
    });
    expect(stockHref(normalizeStockViewFilter(staleWarehouse, snapshot))).toBe(
      "/store/logistics/stock?region=3",
    );

    const staleRegion = parseStockViewFilter(new URLSearchParams("warehouse=wh-2&region=missing"));
    expect(normalizeStockViewFilter(staleRegion, snapshot)).toEqual({
      ...defaultStockViewFilter(),
      warehouseId: "wh-2",
      regionId: null,
    });
    expect(stockHref(normalizeStockViewFilter(staleRegion, snapshot))).toBe(
      "/store/logistics/stock?warehouse=wh-2",
    );
  });

  it("treats blank and unknown params as the default stock view", () => {
    expect(parseStockViewFilter(new URLSearchParams())).toEqual(defaultStockViewFilter());
    expect(parseStockViewFilter(new URLSearchParams("owner=shipped&location=customer_order&group=demand"))).toEqual(
      defaultStockViewFilter(),
    );
    expect(parseStockPlace("transfer")).toEqual({ kind: "locationType", locationType: "transfer" });
    expect(parseStockPlace("warehouse:")).toEqual({ kind: "all" });
    expect(serializeStockPlace({ kind: "all" })).toBe("all");
    expect(isDefaultStockViewFilter(defaultStockViewFilter("warehouses"))).toBe(true);
    expect(stockHref()).toBe("/store/logistics/stock");
    expect(stockHref({ state: "reserved", orderId: "co-101" })).toBe("/store/logistics/stock");
  });

  it("matches product name, sku, code or id", () => {
    const product = { name: "Nordic Chair", sku: "CHR-01", code: "PRD-1" };
    expect(matchesProductQuery(product, "chair", "1")).toBe(true);
    expect(matchesProductQuery(product, "chr-01", "1")).toBe(true);
    expect(matchesProductQuery(product, "prd-1", "1")).toBe(true);
    expect(matchesProductQuery(undefined, "1", "1")).toBe(true);
    expect(matchesProductQuery(product, "desk", "1")).toBe(false);
    expect(matchesProductQuery(product, "  ", "1")).toBe(true);
  });

  it("switches context filters with the grouping tab", () => {
    const base = {
      ...defaultStockViewFilter("regions"),
      owner: "free" as const,
      location: "production" as const,
      warehouseId: "wh-2",
      regionId: "3",
    };

    expect(stockMatrixFilterForGroup({ ...base, group: "products" })).toEqual({
      owner: "free",
      location: "production",
      regionId: "3",
    });
    expect(stockMatrixFilterForGroup({ ...base, group: "warehouses" })).toEqual({
      owner: "free",
      location: "warehouse",
      warehouseId: "wh-2",
      regionId: "3",
    });
    expect(stockMatrixFilterForGroup({ ...base, group: "regions" })).toEqual({
      owner: "region",
      location: "production",
      warehouseId: "wh-2",
      regionId: "3",
    });
  });

  it("clears hidden group fields and keeps visible compatible filters", () => {
    const base = {
      ...defaultStockViewFilter("products"),
      owner: "free" as const,
      location: "production" as const,
      warehouseId: "wh-2",
      regionId: "3",
      query: "chair",
    };

    expect(stockFilterForGroup(base, "products")).toEqual({
      ...base,
      group: "products",
      warehouseId: null,
    });
    expect(stockFilterForGroup(base, "warehouses")).toEqual({
      ...base,
      group: "warehouses",
      location: "all",
    });
    expect(stockFilterForGroup(base, "regions")).toEqual({
      ...base,
      group: "regions",
      owner: "all",
    });
  });

  it("drops nonmatching product rows and empty sections for a query", () => {
    const snapshot = {
      products: [
        { id: "p-chair", name: "Nordic Chair", sku: "CHR-01", code: "PRD-1" },
        { id: "p-desk", name: "Oak Desk", sku: "DSK-01", code: "PRD-2" },
      ],
    } as LogisticsSnapshot;

    expect(
      filterRowsByProductQuery([{ productId: "p-chair" }, { productId: "p-desk" }], snapshot, "desk"),
    ).toEqual([{ productId: "p-desk" }]);

    expect(
      filterSectionsByProductQuery(
        [
          { warehouseId: "wh-chair", rows: [{ productId: "p-chair" }] },
          { warehouseId: "wh-desk", rows: [{ productId: "p-chair" }, { productId: "p-desk" }] },
        ],
        snapshot,
        "desk",
      ),
    ).toEqual([{ warehouseId: "wh-desk", rows: [{ productId: "p-desk" }] }]);
  });
});

describe("location hrefs", () => {
  it("resolves each place type to its document or warehouse card", () => {
    const snapshot = {
      productionOrderLines: [{ id: "pol-1", orderId: "po-9" }],
    } as LogisticsSnapshot;

    expect(hrefForLocation(snapshot, "warehouse", "wh-1")).toBe("/store/logistics/warehouses/wh-1");
    expect(hrefForLocation(snapshot, "transfer", "tr-1")).toBe("/store/logistics/transfers/tr-1");
    expect(hrefForLocation(snapshot, "customer_order", "co-1")).toBe("/store/logistics/customer-orders/co-1");
    expect(hrefForLocation(snapshot, "production_order_line", "pol-1")).toBe("/store/logistics/production-orders/po-9");
    expect(hrefForLocation(snapshot, "production_order_line", "missing")).toBeNull();
  });
});
