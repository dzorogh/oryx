import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

const SNAPSHOT_PRODUCTS_USED_BY_901_905 = new Set([1, 17, 22, 36, 46]);

type MixedDemoLine = {
  id: number;
  productId: number;
  quantity: number;
  plant: string;
  reserve: boolean;
};

type MixedDemoOrder = {
  id: number;
  createdAt: string;
  expectedEndOn: string;
  description: string;
  lines: MixedDemoLine[];
};

type Plant = { id: number; warehouseId: number };

type MixedDemoGroup = {
  manufacturerId: number;
  warehouseId: number;
  plant: string;
  lines: MixedDemoLine[];
};

type SeedClient = {
  insert: (table: string, row: Record<string, unknown>) => Promise<void>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<void>;
};

let mixedOrder: MixedDemoOrder;
let plants: Record<string, Plant>;
let groupsOf: (lines?: MixedDemoLine[]) => MixedDemoGroup[];
let seedMixed: (client: SeedClient) => Promise<void>;
let storyLo: number;
let storyHi: number;

beforeAll(async () => {
  const specifier: string = "../../scripts/lib/seed-logistics-stories.mjs";
  const mod = (await import(specifier)) as {
    MIXED_DEMO_ORDER: MixedDemoOrder;
    mixedDemoLinesByWarehouse: (lines?: MixedDemoLine[]) => MixedDemoGroup[];
    PLANT: Record<string, Plant>;
    STORY_HI: number;
    STORY_LO: number;
    seedMixedDemoOrder: (client: SeedClient) => Promise<void>;
  };
  mixedOrder = mod.MIXED_DEMO_ORDER;
  plants = mod.PLANT;
  groupsOf = mod.mixedDemoLinesByWarehouse;
  seedMixed = mod.seedMixedDemoOrder;
  storyLo = mod.STORY_LO;
  storyHi = mod.STORY_HI;
});

describe("OMS-906 mixed demo seed", () => {
  it("defines 20 different SKUs with 18 reserved plant lines and 2 leftover free lines", () => {
    const productIds = mixedOrder.lines.map((line) => line.productId);
    const reserved = mixedOrder.lines.filter((line) => line.reserve);
    const leftover = mixedOrder.lines.filter((line) => !line.reserve);

    expect(mixedOrder.id).toBe(906);
    expect(mixedOrder.id).toBeGreaterThanOrEqual(storyLo);
    expect(mixedOrder.id).toBeLessThanOrEqual(storyHi);
    expect(mixedOrder.lines).toHaveLength(20);
    expect(new Set(productIds).size).toBe(20);
    expect(reserved).toHaveLength(18);
    expect(leftover).toHaveLength(2);
    expect(leftover.map((line) => line.id).sort((a, b) => a - b)).toEqual([913, 918]);
    expect(leftover.map((line) => line.productId).sort((a, b) => a - b)).toEqual([44, 50]);
    expect(productIds.some((id) => SNAPSHOT_PRODUCTS_USED_BY_901_905.has(id))).toBe(false);
    expect(Date.parse(mixedOrder.createdAt)).toBeGreaterThan(Date.parse("2026-09-17T07:55:55+00:00"));

    for (const line of leftover) {
      const plant = plants[line.plant];
      expect(plant, `leftover SKU ${line.productId} needs a plant warehouse`).toBeTruthy();
      expect(plant.warehouseId).toBeGreaterThan(0);
    }
  });

  it("groups output and reserve by plant warehouse, skipping RSV on leftover SKUs", async () => {
    const groups = groupsOf();
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.every((group) => group.lines.every((line) => plants[line.plant].warehouseId === group.warehouseId))).toBe(
      true,
    );

    const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
    await seedMixed({
      insert: async (table, row) => {
        inserts.push({ table, row });
      },
      rpc: async () => undefined,
    });

    const outputLineIds = inserts
      .filter((call) => call.table === "store_output_line")
      .map((call) => call.row.id);
    const reservationProductIds = inserts
      .filter((call) => call.table === "store_reservation_line")
      .map((call) => call.row.product_id);
    const leftoverOutputProducts = inserts
      .filter((call) => call.table === "store_output_line" && (call.row.id === 913 || call.row.id === 918))
      .map((call) => call.row.product_id);

    expect(outputLineIds).toEqual(expect.arrayContaining([913, 918]));
    expect(reservationProductIds).not.toContain(44);
    expect(reservationProductIds).not.toContain(50);
    expect(reservationProductIds).toHaveLength(18);
    expect(leftoverOutputProducts.sort((a, b) => Number(a) - Number(b))).toEqual([44, 50]);
  });

  it("resets story documents through 999 and counts OMS-906 in seed", () => {
    const stories = read("scripts/lib/seed-logistics-stories.mjs");
    const seed = read("scripts/seed-logistics.mjs");

    expect(stories).toContain("store_reset_logistics_stories");
    expect(stories).toContain("p_lo: STORY_LO");
    expect(stories).toContain("p_hi: STORY_HI");
    expect(stories).not.toContain("customer_order_id.lte.905");
    expect(stories).toContain("id=lte.${STORY_HI}");
    expect(stories).not.toContain("id=lte.905");
    expect(stories).toContain("seedMixedDemoOrder");
    expect(stories).toContain('toOwnerType: "region"');
    expect(stories).toContain("to_owner_type");
    expect(stories).toContain("from_owner_type");
    expect(stories).toContain("product_id");
    expect(stories).not.toMatch(/store_reservation_line[\s\S]*customer_order_line_id/);
    expect(stories).not.toMatch(/insert\("store_stock_transaction"/);
    expect(seed).toContain("story_orders=${stories.orders}");
    expect(seed).not.toMatch(/id<=905|id=lte\.905/);
  });
});
