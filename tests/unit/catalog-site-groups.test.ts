import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOG_NO_SITE_KEY,
  CATALOG_NO_SITE_LABEL,
  areCatalogSiteGroupRowsVisible,
  catalogSiteKeysForCollapseAll,
  catalogTableSection,
  compareCatalogSiteKeys,
  groupCatalogItemsBySite,
  toggleCatalogSiteCollapsed,
} from "@/components/store/pim/products/catalog/catalog-site-groups";
import type { StoreCatalogItem } from "@/components/store/pim/products/store-catalog-demo-data";

const item = (id: string, productionSite: string): StoreCatalogItem =>
  ({
    id,
    name: id,
    code: id,
    productionSite,
  }) as StoreCatalogItem;

describe("groupCatalogItemsBySite", () => {
  it("orders plant codes numerically and keeps loader order inside a group", () => {
    const groups = groupCatalogItemsBySite([
      item("a", "PLT-10"),
      item("b", "PLT-2"),
      item("c", "PLT-2"),
    ]);

    assert.deepEqual(
      groups.map((group) => group.siteKey),
      ["PLT-2", "PLT-10"],
    );
    assert.deepEqual(
      groups[0]?.items.map((row) => row.id),
      ["b", "c"],
    );
    assert.equal(groups[0]?.label, "PLT-2");
    assert.equal(groups[0]?.items.length, 2);
  });

  it("puts empty site («—») last with «Без площадки» label", () => {
    const groups = groupCatalogItemsBySite([
      item("empty", CATALOG_NO_SITE_KEY),
      item("plant", "PLT-1"),
    ]);

    assert.deepEqual(
      groups.map((group) => ({ key: group.siteKey, label: group.label })),
      [
        { key: "PLT-1", label: "PLT-1" },
        { key: CATALOG_NO_SITE_KEY, label: CATALOG_NO_SITE_LABEL },
      ],
    );
  });

  it("returns a single group when all rows share one plant", () => {
    const groups = groupCatalogItemsBySite([item("a", "PLT-3"), item("b", "PLT-3")]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.siteKey, "PLT-3");
    assert.deepEqual(
      groups[0]?.items.map((row) => row.id),
      ["a", "b"],
    );
  });

  it("returns no groups for an empty list", () => {
    assert.deepEqual(groupCatalogItemsBySite([]), []);
    assert.equal(catalogTableSection(false, 0), "empty");
  });
});

describe("catalogTableSection", () => {
  it("shows skeletons without groups while loading", () => {
    assert.equal(catalogTableSection(true, 3), "skeletons");
  });

  it("shows groups only after loading when rows exist", () => {
    assert.equal(catalogTableSection(false, 1), "groups");
  });
});

describe("compareCatalogSiteKeys", () => {
  it("orders SH-2 before SH-10", () => {
    assert.deepEqual(["SH-10", "SH-2"].sort(compareCatalogSiteKeys), ["SH-2", "SH-10"]);
  });
});

describe("catalog site collapse helpers", () => {
  it("toggle adds then removes a key", () => {
    const collapsed = toggleCatalogSiteCollapsed(new Set(), "PLT-2");
    assert.equal(areCatalogSiteGroupRowsVisible(collapsed, "PLT-2"), false);
    assert.equal(areCatalogSiteGroupRowsVisible(collapsed, "PLT-10"), true);

    const expanded = toggleCatalogSiteCollapsed(collapsed, "PLT-2");
    assert.equal(areCatalogSiteGroupRowsVisible(expanded, "PLT-2"), true);
  });

  it("collapse-all keys cover every group; rows hidden only for those keys", () => {
    const groups = groupCatalogItemsBySite([
      item("a", "PLT-10"),
      item("b", "PLT-2"),
    ]);
    const keys = catalogSiteKeysForCollapseAll(groups);
    assert.deepEqual(keys, ["PLT-2", "PLT-10"]);

    const collapsed = new Set(keys);
    assert.equal(areCatalogSiteGroupRowsVisible(collapsed, "PLT-2"), false);
    assert.equal(areCatalogSiteGroupRowsVisible(collapsed, "PLT-10"), false);
    assert.equal(areCatalogSiteGroupRowsVisible(new Set(), "PLT-2"), true);
  });
});
