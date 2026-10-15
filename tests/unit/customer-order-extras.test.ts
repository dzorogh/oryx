import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_CLIENT_DELIVERY,
  EMPTY_CUSTOMER_ORDER_META,
  deliveryBadgeLabel,
  isHttpUrl,
  mapCustomerOrderExtras,
  prepareExternalUrl,
  prepareMetaText,
  prepareMoneySave,
} from "@/features/oms/customer-order-extras";

describe("customer order extras", () => {
  it("maps an untouched order to empty fields", () => {
    const extras = mapCustomerOrderExtras({
      updated_at: "2026-10-13T12:00:00.000Z",
      client_delivery: null,
      meta: null,
    });
    assert.equal(extras.updatedAt, "2026-10-13T12:00:00.000Z");
    assert.deepEqual(extras.clientDelivery, EMPTY_CLIENT_DELIVERY);
    assert.deepEqual(extras.meta, EMPTY_CUSTOMER_ORDER_META);
    assert.equal(extras.clientDelivery.paymentStatus, null);
    assert.equal(extras.clientDelivery.invoice.amount, null);
    assert.equal(extras.clientDelivery.paid.amount, null);
    assert.equal(extras.clientDelivery.dueOn, null);
    assert.equal(extras.meta.externalId, null);
    assert.equal(extras.meta.externalUrl, null);
    assert.equal(deliveryBadgeLabel(extras.clientDelivery.paymentStatus), null);
  });

  it("maps a missing payload to empty extras", () => {
    const extras = mapCustomerOrderExtras(null);
    assert.equal(extras.updatedAt, null);
    assert.deepEqual(extras.clientDelivery, EMPTY_CLIENT_DELIVERY);
    assert.deepEqual(extras.meta, EMPTY_CUSTOMER_ORDER_META);
  });

  it("keeps updated_at so the header can show when the order last changed", () => {
    const before = mapCustomerOrderExtras({ updated_at: "2026-10-01T08:00:00.000Z", client_delivery: null, meta: null });
    const after = mapCustomerOrderExtras({ updated_at: "2026-10-13T15:04:00.000Z", client_delivery: null, meta: null });
    assert.equal(before.updatedAt, "2026-10-01T08:00:00.000Z");
    assert.equal(after.updatedAt, "2026-10-13T15:04:00.000Z");
    assert.notEqual(before.updatedAt, after.updatedAt);
  });

  it("maps a filled delivery and metadata row", () => {
    const extras = mapCustomerOrderExtras({
      updated_at: "2026-10-13T15:04:00+00:00",
      client_delivery: {
        delivery_status: "delivered",
        payment_status: "paid",
        invoice_amount: "960.0000",
        invoice_currency_code: "AED",
        paid_amount: 960,
        paid_currency_code: "AED",
        due_on: "2026-09-28",
      },
      meta: {
        external_id: "УЧ-921",
        track_number: "AE9214481900",
        supplier_order_number: "SH-18440",
        external_url: "https://example.com/accounting/oms-921",
      },
    });
    assert.equal(extras.clientDelivery.deliveryStatus, "delivered");
    assert.equal(extras.clientDelivery.paymentStatus, "paid");
    assert.equal(extras.clientDelivery.invoice.amount, 960);
    assert.equal(extras.clientDelivery.invoice.currencyCode, "AED");
    assert.equal(extras.clientDelivery.paid.amount, 960);
    assert.equal(extras.clientDelivery.dueOn, "2026-09-28");
    assert.equal(deliveryBadgeLabel("paid"), "Доставка: Оплачено");
    assert.equal(extras.meta.externalId, "УЧ-921");
    assert.equal(extras.meta.trackNumber, "AE9214481900");
    assert.equal(extras.meta.supplierOrderNumber, "SH-18440");
    assert.equal(isHttpUrl(extras.meta.externalUrl), true);
  });

  it("drops an unknown delivery status instead of showing it", () => {
    const extras = mapCustomerOrderExtras({
      updated_at: "2026-10-13T12:00:00Z",
      client_delivery: {
        delivery_status: "lost",
        payment_status: "shipped",
        invoice_amount: null,
        paid_amount: null,
        due_on: null,
      },
      meta: null,
    });
    assert.equal(extras.clientDelivery.deliveryStatus, null);
    assert.equal(extras.clientDelivery.paymentStatus, null);
  });

  it("refuses an invoice amount without a currency and does not build a save", () => {
    assert.deepEqual(prepareMoneySave("invoice", "500", null), {
      ok: false,
      error: "Укажите валюту инвойса",
    });
    assert.deepEqual(prepareMoneySave("invoice", "500", "  "), {
      ok: false,
      error: "Укажите валюту инвойса",
    });
  });

  it("refuses a paid amount without a currency the same way", () => {
    assert.deepEqual(prepareMoneySave("paid", "500", null), {
      ok: false,
      error: "Укажите валюту оплаты",
    });
  });

  it("refuses a negative amount", () => {
    assert.deepEqual(prepareMoneySave("invoice", "-1", "USD"), {
      ok: false,
      error: "Сумма не может быть отрицательной",
    });
    assert.deepEqual(prepareMoneySave("paid", "-1", null), {
      ok: false,
      error: "Сумма не может быть отрицательной",
    });
  });

  it("clears the currency when the amount is emptied", () => {
    assert.deepEqual(prepareMoneySave("invoice", "", "USD"), {
      ok: true,
      value: { amount: null, currencyCode: null },
    });
    assert.deepEqual(prepareMoneySave("paid", "   ", "EUR"), {
      ok: true,
      value: { amount: null, currencyCode: null },
    });
  });

  it("accepts a comma decimal when the currency is set", () => {
    assert.deepEqual(prepareMoneySave("invoice", "500,50", "usd"), {
      ok: true,
      value: { amount: 500.5, currencyCode: "usd" },
    });
  });

  it("refuses a link that is not http(s) and does not build a save", () => {
    for (const bad of ["ftp://x", "example.com", "http://has space"]) {
      assert.deepEqual(prepareExternalUrl(bad), {
        ok: false,
        error: "Ссылка должна начинаться с http:// или https://",
      });
      assert.equal(isHttpUrl(bad), false);
    }
    assert.deepEqual(prepareExternalUrl("https://example.com/accounting/oms-921"), {
      ok: true,
      value: "https://example.com/accounting/oms-921",
    });
    assert.deepEqual(prepareExternalUrl("http://example.com"), {
      ok: true,
      value: "http://example.com",
    });
    assert.deepEqual(prepareExternalUrl("  "), { ok: true, value: null });
  });

  it("refuses meta text longer than 200 characters", () => {
    assert.deepEqual(prepareMetaText("а".repeat(201)), {
      ok: false,
      error: "Не длиннее 200 символов",
    });
    assert.deepEqual(prepareMetaText("а".repeat(200)), {
      ok: true,
      value: "а".repeat(200),
    });
    assert.deepEqual(prepareExternalUrl(`https://example.com/${"a".repeat(200)}`), {
      ok: false,
      error: "Не длиннее 200 символов",
    });
    assert.deepEqual(prepareMetaText(""), { ok: true, value: null });
  });
});
