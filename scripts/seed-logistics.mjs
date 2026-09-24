#!/usr/bin/env node
/**
 * Privileged Store logistics reseed for Oryx demo Supabase.
 * Uses service_role from ~/.config/oryx/supabase.env (never prints secrets).
 * Wipes via oryx_supabase.py sql truncate — no public reset RPC.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { preferKorportalMediaConversion } from "./lib/korportal-media-url.mjs";
import { seedLogisticsStories } from "./lib/seed-logistics-stories.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = process.env.HOME || process.env.USERPROFILE || "";

const parseEnv = (text) => {
  const env = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
};

const loadEnv = () => {
  const local = parseEnv(readFileSync(resolve(root, ".env.local"), "utf8"));
  let privileged = {};
  try {
    privileged = parseEnv(readFileSync(resolve(home, ".config/oryx/supabase.env"), "utf8"));
  } catch {
    /* optional */
  }
  return { ...local, ...privileged };
};

const hashSeed = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const inferDealer = (seed) => 2490 + (hashSeed(seed) % 90) * 100;

const CURRENCIES = [
  { code: "USD", name: "Доллар США" },
  { code: "CNY", name: "Юань" },
  { code: "EUR", name: "Евро" },
  { code: "RUB", name: "Российский рубль" },
  { code: "AED", name: "Дирхам ОАЭ" },
  { code: "KZT", name: "Тенге" },
  { code: "BYN", name: "Белорусский рубль" },
  { code: "UZS", name: "Сум" },
  { code: "MXN", name: "Мексиканское песо" },
  { code: "INR", name: "Индийская рупия" },
  { code: "OMR", name: "Оманский риал" },
];

const REGION_GROUPS = [
  { code: "cis", name: "СНГ", sort_order: 10 },
  { code: "mena", name: "Ближний Восток и Северная Африка", sort_order: 20 },
  { code: "europe", name: "Европа", sort_order: 30 },
  { code: "americas", name: "Америка", sort_order: 40 },
  { code: "apac", name: "Азиатско-Тихоокеанский регион", sort_order: 50 },
];

/** Stable region codes match pricelist UI ids. */
const REGIONS = [
  { code: "ae", name: "ОАЭ", group: "mena", retail: "AED", dealer: "CNY", sort_order: 10 },
  { code: "ru", name: "Россия", group: "cis", retail: "RUB", dealer: "CNY", sort_order: 20 },
  { code: "kz", name: "Казахстан", group: "cis", retail: "KZT", dealer: "CNY", sort_order: 30 },
  { code: "by", name: "Беларусь", group: "cis", retail: "BYN", dealer: "CNY", sort_order: 40 },
  { code: "uz", name: "Узбекистан", group: "cis", retail: "UZS", dealer: "CNY", sort_order: 50 },
  { code: "mx", name: "Мексика", group: "americas", retail: "MXN", dealer: "CNY", sort_order: 60 },
  { code: "de", name: "Германия", group: "europe", retail: "EUR", dealer: "CNY", sort_order: 70 },
  { code: "us", name: "США", group: "americas", retail: "USD", dealer: "CNY", sort_order: 80 },
  { code: "in", name: "Индия", group: "apac", retail: "INR", dealer: "CNY", sort_order: 90 },
  { code: "om", name: "Оман", group: "mena", retail: "OMR", dealer: "CNY", sort_order: 100 },
];

const RETAIL_STATUSES = [
  "draft",
  "available",
  "preorder",
  "temporarily_unavailable",
  "discontinued",
  "banned",
  "hidden",
  "pending_approval",
  "archived",
];

const env = loadEnv();
const url = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for privileged seed");
}

