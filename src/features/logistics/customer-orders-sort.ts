import type { CustomerOrder, CustomerOrderStatus } from "@/features/logistics/logistics-types";

export type CustomerOrderListFilter = "all" | CustomerOrderStatus;

const createdAtMs = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const numericId = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const compareCustomerOrdersNewestFirst = (a: CustomerOrder, b: CustomerOrder): number => {
  const byCreated = createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
  if (byCreated !== 0) {
    return byCreated;
  }
  const aId = numericId(a.id);
  const bId = numericId(b.id);
  if (aId != null && bId != null && aId !== bId) {
    return bId - aId;
  }
  return b.id.localeCompare(a.id);
};

export const visibleCustomerOrders = (
  orders: CustomerOrder[],
  status: CustomerOrderListFilter,
): CustomerOrder[] =>
  orders
    .filter((order) => status === "all" || order.status === status)
    .slice()
    .sort(compareCustomerOrdersNewestFirst);
