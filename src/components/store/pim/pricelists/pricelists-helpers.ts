export type CurrencyCode =
  | "USD"
  | "CNY"
  | "EUR"
  | "RUB"
  | "AED"
  | "KZT"
  | "BYN"
  | "UZS"
  | "MXN"
  | "INR"
  | "OMR";

export const CURRENCY_CODES: CurrencyCode[] = [
  "CNY",
  "USD",
  "EUR",
  "RUB",
  "AED",
  "KZT",
  "BYN",
  "UZS",
  "MXN",
  "INR",
  "OMR",
];

/**
 * Value of one currency unit in USD. Captured 2026-06-02 as a demo constant —
 * rates are intentionally static and never refreshed at runtime.
 */
export const CURRENCY_USD_RATE: Record<CurrencyCode, number> = {
  USD: 1,
  CNY: 0.1466,
  EUR: 1.1646,
  RUB: 0.0141,
  AED: 0.2723,
  KZT: 0.00206,
  BYN: 0.3623,
  UZS: 0.0000833,
  MXN: 0.0577,
  INR: 0.01053,
  OMR: 2.6008,
};

export type PriceField = "purchase" | "dealer" | "retail";

export type PricelistCellValue = {
  amount: number | null;
  currency: CurrencyCode;
};

export const SCOPE_QUERY_PARAM = "list";
export const REGION_QUERY_PARAM = "region";

export const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === "string" && (CURRENCY_CODES as string[]).includes(value);

export const toUsd = (amount: number | null, currency: CurrencyCode): number | null =>
  amount === null ? null : amount * CURRENCY_USD_RATE[currency];

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

export const formatMoney = (amount: number | null, currency: CurrencyCode): string =>
  amount === null ? "—" : `${formatNumber(amount)} ${currency}`;

export const formatUsd = (amount: number | null): string =>
  amount === null ? "—" : `${formatNumber(amount)} USD`;

/** USD conversion shown in its own column: formatted like currency but without the code. */
export const formatUsdValue = (amount: number | null): string =>
  amount === null ? "—" : formatNumber(amount);

/** Same typography for editable amount and read-only primary price cells. */
export const PRICE_AMOUNT_TYPOGRAPHY = "text-sm font-normal tabular-nums text-foreground";

export const PRICE_AMOUNT_DISPLAY_CLASS = `block w-full text-left whitespace-nowrap ${PRICE_AMOUNT_TYPOGRAPHY}`;

/**
 * USD conversion is a derived/reference value, so it renders muted. The color
 * keeps it visually distinct from the primary price without relying on column
 * separators or a heavier font weight.
 */
export const PRICE_USD_DISPLAY_CLASS =
  "block w-full text-left whitespace-nowrap text-sm font-normal tabular-nums text-muted-foreground";

/**
 * Cell id is intentionally independent of the pricelist scope so a product's
 * price is shared across pricelists: purchase price is global per product,
 * while dealer and retail prices are shared per product + region.
 */
export const buildPriceCellId = (
  regionId: string | null,
  variantId: string,
  field: PriceField,
): string => `${regionId ?? "global"}:${variantId}:${field}`;
