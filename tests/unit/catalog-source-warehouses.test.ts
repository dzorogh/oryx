import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import { catalogSourceWarehouseIds } from "@/features/logistics/ui/place-catalog";

const balance = (patch: Partial<StockBalance> & Pick<StockBalance, "productId" | "locationId" | "quantity">): StockBalance =>
  ({
    id: "b",
    locationType: "warehouse",
    ownerType: null,
    ownerId: null,
    stockState: "free",
    ...patch,
  }) as StockBalance;

const snapshot = {
  products: [
    { id: "p-order", name: "Заказной", code: "P1", unit: "шт", categoryIds: [], plantId: null },
    { id: "p-other", name: "Чужой", code: "P2", unit: "шт", categoryIds: [], plantId: null },
  ],
  categories: [],
  customerOrders: [{ id: "co-1", number: "CO-1" }],
  regions: [],
  warehouses: [
    { id: "wh-order", code: "WH-1" },
    { id: "wh-other-owner", code: "WH-2" },
    { id: "wh-unrelated", code: "WH-3" },
    { id: "wh-empty", code: "WH-4" },
    { id: "wh-shipped", code: "WH-5" },
  ],
} as unknown as LogisticsSnapshot;

const balances: StockBalance[] = [
  balance({ productId: "p-order", locationId: "wh-order", quantity: 2, ownerType: "order", ownerId: "co-1", stockState: "reserved" }),
  balance({ productId: "p-order", locationId: "wh-other-owner", quantity: 5, ownerType: null, ownerId: null }),
  balance({ productId: "p-other", locationId: "wh-unrelated", quantity: 8 }),
  balance({ productId: "p-order", locationId: "wh-shipped", quantity: 4, ownerType: "order", ownerId: "co-1", stockState: "shipped" }),
];

describe("склады-источники каталога", () => {
  it("для заказа оставляет склады с остатком товаров заказа и прячет чужие и отгруженные", () => {
    const hidden = catalogSourceWarehouseIds(snapshot, balances, {
      orderOwnerId: "co-1",
      orderProductIds: ["p-order"],
      showAll: false,
    });
    assert.deepEqual(hidden, ["wh-order"]);

    const shown = catalogSourceWarehouseIds(snapshot, balances, {
      orderOwnerId: "co-1",
      orderProductIds: ["p-order"],
      showAll: true,
    });
    assert.deepEqual(shown, ["wh-order", "wh-other-owner"]);
  });

  it("для свободного перемещения оставляет любой ненулевой остаток", () => {
    assert.deepEqual(catalogSourceWarehouseIds(snapshot, balances, { showAll: true }), [
      "wh-order",
      "wh-other-owner",
      "wh-unrelated",
    ]);
  });

  it("сохраняет заданный склад, даже если на нём нет подходящего остатка", () => {
    const ids = catalogSourceWarehouseIds(snapshot, balances, {
      orderOwnerId: "co-1",
      orderProductIds: ["p-order"],
      showAll: false,
      keepId: "wh-empty",
    });
    assert.deepEqual(ids, ["wh-order", "wh-empty"]);
  });
});
