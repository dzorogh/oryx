import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG_NO_SITE_LABEL, activeCatalogSiteLabel, areCatalogSiteGroupRowsVisible, buildCatalogVirtualElements, mergeCatalogPageItems, catalogSiteKeysForCollapseAll, catalogTableSection, compareCatalogSiteKeys, groupCatalogItemsBySite, toggleCatalogSiteCollapsed } from "@/components/store/pim/products/catalog/catalog-site-groups";
import { CATALOG_NO_SITE_KEY, type StoreCatalogItem } from "@/features/store/domain/catalog-item";

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
    assert.equal(groups[0]?.totalCount, 2);
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

  it("uses full group totals when they exceed loaded rows", () => {
    const groups = groupCatalogItemsBySite([item("a", "PLT-2"), item("b", "PLT-2")], {
      "PLT-2": 5,
      "PLT-10": 1,
    });

    assert.deepEqual(
      groups.map((group) => ({ key: group.siteKey, loaded: group.items.length, total: group.totalCount })),
      [{ key: "PLT-2", loaded: 2, total: 5 }],
    );
    assert.ok((groups[0]?.totalCount ?? 0) > (groups[0]?.items.length ?? 0));
  });
});

describe("buildCatalogVirtualElements", () => {
  it("emits header then rows for two sites", () => {
    const groups = groupCatalogItemsBySite([
      item("a", "PLT-2"),
      item("b", "PLT-2"),
      item("c", "PLT-10"),
    ]);
    const elements = buildCatalogVirtualElements(groups, new Set());

    assert.deepEqual(
      elements.map((element) =>
        element.kind === "header"
          ? { kind: element.kind, siteKey: element.siteKey, totalCount: element.totalCount }
          : { kind: element.kind, id: element.item.id, siteKey: element.siteKey },
      ),
      [
        { kind: "header", siteKey: "PLT-2", totalCount: 2 },
        { kind: "row", id: "a", siteKey: "PLT-2" },
        { kind: "row", id: "b", siteKey: "PLT-2" },
        { kind: "header", siteKey: "PLT-10", totalCount: 1 },
        { kind: "row", id: "c", siteKey: "PLT-10" },
      ],
    );
  });

  it("keeps only the header for a collapsed group", () => {
    const groups = groupCatalogItemsBySite([
      item("a", "PLT-2"),
      item("b", "PLT-2"),
      item("c", "PLT-10"),
    ]);
    const elements = buildCatalogVirtualElements(groups, new Set(["PLT-2"]));

    assert.deepEqual(
      elements.map((element) => (element.kind === "header" ? element.siteKey : element.item.id)),
      ["PLT-2", "PLT-10", "c"],
    );
  });

  it("keeps the full filter total on the header when only some rows are loaded", () => {
    const groups = groupCatalogItemsBySite([item("a", "PLT-2")], { "PLT-2": 5 });
    const [header] = buildCatalogVirtualElements(groups, new Set());
    assert.equal(header?.kind, "header");
    if (header?.kind === "header") {
      assert.equal(header.totalCount, 5);
    }
  });

  it("returns an empty list when there are no groups", () => {
    assert.deepEqual(buildCatalogVirtualElements([], new Set()), []);
  });
});

describe("mergeCatalogPageItems", () => {
  it("appends the next page and keeps current rows when the request fails", () => {
    assert.deepEqual(mergeCatalogPageItems(["a", "b"], { ok: true, items: ["c"] }), ["a", "b", "c"]);
    assert.deepEqual(mergeCatalogPageItems(["a", "b"], { ok: false }), ["a", "b"]);
  });
});

describe("activeCatalogSiteLabel", () => {
  it("tracks the last header at or above the top index", () => {
    const groups = groupCatalogItemsBySite([
      item("a", "PLT-2"),
      item("b", "PLT-2"),
      item("c", "PLT-10"),
    ]);
    const elements = buildCatalogVirtualElements(groups, new Set());

    assert.equal(activeCatalogSiteLabel(elements, 0), "PLT-2");
    assert.equal(activeCatalogSiteLabel(elements, 2), "PLT-2");
    assert.equal(activeCatalogSiteLabel(elements, 3), "PLT-10");
    assert.equal(activeCatalogSiteLabel(elements, -1), null);
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
