import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addCartPack,
  normalizeCartQuantity,
  normalizeCartToPacks,
  parseCartLines,
  upsertCartLine,
} from "@/features/store/cart/cart-store";
import {
  applySupplyCost,
  buildCheckoutLayout,
  buildCheckoutOrderLines,
  splitHubAvailability,
  submitCheckoutBlocks,
  sumCheckoutTotals,
  type CheckoutCartItem,
} from "@/features/store/cart/checkout-model";

const item = (overrides: Partial<CheckoutCartItem> & Pick<CheckoutCartItem, "variantId">): CheckoutCartItem => ({
  name: `Товар ${overrides.variantId}`,
  imageUrl: null,
  plantId: "3",
  plantCode: "PLT-3",
  quantity: 10,
  quantityPerUnit: 1,
  dealerPrice: 100,
  dealerCurrency: "CNY",
  dealerStatus: "available",
  supplyCostPercent: 10,
  hubReady: 12,
  ...overrides,
});

describe("cart quantity", () => {
  it("rounds up to quantity_per_unit and removes at ≤0", () => {
    assert.equal(normalizeCartQuantity(1, 4), 4);
    assert.equal(normalizeCartQuantity(5, 4), 8);
    assert.equal(normalizeCartQuantity(0, 4), 0);
    assert.equal(normalizeCartQuantity(-2, 4), 0);
  });

  it("adds one pack and upserts", () => {
    const lines = addCartPack([], "1", 2);
    assert.deepEqual(lines, [{ variantId: "1", quantity: 2 }]);
    assert.deepEqual(addCartPack(lines, "1", 2), [{ variantId: "1", quantity: 4 }]);
    assert.deepEqual(upsertCartLine(lines, "1", 0, 2), []);
  });

  it("parses cart JSON safely", () => {
    assert.deepEqual(parseCartLines([{ variantId: "9", quantity: 3 }]), [
      { variantId: "9", quantity: 3 },
    ]);
    assert.deepEqual(parseCartLines("nope"), []);
  });
});

describe("checkout model", () => {
  it("applies Supply costs only when provided", () => {
    assert.deepEqual(applySupplyCost(100, 10), {
      unitPrice: 110,
      percent: 10,
      supplyAmount: 10,
    });
    assert.deepEqual(applySupplyCost(100, null), {
      unitPrice: 100,
      percent: 0,
      supplyAmount: 0,
    });
  });

  it("splits hub availability into from-stock / on-order", () => {
    assert.deepEqual(splitHubAvailability(20, 12), { fromStock: 12, onOrder: 8 });
    assert.deepEqual(splitHubAvailability(5, 12), { fromStock: 5, onOrder: 0 });
  });

  it("blocks unavailable / missing price lines into remainder", () => {
    const layout = buildCheckoutLayout({
      mode: "hub",
      items: [
        item({ variantId: "1" }),
        item({ variantId: "2", dealerPrice: null }),
        item({ variantId: "3", dealerStatus: "unavailable" }),
      ],
      includedVariantIds: new Set(["1", "2", "3"]),
      hasRegion: true,
      hubWarehouseId: "44",
      hubCode: "WH-44",
    });
    assert.equal(layout.blocks[0].lines.length, 1);
    assert.equal(layout.blocks[0].lines[0].pricing?.unitPrice, 110);
    assert.equal(layout.remainder.length, 2);
  });

  it("marks hub mode unavailable without hub", () => {
    const layout = buildCheckoutLayout({
      mode: "hub",
      items: [item({ variantId: "1" })],
      includedVariantIds: new Set(["1"]),
      hasRegion: true,
      hubWarehouseId: null,
      hubCode: null,
    });
    assert.equal(layout.hubAvailable, false);
    assert.equal(layout.blocks.length, 0);
  });

  it("splits plant mode by plant and leaves items without plant", () => {
    const layout = buildCheckoutLayout({
      mode: "plant",
      items: [
        item({ variantId: "1", plantId: "3", plantCode: "PLT-3" }),
        item({ variantId: "2", plantId: "7", plantCode: "PLT-7" }),
        item({ variantId: "3", plantId: null, plantCode: null }),
      ],
      includedVariantIds: new Set(["1", "2", "3"]),
      hasRegion: true,
      hubWarehouseId: "44",
      hubCode: "WH-44",
    });
    assert.equal(layout.blocks.length, 2);
    assert.ok(layout.blocks.every((block) => block.lines[0].pricing?.supplyCostPercent === 0));
    assert.equal(layout.remainder.length, 1);
    assert.match(layout.remainder[0].reason, /площадка/i);
  });

  it("moves unchecked lines to remainder", () => {
    const layout = buildCheckoutLayout({
      mode: "hub",
      items: [item({ variantId: "1" }), item({ variantId: "2" })],
      includedVariantIds: new Set(["1"]),
      hasRegion: true,
      hubWarehouseId: "44",
      hubCode: "WH-44",
    });
    assert.equal(layout.blocks[0].lines.length, 1);
    assert.equal(layout.remainder[0].variantId, "2");
  });

  it("sums totals per currency and converts to order currency", () => {
    const layout = buildCheckoutLayout({
      mode: "plant",
      items: [
        item({ variantId: "1", dealerPrice: 100, dealerCurrency: "CNY", quantity: 2 }),
        item({
          variantId: "2",
          dealerPrice: 50,
          dealerCurrency: "USD",
          quantity: 1,
          plantId: "7",
          plantCode: "PLT-7",
        }),
      ],
      includedVariantIds: new Set(["1", "2"]),
      hasRegion: true,
      hubWarehouseId: "44",
      hubCode: "WH-44",
    });
    const totals = sumCheckoutTotals(layout.blocks, "USD", { USD: 1, CNY: 7 });
    assert.equal(totals.byCurrency.length, 2);
    assert.ok(totals.orderCurrencyTotal != null);
    // 200 CNY / 7 + 50 USD
    assert.ok(Math.abs((totals.orderCurrencyTotal ?? 0) - (200 / 7 + 50)) < 0.01);
  });

  it("charges Supply costs on the whole quantity including on-order and totals them per currency", () => {
    const layout = buildCheckoutLayout({
      mode: "hub",
      items: [item({ variantId: "1", quantity: 20, hubReady: 12, dealerPrice: 100, supplyCostPercent: 10 })],
      includedVariantIds: new Set(["1"]),
      hasRegion: true,
      hubWarehouseId: "44",
      hubCode: "WH-44",
    });
    const line = layout.blocks[0].lines[0];
    assert.equal(line.pricing?.fromStock, 12);
    assert.equal(line.pricing?.onOrder, 8);
    assert.equal(line.pricing?.lineTotal, 2200);
    assert.deepEqual(layout.blocks[0].supplyCostTotals, [{ currency: "CNY", total: 200 }]);
  });

  it("has no Supply costs total when the pair has no value", () => {
    const layout = buildCheckoutLayout({
      mode: "hub",
      items: [item({ variantId: "1", supplyCostPercent: null })],
      includedVariantIds: new Set(["1"]),
      hasRegion: true,
      hubWarehouseId: "44",
      hubCode: "WH-44",
    });
    assert.equal(layout.blocks[0].lines[0].pricing?.supplyCostPercent, 0);
    assert.deepEqual(layout.blocks[0].supplyCostTotals, []);
  });

  it("keeps submitting the remaining blocks when one fails", async () => {
    const layout = buildCheckoutLayout({
      mode: "plant",
      items: [
        item({ variantId: "1", plantId: "3", plantCode: "PLT-3" }),
        item({ variantId: "2", plantId: "5", plantCode: "PLT-5" }),
        item({ variantId: "3", plantId: "7", plantCode: "PLT-7" }),
      ],
      includedVariantIds: new Set(["1", "2", "3"]),
      hasRegion: true,
      hubWarehouseId: "44",
      hubCode: "WH-44",
    });
    const outcomes = await submitCheckoutBlocks(layout.blocks, async (block) => {
      if (block.sourceId === "5") throw new Error("Товар не выпускается выбранной площадкой");
      return `order-${block.sourceId}`;
    });
    assert.deepEqual(
      outcomes.map((outcome) => (outcome.ok ? outcome.value : `error:${outcome.message}`)),
      ["order-3", "error:Товар не выпускается выбранной площадкой", "order-7"],
    );
  });
});

