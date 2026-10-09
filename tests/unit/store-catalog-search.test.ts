import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapLogisticsProductToCatalogItem,
  sanitizeCatalogSearch,
} from "@/features/store/store-catalog-from-logistics";

describe("catalog item mapping", () => {
  it("takes the brand from store_brand and has no invented update date", () => {
    const row = { id: 7, product_id: 2, name: "Cross 180 RX", product: { brand: { name: "Sharmax" } } };
    const item = mapLogisticsProductToCatalogItem(row, "PLT-1", null, null);
    assert.equal(item.brand, "Sharmax");
    assert.equal(item.updatedAt, null);
    const noBrand = mapLogisticsProductToCatalogItem({ ...row, product: { brand: null } }, "PLT-1", null, null);
    assert.equal(noBrand.brand, null);
  });
});

describe("catalog search", () => {
  it("drops PostgREST delimiters and LIKE wildcards", () => {
    assert.equal(sanitizeCatalogSearch('a*b"c\\d:e'), "abcde");
    assert.equal(sanitizeCatalogSearch("50%_off (new), v1.2"), "50off new v12");
  });

  it("keeps letters, digits, spaces and dashes", () => {
    assert.equal(sanitizeCatalogSearch("Cross 180 RX · Зелёный PRD-12"), "Cross 180 RX · Зелёный PRD-12");
  });
});
