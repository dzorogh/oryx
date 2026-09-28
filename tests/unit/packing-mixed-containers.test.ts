import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containerTypeFromInnerMm,
  packMixedContainers,
  type MixedContainerType,
  type MixedPackItem,
} from "@/domain/packing/mixed-containers";

const ft20: MixedContainerType = containerTypeFromInnerMm({
  code: "20ft",
  innerLengthMm: 5898,
  innerWidthMm: 2352,
  innerHeightMm: 2393,
  maxWeightKg: 28200,
});

const ft40: MixedContainerType = containerTypeFromInnerMm({
  code: "40ft",
  innerLengthMm: 12032,
  innerWidthMm: 2352,
  innerHeightMm: 2393,
  maxWeightKg: 26700,
});

const hc40: MixedContainerType = containerTypeFromInnerMm({
  code: "40HC",
  innerLengthMm: 12032,
  innerWidthMm: 2352,
  innerHeightMm: 2690,
  maxWeightKg: 30000,
});

const box = (overrides: Partial<MixedPackItem> & Pick<MixedPackItem, "id" | "quantity">): MixedPackItem => ({
  name: `Item ${overrides.id}`,
  lengthMm: 1000,
  widthMm: 500,
  heightMm: 500,
  weightKg: 50,
  quantityPerUnit: 1,
  stacking: true,
  stackingLimit: null,
  rotateLength: false,
  rotateWidth: false,
  maxPerContainer: null,
  ...overrides,
});

