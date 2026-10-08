/** Money, payment and fulfillment facts for one customer-order list row. */

import { fulfillmentSegments, headerPercent } from "@/features/logistics/customer-order-oms";
import { formatDate, formatQuantity } from "@/features/logistics/logistics-labels";
import type { CustomerOrderListMoney, CustomerOrderListRow } from "@/features/logistics/logistics-list-types";
import { isOpenCustomerOrderStatus } from "@/features/logistics/logistics-types";
import {
  allocatedAmount,
  convert,
  estimatedCostFromTotals,
  formatOrderMoney,
  MONEY_EPSILON,
  orderTotal,
  summarizePayments,
  todayIso,
  type OrderPayment,
} from "@/features/logistics/order-money";

export type ListOrderMoney = {
  /** Order total in the order currency; null when there is neither a manual amount nor priced lines. */
  total: number | null;
  /** True when the total is the estimated cost, not a manual amount. */
  estimated: boolean;
  currency: string | null;
  /** Total converted to USD by the order rate snapshot; null sorts last. */
  usd: number | null;
};

/** Manual `amount`, otherwise the estimated cost. Empty line totals and no amount → no total. */
export const listOrderMoney = (money: CustomerOrderListMoney | null): ListOrderMoney => {
  if (!money) return { total: null, estimated: false, currency: null, usd: null };
  if (money.amount == null && money.lineTotals.length === 0) {
    return { total: null, estimated: false, currency: money.currencyCode, usd: null };
  }
  const estimatedCost = estimatedCostFromTotals(money.lineTotals, money.currencyCode, money.rates);
  const estimated = money.amount == null;
  const total = orderTotal(money.amount, estimatedCost);
  return {
    total,
    estimated,
    currency: money.currencyCode,
    usd: convert(total, money.currencyCode, "USD", money.rates),
  };
};

/** «12 345 ¥» or «≈ 9 800 $»; «—» when the order has no sum. */
export const formatListOrderMoney = (view: ListOrderMoney): string => {
  if (view.total == null || !view.currency) return "—";
  const text = formatOrderMoney(view.total, view.currency);
  return view.estimated ? `≈ ${text}` : text;
};

export type ListOrderPayment = {
  /** Null when the order has no payment schedule. */
  paidPct: number | null;
  nextDueOn: string | null;
  overdue: boolean;
};

type ListPayment = Pick<OrderPayment, "amount" | "status" | "dueOn">;

/** Paid share of the order total, and the earliest unpaid due date. */
export const listOrderPayment = (
  payments: ListPayment[],
  total: number | null,
  today: string = todayIso(),
): ListOrderPayment => {
  if (payments.length === 0) return { paidPct: null, nextDueOn: null, overdue: false };
  const denominator = total != null && total > 0 ? total : allocatedAmount(payments);
  const summary = summarizePayments(payments, denominator, "", today);
  const paidPct =
    summary.total - summary.paid < MONEY_EPSILON ? 100 : headerPercent(summary.paid, summary.total);
  return {
    paidPct,
    nextDueOn: summary.nextDueOn,
    overdue: summary.overdue,
  };
};

/** «до 25.09», or «до 25.09.2025» when the due year is not the current one. */
export const formatListPaymentDue = (dueOn: string | null, today: string = todayIso()): string | null => {
  if (!dueOn) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueOn);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = `${day}.${month}`;
  return year === today.slice(0, 4) ? `до ${date}` : `до ${date}.${year}`;
};

/** «40 %» / «100 %» / «Нет графика». */
export const formatListPaymentPercent = (paidPct: number | null): string =>
  paidPct == null ? "Нет графика" : `${paidPct} %`;

/** «—» for an open order; otherwise the calendar date of `completedAt`. */
export const listClosedLabel = (completedAt: string | null): string =>
  completedAt ? formatDate(completedAt) : "—";

export type ListFulfillment = {
  open: boolean;
  ordered: number;
  caption: string;
  segments: ReturnType<typeof fulfillmentSegments>;
};

/**
 * Bar segments for the list: shipped, reserved, and uncovered.
 * Uncovered is drawn only while the order is open. In production is not a segment.
 */
export const listFulfillment = (
  row: Pick<CustomerOrderListRow, "status" | "ordered" | "shipped" | "reserved" | "openToReserve" | "positions">,
): ListFulfillment => {
  const open = isOpenCustomerOrderStatus(row.status);
  return {
    open,
    ordered: row.ordered,
    caption: `${formatQuantity(row.shipped)} из ${formatQuantity(row.ordered)} шт`,
    segments: fulfillmentSegments({
      positions: row.positions,
      ordered: row.ordered,
      shipped: row.shipped,
      reserved: row.reserved,
      inProduction: 0,
      uncovered: open ? row.openToReserve : 0,
    }),
  };
};
