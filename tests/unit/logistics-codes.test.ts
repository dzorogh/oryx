import { afterEach, describe, expect, it } from "vitest";
import {
  formatLogisticsCode,
  LOGISTICS_CODE_PREFIXES,
  mergeLogisticsCodePrefixes,
  resetLogisticsCodePrefixes,
  setActiveLogisticsCodePrefixes,
} from "@/features/logistics/logistics-codes";
import { productIdentityLabel } from "@/features/logistics/logistics-lookups";

describe("logistics codes", () => {
  afterEach(() => {
    resetLogisticsCodePrefixes();
  });

  it("builds PREFIX-id for every catalog and document kind", () => {
    expect(formatLogisticsCode("product", 1)).toBe("PRD-1");
    expect(formatLogisticsCode("customerOrder", "12")).toBe("OMS-12");
    expect(formatLogisticsCode("productionOrder", 3)).toBe("PO-3");
    expect(formatLogisticsCode("manufacturer", 4)).toBe("PLT-4");
    expect(formatLogisticsCode("warehouse", 2)).toBe("WH-2");
    expect(LOGISTICS_CODE_PREFIXES.reservation).toBe("RSV");
    expect(LOGISTICS_CODE_PREFIXES.shipment).toBe("SHP");
    expect("reservationRelease" in LOGISTICS_CODE_PREFIXES).toBe(false);
    expect("productManufacturer" in LOGISTICS_CODE_PREFIXES).toBe(false);
  });

  it("does not invent a code without an id", () => {
    expect(formatLogisticsCode("product", null)).toBe("");
    expect(formatLogisticsCode("product", "")).toBe("");
  });

  it("merges saved prefix overrides with defaults", () => {
    const merged = mergeLogisticsCodePrefixes({ customerOrder: "ord", product: "  " });
    expect(merged.customerOrder).toBe("ORD");
    expect(merged.product).toBe("PRD");
    expect(formatLogisticsCode("customerOrder", 12, merged)).toBe("ORD-12");
  });

  it("uses the active prefix store after settings load", () => {
    setActiveLogisticsCodePrefixes({ customerOrder: "SO" });
    expect(formatLogisticsCode("customerOrder", 12)).toBe("SO-12");
    expect(formatLogisticsCode("product", 1)).toBe("PRD-1");
  });

  it("labels a product by document code, not sku", () => {
    expect(
      productIdentityLabel({ id: "12", code: "PRD-12", name: "Enduro 125" }, "12", "free 3"),
    ).toBe("PRD-12 · Enduro 125 · free 3");
    expect(productIdentityLabel({ name: "Enduro 125" }, "12")).toBe("PRD-12 · Enduro 125");
  });
});
