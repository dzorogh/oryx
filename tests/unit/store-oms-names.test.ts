import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

const root = new URL("../..", import.meta.url).pathname;

const KEEP = new Set([
  "store_catalog_page",
  "store_create_plant",
  "store_create_product_variant",
  "store_create_region",
  "store_create_warehouse",
  "store_currency_rates_snapshot",
  "store_current_user_id",
  "store_forbid_hard_delete",
  "store_forbid_variant_hard_delete",
  "store_region_hub_warehouse_guard",
  "store_region_status_for_new_region",
  "store_region_status_for_new_variant",
  "store_set_code_prefix",
  "store_set_production_currency",
  "store_set_tenant_region",
  "store_update_plant",
  "store_update_region",
  "store_update_warehouse",
  "store_variant_stock_facts",
]);

const RELATIONS = [
  "store_customer_order_client_delivery",
  "store_customer_order_meta",
  "store_document_product_line",
  "store_order_payment_event",
  "store_production_output",
  "store_stock_transaction",
  "store_order_plan_action",
  "store_stock_balance_ref",
  "store_production_order",
  "store_customer_order",
  "store_document_history",
  "store_document_file",
  "store_document_kind",
  "store_stock_location",
  "store_order_payment",
  "store_stock_balance",
  "store_location_ref",
  "store_order_money",
  "store_order_plan",
  "store_stock_owner",
  "store_adjustment",
  "store_reservation",
  "store_owner_ref",
  "store_document",
  "store_shipment",
  "store_transfer",
].sort((a, b) => b.length - a.length);

const isOmsIdent = (name: string): boolean => {
  if (name.startsWith("store_oms_") || KEEP.has(name)) return false;
  if (name === "store_customer_order_oms_payload" || name === "store_product_lines_json" || name === "store_product_context") {
    return true;
  }
  return RELATIONS.some((relation) => name.startsWith(relation));
};

const files: string[] = [];
const walk = (dir: string) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "superpowers" || entry.name === "migrations") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|mjs|sql|md)$/.test(entry.name)) files.push(full);
  }
};
for (const folder of ["src", "app", "scripts", "tests", "docs", "supabase/seed"]) {
  const full = join(root, folder);
  if (statSync(full).isDirectory()) walk(full);
}

describe("имена OMS в коде", () => {
  it("клиент, сиды и доки не называют OMS-объекты старым именем", () => {
    const hits: string[] = [];
    for (const file of files) {
      if (file.endsWith("store-oms-names.test.ts")) continue;
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\bstore_[a-z0-9_]+\b/g)) {
        const name = match[0];
        if (isOmsIdent(name)) hits.push(`${relative(root, file)}: ${name}`);
      }
    }
    assert.deepEqual(hits, []);
  });
});