const wipeSql = `truncate table
  public.store_stock_transaction,
  public.store_document_product_line,
  public.store_document_history,
  public.store_reservation,
  public.store_shipment,
  public.store_adjustment,
  public.store_transfer,
  public.store_production_output,
  public.store_customer_order,
  public.store_production_order,
  public.store_document,
  public.store_product_price,
  public.store_product_region_status,
  public.store_product_category,
  public.store_product_variant,
  public.store_product,
  public.store_plant,
  public.store_warehouse,
  public.store_region,
  public.store_region_group,
  public.store_brand,
  public.store_product_family,
  public.store_category,
  public.store_stock_location
restart identity cascade;
delete from public.store_stock_owner where kind <> 'free';
select setval(pg_get_serial_sequence('public.store_stock_owner','id'), greatest((select max(id) from public.store_stock_owner), 1));`;

const wipe = spawnSync("python3", [resolve(root, "scripts/oryx_supabase.py"), "sql", wipeSql], {
  cwd: root,
  encoding: "utf8",
});
if (wipe.status !== 0) {
  throw new Error(`privileged wipe failed: ${(wipe.stderr || wipe.stdout || "").slice(0, 400)}`);
}

const snapshot = JSON.parse(readFileSync(resolve(root, "scripts/data/logistics-demo.json"), "utf8"));

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const rpc = async (name, args) => {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`rpc ${name} failed: ${res.status} (${body.length} bytes)`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const rest = async (method, path, body, prefer) => {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      ...headers,
      Prefer: prefer ?? headers.Prefer,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed: ${res.status} (${text.length} bytes)`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const postBatch = async (table, rows) => {
  if (rows.length === 0) return;
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await rest("POST", table, rows.slice(i, i + chunkSize), "return=minimal");
  }
};

// Currencies (idempotent upsert by code)
for (const row of CURRENCIES) {
  const existing = await rest("GET", `store_currency?code=eq.${row.code}&select=id`);
  if (!existing?.[0]) {
    await rest("POST", "store_currency", row, "return=minimal");
  }
}
const currencyRows = await rest("GET", "store_currency?select=id,code&deleted_at=is.null");
const currencyIdByCode = new Map(currencyRows.map((row) => [row.code, row.id]));
const cnyId = currencyIdByCode.get("CNY");
const usdId = currencyIdByCode.get("USD");
if (!cnyId || !usdId) {
  throw new Error("CNY/USD currencies missing after seed");
}

const groupIdByCode = new Map();
for (const group of REGION_GROUPS) {
  const created = await rest("POST", "store_region_group", group, "return=representation");
  const id = Array.isArray(created) ? created[0]?.id : created?.id;
  groupIdByCode.set(group.code, id);
}

const regionIdByCode = new Map();
for (const region of REGIONS) {
  const retailCur = currencyIdByCode.get(region.retail);
  const dealerCur = currencyIdByCode.get(region.dealer);
  if (!retailCur || !dealerCur) {
    throw new Error(`currency missing for region ${region.code}`);
  }
  const id = await rpc("store_create_region", { p_name: region.name, p_code: region.code });
  await rest(
    "PATCH",
    `store_region?id=eq.${id}`,
    {
      code: region.code,
      group_id: groupIdByCode.get(region.group),
      default_retail_currency_id: retailCur,
      default_dealer_currency_id: dealerCur,
      sort_order: region.sort_order,
      active: true,
    },
    "return=minimal",
  );
  regionIdByCode.set(region.code, Number(id));
}

const defaultRegionId = regionIdByCode.get("ae");
if (!defaultRegionId) {
  throw new Error("default region ae missing");
}

const warehouseIdByOld = new Map();
const plantIdByOld = new Map();

for (const row of snapshot.warehouses) {
  const id = await rpc("store_create_warehouse", { p_name: row.name });
  warehouseIdByOld.set(String(row.id), String(id));
}

for (const row of snapshot.plants) {
  const warehouseId = warehouseIdByOld.get(String(row.warehouse_id));
  if (!warehouseId) {
    throw new Error(`plant ${row.id}: warehouse ${row.warehouse_id} missing from seed map`);
  }
  const plantId = await rpc("store_create_plant", {
    p_name: row.name,
    p_warehouse_id: Number(warehouseId),
  });
  plantIdByOld.set(String(row.id), String(plantId));
}

const categoryIdByOld = new Map();
for (const row of snapshot.categories ?? []) {
  const parentId = row.parent_id != null ? categoryIdByOld.get(String(row.parent_id)) : null;
  if (row.parent_id != null && !parentId) {
    throw new Error(`category ${row.id}: parent ${row.parent_id} must precede it in the snapshot`);
  }
  const created = await rest(
    "POST",
    "store_category",
    { code: row.code, name: row.name, parent_id: parentId ? Number(parentId) : null },
    "return=representation",
  );
  const id = Array.isArray(created) ? created[0]?.id : created?.id;
  categoryIdByOld.set(String(row.id), String(id));
}

const variantIdByOldProduct = new Map();
const productCategoryRows = [];
const priceRows = [];
const statusRows = [];
const regionList = [...regionIdByCode.entries()];

for (const row of snapshot.products) {
  const plantId = row.plant_id != null ? plantIdByOld.get(String(row.plant_id)) : null;
  const created = await rpc("store_create_product_variant", {
    p_name: row.name,
    p_unit: row.unit || "шт",
    p_plant_id: plantId ? Number(plantId) : null,
    p_image_url: preferKorportalMediaConversion(row.image_url),
    p_product_id: null,
  });
  const variantId = Number(created.variant_id);
  variantIdByOldProduct.set(String(row.id), String(variantId));

  for (const oldCategoryId of row.category_ids ?? []) {
    const categoryId = categoryIdByOld.get(String(oldCategoryId));
    if (!categoryId) {
      throw new Error(`product ${row.id}: category ${oldCategoryId} missing from seed map`);
    }
    productCategoryRows.push({ product_id: Number(created.product_id), category_id: Number(categoryId) });
  }

  const dealerUsd = row.dealer_price != null ? Number(row.dealer_price) : inferDealer(`${row.id}:${row.name}`);
  const retailUsd = row.retail_price != null ? Number(row.retail_price) : Math.round(dealerUsd * 1.18);
  const purchaseUsd = Math.round(dealerUsd * 0.72);

  priceRows.push({
    product_variant_id: variantId,
    price_kind: "purchase",
    region_id: null,
    currency_id: Number(cnyId),
    amount: Math.max(1, Math.round(purchaseUsd / 0.1466)),
    active: true,
  });

  for (const [regionCode, regionId] of regionList) {
    const regionIndex = REGIONS.findIndex((item) => item.code === regionCode);
    const markupSteps = [10, 15, 20, 25, 30, 35, 40];
    const step = markupSteps[(hashSeed(`${row.id}:${row.name}:${regionCode}`) + regionIndex) % markupSteps.length];
    const dealerAmount = Math.max(1, Math.round((purchaseUsd * (1 + step / 100)) / 0.1466));
    const retailCur = currencyIdByCode.get(REGIONS[regionIndex].retail);
    const retailRate =
      {
        USD: 1,
        CNY: 0.1466,
        EUR: 1.1646,
        RUB: 0.0141,
        AED: 0.2723,
        KZT: 0.00206,
        BYN: 0.3623,
        UZS: 0.0000833,
        MXN: 0.0577,
        INR: 0.01053,
        OMR: 2.6008,
      }[REGIONS[regionIndex].retail] ?? 1;

    priceRows.push({
      product_variant_id: variantId,
      price_kind: "dealer",
      region_id: regionId,
      currency_id: Number(cnyId),
      amount: dealerAmount,
      active: true,
    });
    priceRows.push({
      product_variant_id: variantId,
      price_kind: "retail",
      region_id: regionId,
      currency_id: Number(retailCur),
      amount: Math.max(1, Math.round(retailUsd / retailRate)),
      active: true,
    });

    const availabilityThreshold = (variantId % 11) / 10;
    const unit = (hashSeed(`${variantId}:${regionCode}`) % 100000) / 100000;
    const dealerStatus = unit < availabilityThreshold ? "available" : "unavailable";
    const retailStatus = RETAIL_STATUSES[hashSeed(`${variantId}:retail:${regionCode}`) % RETAIL_STATUSES.length];
    statusRows.push({
      product_variant_id: variantId,
      region_id: regionId,
      dealer_status: dealerStatus,
      retail_status: retailStatus,
    });
  }
}

await postBatch("store_product_category", productCategoryRows);
await postBatch("store_product_price", priceRows);
await postBatch("store_product_region_status", statusRows);

const mapOrderStatus = (status) => {
  if (status === "closed" || status === "done") return "done";
  if (status === "cancelled") return "cancelled";
  if (status === "draft") return "draft";
  return "in_progress";
};

const linesByOrderId = new Map();
for (const line of snapshot.customer_order_lines ?? []) {
  const key = String(line.order_id);
  const variantId = variantIdByOldProduct.get(String(line.product_id));
  if (!variantId) {
    throw new Error(`customer_order_line ${line.id}: product ${line.product_id} missing`);
  }
  const bucket = linesByOrderId.get(key) ?? [];
  bucket.push({
    product_variant_id: Number(variantId),
    quantity: Number(line.quantity),
  });
  linesByOrderId.set(key, bucket);
}

let seededOrders = 0;
for (const order of snapshot.customer_orders ?? []) {
  const lines = linesByOrderId.get(String(order.id)) ?? [];
  const created = await rpc("store_create_customer_order", {
    p_region_id: Number(defaultRegionId),
    p_description: order.description ?? "",
    p_expected_end_on: order.expected_end_on ?? null,
    p_lines: lines,
    p_sequence_number: Number(order.id),
    p_id: Number(order.id),
    p_created_at: order.created_at ?? null,
  });
  const status = mapOrderStatus(order.status);
  if (status !== "in_progress") {
    await rest("PATCH", `store_document?id=eq.${created.id}`, { status }, "return=minimal");
  }
  seededOrders += 1;
}

const stories = await seedLogisticsStories({
  url,
  serviceKey,
  regionId: String(defaultRegionId),
  variantIdByOldProduct,
  plantIdByOld,
  warehouseIdByOld,
});

console.log(
  `seed_ok products=${snapshot.products.length} categories=${categoryIdByOld.size} product_categories=${productCategoryRows.length} plants=${snapshot.plants.length} warehouses=${snapshot.warehouses.length} customer_orders=${seededOrders} regions=${regionIdByCode.size} prices=${priceRows.length} statuses=${statusRows.length} story_orders=${stories.orders}`,
);

/** Spread history changed_at monotonically after each document's created_at, at most ~2 days apart, never past now (deterministic). */
const historyBackfillSql = `
begin;
alter table public.store_document_history disable trigger store_document_history_no_update;
with ranked as (
  select
    h.id,
    d.created_at as doc_created_at,
    row_number() over (partition by h.document_id order by h.id) as rn,
    count(*) over (partition by h.document_id) as cnt
  from public.store_document_history h
  join public.store_document d on d.id = h.document_id
)
update public.store_document_history h
set changed_at = case
  when r.cnt <= 1 then r.doc_created_at
  else r.doc_created_at
    + (r.rn - 1) * least((now() - r.doc_created_at) / (r.cnt - 1), interval '2 days 3 hours')
end
from ranked r
where h.id = r.id;
alter table public.store_document_history enable trigger store_document_history_no_update;
commit;
`;

const historyBackfill = spawnSync(
  "python3",
  [resolve(root, "scripts/oryx_supabase.py"), "sql", historyBackfillSql],
  { cwd: root, encoding: "utf8" },
);
if (historyBackfill.status !== 0) {
  throw new Error(
    `history backfill failed: ${(historyBackfill.stderr || historyBackfill.stdout || "").slice(0, 400)}`,
  );
}
console.log("seed_ok history_timestamps_backfilled");

