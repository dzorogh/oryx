import { describe, expect, it } from "vitest";
import {
  buildPriceCellId,
  buildStatusCellId,
  CURRENCY_CODES,
  CURRENCY_USD_RATE,
  formatMoney,
  formatUsd,
  formatUsdValue,
  isCurrencyCode,
  isDealerStatus,
  toUsd,
} from "@/components/store/pim/pricelists/pricelists-helpers";

describe("pricelists-helpers · currency guards", () => {
  it("recognizes every known currency code", () => {
    for (const code of CURRENCY_CODES) {
      expect(isCurrencyCode(code)).toBe(true);
    }
  });

  it("rejects unknown or non-string values", () => {
    expect(isCurrencyCode("XXX")).toBe(false);
    expect(isCurrencyCode("usd")).toBe(false);
    expect(isCurrencyCode(123)).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
    expect(isCurrencyCode(undefined)).toBe(false);
  });

  it("validates dealer statuses", () => {
    expect(isDealerStatus("available")).toBe(true);
    expect(isDealerStatus("unavailable")).toBe(true);
    expect(isDealerStatus("hidden")).toBe(true);
    expect(isDealerStatus("sold")).toBe(false);
    expect(isDealerStatus(null)).toBe(false);
  });
});

describe("pricelists-helpers · toUsd", () => {
  it("returns null when amount is null", () => {
    expect(toUsd(null, "USD")).toBeNull();
  });

  it("passes USD amounts through unchanged", () => {
    expect(toUsd(100, "USD")).toBe(100);
  });

  it("converts foreign currencies by the static rate", () => {
    expect(toUsd(100, "CNY")).toBeCloseTo(100 * CURRENCY_USD_RATE.CNY, 10);
    expect(toUsd(1, "OMR")).toBeCloseTo(CURRENCY_USD_RATE.OMR, 10);
  });
});

describe("pricelists-helpers · formatting", () => {
  it("formats money with thousands separator and currency code", () => {
    expect(formatMoney(1000, "USD")).toBe("1,000 USD");
    expect(formatMoney(1234567, "RUB")).toBe("1,234,567 RUB");
  });

  it("renders an em dash for null money", () => {
    expect(formatMoney(null, "USD")).toBe("—");
  });

  it("formats USD totals with the USD suffix", () => {
    expect(formatUsd(1234)).toBe("1,234 USD");
    expect(formatUsd(null)).toBe("—");
  });

  it("formats the derived USD column value without a code", () => {
    expect(formatUsdValue(1234)).toBe("1,234");
    expect(formatUsdValue(null)).toBe("—");
  });
});

describe("pricelists-helpers · cell ids", () => {
  it("namespaces purchase prices globally and per-region prices by region", () => {
    expect(buildPriceCellId(null, "v1", "purchase")).toBe("global:v1:purchase");
    expect(buildPriceCellId("ru", "v1", "dealer")).toBe("ru:v1:dealer");
    expect(buildPriceCellId("us", "v9", "retail")).toBe("us:v9:retail");
  });

  it("builds dealer status ids in the region + variant namespace", () => {
    expect(buildStatusCellId("ru", "v1")).toBe("ru:v1:dealerStatus");
  });
});