describe("packMixedContainers", () => {
  it("marks oversized boxes without blocking the result shape", () => {
    const result = packMixedContainers(
      [box({ id: 1, quantity: 1, lengthMm: 20000, widthMm: 3000, heightMm: 3000 })],
      [ft20, ft40, hc40],
    );
    assert.deepEqual(result.oversizedItemIds, [1]);
    assert.equal(result.containers.length, 0);
  });

  it("packs small boxes into a single container", () => {
    const result = packMixedContainers([box({ id: 1, quantity: 4 })], [ft20, ft40, hc40]);
    assert.equal(result.oversizedItemIds.length, 0);
    assert.ok(result.containers.length >= 1);
    assert.ok(result.containers.every((c) => c.fillPercent > 0));
    const placed = result.containers.reduce((n, c) => n + c.placements.length, 0);
    assert.equal(placed, 4);
  });

  it("respects stacking=false (no tiers)", () => {
    const result = packMixedContainers(
      [box({ id: 1, quantity: 2, stacking: false, heightMm: 1000 })],
      [ft20],
    );
    assert.equal(result.containers.length, 1);
    const zs = result.containers[0].placements.map((p) => p.position.z);
    assert.ok(zs.every((z) => z === 0));
  });

  it("respects stacking_limit", () => {
    const result = packMixedContainers(
      [box({ id: 1, quantity: 4, stackingLimit: 2, heightMm: 400 })],
      [ft20],
    );
    assert.ok(result.containers.length >= 1);
    for (const container of result.containers) {
      const byXy = new Map<string, number>();
      for (const p of container.placements) {
        const key = `${p.position.x}:${p.position.y}`;
        byXy.set(key, (byXy.get(key) ?? 0) + 1);
      }
      for (const count of byXy.values()) {
        assert.ok(count <= 2);
      }
    }
  });

  describe("empty volume tie-break", () => {
    // 24 cubes of 1 m³; a small container holds 20, so two smalls (40 m³, 16 m³ empty) compete with one big.
    const small: MixedContainerType = { code: "small", width: 5000, length: 2000, height: 2000, maxWeightKg: 30000 };
    const cube = box({ id: 1, quantity: 24, lengthMm: 1000, widthMm: 1000, heightMm: 1000, weightKg: 10 });

    it("takes one container when it leaves at most 2% more empty volume than two", () => {
      // 40.24 m³ → 16.24 m³ empty, 1.5% more than two smalls.
      const big: MixedContainerType = { code: "big", width: 10060, length: 2000, height: 2000, maxWeightKg: 30000 };
      const result = packMixedContainers([cube], [small, big]);
      assert.deepEqual(result.containers.map((c) => c.typeCode), ["big"]);
    });

    it("takes more containers when one leaves clearly more empty volume", () => {
      // 40.8 m³ → 16.8 m³ empty, 5% more than two smalls.
      const big: MixedContainerType = { code: "big", width: 10200, length: 2000, height: 2000, maxWeightKg: 30000 };
      const result = packMixedContainers([cube], [small, big]);
      assert.deepEqual(result.containers.map((c) => c.typeCode), ["small", "small"]);
    });
  });

  it("caps stack height by container weight so heavy stackable boxes still fit", () => {
    const result = packMixedContainers(
      [box({ id: 1, quantity: 4, heightMm: 500, weightKg: 12000 })],
      [hc40],
    );
    assert.equal(result.unplacedBoxIds.length, 0);
    for (const container of result.containers) {
      assert.ok(container.usedWeightKg <= 30000);
    }
    assert.equal(result.containers.reduce((n, c) => n + c.placements.length, 0), 4);
  });

  it("reports a box heavier than every container as not fitting", () => {
    const result = packMixedContainers([box({ id: 7, quantity: 1, weightKg: 40000 })], [ft20, hc40]);
    assert.deepEqual(result.oversizedItemIds, [7]);
    assert.equal(result.containers.length, 0);
  });

  it("picks 40HC + 20ft for ~1.15 of a 40HC instead of two 40HC or a 20ft fleet", () => {
    // 40HC: 20 stacks × 2 tiers = 40 boxes; 20ft: 8 stacks × 1 tier = 8 boxes.
    const result = packMixedContainers(
      [box({ id: 1, quantity: 46, lengthMm: 1200, widthMm: 1000, heightMm: 1300, weightKg: 100 })],
      [ft20, hc40],
    );
    const codes = result.containers.map((c) => c.typeCode).sort();
    assert.deepEqual(codes, ["20ft", "40HC"]);
    const placed = result.containers.reduce((n, c) => n + c.placements.length, 0);
    assert.equal(placed, 46);
  });

  it("uses only the type that fits when a box is too tall for another selected type", () => {
    const result = packMixedContainers(
      [box({ id: 1, quantity: 3, heightMm: 2500 })],
      [ft20, hc40],
    );
    assert.equal(result.oversizedItemIds.length, 0);
    assert.ok(result.containers.length >= 1);
    assert.ok(result.containers.every((c) => c.typeCode === "40HC"));
    assert.equal(result.containers.reduce((n, c) => n + c.placements.length, 0), 3);
  });

  it("respects container max weight", () => {
    const result = packMixedContainers(
      [box({ id: 1, quantity: 5, weightKg: 10000, stacking: false })],
      [hc40],
    );
    assert.ok(result.containers.length >= 2);
    for (const container of result.containers) {
      assert.ok(container.usedWeightKg <= 30000);
    }
    assert.equal(result.unplacedBoxIds.length, 0);
  });

  it("respects max_per_container", () => {
    const result = packMixedContainers([box({ id: 1, quantity: 10, maxPerContainer: 4 })], [hc40]);
    assert.equal(result.containers.length, 3);
    for (const container of result.containers) {
      assert.ok(container.placements.length <= 4);
    }
  });

  it("lays a box on its side only when rotate_length allows it", () => {
    const tall = { id: 1, quantity: 1, lengthMm: 1000, widthMm: 2000, heightMm: 3000 };
    const fixed = packMixedContainers([box(tall)], [hc40]);
    assert.deepEqual(fixed.oversizedItemIds, [1]);
    const rotatable = packMixedContainers([box({ ...tall, rotateLength: true })], [hc40]);
    assert.equal(rotatable.oversizedItemIds.length, 0);
    assert.equal(rotatable.containers[0].placements[0].size.height, 2000);
  });

  it("labels each container with type code and fill percent", () => {
    const result = packMixedContainers([box({ id: 2, quantity: 8 })], [ft40, hc40]);
    for (const container of result.containers) {
      assert.ok(container.typeCode);
      assert.ok(container.fillPercent > 0 && container.fillPercent <= 100);
    }
  });

  it("rounds quantity into boxes by quantity_per_unit", () => {
    const result = packMixedContainers(
      [box({ id: 3, quantity: 5, quantityPerUnit: 2 })],
      [ft20],
    );
    const placed = result.containers.reduce((n, c) => n + c.placements.length, 0);
    assert.equal(placed, 3); // ceil(5/2)
  });
});
