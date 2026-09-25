import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leafCategoryIds, pluralPozicii, pluralTovar, type CategoryRef } from "@/features/logistics/category-tree";
import { quantityUnitLabel } from "@/features/logistics/logistics-labels";
import { freeTransferPayload } from "@/features/logistics/transfer-direct-send";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import { parseDecimalQuantity, priceIssue, quantityIssue, firstErrorKey, productsNotMadeByPlant, sourceDropBanner, categoryStartsOpen } from "@/features/logistics/ui/catalog-quantity-model";
import { catalogProductsFromPlace, parseOwnerQuantityKey, placeOwnersByProduct } from "@/features/logistics/ui/place-catalog";

const balance = (patch: Partial<StockBalance> & Pick<StockBalance, "productId" | "quantity">): StockBalance =>
  ({
    id: "b",
    locationType: "warehouse",
    locationId: "w1",
    ownerType: null,
    ownerId: null,
    stockState: "free",
    ...patch,
  }) as StockBalance;

const snapshot = {
  products: [
    { id: "p1", name: "A", code: "A", unit: "pcs", categoryIds: [], plantId: null },
  ],
  categories: [],
  customerOrders: [{ id: "1042", number: "CO-1042" }],
  regions: [{ id: "3", code: "R3" }],
} as unknown as LogisticsSnapshot;

describe("диалоги store: ограничения ввода", () => {
  it("каталог места оставляет владельца заказа и показывает всех при showAll", () => {
    const owners = placeOwnersByProduct(
      [
        balance({ productId: "p1", quantity: 4, ownerType: null, ownerId: null }),
        balance({ productId: "p1", quantity: 2, ownerType: "order", ownerId: "1042", stockState: "reserved" }),
        balance({ productId: "p1", quantity: 1, ownerType: "region", ownerId: "3", stockState: "reserved" }),
        balance({ productId: "p1", quantity: 9, stockState: "shipped" }),
      ],
      "warehouse",
      "w1",
    );
    assert.equal(owners.get("p1")?.length, 3);
    const hidden = catalogProductsFromPlace(snapshot, owners, { orderOwnerId: "1042", showAll: false });
    assert.deepEqual(
      hidden[0]?.owners.map((owner) => owner.kind),
      ["order"],
    );
    const all = catalogProductsFromPlace(snapshot, owners, { orderOwnerId: "1042", showAll: true });
    assert.equal(all[0]?.owners.length, 3);
  });

  it("ключ владельца разбирается обратно", () => {
    const key = "p1:order:1042";
    assert.deepEqual(parseOwnerQuantityKey(key), { productId: "p1", ownerType: "order", ownerId: "1042" });
    assert.deepEqual(parseOwnerQuantityKey("p1:free:"), { productId: "p1", ownerType: null, ownerId: null });
  });

  it("ввод 30 при остатке 18 помечается «максимум 18»", () => {
    const issue = quantityIssue("30", 18, "hard");
    assert.equal(issue?.kind, "error");
    assert.equal(issue?.message, "максимум 18");
    assert.equal(firstErrorKey([{ key: "row", raw: "30", limit: 18, mode: "hard" }]), "row");
  });

  it("отрицательное и нечисловое количество — ошибка, режим ± принимает минус", () => {
    assert.equal(parseDecimalQuantity("-2"), null);
    assert.equal(parseDecimalQuantity("3.333"), null);
    assert.equal(parseDecimalQuantity("-2", true), -2);
    assert.equal(quantityIssue("-1", 5, "hard")?.message, "Не меньше 0");
    assert.equal(quantityIssue("1.234", 5, "hard")?.message, "Введите число");
    assert.equal(quantityIssue("-1", null, "none"), null);
    assert.equal(priceIssue("-3")?.message, "Не меньше 0");
    assert.equal(priceIssue(""), null);
  });

  it("свободное перемещение сохраняет владельца строки", () => {
    const payload = freeTransferPayload({
      fromWarehouseId: "1",
      toWarehouseId: "2",
      lines: [{ productId: "p", quantity: 1, ownerType: "order", ownerId: "9" }],
    });
    assert.equal(payload.lines[0]?.ownerType, "order");
    assert.equal(payload.lines[0]?.ownerId, "9");
  });

  it("заказ с хаба сверх остатка — нейтральная пометка, не ошибка", () => {
    const issue = quantityIssue("4", 2, "soft");
    assert.equal(issue?.kind, "note");
    assert.equal(issue?.message, "сверх остатка 2");
    assert.equal(firstErrorKey([{ key: "row", raw: "4", limit: 2, mode: "soft" }]), null);
  });

  it("смена завода перечисляет товары, которые он не выпускает", () => {
    const dropped = productsNotMadeByPlant(
      ["1", "2"],
      new Map([
        ["1", "9"],
        ["2", "4"],
      ]),
      "4",
    );
    assert.deepEqual(dropped, ["1"]);
    assert.equal(sourceDropBanner(dropped.length, "PLT-4"), `${pluralTovar(1)} PLT-4 не выпускает — будут убраны`);
  });

  it("товар виден один раз в самой глубокой категории", () => {
    const categories: CategoryRef[] = [
      { id: "2", parentId: null, name: "ATV" },
      { id: "10", parentId: "2", name: "4×4" },
    ];
    assert.deepEqual(leafCategoryIds(["2", "10"], categories), ["10"]);
    assert.deepEqual(leafCategoryIds(["2"], categories), ["2"]);
  });

  it("пустой каталог раскрыт, а категория со значением остаётся открытой", () => {
    assert.equal(categoryStartsOpen(false, false, { anyEntered: false, searching: false }), true);
    assert.equal(categoryStartsOpen(true, false, { anyEntered: true, searching: false }), true);
    assert.equal(categoryStartsOpen(false, false, { anyEntered: true, searching: false }), false);
  });

  it("единица pcs показывается как шт, итог категории — в позициях", () => {
    assert.equal(quantityUnitLabel("pcs"), "шт");
    assert.equal(pluralPozicii(0), "0 позиций");
    assert.equal(pluralPozicii(2), "2 позиции");
  });
});
