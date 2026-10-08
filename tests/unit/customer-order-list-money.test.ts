import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatListOrderMoney,
  formatListPaymentDue,
  formatListPaymentPercent,
  listClosedLabel,
  listFulfillment,
  listOrderMoney,
  listOrderPayment,
} from "@/features/logistics/customer-order-list-money";
import { formatDate } from "@/features/logistics/logistics-labels";
import type { CustomerOrderListMoney } from "@/features/logistics/logistics-list-types";
import { compareSortValues } from "@/features/logistics/ui/list/list-view-state";

const norm = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");

const money = (patch: Partial<CustomerOrderListMoney> = {}): CustomerOrderListMoney => ({
  currencyCode: "USD",
  amount: null,
  rates: { USD: 1 },
  lineTotals: [],
  ...patch,
});

describe("list order money", () => {
  it("shows a manual amount without the estimate mark", () => {
    const view = listOrderMoney(
      money({
        currencyCode: "CNY",
        amount: 12345,
        rates: { USD: 1, CNY: 7.12 },
        lineTotals: [{ currencyCode: "USD", total: 9999 }],
      }),
    );
    assert.equal(view.estimated, false);
    assert.equal(view.total, 12345);
    assert.equal(view.currency, "CNY");
    assert.equal(norm(formatListOrderMoney(view)), "12 345 ¥");
    assert.ok(Math.abs((view.usd ?? 0) - 12345 / 7.12) < 1e-9);
  });

  it("marks the estimated cost when the amount is empty", () => {
    const view = listOrderMoney(money({ amount: null, lineTotals: [{ currencyCode: "USD", total: 9800 }] }));
    assert.equal(view.estimated, true);
    assert.equal(view.total, 9800);
    assert.equal(norm(formatListOrderMoney(view)), "≈ 9 800 $");
    assert.equal(view.usd, 9800);
  });

  it("shows an em dash and sorts last when there is no amount and no prices", () => {
    const view = listOrderMoney(money());
    assert.equal(view.total, null);
    assert.equal(view.usd, null);
    assert.equal(formatListOrderMoney(view), "—");
    assert.equal(formatListOrderMoney(listOrderMoney(null)), "—");
    assert.equal(compareSortValues(view.usd, 10, "asc", "number"), 1);
    assert.equal(compareSortValues(10, view.usd, "desc", "number"), -1);
  });

  it("adds zero for a line currency missing from the rate snapshot", () => {
    const view = listOrderMoney(
      money({
        amount: null,
        rates: { USD: 1, CNY: 7.12 },
        lineTotals: [
          { currencyCode: "XXX", total: 500 },
          { currencyCode: "CNY", total: 712 },
        ],
      }),
    );
    assert.equal(view.estimated, true);
    assert.ok(Math.abs((view.total ?? 0) - 100) < 1e-9);
    assert.ok(Math.abs((view.usd ?? 0) - 100) < 1e-9);
  });

  it("sorts different currencies by their USD equivalent", () => {
    const yuan = listOrderMoney(
      money({ currencyCode: "CNY", amount: 712, rates: { USD: 1, CNY: 7.12 }, lineTotals: [] }),
    );
    const dollars = listOrderMoney(money({ amount: 100, lineTotals: [] }));
    assert.equal(compareSortValues(yuan.usd, dollars.usd, "asc", "number"), 0);
  });
});

describe("list order payment", () => {
  const today = "2026-10-08";

  it("says there is no schedule", () => {
    const view = listOrderPayment([], 1000, today);
    assert.equal(view.paidPct, null);
    assert.equal(view.nextDueOn, null);
    assert.equal(view.overdue, false);
    assert.equal(formatListPaymentPercent(view.paidPct), "Нет графика");
    assert.equal(formatListPaymentDue(view.nextDueOn), null);
  });

  it("shows the paid percent and a red overdue due date", () => {
    const view = listOrderPayment(
      [
        { amount: 40, status: "paid", dueOn: "2026-08-01" },
        { amount: 60, status: "planned", dueOn: "2026-09-25" },
      ],
      100,
      today,
    );
    assert.equal(view.paidPct, 40);
    assert.equal(view.overdue, true);
    assert.equal(formatListPaymentPercent(view.paidPct), "40 %");
    assert.equal(formatListPaymentDue(view.nextDueOn, today), "до 25.09");
  });

  it("uses the payment schedule when the order has no positive total", () => {
    const payments = [
      { amount: 40, status: "paid" as const, dueOn: "2026-08-01" },
      { amount: 60, status: "planned" as const, dueOn: "2026-11-01" },
    ];
    assert.equal(listOrderPayment(payments, null, today).paidPct, 40);
    assert.equal(listOrderPayment(payments, 0, today).paidPct, 40);
  });

  it("treats a rounding gap below the money epsilon as fully paid", () => {
    const view = listOrderPayment([{ amount: 99.996, status: "paid", dueOn: "2026-09-01" }], 100, today);
    assert.equal(view.paidPct, 100);
  });

  it("appends the year when the due date is not in the current year", () => {
    assert.equal(formatListPaymentDue("2026-09-25", "2026-10-08"), "до 25.09");
    assert.equal(formatListPaymentDue("2025-09-25", "2026-10-08"), "до 25.09.2025");
    assert.equal(formatListPaymentDue("2027-01-02", "2026-10-08"), "до 02.01.2027");
  });

  it("shows 100 percent and no date when every payment is paid", () => {
    const view = listOrderPayment([{ amount: 100, status: "paid", dueOn: "2026-09-01" }], 100, today);
    assert.equal(view.paidPct, 100);
    assert.equal(view.nextDueOn, null);
    assert.equal(view.overdue, false);
    assert.equal(formatListPaymentPercent(view.paidPct), "100 %");
    assert.equal(formatListPaymentDue(view.nextDueOn), null);
  });
});

describe("list fulfillment and closed date", () => {
  it("fills the bar with uncovered for an open order that has no shipments or reserves", () => {
    const view = listFulfillment({
      status: "in_progress",
      positions: 2,
      ordered: 8,
      shipped: 0,
      reserved: 0,
      openToReserve: 8,
    });
    assert.equal(view.open, true);
    assert.equal(view.caption, "0 из 8 шт");
    assert.equal(view.segments.shipped, 0);
    assert.equal(view.segments.reserved, 0);
    assert.equal(view.segments.inProduction, 0);
    assert.equal(view.segments.uncovered, 100);
  });

  it("does not treat uncovered as a segment after the order is closed", () => {
    const view = listFulfillment({
      status: "done",
      positions: 2,
      ordered: 8,
      shipped: 0,
      reserved: 0,
      openToReserve: 8,
    });
    assert.equal(view.open, false);
    assert.equal(view.segments.uncovered, 0);
  });

  it("shows an em dash until the order is closed", () => {
    assert.equal(listClosedLabel(null), "—");
    const at = "2026-09-12T14:05:00Z";
    assert.equal(listClosedLabel(at), formatDate(at));
    assert.notEqual(listClosedLabel(at), "—");
  });
});
