import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCategoryTree, groupByBaseProduct, type CategoryProduct, type CategoryRef } from "@/features/logistics/category-tree";
import { buildStockProductTree, type StockProductMatrixRow } from "@/features/logistics/stock-product-matrix";

const categories: CategoryRef[] = [
  { id: "2", parentId: null, name: "ATV" },
  { id: "10", parentId: "2", name: "4x4" },
  { id: "3", parentId: null, name: "Off Road" },
  { id: "4", parentId: null, name: "Пустая" },
];

const products: CategoryProduct[] = [
  { id: "1", name: "Force", categoryIds: ["2", "10"] },
  { id: "2", name: "Cross", categoryIds: ["3"] },
  { id: "3", name: "Ямаха", categoryIds: ["2"] },
  { id: "99", name: "Без группы", categoryIds: [] },
];

describe("остатки: группировка по категориям", () => {
  it("keeps only branches that still have filtered products", () => {
    const { roots, uncategorized } = buildCategoryTree(categories, products, new Set(["1", "2"]));
    assert.deepEqual(
      roots.map((root) => root.id),
      ["2", "3"],
    );
    assert.equal(roots[0]?.children[0]?.id, "10");
    assert.equal(uncategorized.length, 0);
    assert.equal(roots.some((root) => root.id === "4"), false);
  });

  it("puts products without categories after the tree", () => {
    const { roots, uncategorized } = buildCategoryTree(categories, products, new Set(products.map((product) => product.id)));
    assert.equal(roots.at(-1)?.id, "3");
    assert.deepEqual(
      uncategorized.map((product) => product.id),
      ["99"],
    );
  });

  it("returns no groups when the filter leaves no rows", () => {
    const { roots, uncategorized } = buildCategoryTree(categories, products, new Set());
    assert.deepEqual(roots, []);
    assert.deepEqual(uncategorized, []);
  });

  it("orders products inside a group by the caller comparator", () => {
    const order = new Map([
      ["3", 0],
      ["1", 1],
    ]);
    const { roots } = buildCategoryTree(
      categories,
      products,
      new Set(["1", "3"]),
      (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
    );
    assert.deepEqual(
      roots[0]?.products.map((product) => product.id),
      ["3", "1"],
    );
  });
});

const stockRow = (productId: string): StockProductMatrixRow => ({
  productId,
  owner: { free: 1, regionReserve: 0, orderReserve: 0 },
  location: { warehouses: 1, production: 0, transfers: 0 },
});

describe("buildStockProductTree", () => {
  const snapshot = {
    categories,
    products: [
      { id: "1", productId: "1", productName: "Zebra", code: "PRD-1", name: "Zebra", unit: "шт", plantId: null, categoryIds: ["2", "10"] },
      { id: "3", productId: "3", productName: "Alpha", code: "PRD-3", name: "Alpha", unit: "шт", plantId: null, categoryIds: ["2"] },
    ],
  };

  it("keeps incoming row order inside a group instead of sorting by name", () => {
    const { roots } = buildStockProductTree(snapshot, [stockRow("1"), stockRow("3")]);
    assert.deepEqual(
      roots[0]?.products.map((product) => product.id),
      ["1", "3"],
    );
  });

  it("reads categoryIds from the matching snapshot product", () => {
    const { roots } = buildStockProductTree(snapshot, [stockRow("1")]);
    const child = roots[0]?.children.find((node) => node.id === "10");
    assert.deepEqual(child?.products.map((product) => product.categoryIds), [["2", "10"]]);
  });

  it("puts a row missing from snapshot.products into uncategorized", () => {
    const { uncategorized } = buildStockProductTree(snapshot, [stockRow("404")]);
    assert.deepEqual(
      uncategorized.map((product) => product.id),
      ["404"],
    );
    assert.deepEqual(uncategorized[0]?.categoryIds, []);
  });
});

describe("groupByBaseProduct", () => {
  const variant = (id: string, baseId: string) => ({ id, baseId, baseName: `Base ${baseId}` });
  const baseOf = (item: ReturnType<typeof variant>) => ({ id: item.baseId, name: item.baseName });

  it("groups variants of one base product and keeps a lone variant as a plain row", () => {
    const entries = groupByBaseProduct("cat", [variant("9", "9"), variant("4", "4"), variant("226", "9")], baseOf);
    assert.deepEqual(
      entries.map((entry) =>
        entry.kind === "item" ? entry.item.id : `${entry.group.id}=${entry.group.items.map((item) => item.id).join(",")}`,
      ),
      ["cat:base:9=9,226", "4"],
    );
  });

  it("names the group after the base product", () => {
    const [entry] = groupByBaseProduct("cat", [variant("1", "7"), variant("2", "7")], baseOf);
    assert.equal(entry?.kind === "group" ? entry.group.name : null, "Base 7");
  });

  it("reads the base product from the snapshot in the stock tree", () => {
    const { roots } = buildStockProductTree(
      {
        categories,
        products: [
          { id: "9", productId: "9", productName: "Cruiser", code: "PRD-9", name: "Cruiser", unit: "шт", plantId: null, categoryIds: ["3"] },
          { id: "226", productId: "9", productName: "Cruiser", code: "PRD-226", name: "Cruiser · Чёрный", unit: "шт", plantId: null, categoryIds: ["3"] },
        ],
      },
      [stockRow("9"), stockRow("226"), stockRow("404")],
    );
    assert.deepEqual(
      roots[0]?.products.map((product) => [product.id, product.baseProductId, product.baseProductName]),
      [
        ["9", "9", "Cruiser"],
        ["226", "9", "Cruiser"],
      ],
    );
  });
});
