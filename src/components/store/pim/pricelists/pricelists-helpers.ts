import type { KeyboardEvent as ReactKeyboardEvent } from "react";

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

export type DealerStatus = "available" | "unavailable";

export const DEALER_STATUSES: { value: DealerStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
];

export const DEALER_STATUS_LABELS: Record<DealerStatus, string> = {
  available: "Available",
  unavailable: "Unavailable",
};

export const isDealerStatus = (value: unknown): value is DealerStatus =>
  value === "available" || value === "unavailable";

export const SCOPE_QUERY_PARAM = "list";
export const REGION_QUERY_PARAM = "region";

export const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === "string" && (CURRENCY_CODES as string[]).includes(value);

export const toUsd = (amount: number | null, currency: CurrencyCode): number | null =>
  amount === null ? null : amount * CURRENCY_USD_RATE[currency];

/**
 * Inverse of {@link toUsd}: converts a USD amount back into its source currency.
 * Used by the editable USD columns, which let the user type a price in USD while
 * only the original-currency amount is stored. The result is the raw (unrounded)
 * value; callers round it to the precision they persist.
 */
export const fromUsd = (usdAmount: number | null, currency: CurrencyCode): number | null =>
  usdAmount === null ? null : usdAmount / CURRENCY_USD_RATE[currency];

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

export const formatMoney = (amount: number | null, currency: CurrencyCode): string =>
  amount === null ? "—" : `${formatNumber(amount)} ${currency}`;

export const formatUsd = (amount: number | null): string =>
  amount === null ? "—" : `${formatNumber(amount)} USD`;

/** USD conversion shown in its own column, suffixed with the `USD` code. */
export const formatUsdValue = (amount: number | null): string =>
  amount === null ? "—" : `${formatNumber(amount)} USD`;

/**
 * Markup is the percentage premium of the dealer price over the purchase price,
 * computed from their USD conversions so currencies cancel out. Returns null
 * when the purchase price is missing or non-positive (no meaningful base).
 */
export const computeMarkupPercent = (
  purchaseUsd: number | null,
  dealerUsd: number | null,
): number | null => {
  if (purchaseUsd === null || dealerUsd === null || purchaseUsd <= 0) {
    return null;
  }
  return ((dealerUsd - purchaseUsd) / purchaseUsd) * 100;
};

/**
 * Markup rendered in its own column as a rounded number suffixed with `%`.
 * Muted like USD since it is a derived value.
 */
export const formatMarkupValue = (percent: number | null): string =>
  percent === null ? "—" : `${formatNumber(percent)}%`;

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

/**
 * Dealer status is stored per product + region. The id shares the region +
 * variant namespace with prices but uses a distinct trailing segment so it can
 * live in its own collaboration map and editing-presence channel.
 */
export const buildStatusCellId = (regionId: string, variantId: string): string =>
  `${regionId}:${variantId}:dealerStatus`;

/**
 * Spreadsheet-style Enter navigation: moves focus to the editable cell directly
 * below within the same column. Cells opt in by tagging their `<input>` with a
 * shared `data-pricelist-col` key; the next input is resolved from DOM order,
 * which matches the visual row order. Returns silently for non-Enter keys or
 * when there is no cell below.
 */
export const focusNextPricelistCellOnEnter = (
  event: ReactKeyboardEvent<HTMLInputElement>,
): void => {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) {
    return;
  }

  const input = event.currentTarget;
  const columnKey = input.dataset.pricelistCol;
  if (!columnKey) {
    return;
  }

  event.preventDefault();

  const columnInputs = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[data-pricelist-col]"),
  ).filter((element) => element.dataset.pricelistCol === columnKey);

  const currentIndex = columnInputs.indexOf(input);
  if (currentIndex === -1) {
    return;
  }

  const nextInput = columnInputs[currentIndex + 1];
  if (!nextInput) {
    return;
  }

  nextInput.focus();
  nextInput.select();
};
