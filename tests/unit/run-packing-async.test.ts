import { describe, expect, it } from "vitest";
import { DEFAULT_ORDER_ID, getOrderPresetById } from "@/domain/packing/constants";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";
import type { PackingResult } from "@/domain/packing/types";
import { runPackingAsync } from "@/lib/run-packing-async";

const withoutTiming = (result: PackingResult) => {
  const { timing: _timing, ...rest } = result;
  return rest;
};

describe("runPackingAsync", () => {
  it("в среде без Worker возвращает тот же результат, что и generatePackingResult (кроме packingMs)", async () => {
    const order = getOrderPresetById(DEFAULT_ORDER_ID).order;
    const expected = generatePackingResult(DEFAULT_ORDER_ID, order);
    const actual = await runPackingAsync(DEFAULT_ORDER_ID, order);

    expect(withoutTiming(actual)).toEqual(withoutTiming(expected));
    expect(actual.timing.packingMs).toBeGreaterThanOrEqual(0);
    expect(expected.timing.packingMs).toBeGreaterThanOrEqual(0);
  });
});
