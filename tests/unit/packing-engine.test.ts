import { describe, expect, it } from "vitest";
import { expandOrder } from "../../src/domain/packing/expand-order";
import { runPackingEngine } from "../../src/domain/packing/packing-engine";
import { createDeterminismFingerprint } from "../../src/domain/packing/result-validation";
import type { ContainerType, OrderItemType } from "../../src/domain/packing/types";

describe("packing engine", () => {
  it("is deterministic for identical input", () => {
    const order: OrderItemType[] = [
      {
        id: 1,
        name: "A",
        width: 500,
        length: 500,
        height: 500,
        weight: 1,
        quantity: 4,
      },
    ];
    const container: ContainerType = { width: 1000, length: 1000, height: 1000 };
    const units = expandOrder(order);

    const first = runPackingEngine(units, container);
    const second = runPackingEngine(units, container);

    const firstFingerprint = createDeterminismFingerprint(
      first.containers.flatMap((item) => item.placements),
      first.unplacedItemUnitIds,
    );
    const secondFingerprint = createDeterminismFingerprint(
      second.containers.flatMap((item) => item.placements),
      second.unplacedItemUnitIds,
    );

    expect(firstFingerprint).toBe(secondFingerprint);
  });

  it("does not report impossible placement as fully packed", () => {
    const order: OrderItemType[] = [
      {
        id: 1,
        name: "A",
        width: 900,
        length: 900,
        height: 700,
        weight: 1,
        quantity: 3,
      },
    ];
    const container: ContainerType = { width: 1000, length: 1000, height: 1000 };

    const result = runPackingEngine(expandOrder(order), container);
    expect(result.containers.length + result.unplacedItemUnitIds.length).toBeGreaterThan(1);
    expect(result.containers.length > 1 || result.unplacedItemUnitIds.length > 0).toBe(true);
  });
});
