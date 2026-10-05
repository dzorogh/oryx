import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deadlineCountdown,
  deadlineCountdownLabel,
  deadlineProgress,
  fulfillmentSegments,
  headerPercent,
  paymentProgress,
  plannedOutputQuantities,
  summarizeOrderFulfillment,
} from "@/features/logistics/customer-order-oms";
import type { CustomerOrderLine, LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";

const line = (patch: Partial<CustomerOrderLine> & Pick<CustomerOrderLine, "productId" | "quantity">): CustomerOrderLine => ({
  id: patch.id ?? `line-${patch.productId}`,
  orderId: patch.orderId ?? "ord-1",
  productId: patch.productId,
  quantity: patch.quantity,
  productName: patch.productName ?? patch.productId,
  productUnit: patch.productUnit ?? "pcs",
});

const balance = (
  patch: Partial<StockBalance> & Pick<StockBalance, "productId" | "quantity" | "stockState">,
): StockBalance => ({
  productId: patch.productId,
  locationType: patch.locationType ?? "warehouse",
  locationId: patch.locationId ?? "wh-1",
  ownerType: patch.ownerType === undefined ? "order" : patch.ownerType,
  ownerId: patch.ownerId === undefined ? "ord-1" : patch.ownerId,
  stockState: patch.stockState,
  quantity: patch.quantity,
});

describe("summarizeOrderFulfillment", () => {
  it("counts shipped, capped reserved and uncovered for an open order", () => {
    const lines = [
      line({ productId: "a", quantity: 100 }),
      line({ productId: "b", quantity: 80 }),
      line({ productId: "c", quantity: 60 }),
    ];
    const balances = [
      balance({ productId: "a", quantity: 40, stockState: "shipped" }),
      balance({ productId: "a", quantity: 50, stockState: "reserved" }),
      balance({ productId: "b", quantity: 20, stockState: "shipped" }),
      balance({ productId: "b", quantity: 40, stockState: "reserved" }),
      balance({ productId: "c", quantity: 30, stockState: "reserved" }),
    ];
    assert.deepEqual(summarizeOrderFulfillment(lines, balances, true), {
      positions: 3,
      ordered: 240,
      shipped: 60,
      reserved: 120,
      inProduction: 0,
      uncovered: 60,
    });
  });

  it("caps reserved at remaining and keeps uncovered at 0 when reserve overshoots", () => {
    const lines = [line({ productId: "a", quantity: 100 })];
    const balances = [
      balance({ productId: "a", quantity: 20, stockState: "shipped" }),
      balance({ productId: "a", quantity: 120, stockState: "reserved" }),
    ];
    const summary = summarizeOrderFulfillment(lines, balances, true);
    assert.deepEqual(summary, {
      positions: 1,
      ordered: 100,
      shipped: 20,
      reserved: 80,
      inProduction: 0,
      uncovered: 0,
    });
    assert.ok(summary.shipped + summary.reserved + summary.uncovered <= summary.ordered);
  });

  it("hides uncovered on a closed order", () => {
    const lines = [line({ productId: "a", quantity: 100 })];
    const balances = [
      balance({ productId: "a", quantity: 10, stockState: "shipped" }),
      balance({ productId: "a", quantity: 20, stockState: "reserved" }),
    ];
    assert.deepEqual(summarizeOrderFulfillment(lines, balances, false), {
      positions: 1,
      ordered: 100,
      shipped: 10,
      reserved: 20,
      inProduction: 0,
      uncovered: 0,
    });
  });

  it("returns zeros for an empty order", () => {
    assert.deepEqual(summarizeOrderFulfillment([], [], true), {
      positions: 0,
      ordered: 0,
      shipped: 0,
      reserved: 0,
      inProduction: 0,
      uncovered: 0,
    });
  });

  it("ignores free stock and balances of other order owners", () => {
    const lines = [line({ productId: "a", quantity: 100 })];
    const own = [
      balance({ productId: "a", quantity: 10, stockState: "shipped" }),
      balance({ productId: "a", quantity: 20, stockState: "reserved" }),
    ];
    const withNoise = [
      ...own,
      balance({ productId: "a", quantity: 50, stockState: "free", ownerType: null, ownerId: null }),
      balance({ productId: "a", quantity: 30, stockState: "shipped", ownerId: "ord-2" }),
      balance({ productId: "a", quantity: 40, stockState: "reserved", ownerId: "ord-2" }),
    ];
    assert.deepEqual(summarizeOrderFulfillment(lines, withNoise, true), summarizeOrderFulfillment(lines, own, true));
  });

  it("moves planned output quantity from uncovered to in production, capped at what is not reserved", () => {
    const lines = [line({ productId: "a", quantity: 4 }), line({ productId: "b", quantity: 3 })];
    const balances = [
      balance({ productId: "a", quantity: 2, stockState: "reserved" }),
      balance({ productId: "b", quantity: 2, stockState: "reserved" }),
    ];
    const planned = new Map([
      ["a", 2],
      ["b", 5],
    ]);
    assert.deepEqual(summarizeOrderFulfillment(lines, balances, true, planned), {
      positions: 2,
      ordered: 7,
      shipped: 0,
      reserved: 4,
      inProduction: 3,
      uncovered: 0,
    });
    assert.equal(summarizeOrderFulfillment(lines, balances, false, planned).inProduction, 0);
  });
});

describe("plannedOutputQuantities", () => {
  const output = (id: string, status: "draft" | "done" | "cancelled") =>
    ({ id, status }) as LogisticsSnapshot["outputs"][number];
  const outputLine = (outputId: string, productId: string, quantity: number, toOwnerId: string | null) =>
    ({ outputId, productId, quantity, toOwnerType: toOwnerId ? "order" : null, toOwnerId }) as LogisticsSnapshot["outputLines"][number];

  it("sums draft output lines assigned to the order by product", () => {
    const snapshot = {
      outputs: [output("o1", "draft"), output("o2", "draft"), output("o3", "done"), output("o4", "cancelled")],
      outputLines: [
        outputLine("o1", "a", 2, "ord-1"),
        outputLine("o2", "a", 1, "ord-1"),
        outputLine("o2", "b", 3, "ord-2"),
        outputLine("o2", "c", 4, null),
        outputLine("o3", "a", 5, "ord-1"),
        outputLine("o4", "a", 6, "ord-1"),
      ],
    };
    assert.deepEqual([...plannedOutputQuantities(snapshot, "ord-1")], [["a", 3]]);
  });
});

describe("deadlineCountdown", () => {
  const today = new Date(2026, 8, 29); // 29.09.2026 local

  it("reports days left, today and overdue for an open order", () => {
    assert.deepEqual(deadlineCountdown("2026-10-10", true, today), { kind: "left", days: 11 });
    assert.deepEqual(deadlineCountdown("2026-09-29", true, today), { kind: "today", days: 0 });
    assert.deepEqual(deadlineCountdown("2026-09-20", true, today), { kind: "overdue", days: 9 });
  });

  it("returns null without a deadline or when the order is closed", () => {
    assert.equal(deadlineCountdown(null, true, today), null);
    assert.equal(deadlineCountdown(undefined, true, today), null);
    assert.equal(deadlineCountdown("2026-10-10", false, today), null);
  });

  it("crosses a month boundary correctly", () => {
    const endOfMonth = new Date(2026, 8, 30);
    assert.deepEqual(deadlineCountdown("2026-10-01", true, endOfMonth), { kind: "left", days: 1 });
    assert.deepEqual(deadlineCountdown("2026-09-01", true, endOfMonth), { kind: "overdue", days: 29 });
  });

  it("returns null for an invalid date string", () => {
    assert.equal(deadlineCountdown("not-a-date", true, today), null);
  });
});

describe("deadlineCountdownLabel", () => {
  it("is neutral before the deadline, amber today and red when overdue", () => {
    assert.deepEqual(deadlineCountdownLabel({ kind: "left", days: 11 }), { text: "через 11 дней", tone: "neutral" });
    assert.deepEqual(deadlineCountdownLabel({ kind: "left", days: 1 }), { text: "через 1 день", tone: "neutral" });
    assert.deepEqual(deadlineCountdownLabel({ kind: "today", days: 0 }), { text: "срок сегодня", tone: "warning" });
    assert.deepEqual(deadlineCountdownLabel({ kind: "overdue", days: 9 }), { text: "просрочен на 9 дней", tone: "danger" });
    assert.deepEqual(deadlineCountdownLabel({ kind: "overdue", days: 3 }), { text: "просрочен на 3 дня", tone: "danger" });
  });
});

describe("headerPercent", () => {
  it("caps below 100 while part is still under total", () => {
    assert.equal(headerPercent(99.6, 100), 99);
  });

  it("is 100 when total is zero but something is paid", () => {
    assert.equal(headerPercent(10, 0), 100);
    assert.equal(headerPercent(0, 0), 0);
  });
});

describe("fulfillmentSegments", () => {
  it("splits 240 ordered into 25% shipped, 50% reserved, 25% uncovered", () => {
    assert.deepEqual(
      fulfillmentSegments({ positions: 6, ordered: 240, shipped: 60, reserved: 120, inProduction: 0, uncovered: 60 }),
      { shipped: 25, reserved: 50, inProduction: 0, uncovered: 25 },
    );
    assert.deepEqual(
      fulfillmentSegments({ positions: 2, ordered: 8, shipped: 0, reserved: 4, inProduction: 2, uncovered: 2 }),
      { shipped: 0, reserved: 50, inProduction: 25, uncovered: 25 },
    );
  });

  it("never exceeds 100% after rounding and keeps a 1% floor for tiny nonzero parts", () => {
    const over = fulfillmentSegments({ positions: 3, ordered: 200, shipped: 67, reserved: 67, inProduction: 0, uncovered: 66 });
    assert.equal(over.shipped + over.reserved + over.uncovered, 100);
    assert.ok(over.shipped + over.reserved + over.uncovered <= 100);

    const tiny = fulfillmentSegments({ positions: 1, ordered: 1000, shipped: 1, reserved: 1, inProduction: 0, uncovered: 998 });
    assert.equal(tiny.shipped, 1);
    assert.equal(tiny.reserved, 1);
    assert.ok(tiny.shipped + tiny.reserved + tiny.uncovered <= 100);

    assert.deepEqual(fulfillmentSegments({ positions: 0, ordered: 0, shipped: 0, reserved: 0, inProduction: 0, uncovered: 0 }), {
      shipped: 0,
      reserved: 0,
      inProduction: 0,
      uncovered: 0,
    });
  });
});

describe("paymentProgress", () => {
  it("keeps the overdue due date on one line", () => {
    assert.deepEqual(paymentProgress({ paid: 19_300, total: 48_250, nextDueOn: "2026-09-25", overdue: true }, 2), {
      paidPct: 40,
      dueText: "Срок платежа 25.09.2026 · просрочен",
      overdue: true,
      muted: false,
    });
  });

  it("shows the next due date without the overdue mark when it is not late", () => {
    const progress = paymentProgress({ paid: 0, total: 100, nextDueOn: "2026-10-05", overdue: false }, 1);
    assert.equal(progress.dueText, "Срок платежа 05.10.2026");
    assert.equal(progress.overdue, false);
  });

  it("picks the closing note from paymentCount and coverage", () => {
    assert.equal(
      paymentProgress({ paid: 0, total: 100, nextDueOn: null, overdue: false }, 0).dueText,
      "Платежей в графике нет",
    );
    assert.equal(
      paymentProgress({ paid: 100, total: 100, nextDueOn: null, overdue: false }, 2).dueText,
      "Оплачен полностью",
    );
    assert.equal(
      paymentProgress({ paid: 40, total: 100, nextDueOn: null, overdue: false }, 1).dueText,
      "Все платежи графика оплачены",
    );
  });

  it("is 0% for a zero order amount with nothing paid", () => {
    assert.equal(paymentProgress({ paid: 0, total: 0, nextDueOn: null, overdue: false }, 0).paidPct, 0);
  });
});

describe("deadlineProgress", () => {
  const today = new Date(2026, 8, 29);

  it("is the passed share of days from creation to the deadline", () => {
    assert.equal(deadlineProgress("2026-09-19T11:20:00", "2026-10-09", today), 50);
    assert.equal(deadlineProgress("2026-09-29T08:00:00", "2026-10-09", today), 0);
  });

  it("is full once the deadline passed or when it is not after creation", () => {
    assert.equal(deadlineProgress("2026-09-02T16:05:00", "2026-09-20", today), 100);
    assert.equal(deadlineProgress("2026-09-29T08:00:00", "2026-09-29", today), 100);
  });

  it("is empty without a valid deadline", () => {
    assert.equal(deadlineProgress("2026-09-19T11:20:00", null, today), null);
    assert.equal(deadlineProgress("2026-09-19T11:20:00", "not-a-date", today), null);
  });
});
