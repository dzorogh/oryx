#!/usr/bin/env node
/**
 * Seed Logistics demo data into the Oryx demo Supabase.
 * Reads a one-time Korportal snapshot from scripts/data/logistics-demo.json.
 * Reads NEXT_PUBLIC_SUPABASE_* from .env.local. Does not print secrets.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { preferKorportalMediaConversion } from "./lib/korportal-media-url.mjs";
import { seedLogisticsStories } from "./lib/seed-logistics-stories.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const loadEnv = () => {
  const env = {};
  const raw = readFileSync(resolve(root, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
};

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
}

const snapshot = JSON.parse(readFileSync(resolve(root, "scripts/data/logistics-demo.json"), "utf8"));

const inferCategory = (sku, name) => {
  const haystack = `${sku} ${name}`.toUpperCase();
  const rules = [
    { tokens: ["XFORCE", "FORCE"], category: "4x4", family: "Force" },
    { tokens: ["PREDATOR", "5000"], category: "Side-by-Side", family: "Utility" },
    { tokens: ["CROSS", "ENDURO"], category: "Enduro", family: "Cross" },
    { tokens: ["VESPITO", "SCOOTER", "MOPED"], category: "Scooter", family: "Scooter" },
    { tokens: ["CUSTOM"], category: "Custom Bike", family: "Custom" },
    { tokens: ["GP", "GL", "RR", "RST", "FX", "BANDIT", "PHANTOM"], category: "Street Bike", family: "Road" },
  ];
  const match = rules.find((rule) => rule.tokens.some((token) => haystack.includes(token)));
  const family = name.split(/\s+/)[0] || match?.family || "Equipment";
  return { category: match?.category || "4x4", family };
};

const enrichProduct = (row) => {
  const inferred = inferCategory(row.sku, row.name);
  return {
    ...row,
    image_url: preferKorportalMediaConversion(row.image_url),
    dealer_price: row.dealer_price ?? null,
    retail_price: row.retail_price ?? null,
    category: inferred.category,
    family: inferred.family,
  };
};

const headers = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

const upsert = async (table, rows) => {
  if (!rows.length) return 200;
  const res = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`upsert ${table} failed: ${res.status} (${body.length} bytes)`);
  }
  return res.status;
};

await upsert("logistics_setting", [{ id: 1, production_activation_status: "planned" }]);
await upsert("logistics_product", snapshot.products.map(enrichProduct));
await upsert(
  "logistics_warehouse",
  snapshot.warehouses.map((row) => ({ ...row, manufacturer_id: null })),
);
await upsert("logistics_manufacturer", snapshot.manufacturers);
await upsert("logistics_warehouse", snapshot.warehouses);
await upsert("logistics_product_manufacturer", snapshot.product_manufacturers ?? []);
await upsert("logistics_customer_order", snapshot.customer_orders);
await upsert("logistics_customer_order_line", snapshot.customer_order_lines);

const countRes = await fetch(`${url}/rest/v1/logistics_customer_order?select=id`, {
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    Prefer: "count=exact",
    Range: "0-0",
  },
});
const range = countRes.headers.get("content-range");
const stories = await seedLogisticsStories({ url, anon });
console.log(
  `seed_ok products=${snapshot.products.length} warehouses=${snapshot.warehouses.length} manufacturers=${snapshot.manufacturers.length} product_plants=${(snapshot.product_manufacturers ?? []).length} orders=${snapshot.customer_orders.length} lines=${snapshot.customer_order_lines.length} story_orders=${stories.orders} order_content_range=${range}`,
);
