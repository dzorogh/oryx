import { formatEntityCode } from "@/lib/entity-codes";
import { CUSTOMER_ORDER_STATUS_LABELS } from "@/features/logistics/logistics-labels";
import type { CustomerOrderListRow } from "@/features/logistics/logistics-list-types";
import { isOpenCustomerOrderStatus } from "@/features/logistics/logistics-types";
import type { ListFilterDef } from "@/features/logistics/ui/list/list-filters";
import {
  authorFilter,
  createdFilter,
  deadlineBucketFilter,
  deadlineRangeFilter,
  productFilter,
  statusOptions,
} from "@/features/logistics/ui/list/list-filter-defs";

export const NO_VALUE = "__none__";

export type CustomerOrderPaymentState = "none" | "unpaid" | "partial" | "paid";

export const CUSTOMER_ORDER_PAYMENT_STATES: readonly CustomerOrderPaymentState[] = ["none", "unpaid", "partial", "paid"];

export const CUSTOMER_ORDER_PAYMENT_STATE_LABELS: Record<CustomerOrderPaymentState, string> = {
  none: "Нет графика",
  unpaid: "Не оплачен",
  partial: "Оплачен частично",
  paid: "Оплачен",
};

/** By the payment schedule: nothing paid, some paid, all paid. */
export const customerOrderPaymentState = (payments: CustomerOrderListRow["payments"]): CustomerOrderPaymentState => {
  if (payments.length === 0) return "none";
  const paid = payments.filter((payment) => payment.status === "paid").length;
  if (paid === 0) return "unpaid";
  return paid === payments.length ? "paid" : "partial";
};

/** Earliest due date among unpaid payments. */
export const nextUnpaidDueOn = (payments: CustomerOrderListRow["payments"]): string | null =>
  payments.reduce<string | null>(
    (earliest, payment) =>
      payment.status !== "paid" && (earliest == null || payment.dueOn < earliest) ? payment.dueOn : earliest,
    null,
  );

/** «OMS-12, 15 OMS-7» → {"12", "15", "7"}. */
export const parseOrderNumbers = (raw: string): Set<string> =>
  new Set(
    raw
      .split(/[\s,;]+/)
      .map((token) => token.match(/(\d+)\s*$/)?.[1]?.replace(/^0+(?=\d)/, ""))
      .filter((value): value is string => Boolean(value)),
  );

export const customerOrderSourceKey = (row: Pick<CustomerOrderListRow, "sourceKind" | "sourceId">): string =>
  row.sourceKind && row.sourceId ? `${row.sourceKind}:${row.sourceId}` : NO_VALUE;

export const customerOrderSourceLabel = (key: string): string => {
  if (key === NO_VALUE) return "Без источника";
  const [kind, id] = key.split(":");
  return formatEntityCode(kind === "plant" ? "plant" : "warehouse", id);
};

export const customerOrderTenantLabel = (row: Pick<CustomerOrderListRow, "tenants">): string =>
  row.tenants.length ? row.tenants.map((tenant) => tenant.name).join(", ") : "Без тенанта";

/** Number, description and product search plus the sheet text fields «Описание» and «Номера заказов». */
export const matchesCustomerOrderText = (
  row: Pick<CustomerOrderListRow, "number" | "sequenceNumber" | "description" | "products">,
  text: { search: string; description: string; numbers: string },
): boolean => {
  const search = text.search.trim().toLowerCase();
  if (
    search &&
    !row.number.toLowerCase().includes(search) &&
    !row.description.toLowerCase().includes(search) &&
    !row.products.some(
      (line) => line.productId.toLowerCase().includes(search) || (line.productName?.toLowerCase().includes(search) ?? false),
    )
  ) {
    return false;
  }
  const description = text.description.trim().toLowerCase();
  if (description && !row.description.toLowerCase().includes(description)) return false;
  const numbers = parseOrderNumbers(text.numbers);
  return numbers.size === 0 || numbers.has(row.sequenceNumber);
};

export const customerOrderFilters: ListFilterDef<CustomerOrderListRow>[] = [
  {
    kind: "multi",
    id: "region",
    label: "Регион",
    placeholder: "Регион",
    quick: true,
    values: (row) => row.regionId || NO_VALUE,
    optionLabel: (value, row) => (value === NO_VALUE ? "Без региона" : row.regionCode),
  },
  {
    kind: "multi",
    id: "tenant",
    label: "Тенант",
    placeholder: "Тенант",
    quick: true,
    values: (row) => (row.tenants.length ? row.tenants.map((tenant) => tenant.id) : NO_VALUE),
    optionLabel: (value, row) =>
      value === NO_VALUE ? "Без тенанта" : (row.tenants.find((tenant) => tenant.id === value)?.name ?? value),
  },
  productFilter<CustomerOrderListRow>((row) => row.products, { quick: true }),
  {
    kind: "multi",
    id: "status",
    label: "Статус",
    options: statusOptions(CUSTOMER_ORDER_STATUS_LABELS, ["draft", "in_progress", "done", "cancelled"]),
    values: (row) => (row.status === "closed" ? "done" : row.status),
  },
  {
    kind: "multi",
    id: "payment",
    label: "Оплата",
    options: CUSTOMER_ORDER_PAYMENT_STATES.map((state) => ({ value: state, label: CUSTOMER_ORDER_PAYMENT_STATE_LABELS[state] })),
    values: (row) => customerOrderPaymentState(row.payments),
  },
  {
    kind: "multi",
    id: "source",
    label: "Источник",
    values: (row) => customerOrderSourceKey(row),
    optionLabel: (value) => customerOrderSourceLabel(value),
  },
  authorFilter<CustomerOrderListRow>(),
  deadlineBucketFilter<CustomerOrderListRow>(isOpenCustomerOrderStatus),
  deadlineRangeFilter<CustomerOrderListRow>(),
  {
    kind: "dateRange",
    id: "paymentDue",
    label: "Ближайший неоплаченный платёж",
    presets: "future",
    value: (row) => nextUnpaidDueOn(row.payments),
  },
  createdFilter<CustomerOrderListRow>("Дата создания"),
  {
    kind: "flag",
    id: "unfulfilled",
    label: "Есть необеспеченное",
    description: "Открытые заказы, где заказано больше, чем отгружено и зарезервировано",
    match: (row) => isOpenCustomerOrderStatus(row.status) && row.openToReserve > 0,
  },
];
