import { describe, expect, it } from "vitest";
import type { PackingValidation } from "@/domain/packing/types";
import { isPackingPlacementValid } from "@/domain/packing/result-validation";

const base: PackingValidation = {
  geometryValid: true,
  supportValid: true,
  completenessValid: true,
  deterministic: true,
  violations: [],
};

describe("isPackingPlacementValid", () => {
  it("true только если геометрия, опора и полнота размещения успешны", () => {
    expect(isPackingPlacementValid(base)).toBe(true);
    expect(isPackingPlacementValid({ ...base, geometryValid: false })).toBe(false);
    expect(isPackingPlacementValid({ ...base, supportValid: false })).toBe(false);
    expect(isPackingPlacementValid({ ...base, completenessValid: false })).toBe(false);
  });

  it("deterministic не влияет на пригодность 3D-визуализации", () => {
    expect(isPackingPlacementValid({ ...base, deterministic: false })).toBe(true);
  });
});
