import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOrderRegionVisibleForRole,
  isStorePathAllowedForRole,
  isVisibleForRole,
  viewRolePageForPath,
  mapRoleVisibilityRow,
  parseViewRole,
  resolveCustomerOrderVisibility,
  type RoleVisibilityRule,
} from "@/features/logistics/order-view-role";

const rules: RoleVisibilityRule[] = [
  { elementKey: "tab.plan", label: "Вкладка «План»", managerVisible: true, customerVisible: false },
  { elementKey: "tab.money", label: "Вкладка «Деньги»", managerVisible: true, customerVisible: true },
  { elementKey: "header.author", label: "Автор", managerVisible: false, customerVisible: false },
];

describe("order view role", () => {
  it("reads the visibility of the active role", () => {
    assert.equal(isVisibleForRole(rules, "manager", "tab.plan"), true);
    assert.equal(isVisibleForRole(rules, "customer", "tab.plan"), false);
    assert.equal(isVisibleForRole(rules, "customer", "tab.money"), true);
    assert.equal(isVisibleForRole(rules, "manager", "header.author"), false);
  });

  it("shows a key without a rule to the manager only", () => {
    assert.equal(isVisibleForRole([], "manager", "tab.history"), true);
    assert.equal(isVisibleForRole([], "customer", "tab.history"), false);
  });

  it("resolves every customer-order key", () => {
    const customer = resolveCustomerOrderVisibility(rules, "customer");
    assert.equal(customer["tab.money"], true);
    assert.equal(customer["tab.plan"], false);
    assert.equal(customer["order.actions"], false);
    const manager = resolveCustomerOrderVisibility(rules, "manager");
    assert.equal(manager["order.actions"], true);
    assert.equal(manager["header.author"], false);
  });

  it("parses the stored role and maps backend rows", () => {
    assert.equal(parseViewRole("customer"), "customer");
    assert.equal(parseViewRole("admin"), "manager");
    assert.equal(parseViewRole(null), "manager");
    assert.deepEqual(
      mapRoleVisibilityRow({ element_key: "tab.files", label: "Файлы", manager_visible: true, customer_visible: true }),
      { elementKey: "tab.files", label: "Файлы", managerVisible: true, customerVisible: true },
    );
  });

  it("limits the customer to the catalog, checkout and customer orders", () => {
    assert.equal(isStorePathAllowedForRole("manager", "/store/logistics/stock"), true);
    assert.equal(isStorePathAllowedForRole("customer", "/store"), true);
    assert.equal(isStorePathAllowedForRole("customer", "/store/pim/products"), true);
    assert.equal(isStorePathAllowedForRole("customer", "/store/pim/products/42/"), true);
    assert.equal(isStorePathAllowedForRole("customer", "/store/pim/variants/7"), true);
    assert.equal(isStorePathAllowedForRole("customer", "/store/checkout"), true);
    assert.equal(isStorePathAllowedForRole("customer", "/store/logistics/customer-orders/12?tab=money"), true);
    assert.equal(isStorePathAllowedForRole("customer", "/store/logistics/stock"), false);
    assert.equal(isStorePathAllowedForRole("customer", "/store/pim/pricelists"), false);
    assert.equal(isStorePathAllowedForRole("customer", "/store/logistics/customer-orders-archive"), false);
    assert.equal(isStorePathAllowedForRole("customer", "/store/settings"), false);
  });

  it("maps the customer order card to its visibility page", () => {
    assert.equal(viewRolePageForPath("/store/logistics/customer-orders/12"), "customer_order");
    assert.equal(viewRolePageForPath("/store/logistics/customer-orders"), null);
    assert.equal(viewRolePageForPath("/store/pim/products"), null);
  });

  it("shows the customer only orders of the selected region", () => {
    assert.equal(isOrderRegionVisibleForRole("manager", "1", null), true);
    assert.equal(isOrderRegionVisibleForRole("customer", "1", "1"), true);
    assert.equal(isOrderRegionVisibleForRole("customer", "2", "1"), false);
    assert.equal(isOrderRegionVisibleForRole("customer", "", null), false);
  });
});
