import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DOCUMENT_KINDS,
  FREE_OWNER_ID,
  LIFECYCLE_STATUSES,
  OWNER_KINDS,
  LOCATION_KINDS,
  derivedStockState,
  documentNumber,
  ownerKindToType,
  shipmentDirection,
} from "@/features/logistics/logistics-types";
import { adjustmentSignedQuantity } from "@/features/logistics/logistics-adjustments";
import {
  CATALOG_CODE_TO_PREFIX_FIELD,
  formatLogisticsCode,
  mergeLogisticsCodePrefixes,
  normalizeLogisticsCodePrefix,
  regionCatalogCode,
} from "@/features/logistics/logistics-codes";
import {
  buildPriceCellId,
  buildStatusCellId,
} from "@/components/store/pim/pricelists/pricelists-helpers";

describe("чистая модель Store — инварианты контракта", () => {
  it("lifecycle vocabulary единый; operational kinds включают production_output", () => {
    assert.deepEqual([...LIFECYCLE_STATUSES], ["draft", "in_progress", "done", "cancelled"]);
    assert.ok(DOCUMENT_KINDS.includes("production_output"));
    assert.deepEqual([...OWNER_KINDS], ["free", "customer_order", "region"]);
    assert.deepEqual([...LOCATION_KINDS], [
      "warehouse",
      "production_order",
      "transfer",
      "customer_order",
      "production_output",
    ]);
  });

  it("номер документа берёт префикс kind, не внутренний id", () => {
    assert.equal(documentNumber("OMS", "901"), "OMS-901");
    assert.equal(formatLogisticsCode("plant", 6, mergeLogisticsCodePrefixes()), "PLT-6");
    assert.equal(formatLogisticsCode("productionOutput", 3, mergeLogisticsCodePrefixes()), "OUT-3");
  });

  it("префиксы завода, товара и склада настраиваются, регион остаётся REG", () => {
    const defaults = mergeLogisticsCodePrefixes();
    assert.equal(formatLogisticsCode("product", 12, defaults), "PRD-12");
    assert.equal(formatLogisticsCode("warehouse", 7, defaults), "WH-7");

    const custom = mergeLogisticsCodePrefixes({
      plant: "ZAV",
      product: "ART",
      warehouse: "SKL",
      region: "AREA",
      customerOrder: "DFL",
      productionOrder: "PL",
    });
    assert.equal(formatLogisticsCode("plant", 6, custom), "ZAV-6");
    assert.equal(formatLogisticsCode("product", 12, custom), "ART-12");
    assert.equal(formatLogisticsCode("warehouse", 7, custom), "SKL-7");
    assert.equal(formatLogisticsCode("region", 3, custom), "REG-3");
    assert.equal(CATALOG_CODE_TO_PREFIX_FIELD.product, "product");
    assert.equal(CATALOG_CODE_TO_PREFIX_FIELD.warehouse, "warehouse");
    assert.equal(regionCatalogCode("ae", 3, custom), "ae");
    assert.equal(regionCatalogCode("", 3, custom), "REG-3");
    assert.equal(regionCatalogCode("   ", 3, custom), "REG-3");
    assert.equal(regionCatalogCode(null, 3, custom), "REG-3");
    assert.equal(formatLogisticsCode("customerOrder", 2, custom), "DFL-2");
    assert.equal(formatLogisticsCode("productionOrder", "1.6", custom), "PL-1.6");

    const missing = mergeLogisticsCodePrefixes({ plant: "ZAV" });
    assert.equal(formatLogisticsCode("product", 12, missing), "PRD-12");
    assert.equal(formatLogisticsCode("warehouse", 7, missing), "WH-7");

    const empty = mergeLogisticsCodePrefixes({ product: "", warehouse: "---", region: "XXX" });
    assert.equal(formatLogisticsCode("product", 12, empty), "PRD-12");
    assert.equal(formatLogisticsCode("warehouse", 7, empty), "WH-7");
    assert.equal(formatLogisticsCode("region", 1, empty), "REG-1");

    assert.equal(normalizeLogisticsCodePrefix("ART"), "ART");
    assert.equal(normalizeLogisticsCodePrefix("ARTарт-"), "ART");
    assert.equal(normalizeLogisticsCodePrefix("арт-"), "");
  });

  it("свободный owner — singleton id=1, projection free→null pair", () => {
    assert.equal(FREE_OWNER_ID, "1");
    assert.equal(ownerKindToType("free"), null);
    assert.equal(ownerKindToType("customer_order"), "order");
    assert.equal(ownerKindToType("region"), "region");
  });

  it("корректировка использует знаковую quantity", () => {
    assert.equal(adjustmentSignedQuantity("increase", 4), 4);
    assert.equal(adjustmentSignedQuantity("decrease", 4), -4);
    assert.equal(adjustmentSignedQuantity("write_off", 4), -4);
  });

  it("направление отгрузки выводится из kinds мест", () => {
    assert.equal(shipmentDirection("warehouse", "customer_order"), "shipment");
    assert.equal(shipmentDirection("customer_order", "warehouse"), "return");
  });

  it("остаток free/reserved/shipped выводится из location+owner", () => {
    assert.equal(derivedStockState("warehouse", "free"), "free");
    assert.equal(derivedStockState("warehouse", "customer_order"), "reserved");
    assert.equal(derivedStockState("customer_order", "customer_order"), "shipped");
  });

  it("ячейки прайслиста ключуют purchase глобально, dealer/retail по региону", () => {
    assert.equal(buildPriceCellId(null, "7", "purchase"), "global:7:purchase");
    assert.equal(buildPriceCellId("ae", "7", "dealer"), "ae:7:dealer");
    assert.equal(buildStatusCellId("ae", "7"), "ae:7:dealerStatus");
  });
});
