import { describe, expect, it } from "vitest";
import { validatePackingResult } from "../../src/domain/packing/result-validation";
import type {
  ContainerType,
  OrderItemUnit,
  Placement,
} from "../../src/domain/packing/types";

const container: ContainerType = {
  width: 1000,
  length: 1000,
  height: 1000,
};

const expandedOrder: OrderItemUnit[] = [
  {
    unitId: "1-01",
    itemTypeId: 1,
    dimensions: { width: 100, length: 100, height: 100 },
  },
  {
    unitId: "1-02",
    itemTypeId: 1,
    dimensions: { width: 100, length: 100, height: 100 },
  },
];

const placement: Placement = {
  containerIndex: 0,
  itemUnitId: "1-01",
  itemTypeId: 1,
  position: { x: 0, y: 0, z: 0 },
  rotationYaw: 0,
  size: { width: 100, length: 100, height: 100 },
};

describe("result validation", () => {
  it("passes completeness when all units are tracked", () => {
    const validation = validatePackingResult({
      containers: [{ containerIndex: 0, placements: [placement] }],
      containerType: container,
      expandedOrder,
      unplacedItemUnitIds: ["1-02"],
      deterministic: true,
    });

    expect(validation.completenessValid).toBe(true);
    expect(validation.geometryValid).toBe(true);
    expect(validation.supportValid).toBe(true);
    expect(validation.deterministic).toBe(true);
  });

  it("fails deterministic flag when check fails", () => {
    const validation = validatePackingResult({
      containers: [{ containerIndex: 0, placements: [placement] }],
      containerType: container,
      expandedOrder,
      unplacedItemUnitIds: ["1-02"],
      deterministic: false,
    });

    expect(validation.deterministic).toBe(false);
    expect(validation.violations.some((item) => item.includes("Determinism check failed"))).toBe(
      true,
    );
  });
});
