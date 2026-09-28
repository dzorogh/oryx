import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeVariantRegionStock,
  type VariantStockFact,
  type VariantStockRegion,
} from "@/features/store/variant-stock";

const region = (overrides: Partial<VariantStockRegion> = {}): VariantStockRegion => ({
  id: "3",
  code: "kz",
  hubWarehouseId: "44",
  ...overrides,
});

const fact = (
  warehouseId: string,
  bucket: VariantStockFact["bucket"],
  quantity: number,
  regionId: string | null = null,
): VariantStockFact => ({
  variantId: "1",
  warehouseId,
  bucket,
  regionId,
  quantity,
});

describe("computeVariantRegionStock", () => {
  it("без хаба: Готово null, строки без хаба, missingHub", () => {
    const result = computeVariantRegionStock(
      [fact("2", "free", 5), fact("2", "production", 3)],
      "1",
      region({ hubWarehouseId: null }),
    );
    assert.equal(result.ready, null);
    assert.equal(result.missingHub, true);
    assert.equal(result.rows.some((row) => row.isHub), false);
    assert.equal(result.total, 8);
  });

  it("резерв другого региона не входит в Готово, но входит в Всего", () => {
    const result = computeVariantRegionStock(
      [
        fact("44", "free", 10),
        fact("44", "region", 4, "3"),
        fact("44", "region", 7, "2"),
        fact("44", "order", 2),
      ],
      "1",
      region(),
    );
    assert.equal(result.ready, 14);
    assert.equal(result.total, 23);
    assert.equal(result.rows[0]?.regionReserve, 4);
    assert.equal(result.rows[0]?.reserveTotal, 13);
  });

  it("путь и производство входят в Всего и детализацию", () => {
    const result = computeVariantRegionStock(
      [
        fact("44", "free", 1),
        fact("5", "production", 6),
        fact("44", "transit", 3),
      ],
      "1",
      region(),
    );
    assert.equal(result.ready, 1);
    assert.equal(result.total, 10);
    assert.equal(result.rows.find((row) => row.warehouseId === "5")?.production, 6);
    assert.equal(result.rows[0]?.transit, 3);
  });

  it("чужой хаб с ненулевым остатком показывается после хаба региона", () => {
    const result = computeVariantRegionStock(
      [fact("44", "free", 2), fact("1", "free", 9)],
      "1",
      region(),
    );
    assert.deepEqual(
      result.rows.map((row) => row.warehouseId),
      ["44", "1"],
    );
    assert.equal(result.rows[0]?.isHub, true);
    assert.equal(result.rows[1]?.isHub, false);
  });

  it("нулевые чужие склады скрыты; хаб региона всегда первой строкой", () => {
    const result = computeVariantRegionStock(
      [fact("44", "free", 0), fact("99", "free", 0), fact("5", "free", 1e-12)],
      "1",
      region(),
    );
    assert.deepEqual(
      result.rows.map((row) => row.warehouseId),
      ["44"],
    );
    assert.equal(result.ready, 0);
    assert.equal(result.total, 0);
  });

  it("сумма Свободно + Резерв всего + В производстве + В пути равна Всего", () => {
    const result = computeVariantRegionStock(
      [
        fact("44", "free", 5),
        fact("44", "region", 2, "3"),
        fact("44", "order", 1),
        fact("5", "free", 3),
        fact("5", "production", 4),
        fact("1", "transit", 6),
      ],
      "1",
      region(),
    );
    const detailSum = result.rows.reduce(
      (sum, row) => sum + row.free + row.reserveTotal + row.production + row.transit,
      0,
    );
    assert.equal(detailSum, result.total);
    assert.equal(result.total, 21);
  });
});
