// english-ui:ignore-file
"use client";

import {
  formatListOrderMoney,
  formatListPaymentDue,
  formatListPaymentPercent,
  listClosedLabel,
  listFulfillment,
  listOrderMoney,
  listOrderPayment,
} from "@/features/logistics/customer-order-list-money";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import type { CustomerOrderListRow } from "@/features/logistics/logistics-list-types";
import { cn } from "@/lib/utils";

export const CustomerOrderFulfillmentCell = ({ row }: { row: CustomerOrderListRow }) => {
  const view = listFulfillment(row);
  if (view.ordered <= 0) return <span className="text-muted-foreground">—</span>;
  const parts = [
    view.segments.shipped > 0 ? { key: "shipped", width: view.segments.shipped, className: "bg-green-600" } : null,
    view.segments.reserved > 0 ? { key: "reserved", width: view.segments.reserved, className: "bg-blue-500" } : null,
    view.open && view.segments.uncovered > 0
      ? { key: "uncovered", width: view.segments.uncovered, className: "bg-amber-400" }
      : null,
  ].filter((part) => part != null);

  const title = [
    `Отгружено ${formatQuantity(row.shipped)}`,
    `В резерве ${formatQuantity(row.reserved)}`,
    view.open ? `Не обеспечено ${formatQuantity(row.openToReserve)}` : null,
  ]
    .filter((part) => part != null)
    .join(" · ");

  return (
    <div className="flex min-w-36 flex-col gap-1" title={title}>
      <span className="tabular-nums">{view.caption}</span>
      <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-muted" aria-hidden>
        {parts.map((part) => (
          <div
            key={part.key}
            className={cn("h-full", part.className)}
            style={{ width: `${part.width}%`, flex: `0 0 ${part.width}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export const CustomerOrderAmountCell = ({ row }: { row: CustomerOrderListRow }) => {
  const text = formatListOrderMoney(listOrderMoney(row.money));
  return (
    <span className={cn("whitespace-nowrap tabular-nums", text === "—" && "text-muted-foreground")}>{text}</span>
  );
};

export const CustomerOrderPaymentCell = ({ row }: { row: CustomerOrderListRow }) => {
  const payment = listOrderPayment(row.payments, listOrderMoney(row.money).total);
  const text = formatListPaymentPercent(payment.paidPct);
  if (payment.paidPct == null) return <span className="text-muted-foreground">{text}</span>;
  const due = formatListPaymentDue(payment.nextDueOn);
  return (
    <span className="whitespace-nowrap tabular-nums">
      {text}
      {due ? (
        <span className={cn("ml-1.5", payment.overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
          {due}
        </span>
      ) : null}
    </span>
  );
};

export const CustomerOrderClosedCell = ({ row }: { row: CustomerOrderListRow }) => {
  const text = listClosedLabel(row.completedAt);
  return (
    <span className={cn("whitespace-nowrap tabular-nums", text === "—" && "text-muted-foreground")}>{text}</span>
  );
};

export const CustomerOrderPositionsCell = ({ row }: { row: CustomerOrderListRow }) => (
  <span className={cn("tabular-nums", row.positions === 0 && "text-muted-foreground/60")}>{row.positions}</span>
);
