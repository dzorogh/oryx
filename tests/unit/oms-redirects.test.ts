import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { hrefForPlant, hrefForRegion, hrefForWarehouse } from "@/features/oms/oms-availability";
import { STORE_LEGACY_REDIRECTS } from "@/features/store/store-legacy-redirects";
import { STORE_DIRECTORY_PATHS } from "@/features/store/store-paths";
import { STORE_NAV_GROUPS } from "@/features/store/store-nav";

type RedirectRule = { source: string; destination: string };

const previousRoot = "/logistics";
const previousStore = "/store/logistics";

const compile = (source: string): RegExp => {
  let pattern = "^";
  source.split("/").forEach((part, index) => {
    if (index > 0) pattern += "/";
    if (part.startsWith(":") && part.endsWith("*")) {
      pattern += `(?<${part.slice(1, -1)}>.*)`;
    } else if (part.startsWith(":")) {
      pattern += `(?<${part.slice(1)}>[^/]+)`;
    } else {
      pattern += part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  });
  return new RegExp(`${pattern}$`);
};

const resolveRedirect = (pathname: string, rules: readonly RedirectRule[]): string | null => {
  for (const rule of rules) {
    const match = compile(rule.source).exec(pathname);
    if (!match) continue;
    let destination = rule.destination.split("?")[0] ?? rule.destination;
    const query = rule.destination.includes("?") ? `?${rule.destination.split("?")[1]}` : "";
    for (const [key, value] of Object.entries(match.groups ?? {})) {
      destination = destination.replace(`:${key}*`, value).replace(`:${key}`, value);
    }
    return `${destination}${query}`;
  }
  return null;
};

describe("редиректы магазина", () => {
  it("матрица адресов резолвится напрямую, без цепочки", () => {
    const rules = STORE_LEGACY_REDIRECTS;
    assert.match(readFileSync("next.config.ts", "utf8"), /STORE_LEGACY_REDIRECTS/);
    assert.match(readFileSync("app/store/oms/page.tsx", "utf8"), /redirect\("\/store\/oms\/stock"\)/);
    assert.equal(resolveRedirect(previousStore, rules), "/store/oms/stock");
    assert.equal(resolveRedirect(`${previousStore}/transfers/7`, rules), "/store/oms/transfers/7");
    assert.equal(resolveRedirect(`${previousRoot}/transfers/7`, rules), "/store/oms/transfers/7");
    assert.equal(resolveRedirect(`${previousStore}/plants/2`, rules), "/store/plants/2");
    assert.equal(resolveRedirect(`${previousRoot}/regions`, rules), "/store/regions");
    assert.equal(resolveRedirect(`${previousStore}/releases`, rules), "/store/oms/reservations?operation=release");
    assert.equal(resolveRedirect(`${previousStore}/products/9`, rules), "/store/pim/variants/9");
    assert.equal(resolveRedirect(previousRoot, rules), "/store/oms/stock");
    assert.equal(resolveRedirect(`${previousRoot}/products`, rules), "/store/pim/products");
    assert.equal(resolveRedirect(`${previousStore}/releases/5`, rules), "/store/oms/reservations?operation=release");
    assert.equal(resolveRedirect(`${previousStore}/products/9/x`, rules), "/store/pim/variants/9");
    assert.equal(resolveRedirect("/store/warehouses/5", rules), null);
    assert.equal(resolveRedirect("/store/regions", rules), null);
    assert.equal(resolveRedirect("/store/pim/products", rules), null);

    const stalePrefix = previousStore;
    for (const rule of rules) {
      const path = rule.destination.split("?")[0] ?? "";
      assert.equal(path === stalePrefix || path.startsWith(`${stalePrefix}/`), false, rule.destination);
    }
  });

  it("справочники в меню сразу после каталога и совпадают с карточкой", () => {
    assert.deepEqual(
      STORE_NAV_GROUPS.map((group) => group.title ?? ""),
      ["Каталог", "Справочники", "Продажи", "Производство", "Склад", ""],
    );
    const directories = STORE_NAV_GROUPS.find((group) => group.title === "Справочники");
    assert.deepEqual(
      directories?.items.map((item) => item.href),
      [STORE_DIRECTORY_PATHS.warehouses, STORE_DIRECTORY_PATHS.regions, STORE_DIRECTORY_PATHS.plants],
    );
    const active = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
    assert.equal(active("/store/warehouses/5", STORE_DIRECTORY_PATHS.warehouses), true);
    assert.equal(active("/store/plants/2", STORE_DIRECTORY_PATHS.plants), true);
    assert.equal(active("/store/regions", STORE_DIRECTORY_PATHS.regions), true);
  });

  it("карточка заказа клиента остаётся на новом адресе, оформление пишет в OMS", () => {
    const orderPage = readFileSync("app/store/oms/customer-orders/[orderId]/page.tsx", "utf8");
    assert.match(orderPage, /CustomerOrderDetailPage/);
    const checkout = readFileSync("src/features/store/cart/checkout-api.ts", "utf8");
    assert.match(checkout, /store_oms_checkout_customer_order/);
    const api = readFileSync("src/features/store/directories/directories-api.ts", "utf8");
    assert.match(api, /store_create_warehouse/);
    assert.equal(hrefForWarehouse("5"), "/store/warehouses/5");
    assert.equal(hrefForRegion("3"), "/store/regions/3");
    assert.equal(hrefForPlant("2"), "/store/plants/2");
    const migration = readFileSync("supabase/migrations/20261015120000_store_oms_prefix.sql", "utf8");
    assert.match(migration, /store_create_warehouse must call store_oms_new_stock_location/);
  });
});
