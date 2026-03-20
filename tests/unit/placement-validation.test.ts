import { describe, expect, it } from "vitest";
import {
  hasSupport,
  isPlacementInBounds,
  placementsOverlap,
  validateContainerPlacements,
} from "../../src/domain/packing/placement-validation";
import type { ContainerType, Placement } from "../../src/domain/packing/types";

const container: ContainerType = {
  width: 1000,
  length: 1000,
  height: 1000,
};

const makePlacement = (overrides: Partial<Placement> = {}): Placement => ({
  containerIndex: 0,
  itemUnitId: "u-1",
  itemTypeId: 1,
  position: { x: 0, y: 0, z: 0 },
  rotationYaw: 0,
  size: { width: 100, length: 100, height: 100 },
  ...overrides,
});

describe("placement validation", () => {
  it("validates in-bounds placement", () => {
    const placement = makePlacement({ position: { x: 900, y: 900, z: 900 } });
    expect(isPlacementInBounds(placement, container)).toBe(true);
  });

  it("detects overlap in 3D", () => {
    const left = makePlacement({ itemUnitId: "u-1" });
    const right = makePlacement({
      itemUnitId: "u-2",
      position: { x: 50, y: 50, z: 0 },
    });
    expect(placementsOverlap(left, right)).toBe(true);
  });

  it("detects unsupported floating placement", () => {
    const base = makePlacement({ itemUnitId: "u-1" });
    const floating = makePlacement({
      itemUnitId: "u-2",
      position: { x: 400, y: 400, z: 100 },
    });

    expect(hasSupport(floating, [base, floating])).toBe(false);
  });

  it("returns violations for out-of-bounds and overlap", () => {
    const outOfBounds = makePlacement({
      itemUnitId: "u-1",
      position: { x: 950, y: 0, z: 0 },
    });
    const overlap = makePlacement({
      itemUnitId: "u-2",
      position: { x: 940, y: 0, z: 0 },
    });

    const violations = validateContainerPlacements([outOfBounds, overlap], container);
    expect(violations.some((item) => item.includes("Out of bounds"))).toBe(true);
    expect(violations.some((item) => item.includes("Overlap"))).toBe(true);
  });
});
