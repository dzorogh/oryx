/** Money of a production order or customer order: currency, rates snapshot, amount, payment schedule. */

export type PaymentStatus = "planned" | "invoiced" | "paid";

export const PAYMENT_STATUSES: readonly PaymentStatus[] = ["planned", "invoiced", "paid"];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  planned: "Запланирован",
  invoiced: "Выставлен счёт",
  paid: "Оплачен",
};

/** Units of currency per 1 USD, keyed by currency code. USD = 1. */
export type OrderRates = Record<string, number>;

export type OrderMoney = {
  documentId: string;
  currencyCode: string;
  /** Explicit order amount in the order currency; null — use the estimated cost. */
  amount: number | null;
  rates: OrderRates;
};

export type OrderPayment = {
  id: string;
  documentId: string;
  dueOn: string;
  amount: number;
  status: PaymentStatus;
};

export type OrderCurrency = { id: string; code: string; name: string };

/** Line price facts: `unitPrice × quantity` in `currencyCode` (null — order currency). */
export type MoneyLine = { unitPrice: number | null; quantity: number; currencyCode: string | null };

/** Pre-summed line totals per currency (calendar payload). */
export type MoneyLineTotal = { currencyCode: string | null; total: number };

/** Amounts below this are treated as zero (rounding of 4-decimal storage). */
export const MONEY_EPSILON = 0.005;

export const isPaymentStatus = (value: unknown): value is PaymentStatus =>
  value === "planned" || value === "invoiced" || value === "paid";

/** `amount / rate[from] * rate[to]`; null when a rate is missing from the snapshot. */
export const convert = (amount: number, from: string, to: string, rates: OrderRates): number | null => {
  if (from === to) return amount;
  const rateFrom = rates[from];
  const rateTo = rates[to];
  if (!(rateFrom > 0) || !(rateTo > 0)) return null;
  return (amount / rateFrom) * rateTo;
};

/** Σ lines converted to the order currency by the order snapshot. A line without a price adds 0. */
export const estimatedCost = (lines: MoneyLine[], orderCurrency: string, rates: OrderRates): number => {
  let sum = 0;
  for (const line of lines) {
    if (line.unitPrice == null) continue;
    sum += convert(line.unitPrice * line.quantity, line.currencyCode ?? orderCurrency, orderCurrency, rates) ?? 0;
  }
  return sum;
};

/** Same as `estimatedCost` for totals already summed per line currency. */
export const estimatedCostFromTotals = (
  totals: MoneyLineTotal[],
  orderCurrency: string,
  rates: OrderRates,
): number =>
  totals.reduce(
    (sum, row) => sum + (convert(row.total, row.currencyCode ?? orderCurrency, orderCurrency, rates) ?? 0),
    0,
  );

/** Order amount; empty — the estimated cost. */
export const orderTotal = (amount: number | null, estimated: number): number => amount ?? estimated;

/** Σ of all payments, paid included. */
export const allocatedAmount = (payments: Array<Pick<OrderPayment, "amount">>): number =>
  payments.reduce((sum, payment) => sum + payment.amount, 0);

/** Order amount minus all payments. Negative when payments exceed the amount. */
export const unallocated = (total: number, payments: Array<Pick<OrderPayment, "amount">>): number => {
  const rest = total - allocatedAmount(payments);
  return Math.abs(rest) < MONEY_EPSILON ? 0 : rest;
};

export const todayIso = (today: Date = new Date()): string =>
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

export const isPaymentOverdue = (
  payment: Pick<OrderPayment, "dueOn" | "status">,
  today: string = todayIso(),
): boolean => payment.status !== "paid" && payment.dueOn < today;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  CNY: "¥",
  RUB: "₽",
};

export const currencySymbol = (code: string): string => CURRENCY_SYMBOLS[code] ?? code;

const groupedNumber = (value: number, fractionDigits: number): string =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);

/** «12 345,5 ¥». `compact` rounds to whole units for dense cells. */
export const formatOrderMoney = (
  amount: number,
  currencyCode: string,
  options: { compact?: boolean } = {},
): string => {
  const value = Math.abs(amount) < MONEY_EPSILON ? 0 : amount;
  const text = groupedNumber(value, options.compact ? 0 : 2).replace("-", "−");
  return `${text} ${currencySymbol(currencyCode)}`;
};

/** Plain number for inputs: dot decimal, no grouping. */
export const formatMoneyInput = (amount: number | null): string => {
  if (amount == null) return "";
  return String(Math.round(amount * 100) / 100);
};

