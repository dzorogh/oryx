import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCreateProductionOutputRpcArgs } from "@/features/logistics/logistics-api";
import { assertProductionOutputLines } from "@/features/logistics/logistics-rules";

describe("assertProductionOutputLines", () => {
  it("rejects an empty array", () => {
    assert.throws(
      () => assertProductionOutputLines([]),
      /Выберите товар и положительное количество/,
    );
  });

  it("rejects duplicate product ids", () => {
    assert.throws(
      () =>
        assertProductionOutputLines([
          { productId: "1", quantity: 2, planQuantity: 10, alreadyOutput: 0 },
          { productId: "1", quantity: 1, planQuantity: 10, alreadyOutput: 0 },
        ]),
      /Товар не должен повторяться в выпуске/,
    );
  });

  it("rejects quantity above remaining plan", () => {
    assert.throws(
      () =>
        assertProductionOutputLines([
          { productId: "1", quantity: 6, planQuantity: 10, alreadyOutput: 5 },
        ]),
      /Нельзя выпустить больше строки заказа на производство/,
    );
  });

  it("rejects allocation above output quantity", () => {
    assert.throws(
      () =>
        assertProductionOutputLines([
          {
            productId: "1",
            quantity: 4,
            planQuantity: 10,
            alreadyOutput: 0,
            allocationQuantity: 5,
          },
        ]),
      /Занятое количество не может превышать выпуск/,
    );
  });

  it("accepts two valid products within plan", () => {
    assert.doesNotThrow(() =>
      assertProductionOutputLines([
        {
          productId: "1",
          quantity: 3,
          planQuantity: 10,
          alreadyOutput: 2,
          allocationQuantity: 1,
        },
        {
          productId: "2",
          quantity: 5,
          planQuantity: 5,
          alreadyOutput: 0,
          allocationQuantity: 0,
        },
      ]),
    );
  });
});

describe("buildCreateProductionOutputRpcArgs", () => {
  it("maps lines to product_variant_id", () => {
    const args = buildCreateProductionOutputRpcArgs({
      orderId: "42",
      expectedEndOn: "2026-09-22",
      complete: true,
      lines: [
        {
          productId: "7",
          quantity: 3,
          allocation: { ownerType: "order", ownerId: "12", quantity: 3 },
        },
        { productId: "8", quantity: 1 },
      ],
    });
    assert.equal(args.p_production_order_id, 42);
    assert.equal(args.p_complete, true);
    assert.equal(args.p_expected_end_on, "2026-09-22");
    assert.equal((args.p_lines as unknown[]).length, 2);
    assert.equal((args.p_lines as Array<{ product_variant_id: number }>)[0].product_variant_id, 7);
  });
});
