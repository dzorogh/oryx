import { describe, expect, it } from "vitest";
import { hrefForLocation } from "@/features/logistics/logistics-availability";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import {
  defaultStockViewFilter,
  isDefaultStockViewFilter,
  matchesProductQuery,
  parseStockPlace,
  parseStockViewFilter,
  serializeStockPlace,
  stockHref,
} from "@/features/logistics/stock-filters";

describe("stock filters", () => {
  it("round-trips place, state, query and order in the stock URL", () => {
    const href = stockHref({
      state: "reserved",
      place: { kind: "warehouse", warehouseId: "wh-nordic" },
      query: "  chair  ",
      orderId: "co-101",
    });

    expect(href).toBe("/store/logistics/stock?state=reserved&place=warehouse%3Awh-nordic&q=chair&order=co-101");

    const parsed = parseStockViewFilter(new URLSearchParams(href.split("?")[1]));
    expect(parsed).toEqual({
      state: "reserved",
      place: { kind: "warehouse", warehouseId: "wh-nordic" },
      query: "chair",
      orderId: "co-101",
    });
  });

  it("treats blank and unknown params as the default stock view", () => {
    expect(parseStockViewFilter(new URLSearchParams())).toEqual(defaultStockViewFilter());
    expect(parseStockPlace("transfer")).toEqual({ kind: "locationType", locationType: "transfer" });
    expect(parseStockPlace("warehouse:")).toEqual({ kind: "all" });
    expect(serializeStockPlace({ kind: "all" })).toBe("all");
    expect(isDefaultStockViewFilter(defaultStockViewFilter())).toBe(true);
    expect(stockHref()).toBe("/store/logistics/stock");
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