/** Parses «12 345,50» / «12345.5»; null for empty or invalid. */
export const parseMoneyInput = (raw: string): number | null => {
  const normalized = raw.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

export const FLOATRATES_URL = "https://www.floatrates.com/daily/usd.json";

/**
 * Current rates from floatrates (units per 1 USD), USD = 1. Without `codes` — every currency of the answer;
 * the create RPC keeps only `store_currency` codes. Returns null when the API is unreachable or answers garbage.
 */
export const fetchFloatRates = async (
  options: { codes?: string[]; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<OrderRates | null> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs ?? 6000) : null;
  try {
    const response = await fetchImpl(FLOATRATES_URL, { signal: controller?.signal });
    if (!response.ok) return null;
    const body = (await response.json()) as Record<string, { code?: unknown; rate?: unknown }> | null;
    if (!body || typeof body !== "object") return null;
    const wanted = options.codes ? new Set(options.codes.map((code) => code.toUpperCase())) : null;
    const rates: OrderRates = { USD: 1 };
    for (const entry of Object.values(body)) {
      const code = typeof entry?.code === "string" ? entry.code.toUpperCase() : "";
      const rate = Number(entry?.rate);
      if (!code || code === "USD" || (wanted && !wanted.has(code))) continue;
      if (Number.isFinite(rate) && rate > 0) rates[code] = rate;
    }
    return Object.keys(rates).length > 1 ? rates : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const asNumberOrNull = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const mapOrderRates = (raw: unknown): OrderRates => {
  const rates: OrderRates = {};
  if (!raw || typeof raw !== "object") return rates;
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = asNumberOrNull(value);
    if (n != null && n > 0) rates[code.toUpperCase()] = n;
  }
  return rates;
};

export type OrderMoneyContext = {
  money: OrderMoney | null;
  payments: OrderPayment[];
  currencies: OrderCurrency[];
};

/** Maps `order_money` / `order_payments` / `currencies` of `store_document_context`. */
export const mapOrderMoneyContext = (payload: {
  order_money?: unknown;
  order_payments?: unknown;
  currencies?: unknown;
}): OrderMoneyContext => {
  const raw = payload.order_money as Record<string, unknown> | null | undefined;
  const money: OrderMoney | null =
    raw && typeof raw === "object"
      ? {
          documentId: String(raw.document_id ?? ""),
          currencyCode: String(raw.currency_code ?? "USD"),
          amount: asNumberOrNull(raw.amount),
          rates: mapOrderRates(raw.rates),
        }
      : null;
  const payments: OrderPayment[] = (Array.isArray(payload.order_payments) ? payload.order_payments : []).flatMap(
    (item) => {
      const row = item as Record<string, unknown>;
      if (!isPaymentStatus(row.status)) return [];
      return [
        {
          id: String(row.id),
          documentId: String(row.document_id ?? ""),
          dueOn: String(row.due_on ?? "").slice(0, 10),
          amount: asNumberOrNull(row.amount) ?? 0,
          status: row.status,
        },
      ];
    },
  );
  const currencies: OrderCurrency[] = (Array.isArray(payload.currencies) ? payload.currencies : []).map((item) => {
    const row = item as Record<string, unknown>;
    return { id: String(row.id), code: String(row.code), name: String(row.name ?? row.code) };
  });
  return { money, payments, currencies };
};

/** Line facts the money helpers read from a document snapshot. */
export type MoneySnapshotLine = {
  documentId: string;
  unitPrice: number | null;
  quantity: number;
  currencyId: string | null;
};

/** Price facts of a document's lines, currency ids resolved to codes. */
export const orderMoneyLines = (
  snapshot: { documentProductLines: MoneySnapshotLine[] },
  documentId: string,
  context: Pick<OrderMoneyContext, "currencies">,
): MoneyLine[] => {
  const codeById = new Map(context.currencies.map((currency) => [currency.id, currency.code]));
  return snapshot.documentProductLines
    .filter((line) => line.documentId === documentId)
    .map((line) => ({
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      currencyCode: line.currencyId ? codeById.get(line.currencyId) ?? null : null,
    }));
};

export type OrderMoneySummary = {
  currencyCode: string;
  estimated: number;
  total: number;
  rest: number;
};

export const summarizeOrderMoney = (
  snapshot: { documentProductLines: MoneySnapshotLine[] },
  documentId: string,
  context: OrderMoneyContext,
): OrderMoneySummary | null => {
  const { money } = context;
  if (!money) return null;
  const estimated = estimatedCost(orderMoneyLines(snapshot, documentId, context), money.currencyCode, money.rates);
  const total = orderTotal(money.amount, estimated);
  return { currencyCode: money.currencyCode, estimated, total, rest: unallocated(total, context.payments) };
};
