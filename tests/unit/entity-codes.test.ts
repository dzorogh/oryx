import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EDITABLE_ENTITY_CODE_FIELDS,
  ENTITY_CODES,
  ENTITY_CODE_FIELDS,
  entityCodePrefixesFromRows,
  formatEntityCode,
  mergeEntityCodePrefixes,
  normalizeEntityCodePrefix,
  parseEntityCodeId,
  storedEntityCode,
} from "@/lib/entity-codes";

describe("entity-codes — реестр и форматирование", () => {
  it("дефолты: customer_order/plant/product без overrides", () => {
    const prefixes = mergeEntityCodePrefixes();
    assert.equal(formatEntityCode("customer_order", 12, prefixes), "OMS-12");
    assert.equal(formatEntityCode("plant", 6, prefixes), "PLT-6");
    assert.equal(formatEntityCode("product", 12, prefixes), "PRD-12");
  });

  it("overrides: plant и customer_order", () => {
    const prefixes = mergeEntityCodePrefixes({ plant: "ZAV", customer_order: "DFL" });
    assert.equal(formatEntityCode("plant", 6, prefixes), "ZAV-6");
    assert.equal(formatEntityCode("customer_order", 2, prefixes), "DFL-2");
  });

  it("мусорные префиксы игнорируются", () => {
    const prefixes = mergeEntityCodePrefixes({ product: "---", warehouse: "" });
    assert.equal(formatEntityCode("product", 12, prefixes), "PRD-12");
    assert.equal(formatEntityCode("warehouse", 7, prefixes), "WH-7");
  });

  it("фиксированный region: override не действует; stored code важнее", () => {
    const prefixes = mergeEntityCodePrefixes({ region: "XXX" });
    assert.equal(prefixes.region, "REG");
    assert.equal(formatEntityCode("region", 1, prefixes), "REG-1");
    assert.equal(storedEntityCode("region", "ae", 1, prefixes), "ae");
    assert.equal(storedEntityCode("region", "   ", 1, prefixes), "REG-1");
  });

  it("неизвестный ключ в overrides игнорируется", () => {
    const prefixes = mergeEntityCodePrefixes({ brand: "BRD", plant: "ZAV" });
    assert.equal(formatEntityCode("plant", 6, prefixes), "ZAV-6");
    assert.equal((prefixes as Record<string, string>).brand, undefined);
  });

  it("строки БД → префиксы: известные overrides, fixed и unknown игнорируются", () => {
    const prefixes = entityCodePrefixesFromRows([
      { entity: "warehouse", number_prefix: "SKL" },
      { entity: "region", number_prefix: "XXX" },
      { entity: "unknown_kind", number_prefix: "ZZ" },
    ]);
    assert.equal(prefixes.warehouse, "SKL");
    assert.equal(prefixes.region, "REG");
    assert.equal((prefixes as Record<string, string>).unknown_kind, undefined);
    assert.equal(mergeEntityCodePrefixes({ region: "XXX" }).region, "REG");
  });

  it("редактируемые поля = нефиксированные записи реестра", () => {
    const editable = new Set(EDITABLE_ENTITY_CODE_FIELDS.map((field) => field.entity));
    for (const field of ENTITY_CODE_FIELDS) {
      const isFixed = Boolean((ENTITY_CODES[field.entity] as { fixed?: boolean }).fixed);
      assert.equal(editable.has(field.entity), !isFixed);
    }
    assert.ok(!editable.has("region"));
    assert.ok(!editable.has("stock_transaction"));
    assert.ok(editable.has("plant"));
    assert.ok(editable.has("customer_order"));
  });

  it("normalize: латиница/цифры, верхний регистр, 1–8", () => {
    assert.equal(normalizeEntityCodePrefix("art"), "ART");
    assert.equal(normalizeEntityCodePrefix("ARTарт-"), "ART");
    assert.equal(normalizeEntityCodePrefix("арт-"), "");
    assert.equal(normalizeEntityCodePrefix("ABCDEFGHI"), "ABCDEFGH");
  });

  it("parse: обратный разбор кода со своим префиксом", () => {
    const prefixes = mergeEntityCodePrefixes({ plant: "ZAV", product: "ART" });
    assert.equal(parseEntityCodeId("plant", formatEntityCode("plant", 6, prefixes), prefixes), 6);
    assert.equal(parseEntityCodeId("product", "art-12", prefixes), 12);
    assert.equal(parseEntityCodeId("product", " 12 ", prefixes), 12);
  });

  it("parse: дефолтный префикс принимается, чужой — нет", () => {
    const prefixes = mergeEntityCodePrefixes({ plant: "ZAV" });
    assert.equal(parseEntityCodeId("plant", "PLT-6", prefixes), 6);
    assert.equal(parseEntityCodeId("plant", "WH-6", prefixes), null);
    assert.equal(parseEntityCodeId("plant", "ZAV-", prefixes), null);
    assert.equal(parseEntityCodeId("plant", "Силовой", prefixes), null);
  });
});
