#!/usr/bin/env node
/**
 * One-off remap of scripts/data/logistics-demo.json to sequential integer ids.
 * Same order as the SQL migration: row_number() OVER (ORDER BY id).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const file = resolve(dirname(fileURLToPath(import.meta.url)), "data/logistics-demo.json");
const data = JSON.parse(readFileSync(file, "utf8"));

const idMap = (rows) => {
  const map = new Map();
  [...rows]
    .map((row) => String(row.id))
    .sort((left, right) => left.localeCompare(right))
    .forEach((id, index) => {
      map.set(id, index + 1);
    });
  return map;
};

const products = idMap(data.products);
const warehouses = idMap(data.warehouses);
const manufacturers = idMap(data.manufacturers);
const orders = idMap(data.customer_orders);
const orderLines = idMap(data.customer_order_lines);
const links = idMap(data.product_manufacturers ?? []);

const requireId = (map, value, label) => {
  if (value == null) return null;
  const next = map.get(String(value));
  if (next == null) {
    throw new Error(`Missing ${label} mapping for ${value}`);
  }
  return next;
};

data.products = data.products.map((row) => ({
  id: requireId(products, row.id, "product"),
  sku: row.sku,
  name: row.name,
  unit: row.unit,
}));

data.warehouses = data.warehouses.map((row) => ({
  id: requireId(warehouses, row.id, "warehouse"),
  name: row.name,
  manufacturer_id: row.manufacturer_id ? requireId(manufacturers, row.manufacturer_id, "manufacturer") : null,
}));

data.manufacturers = data.manufacturers.map((row) => ({
  id: requireId(manufacturers, row.id, "manufacturer"),
  name: row.name,
  warehouse_id: requireId(warehouses, row.warehouse_id, "warehouse"),
}));

data.customer_orders = data.customer_orders.map((row) => ({
  id: requireId(orders, row.id, "order"),
  status: row.status,
  created_at: row.created_at,
  closed_at: row.closed_at ?? null,
  expected_end_on: row.expected_end_on ?? null,
}));

data.customer_order_lines = data.customer_order_lines.map((row) => ({
  id: requireId(orderLines, row.id, "order_line"),
  order_id: requireId(orders, row.order_id, "order"),
  product_id: requireId(products, row.product_id, "product"),
  quantity: row.quantity,
}));

data.product_manufacturers = (data.product_manufacturers ?? []).map((row) => ({
  id: requireId(links, row.id, "product_manufacturer"),
  product_id: requireId(products, row.product_id, "product"),
  manufacturer_id: requireId(manufacturers, row.manufacturer_id, "manufacturer"),
}));

writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `remap_ok products=${data.products.length} warehouses=${data.warehouses.length} manufacturers=${data.manufacturers.length} orders=${data.customer_orders.length} lines=${data.customer_order_lines.length} plants=${data.product_manufacturers.length}`,
);
