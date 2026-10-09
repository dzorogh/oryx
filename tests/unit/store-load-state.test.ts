import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOG_SCOPE_STORAGE_KEY,
  readStoredCatalogScope,
  writeStoredCatalogScope,
} from "@/features/store/catalog-scope-storage";
import {
  buildCatalogQueryFilters,
  resolveCatalogFirstPage,
  resolveCatalogLoadMore,
} from "@/features/store/load-state";

const filters = {
  search: "cruiser",
  category: "atv",
  family: "fam-1",
  site: "PLT-2",
  dealerStatus: "available",
  retailStatus: "draft",
  allValue: "all",
};

describe("buildCatalogQueryFilters", () => {
  it("без региона не отправляет статусы дилера и розницы", () => {
    const query = buildCatalogQueryFilters({ ...filters, regionCode: null });
    assert.equal(query.regionCode, null);
    assert.equal(query.category, "atv");
    assert.equal(query.familyId, "fam-1");
    assert.equal(query.site, "PLT-2");
    assert.equal(query.search, "cruiser");
    assert.equal("dealerStatus" in query, false);
    assert.equal("retailStatus" in query, false);
  });

  it("с регионом передаёт только выбранные статусы", () => {
    const query = buildCatalogQueryFilters({
      ...filters,
      regionCode: "kz",
      retailStatus: "all",
    });
    assert.equal(query.regionCode, "kz");
    assert.equal(query.dealerStatus, "available");
    assert.equal("retailStatus" in query, false);
  });

  it("значение «все» не попадает в запрос", () => {
    const query = buildCatalogQueryFilters({
      ...filters,
      regionCode: "ae",
      category: "all",
      family: "all",
      site: "all",
      dealerStatus: "all",
      retailStatus: "all",
    });
    assert.deepEqual(query, { search: "cruiser", regionCode: "ae" });
  });
});

describe("resolveCatalogFirstPage", () => {
  it("null — бэкенд не настроен", () => {
    assert.deepEqual(resolveCatalogFirstPage(null), { status: "unconfigured" });
  });

  it("страница остаётся как есть", () => {
    const page = { items: [{ id: "1" }], hasMore: true };
    assert.deepEqual(resolveCatalogFirstPage(page), { status: "ready", page });
  });
});

describe("resolveCatalogLoadMore", () => {
  it("ошибка страницы оставляет догрузку доступной", () => {
    assert.deepEqual(resolveCatalogLoadMore(null), { ok: false, hasMore: true });
  });

  it("пустая страница заканчивает список", () => {
    const page = { items: [], hasMore: true, groupTotals: {} };
    assert.deepEqual(resolveCatalogLoadMore(page), { ok: true, hasMore: false, page });
  });

  it("непустая страница дописывается с флагом сервера", () => {
    const page = { items: ["a"], hasMore: false };
    assert.deepEqual(resolveCatalogLoadMore(page), { ok: true, hasMore: false, page });
  });
});

describe("catalog scope storage", () => {
  it("ключ области каталога прежний", () => {
    assert.equal(CATALOG_SCOPE_STORAGE_KEY, "store-catalog-scope");
  });

  it("читает сохранённую область и игнорирует мусор", () => {
    assert.equal(
      readStoredCatalogScope(() => ({ getItem: () => "parts" })),
      "parts",
    );
    assert.equal(readStoredCatalogScope(() => ({ getItem: () => "nope" })), null);
    assert.equal(readStoredCatalogScope(() => null), null);
    assert.equal(readStoredCatalogScope(() => ({})), null);
  });

  it("сбой getItem или доступа к storage не бросает исключение", () => {
    assert.equal(
      readStoredCatalogScope(() => {
        throw new Error("denied");
      }),
      null,
    );
    assert.equal(
      readStoredCatalogScope(() => ({
        getItem: () => {
          throw new Error("quota");
        },
      })),
      null,
    );
  });

  it("пишет область и глотает сбой setItem", () => {
    const calls: Array<[string, string]> = [];
    writeStoredCatalogScope(
      () => ({
        setItem: (key, value) => {
          calls.push([key, value]);
        },
      }),
      "accessories",
    );
    assert.deepEqual(calls, [["store-catalog-scope", "accessories"]]);

    assert.doesNotThrow(() => {
      writeStoredCatalogScope(() => {
        throw new Error("denied");
      }, "equipment");
    });
    assert.doesNotThrow(() => {
      writeStoredCatalogScope(
        () => ({
          setItem: () => {
            throw new Error("quota");
          },
        }),
        "equipment",
      );
    });
    assert.doesNotThrow(() => {
      writeStoredCatalogScope(() => ({}), "parts");
    });
  });
});
