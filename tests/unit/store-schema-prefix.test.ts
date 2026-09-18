import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { catalogProductionSite } from "@/features/store/store-catalog-from-logistics";
import { manufacturerIdsForProducts, manufacturerSelectItems } from "@/features/logistics/logistics-lookups";
import type { LogisticsProduct, LogisticsSetting, LogisticsSnapshot } from "@/features/logistics/logistics-types";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

const STORE_RELATIONS = [
  "store_product",
  "store_manufacturer",
  "store_warehouse",
  "store_setting",
  "store_customer_order",
  "store_customer_order_line",
  "store_production_order",
  "store_production_order_line",
  "store_reservation",
  "store_reservation_line",
  "store_transfer",
  "store_transfer_line",
  "store_transfer_allocation",
  "store_shipment",
  "store_shipment_line",
  "store_output",
  "store_output_line",
  "store_output_allocation",
  "store_return",
  "store_return_line",
  "store_stock_transaction",
  "store_stock_balance",
];

describe("store schema prefix contract", () => {
  it("points live PostgREST and RPC clients at store_* names", () => {
    const api = read("src/features/logistics/logistics-api.ts");
    const catalog = read("src/features/store/store-catalog-from-logistics.ts");
    const seed = read("scripts/seed-logistics.mjs");
    const stories = read("scripts/lib/seed-logistics-stories.mjs");
    const pages = [
      read("src/features/logistics/customer-orders-page.tsx"),
      read("src/features/logistics/transfers-page.tsx"),
      read("src/features/logistics/production-orders-page.tsx"),
      read("src/features/logistics/flow-documents-pages.tsx"),
    ].join("\n");

    for (const source of [api, catalog, seed, stories, pages]) {
      expect(source).not.toMatch(/["']logistics_(product|setting|warehouse|manufacturer|customer|production|reservation|transfer|shipment|output|return|stock)/);
      expect(source).not.toMatch(/rpc\(["']logistics_/);
    }

    expect(api).toContain('"store_product"');
    const productSelect = api.match(/selectAll\("store_product",\s*"([^"]+)"/);
    expect(productSelect?.[1].split(",")).toContain("manufacturer_id");
    expect(api).toContain("store_post_reservation");
    expect(catalog).toContain('.from("store_product")');
    expect(catalog).toContain("manufacturer_id");
    expect(catalog).not.toContain("product_manufacturer");
  });

  it("comments every store table and view in the migration", () => {
    const sql = read("supabase/migrations/20260918120000_store_schema_prefix.sql");
    expect(sql).toContain("drop table if exists public.logistics_product_manufacturer");
    expect(sql).not.toMatch(/rename to store_product_manufacturer/);
    expect(sql).toContain("drop column if exists production_activation_status");
    for (const relation of STORE_RELATIONS) {
      expect(sql).toContain(`('${relation}', null,`);
    }
  });

  it("stores a single optional plant on the product, not a junction", () => {
    const demo = JSON.parse(read("scripts/data/logistics-demo.json")) as {
      products: Array<{ manufacturer_id?: number | null }>;
      product_manufacturers?: unknown;
    };
    expect(demo.product_manufacturers).toBeUndefined();
    expect(demo.products.some((row) => row.manufacturer_id != null)).toBe(true);
    expect(demo.products.some((row) => row.manufacturer_id == null)).toBe(true);

    const row = { id: 1, sku: "FORCE-1100-EFI", name: "Force 1100 EFI", unit: "pcs", manufacturer_id: 38 };
    const product = {
      id: String(row.id),
      sku: row.sku,
      name: row.name,
      unit: row.unit,
      manufacturerId: row.manufacturer_id ? String(row.manufacturer_id) : null,
    } as LogisticsProduct;
    const snapshot = {
      products: [product],
      manufacturers: [{ id: "38", code: "PLT-38", name: "Qianjiang", warehouseId: "41" }],
    } as LogisticsSnapshot;
    expect("productManufacturers" in snapshot).toBe(false);
    expect(product.manufacturerId).toBe("38");
    expect(manufacturerIdsForProducts(snapshot, [product.id])).toEqual(["38"]);
    expect(manufacturerSelectItems(snapshot, [product.id])).toEqual([{ value: "38", label: "PLT-38" }]);
  });

  it("maps catalog production site from store_product.manufacturer_id", () => {
    const plants = new Map([["38", "PLT-38"]]);
    expect(catalogProductionSite(null, plants)).toBe("—");
    expect(catalogProductionSite(38, plants)).toBe("PLT-38");
  });

  it("keeps settings without production activation", () => {
    const settings = { id: "1", codePrefixes: {} } as unknown as LogisticsSetting;
    expect("productionActivationStatus" in settings).toBe(false);
  });
});
