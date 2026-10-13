/** Client delivery and accounting metadata of a customer order, from `store_customer_order_extras`. */

export const CLIENT_DELIVERY_PAYMENT_STATUSES = ["awaiting_invoice", "pending_payment", "paid"] as const;

export type ClientDeliveryPaymentStatus = (typeof CLIENT_DELIVERY_PAYMENT_STATUSES)[number];

export const CLIENT_DELIVERY_PAYMENT_STATUS_LABELS: Record<ClientDeliveryPaymentStatus, string> = {
  awaiting_invoice: "Счёт не выставлен",
  pending_payment: "Ожидается полная оплата",
  paid: "Оплачено",
};

export const EXTRAS_ERRORS = {
  invoiceCurrency: "Укажите валюту инвойса",
  paidCurrency: "Укажите валюту оплаты",
  negativeAmount: "Сумма не может быть отрицательной",
  amountNumber: "Сумма должна быть числом",
  url: "Ссылка должна начинаться с http:// или https://",
  tooLong: "Не длиннее 200 символов",
} as const;

export const META_TEXT_MAX = 200;

const HTTP_URL = /^https?:\/\/\S+$/i;

export type ClientDeliveryMoney = {
  amount: number | null;
  currencyCode: string | null;
};

export type ClientDelivery = {
  paymentStatus: ClientDeliveryPaymentStatus | null;
  invoice: ClientDeliveryMoney;
  paid: ClientDeliveryMoney;
  dueOn: string | null;
};

export type CustomerOrderMeta = {
  externalId: string | null;
  trackNumber: string | null;
  supplierOrderNumber: string | null;
  externalUrl: string | null;
};

export type CustomerOrderExtras = {
  updatedAt: string | null;
  clientDelivery: ClientDelivery;
  meta: CustomerOrderMeta;
};

export const EMPTY_CLIENT_DELIVERY: ClientDelivery = {
  paymentStatus: null,
  invoice: { amount: null, currencyCode: null },
  paid: { amount: null, currencyCode: null },
  dueOn: null,
};

export const EMPTY_CUSTOMER_ORDER_META: CustomerOrderMeta = {
  externalId: null,
  trackNumber: null,
  supplierOrderNumber: null,
  externalUrl: null,
};

export const EMPTY_CUSTOMER_ORDER_EXTRAS: CustomerOrderExtras = {
  updatedAt: null,
  clientDelivery: EMPTY_CLIENT_DELIVERY,
  meta: EMPTY_CUSTOMER_ORDER_META,
};

export type ExtrasSave<T> = { ok: true; value: T } | { ok: false; error: string };

export const isClientDeliveryPaymentStatus = (value: unknown): value is ClientDeliveryPaymentStatus =>
  value === "awaiting_invoice" || value === "pending_payment" || value === "paid";

/** Header badge, or null when the delivery status is empty. */
export const deliveryBadgeLabel = (status: ClientDeliveryPaymentStatus | null): string | null =>
  status ? `Доставка: ${CLIENT_DELIVERY_PAYMENT_STATUS_LABELS[status]}` : null;

export const isHttpUrl = (value: string | null | undefined): value is string =>
  typeof value === "string" && HTTP_URL.test(value);

const num = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const textOrNull = (value: unknown): string | null => {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
};

const record = (value: unknown): Record<string, unknown> | null =>
  value != null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** Maps `store_customer_order_extras`. A missing row is an empty form, not an error. */
export const mapCustomerOrderExtras = (payload: unknown): CustomerOrderExtras => {
  const row = record(payload);
  if (!row) return EMPTY_CUSTOMER_ORDER_EXTRAS;
  const delivery = record(row.client_delivery);
  const meta = record(row.meta);
  return {
    updatedAt: row.updated_at == null || row.updated_at === "" ? null : String(row.updated_at),
    clientDelivery: delivery
      ? {
          paymentStatus: isClientDeliveryPaymentStatus(delivery.payment_status) ? delivery.payment_status : null,
          invoice: {
            amount: num(delivery.invoice_amount),
            currencyCode: textOrNull(delivery.invoice_currency_code),
          },
          paid: {
            amount: num(delivery.paid_amount),
            currencyCode: textOrNull(delivery.paid_currency_code),
          },
          dueOn: delivery.due_on == null || delivery.due_on === "" ? null : String(delivery.due_on).slice(0, 10),
        }
      : EMPTY_CLIENT_DELIVERY,
    meta: meta
      ? {
          externalId: textOrNull(meta.external_id),
          trackNumber: textOrNull(meta.track_number),
          supplierOrderNumber: textOrNull(meta.supplier_order_number),
          externalUrl: textOrNull(meta.external_url),
        }
      : EMPTY_CUSTOMER_ORDER_META,
  };
};

/** «12 345,50» / «12345.5». A leading minus is the negative-amount error, not a generic parse failure. */
export const validateExtrasAmount = (raw: string): { amount: number | null; error: string | null } => {
  const trimmed = raw.trim();
  if (!trimmed) return { amount: null, error: null };
  const normalized = trimmed.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (normalized.startsWith("-")) return { amount: null, error: EXTRAS_ERRORS.negativeAmount };
  if (!/^\d+(\.\d+)?$/.test(normalized)) return { amount: null, error: EXTRAS_ERRORS.amountNumber };
  return { amount: Number(normalized), error: null };
};

/**
 * Empty amount clears the currency. An amount without a currency is refused.
 * `field` chooses the toast: invoice vs paid.
 */
export const prepareMoneySave = (
  field: "invoice" | "paid",
  rawAmount: string,
  currencyCode: string | null,
): ExtrasSave<ClientDeliveryMoney> => {
  const parsed = validateExtrasAmount(rawAmount);
  if (parsed.error) return { ok: false, error: parsed.error };
  if (parsed.amount == null) return { ok: true, value: { amount: null, currencyCode: null } };
  const currency = currencyCode?.trim() || null;
  if (!currency) {
    return { ok: false, error: field === "invoice" ? EXTRAS_ERRORS.invoiceCurrency : EXTRAS_ERRORS.paidCurrency };
  }
  return { ok: true, value: { amount: parsed.amount, currencyCode: currency } };
};

export const prepareMetaText = (raw: string): ExtrasSave<string | null> => {
  const value = raw.trim();
  if (!value) return { ok: true, value: null };
  if (value.length > META_TEXT_MAX) return { ok: false, error: EXTRAS_ERRORS.tooLong };
  return { ok: true, value };
};

/** Length first, then the http(s) check, so a long URL reports the length toast. */
export const prepareExternalUrl = (raw: string): ExtrasSave<string | null> => {
  const text = prepareMetaText(raw);
  if (!text.ok || text.value == null) return text;
  if (!isHttpUrl(text.value)) return { ok: false, error: EXTRAS_ERRORS.url };
  return text;
};
