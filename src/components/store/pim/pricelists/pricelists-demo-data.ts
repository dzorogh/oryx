import { getVariantCatalogItems } from "../products/detail/product-detail-demo-data";
import type { StoreCatalogItem } from "../products/store-catalog-demo-data";
import {
  CURRENCY_USD_RATE,
  type CurrencyCode,
  type DealerStatus,
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
  global: "Plant prices and regional availability — the shared baseline every supplier and dealer list builds on.",
  supplier: "The full price chain for a region — from plant cost through dealer price to retail, with all markups editable in one place.",
  dealer: "Review retail prices for the region and manage the cost expenses that shape each product's margin.",
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

/**
 * Purchase and dealer prices are quoted in CNY (the supplier currency); only the
 * retail price defaults to the region's own currency.
 */
export const getDefaultCurrency = (field: PriceField, regionCurrency: CurrencyCode): CurrencyCode =>
  field === "retail" ? regionCurrency : "CNY";

const REGION_INDEX = new Map(PRICELIST_REGIONS.map((region, index) => [region.id, index]));

/** Deterministic pseudo-random value in [0, 1) from two integer seeds. */
const hashUnit = (a: number, b: number): number => {
  const h = ((a * 73856093) ^ (b * 19349663)) >>> 0;
  return (h % 100000) / 100000;
};

/**
 * Discrete markup steps (percent) the dealer price sits above the purchase
 * price. Fewer steps than regions on purpose, so a product repeats a few markups
 * across regions while still varying — some regions match, others differ.
 */
const DEALER_MARKUP_STEPS = [10, 15, 20, 25, 30, 35, 40];

/** Deterministic per product + region dealer markup over purchase, in [10, 40]%. */
const getDealerMarkupFactor = (row: PricelistRow, regionId: string): number => {
  const regionIndex = REGION_INDEX.get(regionId) ?? 0;
  const stepIndex = Math.min(
    DEALER_MARKUP_STEPS.length - 1,
    Math.floor(hashUnit(row.numericId, regionIndex + 991) * DEALER_MARKUP_STEPS.length),
  );
  return 1 + DEALER_MARKUP_STEPS[stepIndex] / 100;
};

/** Base USD amount per field before currency conversion. */
const getSeedUsdAmount = (row: PricelistRow, field: PriceField, regionId: string): number => {
  const baseUsd = getRowBaseUsd(row);
  if (field === "dealer") {
    // Dealer price is derived from the purchase price plus a regional markup so
    // the Markup column reads back as a clean 10–40% premium.
    return baseUsd * FIELD_FACTOR.purchase * getDealerMarkupFactor(row, regionId);
  }
  return baseUsd * FIELD_FACTOR[field];
};

/**
 * Deterministic seed value used until a cell is edited. Pure function of the
 * row, field, and region so every client sees identical defaults. The dealer
 * price varies per region (10–40% above purchase); purchase is region-agnostic.
 */
export const getSeedCellValue = (
  row: PricelistRow,
  field: PriceField,
  region: PricelistRegion,
): PricelistCellValue => {
  const currency = getDefaultCurrency(field, region.currency);
  const usd = getSeedUsdAmount(row, field, region.id);
  const amount = Math.max(1, Math.round(usd / CURRENCY_USD_RATE[currency]));
  return { amount, currency };
};

/**
 * Deterministic default dealer status per product + region.
 *
 * Each product gets its own "availability level" (0..10) derived from its id,
 * so the catalog spans the full range: some products are sold in no region at
 * all (level 0), some in every region (level 10), and the rest in between. For
 * a given product, a per-region hash decides whether that region clears the
 * product's availability threshold; regions that fall short are "unavailable".
 * Pure function of row + region so every client renders identical defaults
 * until the value is edited.
 */
export const getSeedDealerStatus = (row: PricelistRow, regionId: string): DealerStatus => {
  const regionIndex = REGION_INDEX.get(regionId) ?? 0;
  const availabilityThreshold = (row.numericId % 11) / 10;

  if (hashUnit(row.numericId, regionIndex) < availabilityThreshold) {
    return "available";
  }

  return "unavailable";
};
