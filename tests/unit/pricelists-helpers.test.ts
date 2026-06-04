import { describe, expect, it } from "vitest";
import {
  buildPriceCellId,
  buildStatusCellId,
  computeMarkupPercent,
  convertAmount,
  CURRENCY_CODES,
  CURRENCY_USD_RATE,
  formatMarkupValue,
  formatMoney,
  formatUsd,
  formatUsdValue,
  fromUsd,
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
    expect(isDealerStatus("hidden")).toBe(false);
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

describe("pricelists-helpers · fromUsd", () => {
  it("returns null when the USD amount is null", () => {
    expect(fromUsd(null, "CNY")).toBeNull();
  });

  it("passes USD amounts through unchanged", () => {
    expect(fromUsd(100, "USD")).toBe(100);
  });

  it("is the inverse of toUsd for foreign currencies", () => {
    const original = 52486;
    const usd = toUsd(original, "CNY");
    expect(fromUsd(usd, "CNY")).toBeCloseTo(original, 6);
  });
});

describe("pricelists-helpers · convertAmount", () => {
  it("returns null when amount is null", () => {
    expect(convertAmount(null, "CNY", "EUR")).toBeNull();
  });

  it("is a no-op when the currencies match", () => {
    expect(convertAmount(1000, "CNY", "CNY")).toBe(1000);
  });

  it("matches toUsd when converting to USD", () => {
    expect(convertAmount(1000, "CNY", "USD")).toBeCloseTo(toUsd(1000, "CNY") ?? 0, 10);
  });

  it("converts between two foreign currencies via their USD rates", () => {
    expect(convertAmount(1000, "CNY", "EUR")).toBeCloseTo(
      (1000 * CURRENCY_USD_RATE.CNY) / CURRENCY_USD_RATE.EUR,
      10,
    );
  });

  it("round-trips an amount through a second currency", () => {
    const eur = convertAmount(1000, "CNY", "EUR");
    expect(convertAmount(eur, "EUR", "CNY")).toBeCloseTo(1000, 6);
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

  it("formats the derived USD column value with a USD code", () => {
    expect(formatUsdValue(1234)).toBe("1,234 USD");
    expect(formatUsdValue(null)).toBe("—");
  });

  it("formats markup as a rounded number suffixed with %", () => {
    expect(formatMarkupValue(25)).toBe("25%");
    expect(formatMarkupValue(0)).toBe("0%");
    expect(formatMarkupValue(-5)).toBe("-5%");
    expect(formatMarkupValue(null)).toBe("—");
  });
});

describe("pricelists-helpers · computeMarkupPercent", () => {
  it("returns the dealer premium over the purchase price", () => {
    expect(computeMarkupPercent(100, 125)).toBeCloseTo(25, 10);
    expect(computeMarkupPercent(200, 220)).toBeCloseTo(10, 10);
  });

  it("returns null when the purchase base is missing or non-positive", () => {
    expect(computeMarkupPercent(null, 100)).toBeNull();
    expect(computeMarkupPercent(100, null)).toBeNull();
    expect(computeMarkupPercent(0, 100)).toBeNull();
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
