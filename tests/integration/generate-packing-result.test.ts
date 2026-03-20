import { describe, expect, it } from "vitest";
import { generatePackingResult } from "../../src/features/packing-visualization/hooks/usePackingResult";
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
    for (const entry of placedHeights) {
      expect(entry.placedHeight).toBe(expectedHeightByUnitId.get(entry.unitId));
    }
  });
});