describe("checkout order payload and totals", () => {
  const hubLayout = (items: CheckoutCartItem[], included = items.map((i) => i.variantId)) =>
    buildCheckoutLayout({
      mode: "hub",
      items,
      includedVariantIds: new Set(included),
      hasRegion: true,
      hubWarehouseId: "44",
      hubCode: "WH-44",
    });

  it("sends only checked lines at the price with Supply costs, rounded to cents", () => {
    const layout = hubLayout(
      [item({ variantId: "1", dealerPrice: 100, supplyCostPercent: 7.333, quantity: 3 }), item({ variantId: "2" })],
      ["1"],
    );
    assert.deepEqual(buildCheckoutOrderLines(layout.blocks[0]), [
      { productVariantId: "1", quantity: 3, unitPrice: 107.33 },
    ]);
  });

  it("has no order-currency total without rates or when a currency has no rate", () => {
    const layout = hubLayout([
      item({ variantId: "1", dealerCurrency: "CNY" }),
      item({ variantId: "2", dealerCurrency: "EUR" }),
    ]);
    assert.equal(sumCheckoutTotals(layout.blocks, "KZT", null).orderCurrencyTotal, null);
    assert.equal(sumCheckoutTotals(layout.blocks, "KZT", { USD: 1, CNY: 7, KZT: 450 }).orderCurrencyTotal, null);
  });
});

describe("cart storage", () => {
  it("drops lines whose stored quantity rounds down to zero", () => {
    assert.deepEqual(parseCartLines([{ variantId: "1", quantity: 0.5 }, { variantId: "2", quantity: 2.7 }]), [
      { variantId: "2", quantity: 2 },
    ]);
  });

  it("rounds lines up to the pack size once it is known and keeps the array when nothing changes", () => {
    const lines = [
      { variantId: "1", quantity: 1 },
      { variantId: "2", quantity: 4 },
    ];
    const packs = (id: string) => (id === "1" ? 6 : 2);
    assert.deepEqual(normalizeCartToPacks(lines, packs), [
      { variantId: "1", quantity: 6 },
      { variantId: "2", quantity: 4 },
    ]);
    const already = [{ variantId: "2", quantity: 4 }];
    assert.equal(normalizeCartToPacks(already, packs), already);
  });
});

describe("cart line order", () => {
  it("keeps the line position when quantity changes", () => {
    const lines = [
      { variantId: "1", quantity: 1 },
      { variantId: "2", quantity: 1 },
    ];
    assert.deepEqual(
      upsertCartLine(lines, "1", 5, 1).map((line) => line.variantId),
      ["1", "2"],
    );
  });
});
