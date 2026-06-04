import { describe, expect, it } from "vitest";
import {
  buildParamComputedTargetId,
  computeTargetHash,
  computeTargetValue,
  isComputedReady,
  isComputedStale,
  markupDerivedTargetId,
  usdDerivedTargetId,
  type RecalcDeps,
} from "@/components/store/pim/pricelists/pricelist-recalc";
import type { PricelistCellValue } from "@/components/store/pim/pricelists/pricelists-helpers";

type PriceMap = Record<string, PricelistCellValue>;

const makeDeps = (
  prices: PriceMap,
  options: { expenses?: number; base?: number } = {},
): RecalcDeps => ({
  getPrice: (regionKey, _variantId, field) =>
    prices[`${regionKey}:${field}`] ?? { amount: null, currency: "USD" },
  getParamResolved: () => options.expenses ?? 0,
  getParamBase: () => options.base ?? 0,
});

describe("pricelist-recalc · target ids", () => {
  it("routes purchase USD to the global namespace and others to the region", () => {
    expect(usdDerivedTargetId("purchase", "ae", "v1")).toBe("d:global:v1:purchaseUsd");
    expect(usdDerivedTargetId("dealer", "ae", "v1")).toBe("d:ae:v1:dealerUsd");
    expect(usdDerivedTargetId("retail", "ae", "v1")).toBe("d:ae:v1:retailUsd");
  });

  it("maps markup bases to their derived keys", () => {
    expect(markupDerivedTargetId("dealer", "ae", "v1")).toBe("d:ae:v1:dealerMarkup");
    expect(markupDerivedTargetId("retailNoExpenses", "ae", "v1")).toBe(
      "d:ae:v1:retailMarkupNoExpenses",
    );
    expect(markupDerivedTargetId("retail", "ae", "v1")).toBe("d:ae:v1:retailMarkup");
  });
});

describe("pricelist-recalc · compute", () => {
  it("converts a price to USD", () => {
    const deps = makeDeps({ "global:purchase": { amount: 100, currency: "USD" } });
    expect(computeTargetValue("d:global:v1:purchaseUsd", deps)).toBe(100);
  });

  it("computes dealer markup over the purchase price", () => {
    const deps = makeDeps({
      "global:purchase": { amount: 100, currency: "USD" },
      "ae:dealer": { amount: 200, currency: "USD" },
    });
    expect(computeTargetValue("d:ae:v1:dealerMarkup", deps)).toBeCloseTo(100);
  });

  it("computes retail markup over the landed cost (dealer + expenses)", () => {
    const deps = makeDeps(
      {
        "ae:dealer": { amount: 200, currency: "USD" },
        "ae:retail": { amount: 400, currency: "USD" },
      },
      { expenses: 100 },
    );
    // Landed cost = 200 + 100 = 300, retail 400 → (400 - 300) / 300 = 33.33%.
    expect(computeTargetValue("d:ae:v1:retailMarkup", deps)).toBeCloseTo(100 / 3);
  });

  it("returns the column base for an inherited parameter target", () => {
    const deps = makeDeps({}, { base: 325 });
    expect(computeTargetValue(buildParamComputedTargetId("ae", "customs", "v1"), deps)).toBe(325);
  });
});

describe("pricelist-recalc · hashing & freshness", () => {
  it("produces a different hash when an input changes", () => {
    const before = makeDeps({ "global:purchase": { amount: 100, currency: "USD" } });
    const after = makeDeps({ "global:purchase": { amount: 120, currency: "USD" } });
    expect(computeTargetHash("d:global:v1:purchaseUsd", before)).not.toBe(
      computeTargetHash("d:global:v1:purchaseUsd", after),
    );
  });

  it("treats a cached entry as ready only when status and hash match", () => {
    expect(isComputedReady({ value: 1, status: "ready", hash: "h", updatedAt: 0 }, "h")).toBe(true);
    expect(isComputedReady({ value: 1, status: "pending", hash: "h", updatedAt: 0 }, "h")).toBe(false);
    expect(isComputedReady({ value: 1, status: "ready", hash: "old", updatedAt: 0 }, "h")).toBe(false);
    expect(isComputedReady(undefined, "h")).toBe(false);
  });

  it("treats a missing or differently-hashed entry as stale", () => {
    expect(isComputedStale(undefined, "h")).toBe(true);
    expect(isComputedStale({ value: 1, status: "ready", hash: "old", updatedAt: 0 }, "h")).toBe(true);
    expect(isComputedStale({ value: 1, status: "ready", hash: "h", updatedAt: 0 }, "h")).toBe(false);
  });
});
