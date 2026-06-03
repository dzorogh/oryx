import { describe, expect, it } from "vitest";
import {
  DEFAULT_REGION_ID,
  getDefaultCurrency,
  getPricelistRows,
  getRegionById,
  getSeedCellValue,
  getSeedDealerStatus,
  parsePricelistScope,
  parseRegionId,
  PRICELIST_REGIONS,
  scopeHasRegion,
} from "@/components/store/pim/pricelists/pricelists-demo-data";
import { isDealerStatus } from "@/components/store/pim/pricelists/pricelists-helpers";

describe("pricelists-demo-data · scope parsing", () => {
  it("accepts supplier and dealer, falling back to global otherwise", () => {
    expect(parsePricelistScope("supplier")).toBe("supplier");
    expect(parsePricelistScope("dealer")).toBe("dealer");
    expect(parsePricelistScope("global")).toBe("global");
    expect(parsePricelistScope("bogus")).toBe("global");
    expect(parsePricelistScope(null)).toBe("global");
    expect(parsePricelistScope(undefined)).toBe("global");
  });

  it("reports which scopes carry a region", () => {
    expect(scopeHasRegion("global")).toBe(false);
    expect(scopeHasRegion("supplier")).toBe(true);
    expect(scopeHasRegion("dealer")).toBe(true);
  });
});

describe("pricelists-demo-data · region parsing", () => {
  it("defaults to the first region when the id is unknown", () => {
    expect(DEFAULT_REGION_ID).toBe(PRICELIST_REGIONS[0].id);
    expect(parseRegionId("ru")).toBe("ru");
    expect(parseRegionId("zz")).toBe(DEFAULT_REGION_ID);
    expect(parseRegionId(null)).toBe(DEFAULT_REGION_ID);
  });

  it("resolves a region by id and falls back to the first one", () => {
    expect(getRegionById("ru").currency).toBe("RUB");
    expect(getRegionById("missing")).toBe(PRICELIST_REGIONS[0]);
  });
});

describe("pricelists-demo-data · default currency", () => {
  it("uses CNY for purchase and dealer, the region currency for retail", () => {
    expect(getDefaultCurrency("purchase", "RUB")).toBe("CNY");
    expect(getDefaultCurrency("dealer", "RUB")).toBe("CNY");
    expect(getDefaultCurrency("retail", "AED")).toBe("AED");
  });
});

describe("pricelists-demo-data · rows", () => {
  it("enriches variant rows with a stable numeric id and caches the list", () => {
    const first = getPricelistRows();
    const second = getPricelistRows();

    expect(first).toBe(second); // cached reference
    expect(first.length).toBeGreaterThan(0);
    expect(first[0].numericId).toBe(1000);
    expect(first[1].numericId).toBe(1001);
  });
});

describe("pricelists-demo-data · deterministic seeds", () => {
  const ru = getRegionById("ru");
  const ae = getRegionById("ae");

  it("returns identical seed cell values for the same inputs", () => {
    const row = getPricelistRows()[0];
    const a = getSeedCellValue(row, "dealer", ru);
    const b = getSeedCellValue(row, "dealer", ru);

    expect(a).toEqual(b);
    expect(a.amount).toBeGreaterThanOrEqual(1);
  });

  it("prices purchase and dealer in CNY, retail in the region currency", () => {
    const row = getPricelistRows()[0];
    expect(getSeedCellValue(row, "purchase", ru).currency).toBe("CNY");
    expect(getSeedCellValue(row, "dealer", ru).currency).toBe("CNY");
    expect(getSeedCellValue(row, "retail", ae).currency).toBe("AED");
  });

  it("keeps the dealer seed 10–40% above the purchase price per region", () => {
    const row = getPricelistRows()[0];
    for (const region of PRICELIST_REGIONS) {
      const purchase = getSeedCellValue(row, "purchase", region);
      const dealer = getSeedCellValue(row, "dealer", region);
      const markup = (dealer.amount! - purchase.amount!) / purchase.amount!;
      // Allow a little slack for integer rounding at the CNY amount level.
      expect(markup).toBeGreaterThanOrEqual(0.08);
      expect(markup).toBeLessThanOrEqual(0.42);
    }
  });

  it("returns a deterministic, valid dealer status per row + region", () => {
    const row = getPricelistRows()[0];
    const status = getSeedDealerStatus(row, "ru");

    expect(isDealerStatus(status)).toBe(true);
    expect(getSeedDealerStatus(row, "ru")).toBe(status);
  });
});
