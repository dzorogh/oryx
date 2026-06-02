import { getVariantCatalogItems } from "../products/detail/product-detail-demo-data";
import type { StoreCatalogItem } from "../products/store-catalog-demo-data";
import {
  CURRENCY_USD_RATE,
  type CurrencyCode,
  type PriceField,
  type PricelistCellValue,
} from "./pricelists-helpers";

export type PricelistScope = "global" | "supplier" | "dealer";

export const PRICELIST_SCOPES: PricelistScope[] = ["global", "supplier", "dealer"];

export const PRICELIST_SCOPE_LABELS: Record<PricelistScope, string> = {
  global: "Global",
  supplier: "Supplier",
  dealer: "Dealer",
};

export const PRICELIST_SCOPE_DESCRIPTIONS: Record<PricelistScope, string> = {
  global: "Base purchase prices shared across all suppliers and regions.",
  supplier: "Supplier purchase, dealer, and retail prices per region.",
  dealer: "Dealer and retail prices offered to a specific region.",
};

export const parsePricelistScope = (value: string | null | undefined): PricelistScope =>
  value === "supplier" || value === "dealer" ? value : "global";

export const scopeHasRegion = (scope: PricelistScope): boolean => scope !== "global";

export type PricelistRegion = {
  id: string;
  label: string;
  currency: CurrencyCode;
};

/** First region is selected by default. Currency = the region's default retail currency. */
export const PRICELIST_REGIONS: PricelistRegion[] = [
  { id: "ae", label: "United Arab Emirates", currency: "AED" },
  { id: "ru", label: "Russia", currency: "RUB" },
  { id: "kz", label: "Kazakhstan", currency: "KZT" },
  { id: "by", label: "Belarus", currency: "BYN" },
  { id: "uz", label: "Uzbekistan", currency: "UZS" },
  { id: "mx", label: "Mexico", currency: "MXN" },
  { id: "de", label: "Germany", currency: "EUR" },
  { id: "us", label: "United States", currency: "USD" },
  { id: "in", label: "India", currency: "INR" },
  { id: "om", label: "Oman", currency: "OMR" },
];

export const DEFAULT_REGION_ID = PRICELIST_REGIONS[0].id;

export const getRegionById = (regionId: string): PricelistRegion =>
  PRICELIST_REGIONS.find((region) => region.id === regionId) ?? PRICELIST_REGIONS[0];

export const parseRegionId = (value: string | null | undefined): string =>
  PRICELIST_REGIONS.some((region) => region.id === value) ? (value as string) : DEFAULT_REGION_ID;

export type PricelistRow = StoreCatalogItem & { numericId: number };

let pricelistRowsCache: PricelistRow[] | null = null;

/** Variant rows enriched with a stable numeric id shown in the Name column. */
export const getPricelistRows = (): PricelistRow[] => {
  if (pricelistRowsCache) {
    return pricelistRowsCache;
  }

  pricelistRowsCache = getVariantCatalogItems().map((item, index) => ({
    ...item,
    numericId: 1000 + index,
  }));

  return pricelistRowsCache;
};

const FIELD_FACTOR: Record<PriceField, number> = {
  purchase: 0.55,
  dealer: 0.8,
  retail: 1,
};

const getRowBaseUsd = (row: PricelistRow): number => {
  const known = row.retailPrice ?? row.dealerPrice;
  if (known && known > 0) {
    return known;
  }
  return 200 + (row.numericId % 50) * 30;
};

export const getDefaultCurrency = (field: PriceField, regionCurrency: CurrencyCode): CurrencyCode =>
  field === "purchase" ? "CNY" : regionCurrency;

/**
 * Deterministic seed value used until a cell is edited. Pure function of the
 * row, field, and region currency so every client sees identical defaults.
 */
export const getSeedCellValue = (
  row: PricelistRow,
  field: PriceField,
  regionCurrency: CurrencyCode,
): PricelistCellValue => {
  const currency = getDefaultCurrency(field, regionCurrency);
  const usd = getRowBaseUsd(row) * FIELD_FACTOR[field];
  const amount = Math.max(1, Math.round(usd / CURRENCY_USD_RATE[currency]));
  return { amount, currency };
};
