import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogCategoryCodesForFilter,
  catalogTreeIdForCategoryCodes,
} from "@/features/store/category-tree";

describe("catalog category code map", () => {
  it("maps a leaf and a parent to store category codes", () => {
    assert.deepEqual(catalogCategoryCodesForFilter("atv-4x4"), ["pim-37"]);
    const parent = catalogCategoryCodesForFilter("atv");
    assert.ok(parent.includes("pim-37"));
    assert.ok(parent.includes("pim-25"));
  });

  it("returns no codes for all and for an unknown id", () => {
    assert.deepEqual(catalogCategoryCodesForFilter("all"), []);
    assert.deepEqual(catalogCategoryCodesForFilter("missing-leaf"), []);
  });

  it("maps a database code back to the tree leaf", () => {
    assert.equal(catalogTreeIdForCategoryCodes(["pim-37"]), "atv-4x4");
    assert.equal(catalogTreeIdForCategoryCodes(["nope"]), null);
  });
});
