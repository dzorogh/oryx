import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORDER_ID,
  ORDER_PRESETS,
  getOrderPresetById,
} from "@/domain/packing/constants";
import { expandOrder } from "@/domain/packing/expand-order";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";
import { validatePackingResultSchema } from "@/domain/packing/schema-validation";

describe("generatePackingResult (клиентский расчёт)", () => {
  it.each(ORDER_PRESETS)(
    "orderId $orderId: валидная схема и инварианты",
    (preset) => {
      const parsed = generatePackingResult(preset.orderId);
      validatePackingResultSchema(parsed);

      expect(parsed.validation.geometryValid).toBe(true);
      expect(parsed.validation.supportValid).toBe(true);
      expect(parsed.validation.completenessValid).toBe(true);
      expect(parsed.validation.deterministic).toBe(true);

      const expectedUnits = expandOrder(preset.order).length;
      expect(parsed.summary.totalUnits).toBe(expectedUnits);
      expect(parsed.summary.placedUnits + parsed.summary.unplacedUnits).toBe(expectedUnits);
    },
    120_000,
  );

  it("без явного orderId — заказ по умолчанию", () => {
    const parsed = generatePackingResult();
    const expectedUnits = expandOrder(getOrderPresetById(DEFAULT_ORDER_ID).order).length;
    expect(parsed.summary.totalUnits).toBe(expectedUnits);
  });

  it("orderOverride — пересчёт по переданному составу заказа", () => {
    const preset = getOrderPresetById(DEFAULT_ORDER_ID);
    const modified = preset.order.map((item, index) =>
      index === 0 ? { ...item, quantity: item.quantity + 2 } : item,
    );
    const fromPreset = generatePackingResult(preset.orderId);
    const fromOverride = generatePackingResult(preset.orderId, modified);
    expect(fromOverride.summary.totalUnits).toBe(expandOrder(modified).length);
    expect(fromOverride.summary.totalUnits).toBe(fromPreset.summary.totalUnits + 2);
  });
});
