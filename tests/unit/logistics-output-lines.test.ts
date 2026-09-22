// @ts-nocheck
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCreateProductionOutputRpcArgs } from "@/features/logistics/logistics-api";
import { assertProductionOutputLines } from "@/features/logistics/logistics-rules";
import { buildCompleteOutputRpcArgs } from "../../scripts/lib/seed-logistics-stories.mjs";

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
  it("maps one allocated line and one free line into p_lines", () => {
    const args = buildCreateProductionOutputRpcArgs({
      requestKey: "key-1",
      orderId: "42",
      expectedEndOn: "2026-09-22",
      complete: true,
      lines: [
        {
          productId: "8",
          quantity: 10,
          allocation: { ownerType: "order", ownerId: "5", quantity: 4 },
        },
        { productId: "9", quantity: 2 },
      ],
    });
    assert.deepEqual(args.p_lines, [
      {
        product_id: 8,
        quantity: 10,
        allocation_owner_type: "order",
        allocation_owner_id: 5,
        allocation_quantity: 4,
      },
      {
        product_id: 9,
        quantity: 2,
        allocation_owner_type: null,
        allocation_owner_id: null,
        allocation_quantity: null,
      },
    ]);
  });
});

describe("buildCompleteOutputRpcArgs", () => {
  it("builds one p_lines row from productId and both rows from lines", () => {
    assert.deepEqual(
      buildCompleteOutputRpcArgs({
        id: 901,
        productionOrderId: 901,
        productId: 8,
        quantity: 2,
        expectedEndOn: "2026-09-16",
      }).p_lines,
      [{ product_id: 8, quantity: 2 }],
    );
    assert.deepEqual(
      buildCompleteOutputRpcArgs({
        id: 910,
        productionOrderId: 910,
        productId: 8,
        quantity: 2,
        lines: [
          { productId: 8, quantity: 2 },
          { productId: 9, quantity: 1 },
        ],
        expectedEndOn: "2026-09-16",
      }).p_lines,
      [
        { product_id: 8, quantity: 2 },
        { product_id: 9, quantity: 1 },
      ],
    );
  });
});
