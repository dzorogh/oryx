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

export const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === "string" && (CURRENCY_CODES as string[]).includes(value);
