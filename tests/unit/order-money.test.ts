import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  convert,
  estimatedCost,
  fetchFloatRates,
  formatOrderMoney,
  isPaymentOverdue,
  mapOrderMoneyContext,
  orderTotal,
  orderMoneyLines,
  parseMoneyInput,
  summarizeOrderMoney,
  unallocated,
  type OrderMoneyContext,
} from "@/features/logistics/order-money";

const RATES = { USD: 1, CNY: 7.12, EUR: 0.86 };

describe("convert", () => {
  it("goes through USD by the snapshot", () => {
    assert.equal(convert(712, "CNY", "USD", RATES), 100);
    assert.ok(Math.abs((convert(100, "USD", "EUR", RATES) ?? 0) - 86) < 1e-9);
    assert.ok(Math.abs((convert(712, "CNY", "EUR", RATES) ?? 0) - 86) < 1e-9);
  });

  it("keeps the amount for the same currency and returns null without a rate", () => {
    assert.equal(convert(5, "KZT", "KZT", RATES), 5);
    assert.equal(convert(5, "KZT", "USD", RATES), null);
  });
});

describe("estimatedCost", () => {
  it("sums unit_price × quantity in the order currency; a line without a price adds 0", () => {
    const lines = [
      { unitPrice: 100, quantity: 3, currencyCode: "CNY" },
      { unitPrice: null, quantity: 10, currencyCode: "CNY" },
      { unitPrice: 50, quantity: 2, currencyCode: "USD" },
    ];
    assert.equal(estimatedCost(lines, "CNY", RATES), 300 + 712);
    assert.ok(Math.abs(estimatedCost(lines, "USD", RATES) - (300 / 7.12 + 100)) < 1e-9);
  });

  it("treats a line without currency as the order currency", () => {
    assert.equal(estimatedCost([{ unitPrice: 10, quantity: 2, currencyCode: null }], "EUR", RATES), 20);
  });
});

describe("сумма заказа и не распределено", () => {
  it("empty amount falls back to the estimated cost", () => {
    assert.equal(orderTotal(null, 1234), 1234);
    assert.equal(orderTotal(1000, 1234), 1000);
    assert.equal(orderTotal(0, 1234), 0);
  });

  it("subtracts every payment, paid included, and goes negative when payments exceed the amount", () => {
    const payments = [{ amount: 400 }, { amount: 700 }];
    assert.equal(unallocated(1000, payments), -100);
    assert.equal(unallocated(1100, payments), 0);
    assert.equal(unallocated(1100.001, payments), 0, "rounding noise is zero");
  });

  it("currency change keeps the numbers of amount and payments; only the estimate is recomputed", () => {
    const lines = [{ unitPrice: 712, quantity: 1, currencyCode: "CNY" }];
    const payments = [{ amount: 50 }];
    const amount = 80;
    assert.equal(unallocated(orderTotal(amount, estimatedCost(lines, "CNY", RATES)), payments), 30);
    assert.equal(unallocated(orderTotal(amount, estimatedCost(lines, "USD", RATES)), payments), 30);
    assert.equal(estimatedCost(lines, "USD", RATES), 100);
    assert.equal(unallocated(orderTotal(null, estimatedCost(lines, "USD", RATES)), payments), 50);
  });
});

describe("isPaymentOverdue", () => {
  it("is overdue before today unless paid", () => {
    assert.equal(isPaymentOverdue({ dueOn: "2026-09-24", status: "planned" }, "2026-09-25"), true);
    assert.equal(isPaymentOverdue({ dueOn: "2026-09-24", status: "invoiced" }, "2026-09-25"), true);
    assert.equal(isPaymentOverdue({ dueOn: "2026-09-24", status: "paid" }, "2026-09-25"), false);
    assert.equal(isPaymentOverdue({ dueOn: "2026-09-25", status: "planned" }, "2026-09-25"), false);
  });
});

describe("format and parse", () => {
  it("formats with grouping and a symbol or code", () => {
    const norm = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");
    assert.equal(norm(formatOrderMoney(12345.5, "CNY")), "12 345,5 ¥");
    assert.equal(norm(formatOrderMoney(12345.5, "CNY", { compact: true })), "12 346 ¥");
    assert.equal(norm(formatOrderMoney(-50, "USD")), "−50 $");
    assert.equal(norm(formatOrderMoney(10, "AED")), "10 AED");
  });

  it("parses user input", () => {
    assert.equal(parseMoneyInput("12 345,50"), 12345.5);
    assert.equal(parseMoneyInput("7.12"), 7.12);
    assert.equal(parseMoneyInput(""), null);
    assert.equal(parseMoneyInput("-5"), null);
    assert.equal(parseMoneyInput("abc"), null);
  });
});

