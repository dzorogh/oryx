import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCatalogItemForRegion } from "@/components/store/pim/products/catalog/catalog-region";
import type { StoreCatalogItem } from "@/features/store/domain/catalog-item";
import { resolveSelectedVariant } from "@/features/store/product-card/variant-selection";
import { resolveSelectedRegionCode } from "@/features/store/region-selection";
import { hrefForStoreProduct, redirectLegacyLogisticsPath } from "@/features/logistics/logistics-paths";

const item = (overrides: Partial<StoreCatalogItem> = {}): StoreCatalogItem => ({
  id: "4",
  productId: "4",
  name: "Cruiser 300 FJ",
  code: "PRD-4",
  imageSrc: "",
  imageAlt: "",
  categoryId: "atv-4x2",
  category: "4x2",
  family: "Cruiser",
  brand: "Oryx",
  stock: 0,
  updatedAt: "2026-09-01T00:00:00.000Z",
  dealerPrice: null,
  retailPrice: null,
  dealerStatus: "unavailable",
  retailStatus: "draft",
  productionSite: "SH-4",
  regionPrices: {
    kz: {
      dealer: { amount: 75521, currency: "CNY" },
      retail: { amount: 6524272, currency: "KZT" },
    },
    ae: { dealer: null, retail: null },
  },
  regionStatuses: { kz: { dealer: "available", retail: "banned" } },
  ...overrides,
});

describe("resolveCatalogItemForRegion", () => {
  it("без региона цен нет, валюты нет", () => {
    const resolved = resolveCatalogItemForRegion(item(), null);
    assert.equal(resolved.dealerPrice, null);
    assert.equal(resolved.retailPrice, null);
    assert.equal(resolved.dealerCurrency, null);
    assert.equal(resolved.retailCurrency, null);
  });

  it("выбранный регион даёт его цены, валюту каждой цены и статусы", () => {
    const resolved = resolveCatalogItemForRegion(item(), "kz");
    assert.equal(resolved.dealerPrice, 75521);
    assert.equal(resolved.dealerCurrency, "CNY");
    assert.equal(resolved.retailPrice, 6524272);
    assert.equal(resolved.retailCurrency, "KZT");
    assert.equal(resolved.dealerStatus, "available");
    assert.equal(resolved.retailStatus, "banned");
  });

  it("нет цены в регионе — «—», цена не выдумывается", () => {
    for (const code of ["ae", "de"]) {
      const resolved = resolveCatalogItemForRegion(item(), code);
      assert.equal(resolved.dealerPrice, null);
      assert.equal(resolved.retailPrice, null);
    }
  });
});

describe("resolveSelectedRegionCode", () => {
  const valid = new Set(["ae", "kz"]);

  it("пустое хранилище — регион не выбран", () => {
    assert.equal(resolveSelectedRegionCode(null, valid, false), null);
  });

  it("сохранённый несуществующий код считается «не выбран» после загрузки регионов", () => {
    assert.equal(resolveSelectedRegionCode("xx", valid, false), null);
    assert.equal(resolveSelectedRegionCode("xx", valid, true), "xx");
  });

  it("существующий код выбран", () => {
    assert.equal(resolveSelectedRegionCode("kz", valid, false), "kz");
  });
});

describe("resolveSelectedVariant", () => {
  const variants = [
    { id: "2", deletedAt: null },
    { id: "213", deletedAt: null },
    { id: "214", deletedAt: "2026-09-28T12:30:00Z" },
  ];

  it("неизвестный ?variant= — первый активный вариант", () => {
    assert.equal(resolveSelectedVariant(variants, "999")?.id, "2");
    assert.equal(resolveSelectedVariant(variants, null)?.id, "2");
  });

  it("?variant= архивного варианта открывает его", () => {
    assert.equal(resolveSelectedVariant(variants, "214")?.id, "214");
  });

  it("один вариант — он и выбран", () => {
    assert.equal(resolveSelectedVariant([{ id: "7", deletedAt: null }], "7")?.id, "7");
    assert.equal(resolveSelectedVariant([{ id: "7", deletedAt: null }], null)?.id, "7");
  });

  it("только архивные — первый из них", () => {
    assert.equal(resolveSelectedVariant([{ id: "9", deletedAt: "x" }], null)?.id, "9");
  });
});

describe("hrefForStoreProduct / redirectLegacyLogisticsPath", () => {
  it("hrefForStoreProduct ведёт на маршрут варианта", () => {
    assert.equal(hrefForStoreProduct("213"), "/store/pim/variants/213");
  });

  it("legacy /logistics/products/:id редиректит на маршрут варианта", () => {
    assert.equal(redirectLegacyLogisticsPath(["products", "213"]), "/store/pim/variants/213");
  });
});
