import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { expandOrder } from "../../src/domain/packing/expand-order";
import { runPackingEngine } from "../../src/domain/packing/packing-engine";
import { createDeterminismFingerprint } from "../../src/domain/packing/result-validation";
import { validateContainerPlacements } from "../../src/domain/packing/placement-validation";
import type { ContainerType, OrderItemType } from "../../src/domain/packing/types";

const container: ContainerType = {
  width: 2000,
  length: 2000,
  height: 2000,
};

const itemArbitrary = fc.record<OrderItemType>({
  id: fc.integer({ min: 1, max: 1000 }),
  name: fc.string({ minLength: 1, maxLength: 8 }),
  width: fc.integer({ min: 200, max: 900 }),
  length: fc.integer({ min: 200, max: 900 }),
  height: fc.integer({ min: 200, max: 900 }),
  weight: fc.integer({ min: 1, max: 1000 }),
  quantity: fc.integer({ min: 1, max: 4 }),
});

describe("packing engine property-based", () => {
  it("returns deterministic and geometrically valid placements", () => {
    fc.assert(
      fc.property(fc.array(itemArbitrary, { minLength: 1, maxLength: 4 }), (order) => {
        const deduplicatedOrder = order.map((item, index) => ({ ...item, id: item.id * 10 + index }));
        const expanded = expandOrder(deduplicatedOrder);
        const first = runPackingEngine(expanded, container);
        const second = runPackingEngine(expanded, container);
        const firstFingerprint = createDeterminismFingerprint(
          first.containers.flatMap((entry) => entry.placements),
          first.unplacedItemUnitIds,
        );
        const secondFingerprint = createDeterminismFingerprint(
          second.containers.flatMap((entry) => entry.placements),
          second.unplacedItemUnitIds,
        );

        expect(firstFingerprint).toBe(secondFingerprint);

        for (const containerInstance of first.containers) {
          const violations = validateContainerPlacements(containerInstance.placements, container);
          expect(violations).toEqual([]);
        }

        const placed = new Set(
          first.containers.flatMap((containerInstance) =>
            containerInstance.placements.map((placement) => placement.itemUnitId),
          ),
        );
        const unplaced = new Set(first.unplacedItemUnitIds);
        for (const unit of expanded) {
          const inPlaced = placed.has(unit.unitId);
          const inUnplaced = unplaced.has(unit.unitId);
          expect(inPlaced || inUnplaced).toBe(true);
          expect(inPlaced && inUnplaced).toBe(false);
        }
      }),
      { numRuns: 30 },
    );
  });
});
