import { describe, expect, it } from "vitest";
import { generatePackingResult } from "../../src/domain/packing/generate-packing-result";

describe("packing performance", () => {
  it("generates fixed-order result under 3 seconds", () => {
    const started = performance.now();
    const result = generatePackingResult();
    const elapsed = performance.now() - started;

    expect(result.usedContainerCount).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(3000);
  });
});
