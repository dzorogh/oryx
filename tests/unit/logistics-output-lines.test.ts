import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCreateProductionOutputRpcArgs } from "@/features/logistics/logistics-api";
import { assertProductionOutputLines } from "@/features/logistics/logistics-rules";
import {
  draftOutputHoldsForOrderProduct,
  freeInDraftOutput,
  productionProductOutputs,
  remainingPlanForProductionProduct,
  remainingToReserveInProductionOutputsForLine,
  reservedInActiveOutputsForOrderProduct,
} from "@/features/logistics/logistics-availability";
import { lineLocationAllocations } from "@/features/logistics/allocation-atlas";
import type { CustomerOrderLine, LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";

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
  it("maps lines to product_variant_id and keeps allocation_quantity for split", () => {
    const args = buildCreateProductionOutputRpcArgs({
      orderId: "42",
      expectedEndOn: "2026-09-22",
      complete: true,
      lines: [
        {
          productId: "7",
          quantity: 10,
          allocation: { ownerType: "order", ownerId: "12", quantity: 4 },
        },
        { productId: "8", quantity: 1 },
      ],
    });
    assert.equal(args.p_production_order_id, 42);
    assert.equal(args.p_complete, true);
    assert.equal(args.p_expected_end_on, "2026-09-22");
    const lines = args.p_lines as Array<{
      product_variant_id: number;
      quantity: number;
      allocation_owner_id: number | null;
      allocation_quantity: number;
    }>;
    assert.equal(lines.length, 2);
    assert.equal(lines[0].product_variant_id, 7);
    assert.equal(lines[0].quantity, 10);
    assert.equal(lines[0].allocation_owner_id, 12);
    assert.equal(lines[0].allocation_quantity, 4);
    assert.equal(lines[1].allocation_quantity, 0);
    assert.equal(lines[1].allocation_owner_id, null);
  });
});

const snapshot = (overrides: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  ({
    reservations: [],
    reservationLines: [],
    outputs: [],
    outputLines: [],
    productionOrders: [],
    customerOrders: [],
    shipments: [],
    transfers: [],
    adjustments: [],
    ...overrides,
  }) as LogisticsSnapshot;

describe("резерв в активных выпусках", () => {
  const view = snapshot({
    outputs: [
      {
        id: "out-draft",
        series: "OUT",
        sequenceNumber: "1",
        number: "OUT-1",
        productionOrderId: "po-1",
        status: "draft",
        createdAt: "2026-09-22T00:00:00Z",
        createdBy: "1",
        expectedEndOn: null,
      },
      {
        id: "out-done",
        series: "OUT",
        sequenceNumber: "2",
        number: "OUT-2",
        productionOrderId: "po-1",
        status: "done",
        createdAt: "2026-09-22T01:00:00Z",
        createdBy: "1",
        expectedEndOn: null,
      },
    ],
    outputLines: [
      {
        id: "ol-owned",
        outputId: "out-draft",
        productionOrderLineId: "",
        productId: "7",
        quantity: 4,
        productName: "A",
        productUnit: "шт",
        toOwnerType: "order",
        toOwnerId: "12",
      },
      {
        id: "ol-free",
        outputId: "out-draft",
        productionOrderLineId: "",
        productId: "7",
        quantity: 2,
        productName: "A",
        productUnit: "шт",
        toOwnerType: null,
        toOwnerId: null,
      },
      {
        id: "ol-done",
        outputId: "out-done",
        productionOrderLineId: "",
        productId: "7",
        quantity: 3,
        productName: "A",
        productUnit: "шт",
        toOwnerType: "order",
        toOwnerId: "12",
      },
    ],
  });

  it("считает занятое только в активных выпусках", () => {
    assert.equal(reservedInActiveOutputsForOrderProduct(view, "12", "7"), 4);
  });

  it("свободно в черновике — строки без владельца", () => {
    assert.equal(freeInDraftOutput(view, "out-draft", "7"), 2);
  });

  it("резерв для снятия — только черновики выпусков, по одному на выпуск", () => {
    assert.deepEqual(draftOutputHoldsForOrderProduct(view, "12", "7"), [
      { outputId: "out-draft", outputNumber: "OUT-1", quantity: 4 },
    ]);
    assert.deepEqual(draftOutputHoldsForOrderProduct(view, "13", "7"), []);
  });

  it("разбивка товара заказа на производство по выпускам", () => {
    const result = productionProductOutputs(view, "po-1", "7");
    assert.equal(result.inOutputs, 6);
    assert.equal(result.outputted, 3);
    assert.deepEqual(
      result.rows.map((row) => ({
        id: row.output.id,
        quantity: row.quantity,
        free: row.free,
        reserved: row.reserved.map((item) => `${item.ownerType}:${item.ownerId}:${item.quantity}`),
      })),
      [
        { id: "out-draft", quantity: 6, free: 2, reserved: ["order:12:4"] },
        { id: "out-done", quantity: 3, free: 0, reserved: ["order:12:3"] },
      ],
    );
    assert.deepEqual(productionProductOutputs(view, "po-1", "8").rows, []);
  });

  it("остаток плана = план − неотменённые выпуски", () => {
    assert.equal(remainingPlanForProductionProduct(view, "po-1", "7", 10), 1);
  });

  it("отменённый выпуск не занимает план", () => {
    const withCancelled = snapshot({
      ...view,
      outputs: [
        ...view.outputs,
        {
          id: "out-cancelled",
          series: "OUT",
          sequenceNumber: "3",
          number: "OUT-3",
          productionOrderId: "po-1",
          status: "cancelled",
          createdAt: "2026-09-22T02:00:00Z",
          createdBy: "1",
          expectedEndOn: null,
        },
      ],
      outputLines: [
        ...view.outputLines,
        {
          id: "ol-cancelled",
          outputId: "out-cancelled",
          productionOrderLineId: "",
          productId: "7",
          quantity: 5,
          productName: "A",
          productUnit: "шт",
          toOwnerType: "order",
          toOwnerId: "12",
        },
      ],
    });
    assert.equal(remainingPlanForProductionProduct(withCancelled, "po-1", "7", 10), 1);
  });

  it("завершённый выпуск с владельцем не входит в занятое активных", () => {
    assert.equal(reservedInActiveOutputsForOrderProduct(view, "12", "7"), 4);
  });

  it("«В производстве» в атласе берётся из активных выпусков", () => {
    const allocation = lineLocationAllocations([], { orderId: "12", productId: "7" }, view);
    assert.equal(allocation.inProduction, 4);
  });

  it("лимит формы = остаток к резерву минус занятое в активных выпусках", () => {
    const line = {
      id: "col-1",
      orderId: "12",
      productId: "7",
      quantity: 10,
    } as CustomerOrderLine;
    const balances: StockBalance[] = [];
    assert.equal(remainingToReserveInProductionOutputsForLine(line, balances, view), 6);
  });
});
