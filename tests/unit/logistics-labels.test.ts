import { describe, expect, it } from "vitest";
import { formatQuantity, formatSignedQuantity, locationKindLabel } from "@/features/logistics/logistics-labels";

describe("formatSignedQuantity", () => {
  it("always prefixes positives with plus", () => {
    expect(formatSignedQuantity(12)).toBe("+12");
    expect(formatSignedQuantity(12, "pcs")).toBe("+12 pcs");
    expect(formatSignedQuantity(1.5, "kg")).toBe("+1.50 kg");
  });

  it("uses a Unicode minus, not a hyphen-minus", () => {
    expect(formatSignedQuantity(-5)).toBe("\u22125");
    expect(formatSignedQuantity(-5, "pcs")).toBe("\u22125 pcs");
    expect(formatSignedQuantity(-5)).not.toContain("-");
    expect(formatSignedQuantity(-2.5)).toBe("\u22122.50");
  });

  it("leaves zero unsigned", () => {
    expect(formatSignedQuantity(0)).toBe("0");
    expect(formatSignedQuantity(0, "pcs")).toBe("0 pcs");
    expect(formatSignedQuantity(1e-12)).toBe("0");
  });

  it("does not change unsigned stock formatting", () => {
    expect(formatQuantity(12, "pcs")).toBe("12 pcs");
    expect(formatQuantity(-5)).toBe("-5");
  });
});

describe("locationKindLabel", () => {
  it("names the host entity, not the stock-place phrasing", () => {
    expect(locationKindLabel("warehouse")).toBe("Warehouse");
    expect(locationKindLabel("warehouse", true)).toBe("Plant warehouse");
    expect(locationKindLabel("production_order_line")).toBe("Production order");
    expect(locationKindLabel("transfer")).toBe("Transfer");
    expect(locationKindLabel("customer_order")).toBe("Customer order");
  });
});
