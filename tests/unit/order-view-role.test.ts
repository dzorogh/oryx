import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOG_VIEW_KEYS,
  CUSTOMER_ORDER_VIEW_KEYS,
  PRODUCT_VIEW_KEYS,
  isOrderVisibleForRole,
  isStorePathAllowedForRole,
  isVisibleForRole,
  resolveVisibility,
  viewRolePageForPath,
  mapRoleVisibilityRow,
  resolveCustomerOrderVisibility,
  type RoleVisibilityRule,
} from "@/features/logistics/order-view-role";
import { parseViewRole } from "@/features/store/view-role";

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
    assert.equal(isStorePathAllowedForRole("customer", "/store/catalog"), false);
  });

  it("maps store pages to their visibility page", () => {
    assert.equal(viewRolePageForPath("/store/logistics/customer-orders/12"), "customer_order");
    assert.equal(viewRolePageForPath("/store/logistics/customer-orders"), null);
    assert.equal(viewRolePageForPath("/store/pim/products"), "catalog");
    assert.equal(viewRolePageForPath("/store/pim/products/"), "catalog");
    assert.equal(viewRolePageForPath("/store/catalog"), null);
    assert.equal(viewRolePageForPath("/store/pim/products/42?variant=7"), "product");
    assert.equal(viewRolePageForPath("/store/pim/pricelists"), null);
  });

  it("hides product-card management from the customer until a rule opens it", () => {
    assert.deepEqual(resolveVisibility(PRODUCT_VIEW_KEYS, [], "customer"), {
      "variants.add": false,
      "variants.archived": false,
      "tab.logistics": false,
      "logistics.production": false,
    });
    assert.equal(resolveVisibility(PRODUCT_VIEW_KEYS, [], "manager")["logistics.production"], true);
    const opened: RoleVisibilityRule[] = [
      { elementKey: "tab.logistics", label: "Логистика", managerVisible: true, customerVisible: true },
    ];
    const customer = resolveVisibility(PRODUCT_VIEW_KEYS, opened, "customer");
    assert.equal(customer["tab.logistics"], true);
    assert.equal(customer["logistics.production"], false);
    assert.equal(resolveVisibility(CATALOG_VIEW_KEYS, [], "customer")["catalog.add"], false);
  });

  it("registers rates and file management as customer-order keys, closed until a rule opens them", () => {
    assert.ok(CUSTOMER_ORDER_VIEW_KEYS.includes("money.rates"));
    assert.ok(CUSTOMER_ORDER_VIEW_KEYS.includes("files.manage"));
    assert.equal(isVisibleForRole([], "customer", "money.rates"), false);
    assert.equal(isVisibleForRole([], "customer", "files.manage"), false);
    assert.equal(isVisibleForRole([], "manager", "money.rates"), true);
    assert.equal(isVisibleForRole([], "manager", "files.manage"), true);
  });

  it("shows client delivery to the customer and keeps metadata for the manager", () => {
    assert.ok(CUSTOMER_ORDER_VIEW_KEYS.includes("tab.client_delivery"));
    assert.ok(CUSTOMER_ORDER_VIEW_KEYS.includes("tab.metadata"));
    const opened: RoleVisibilityRule[] = [
      {
        elementKey: "tab.client_delivery",
        label: "Вкладка: доставка клиента",
        managerVisible: true,
        customerVisible: true,
      },
      {
        elementKey: "tab.metadata",
        label: "Вкладка: метаданные",
        managerVisible: true,
        customerVisible: false,
      },
      { elementKey: "order.edit", label: "Правка полей", managerVisible: true, customerVisible: false },
    ];
    const customer = resolveCustomerOrderVisibility(opened, "customer");
    assert.equal(customer["tab.client_delivery"], true);
    assert.equal(customer["tab.metadata"], false);
    assert.equal(customer["order.edit"], false);
    const manager = resolveCustomerOrderVisibility(opened, "manager");
    assert.equal(manager["tab.client_delivery"], true);
    assert.equal(manager["tab.metadata"], true);
    assert.equal(isVisibleForRole([], "customer", "tab.client_delivery"), false);
    assert.equal(isVisibleForRole([], "customer", "tab.metadata"), false);
    assert.equal(isVisibleForRole([], "manager", "tab.metadata"), true);
  });

  it("shows the customer orders of their tenants' regions only", () => {
    assert.equal(isOrderVisibleForRole("customer", ["tenant-sharmax-ae"]), true);
    assert.equal(isOrderVisibleForRole("customer", ["tenant-globaldrive", "tenant-sharmax-om"]), true);
    assert.equal(isOrderVisibleForRole("customer", ["tenant-sharmax-kz", "tenant-globaldrive"]), false);
    assert.equal(isOrderVisibleForRole("customer", []), false);
    assert.equal(isOrderVisibleForRole("manager", []), true);
    assert.equal(isOrderVisibleForRole("manager", ["tenant-sharmax-kz"]), true);
  });
});
