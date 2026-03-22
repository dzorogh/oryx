/**
 * @vitest-environment node
 */
// @ts-nocheck

import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/packing/route";
import {
  DEFAULT_ORDER_ID,
  ORDER_PRESETS,
  getOrderPresetById,
} from "@/domain/packing/constants";
import { expandOrder } from "@/domain/packing/expand-order";
import { validatePackingResultSchema } from "@/domain/packing/schema-validation";

describe("GET /api/packing", () => {
  it.each(ORDER_PRESETS)(
    "orderId $orderId: 200, схема и инварианты",
    async (preset) => {
      const request = new Request(
        `http://127.0.0.1/api/packing?orderId=${String(preset.orderId)}`,
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json: unknown = await response.json();
      const parsed = validatePackingResultSchema(json);

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

  it("без orderId использует заказ по умолчанию", async () => {
    const request = new Request("http://127.0.0.1/api/packing");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json: unknown = await response.json();
    const parsed = validatePackingResultSchema(json);
    const expectedUnits = expandOrder(getOrderPresetById(DEFAULT_ORDER_ID).order).length;
    expect(parsed.summary.totalUnits).toBe(expectedUnits);
  });
});
