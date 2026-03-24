import { describe, expect, it } from "vitest";
import {
  CONTAINER_DIMENSIONS,
  DEFAULT_ORDER_ID,
  ORDER_PRESETS,
  getOrderPresetById,
} from "@/domain/packing/constants";
import { expandOrder } from "@/domain/packing/expand-order";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";
import { validatePackingResultSchema } from "@/domain/packing/schema-validation";
import { isPackingPlacementValid } from "@/domain/packing/result-validation";
import { NON_LAST_CONTAINER_EMPTY_VOLUME_THRESHOLD_PERCENT } from "@/domain/report/summarize-result";

describe("generatePackingResult (клиентский расчёт)", () => {
  it.each(ORDER_PRESETS)(
    "orderId $orderId: валидная схема и инварианты",
    (preset) => {
      const parsed = generatePackingResult(preset.orderId);
      validatePackingResultSchema(parsed);

      expect(parsed.validation.deterministic).toBe(true);
      if (isPackingPlacementValid(parsed.validation)) {
        expect(parsed.validation.geometryValid).toBe(true);
        expect(parsed.validation.supportValid).toBe(true);
        expect(parsed.validation.completenessValid).toBe(true);
      }

      const expectedUnits = expandOrder(preset.order).length;
      expect(parsed.summary.totalUnits).toBe(expectedUnits);
      expect(parsed.summary.placedUnits + parsed.summary.unplacedUnits).toBe(expectedUnits);
      expect(parsed.postCheck.nonLastContainerEmptyVolume.thresholdPercent).toBe(
        NON_LAST_CONTAINER_EMPTY_VOLUME_THRESHOLD_PERCENT,
      );
    },
    120_000,
  );

  it("orderId 192: использует не больше двух контейнеров", () => {
    const parsed = generatePackingResult(192);
    expect(parsed.usedContainerCount).toBeLessThanOrEqual(2);
  });

  it("без явного orderId — заказ по умолчанию", () => {
    const parsed = generatePackingResult();
    const expectedUnits = expandOrder(getOrderPresetById(DEFAULT_ORDER_ID).order).length;
    expect(parsed.summary.totalUnits).toBe(expectedUnits);
  });

  it("orderOverride — габариты больше контейнера попадают в violations и geometryValid=false", () => {
    const parsed = generatePackingResult(DEFAULT_ORDER_ID, [
      {
        id: 999001,
        name: "Слишком глубокий",
        width: 100,
        length: 100,
        height: CONTAINER_DIMENSIONS.height + 1,
        weight: 1,
        quantity: 1,
      },
    ]);
    expect(parsed.validation.geometryValid).toBe(false);
    expect(
      parsed.validation.violations.some((m) => m.startsWith("Габариты товара превышают контейнер")),
    ).toBe(true);
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
