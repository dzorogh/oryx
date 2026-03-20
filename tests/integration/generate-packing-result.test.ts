import { describe, expect, it } from "vitest";
import { generatePackingResult } from "../../src/domain/packing/generate-packing-result";
import { FIXED_ORDER } from "../../src/domain/packing/constants";
import { expandOrder } from "../../src/domain/packing/expand-order";

describe("generate packing result integration", () => {
  it("generates physically valid and deterministic result for fixed order", () => {
    const first = generatePackingResult();
    const second = generatePackingResult();
    const expandedOrder = expandOrder(FIXED_ORDER);
    const expectedHeightByUnitId = new Map(
      expandedOrder.map((unit) => [unit.unitId, unit.dimensions.height]),
    );
    const placedHeights = first.containers.flatMap((container) =>
      container.placements.map((placement) => ({
        unitId: placement.itemUnitId,
        placedHeight: placement.size.height,
      })),
    );

    expect(first).toEqual(second);
    expect(first.usedContainerCount).toBe(1);
    expect(first.summary.totalUnits).toBe(expandedOrder.length);
    expect(first.summary.totalUnits).toBe(first.summary.placedUnits + first.summary.unplacedUnits);
    expect(first.validation.geometryValid).toBe(true);
    expect(first.validation.supportValid).toBe(true);
    expect(first.validation.completenessValid).toBe(true);
    expect(first.validation.deterministic).toBe(true);
    expect(first.validation.violations).not.toEqual(
      expect.arrayContaining([expect.stringContaining("Out of bounds")]),
    );
    expect(first.validation.violations).not.toEqual(
      expect.arrayContaining([expect.stringContaining("Unsupported placement")]),
    );
    for (const entry of placedHeights) {
      expect(entry.placedHeight).toBe(expectedHeightByUnitId.get(entry.unitId));
    }

    const criticalUnitIds = [
      "41-01",
      "41-02",
      "41-04",
      "41-05",
      "41-07",
      "41-08",
      "41-09",
      "6336-01",
      "6336-02",
      "6352-01",
      "6352-02",
      "6360-01",
      "6360-02",
      "6360-03",
      "6360-05",
      "6360-06",
      "6360-08",
      "6360-09",
      "8-08",
    ];
    const placedHeightByUnitId = new Map(placedHeights.map((entry) => [entry.unitId, entry.placedHeight]));
    for (const unitId of criticalUnitIds) {
      if (!placedHeightByUnitId.has(unitId)) continue;
      expect(placedHeightByUnitId.get(unitId)).toBe(expectedHeightByUnitId.get(unitId));
    }
  });

  it("packs order 69 into at most two containers", () => {
    const result = generatePackingResult(69);
    expect(result.validation.geometryValid).toBe(true);
    expect(result.validation.supportValid).toBe(true);
    expect(result.usedContainerCount).toBeLessThanOrEqual(2);
  });
});
