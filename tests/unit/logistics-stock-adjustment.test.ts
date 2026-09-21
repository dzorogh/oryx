import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADJUSTMENT_CANCEL_FORBIDDEN,
  ADJUSTMENT_DUPLICATE_PRODUCT,
  ADJUSTMENT_EXPLANATION_REQUIRED,
  ADJUSTMENT_LINES_REQUIRED,
  ADJUSTMENT_NOT_ENOUGH_FREE,
  ADJUSTMENT_QUANTITY_POSITIVE,
  ADJUSTMENT_WAREHOUSE_REQUIRED,
  assertAdjustmentCanBeCancelled,
  assertAdjustmentExplanation,
  adjustmentSignedQuantity,
  buildAdjustmentFacts,
  freeWarehouseQuantity,
} from "@/features/logistics/logistics-adjustments";
import { hrefForDocument } from "@/features/logistics/logistics-availability";
import { formatLogisticsCode, mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import { documentLabel } from "@/features/logistics/logistics-lookups";
import { assertDocumentCanBeCancelled } from "@/features/logistics/logistics-rules";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";

const freeBalance = (productId: string, warehouseId: string, quantity: number): StockBalance => ({
  productId,
  locationType: "warehouse",
  locationId: warehouseId,
  assignedToType: null,
  assignedToId: null,
  stockState: "free",
  ownerType: null,
  ownerId: null,
  quantity,
});

const reservedBalance = (productId: string, warehouseId: string, quantity: number): StockBalance => ({
  productId,
  locationType: "warehouse",
  locationId: warehouseId,
  assignedToType: "order",
  assignedToId: "12",
  stockState: "reserved",
  ownerType: "order",
  ownerId: "12",
  quantity,
});

const throws = (fn: () => unknown, message: string) => {
  assert.throws(fn, (error: unknown) => error instanceof Error && error.message === message);
};

describe("корректировки остатков", () => {
  it("уменьшает доступный свободный остаток отрицательным фактом и кодом ADJ", () => {
    const balances = [freeBalance("7", "3", 10)];
    const facts = buildAdjustmentFacts(
      {
        operation: "write_off",
        warehouseId: "3",
        explanation: "Лишний выпуск OUT-4",
        lines: [{ productId: "7", quantity: 4 }],
      },
      balances,
    );

    assert.deepEqual(facts, [
      {
        productId: "7",
        quantity: -4,
        locationType: "warehouse",
        locationId: "3",
        assignedToType: null,
        assignedToId: null,
        documentType: "adjustment",
      },
    ]);
    assert.equal(formatLogisticsCode("adjustment", 9, mergeLogisticsCodePrefixes()), "ADJ-9");
    assert.equal(freeWarehouseQuantity(balances, "7", "3"), 10);
  });

  it("увеличивает остаток положительным фактом при обязательном объяснении", () => {
    const facts = buildAdjustmentFacts(
      {
        operation: "increase",
        warehouseId: "3",
        explanation: "  Нашли неучтённый ящик  ",
        lines: [{ productId: "7", quantity: 2 }],
      },
      [],
    );

    assert.equal(facts[0]?.quantity, 2);
    assert.equal(adjustmentSignedQuantity("decrease", 5), -5);
    assert.equal(adjustmentSignedQuantity("increase", 5), 5);
  });

  it("отклоняет пустое или пробельное объяснение и не строит факты", () => {
    throws(() => assertAdjustmentExplanation(""), ADJUSTMENT_EXPLANATION_REQUIRED);
    throws(() => assertAdjustmentExplanation("   "), ADJUSTMENT_EXPLANATION_REQUIRED);
    throws(
      () =>
        buildAdjustmentFacts(
          {
            operation: "increase",
            warehouseId: "3",
            explanation: " \n\t ",
            lines: [{ productId: "7", quantity: 1 }],
          },
          [],
        ),
      ADJUSTMENT_EXPLANATION_REQUIRED,
    );
  });

  it("проводит несколько строк атомарно и откатывает весь документ при ошибке любой строки", () => {
    const balances = [freeBalance("7", "3", 5), freeBalance("8", "3", 1)];

    throws(
      () =>
        buildAdjustmentFacts(
          {
            operation: "decrease",
            warehouseId: "3",
            explanation: "Инвентаризация двух SKU",
            lines: [
              { productId: "7", quantity: 2 },
              { productId: "8", quantity: 4 },
            ],
          },
          balances,
        ),
      ADJUSTMENT_NOT_ENOUGH_FREE,
    );

    const facts = buildAdjustmentFacts(
      {
        operation: "decrease",
        warehouseId: "3",
        explanation: "Инвентаризация двух SKU",
        lines: [
          { productId: "7", quantity: 2 },
          { productId: "8", quantity: 1 },
        ],
      },
      balances,
    );
    assert.deepEqual(
      facts.map((item) => item.quantity),
      [-2, -1],
    );
    assert.deepEqual(new Set(facts.map((item) => item.documentType)), new Set(["adjustment"]));
  });

  it("не берёт резерв и не допускает ноль, дубли и пустые строки", () => {
    const balances = [reservedBalance("7", "3", 20)];
    throws(
      () =>
        buildAdjustmentFacts(
          {
            operation: "write_off",
            warehouseId: "3",
            explanation: "Пытаемся списать резерв",
            lines: [{ productId: "7", quantity: 1 }],
          },
          balances,
        ),
      ADJUSTMENT_NOT_ENOUGH_FREE,
    );
    throws(() => adjustmentSignedQuantity("increase", 0), ADJUSTMENT_QUANTITY_POSITIVE);
    throws(() => adjustmentSignedQuantity("increase", -3), ADJUSTMENT_QUANTITY_POSITIVE);
    throws(
      () =>
        buildAdjustmentFacts(
          {
            operation: "increase",
            warehouseId: "",
            explanation: "Без склада",
            lines: [{ productId: "7", quantity: 1 }],
          },
          [],
        ),
      ADJUSTMENT_WAREHOUSE_REQUIRED,
    );
    throws(
      () =>
        buildAdjustmentFacts(
          {
            operation: "increase",
            warehouseId: "3",
            explanation: "Без строк",
            lines: [],
          },
          [],
        ),
      ADJUSTMENT_LINES_REQUIRED,
    );
    throws(
      () =>
        buildAdjustmentFacts(
          {
            operation: "increase",
            warehouseId: "3",
            explanation: "Дубль",
            lines: [
              { productId: "7", quantity: 1 },
              { productId: "7", quantity: 2 },
            ],
          },
          [],
        ),
      ADJUSTMENT_DUPLICATE_PRODUCT,
    );
  });

  it("объясняет неизменяемость и не предлагает удалить факты", () => {
    throws(() => assertAdjustmentCanBeCancelled("posted"), ADJUSTMENT_CANCEL_FORBIDDEN);
    throws(() => assertDocumentCanBeCancelled("adjustment", "posted"), ADJUSTMENT_CANCEL_FORBIDDEN);
    throws(() => assertDocumentCanBeCancelled("adjustment", "draft"), ADJUSTMENT_CANCEL_FORBIDDEN);
  });

  it("в журнале открывает корректировку по коду ADJ из снимка", () => {
    assert.equal(hrefForDocument("adjustment", "9"), "/store/logistics/adjustments/9");
    const snapshot = {
      adjustments: [
        {
          id: "9",
          number: "ADJ-9",
          operation: "write_off",
          warehouseId: "3",
          explanation: "Лишний выпуск",
          sourceDocumentType: null,
          sourceDocumentId: null,
          status: "posted",
          createdAt: "2026-09-21T00:00:00.000Z",
          createdBy: "1",
        },
      ],
    } as LogisticsSnapshot;
    assert.equal(documentLabel(snapshot, "adjustment", "9"), "ADJ-9");
  });
});
