export type ViewRole = "manager" | "customer";

export const VIEW_ROLES: readonly ViewRole[] = ["manager", "customer"];

export const VIEW_ROLE_LABELS: Record<ViewRole, string> = {
  manager: "Менеджер",
  customer: "Заказчик",
};

export type RoleVisibilityRule = {
  elementKey: string;
  label: string;
  managerVisible: boolean;
  customerVisible: boolean;
};

export const CUSTOMER_ORDER_VIEW_KEYS = [
  "order.actions",
  "order.edit",
  "header.source",
  "header.region",
  "header.tenant",
  "header.author",
  "header.note",
  "header.fulfillment_breakdown",
  "progress.stages",
  "progress.related",
  "tab.products",
  "products.prices",
  "products.max_per_container",
  "products.flow",
  "products.warehouse_reserve",
  "products.containers",
  "tab.money",
  "money.estimate",
  "tab.plan",
  "tab.containers",
  "tab.files",
  "tab.comments",
  "tab.movements",
  "tab.history",
] as const;

export type CustomerOrderViewKey = (typeof CUSTOMER_ORDER_VIEW_KEYS)[number];

export const parseViewRole = (value: unknown): ViewRole =>
  value === "customer" ? "customer" : "manager";

/** A key without a rule stays visible to the manager and hidden from the customer. */
export const isVisibleForRole = (
  rules: readonly RoleVisibilityRule[],
  role: ViewRole,
  key: string,
): boolean => {
  const rule = rules.find((row) => row.elementKey === key);
  if (!rule) return role === "manager";
  return role === "manager" ? rule.managerVisible : rule.customerVisible;
};

export type CustomerOrderVisibility = Record<CustomerOrderViewKey, boolean>;

export const resolveCustomerOrderVisibility = (
  rules: readonly RoleVisibilityRule[],
  role: ViewRole,
): CustomerOrderVisibility =>
  Object.fromEntries(
    CUSTOMER_ORDER_VIEW_KEYS.map((key) => [key, isVisibleForRole(rules, role, key)]),
  ) as CustomerOrderVisibility;

export const mapRoleVisibilityRow = (row: Record<string, unknown>): RoleVisibilityRule => ({
  elementKey: String(row.element_key),
  label: String(row.label ?? row.element_key),
  managerVisible: row.manager_visible !== false,
  customerVisible: row.customer_visible === true,
});