describe("fetchFloatRates", () => {
  const response = (body: unknown, ok = true) =>
    ({ ok, json: async () => body }) as unknown as Response;

  it("maps floatrates to units per USD, USD = 1", async () => {
    const fetchImpl = (async () =>
      response({
        cny: { code: "CNY", rate: "6.71309178" },
        eur: { code: "EUR", rate: 0.8779 },
        bad: { code: "XXX", rate: "0" },
      })) as unknown as typeof fetch;
    assert.deepEqual(await fetchFloatRates({ fetchImpl }), { USD: 1, CNY: 6.71309178, EUR: 0.8779 });
    assert.deepEqual(await fetchFloatRates({ fetchImpl, codes: ["cny"] }), { USD: 1, CNY: 6.71309178 });
  });

  it("returns null when the API is down or answers garbage", async () => {
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    assert.equal(await fetchFloatRates({ fetchImpl: failing }), null);
    const http500 = (async () => response({}, false)) as unknown as typeof fetch;
    assert.equal(await fetchFloatRates({ fetchImpl: http500 }), null);
    const empty = (async () => response({})) as unknown as typeof fetch;
    assert.equal(await fetchFloatRates({ fetchImpl: empty }), null);
  });
});

describe("mapOrderMoneyContext", () => {
  it("maps order_money, order_payments and currencies", () => {
    const mapped = mapOrderMoneyContext({
      order_money: { document_id: 90, currency_code: "CNY", amount: "1500.0000", rates: { USD: 1, cny: 7.12 } },
      order_payments: [
        { id: 3, document_id: 90, due_on: "2026-10-12", amount: "500.0000", status: "planned" },
        { id: 4, document_id: 90, due_on: "2026-10-13", amount: 1, status: "unknown" },
      ],
      currencies: [{ id: 4, code: "CNY", name: "Юань" }],
    });
    assert.deepEqual(mapped.money, { documentId: "90", currencyCode: "CNY", amount: 1500, rates: { USD: 1, CNY: 7.12 } });
    assert.deepEqual(mapped.payments, [{ id: "3", documentId: "90", dueOn: "2026-10-12", amount: 500, status: "planned" }]);
    assert.deepEqual(mapped.currencies, [{ id: "4", code: "CNY", name: "Юань" }]);
    assert.equal(mapOrderMoneyContext({}).money, null);
  });
});

describe("summarizeOrderMoney", () => {
  const snapshot = {
    documentProductLines: [
      { documentId: "90", unitPrice: 100, quantity: 3, currencyId: "4" },
      { documentId: "90", unitPrice: 50, quantity: 2, currencyId: "1" },
      { documentId: "90", unitPrice: null, quantity: 7, currencyId: "4" },
      { documentId: "91", unitPrice: 999, quantity: 9, currencyId: "4" },
    ],
  };
  const context = (amount: number | null): OrderMoneyContext => ({
    money: { documentId: "90", currencyCode: "CNY", amount, rates: RATES },
    payments: [
      { id: "1", documentId: "90", dueOn: "2026-10-01", amount: 400, status: "paid" },
      { id: "2", documentId: "90", dueOn: "2026-11-01", amount: 200, status: "planned" },
    ],
    currencies: [
      { id: "1", code: "USD", name: "Доллар США" },
      { id: "4", code: "CNY", name: "Юань" },
    ],
  });

  it("resolves line currencies and keeps only the document's lines", () => {
    assert.deepEqual(orderMoneyLines(snapshot, "90", context(null)), [
      { unitPrice: 100, quantity: 3, currencyCode: "CNY" },
      { unitPrice: 50, quantity: 2, currencyCode: "USD" },
      { unitPrice: null, quantity: 7, currencyCode: "CNY" },
    ]);
  });

  it("uses the estimated cost when the amount is empty", () => {
    const summary = summarizeOrderMoney(snapshot, "90", context(null));
    assert.ok(summary);
    assert.equal(summary.currencyCode, "CNY");
    assert.ok(Math.abs(summary.estimated - (300 + 712)) < 1e-9);
    assert.ok(Math.abs(summary.total - 1012) < 1e-9);
    assert.ok(Math.abs(summary.rest - 412) < 1e-9);
  });

  it("uses an explicit amount and goes negative when payments exceed it", () => {
    const summary = summarizeOrderMoney(snapshot, "90", context(500));
    assert.ok(summary);
    assert.ok(Math.abs(summary.estimated - 1012) < 1e-9);
    assert.equal(summary.total, 500);
    assert.equal(summary.rest, -100);
  });

  it("returns null without order money", () => {
    assert.equal(summarizeOrderMoney(snapshot, "90", { money: null, payments: [], currencies: [] }), null);
  });
});
