import type { CustomerOrder } from "@/features/logistics/logistics-types";

type SortableOrder = Pick<CustomerOrder, "id" | "createdAt">;

const createdAtMs = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const numericId = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const compareCustomerOrdersNewestFirst = (a: SortableOrder, b: SortableOrder): number => {
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
