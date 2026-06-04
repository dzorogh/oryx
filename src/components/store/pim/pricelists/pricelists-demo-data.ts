import { getVariantCatalogItems } from "../products/detail/product-detail-demo-data";
import type { StoreCatalogItem } from "../products/store-catalog-demo-data";
import {
  CURRENCY_USD_RATE,
  RETAIL_STATUSES,
  type CurrencyCode,
  type DealerStatus,
  type PriceField,
  type PricelistCellValue,
  type RetailStatus,
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

/** Region group (CIS, MENA, …) used to cluster regions for bulk management. */
export type PricelistRegionGroup = {
  id: string;
  label: string;
};

export const PRICELIST_REGION_GROUPS: PricelistRegionGroup[] = [
  { id: "cis", label: "CIS" },
  { id: "mena", label: "MENA" },
  { id: "europe", label: "Europe" },
  { id: "americas", label: "Americas" },
  { id: "apac", label: "APAC" },
];

export const getRegionGroupById = (groupId: string): PricelistRegionGroup =>
  PRICELIST_REGION_GROUPS.find((group) => group.id === groupId) ?? PRICELIST_REGION_GROUPS[0];

export type PricelistRegion = {
  id: string;
  label: string;
  currency: CurrencyCode;
  /** Region group this region belongs to (references PRICELIST_REGION_GROUPS). */
  group: string;
};

/** First region is selected by default. Currency = the region's default retail currency. */
export const PRICELIST_REGIONS: PricelistRegion[] = [
  { id: "ae", label: "United Arab Emirates", currency: "AED", group: "mena" },
  { id: "ru", label: "Russia", currency: "RUB", group: "cis" },
  { id: "kz", label: "Kazakhstan", currency: "KZT", group: "cis" },
  { id: "by", label: "Belarus", currency: "BYN", group: "cis" },
  { id: "uz", label: "Uzbekistan", currency: "UZS", group: "cis" },
  { id: "mx", label: "Mexico", currency: "MXN", group: "americas" },
  { id: "de", label: "Germany", currency: "EUR", group: "europe" },
  { id: "us", label: "United States", currency: "USD", group: "americas" },
  { id: "in", label: "India", currency: "INR", group: "apac" },
  { id: "om", label: "Oman", currency: "OMR", group: "mena" },
];

export const DEFAULT_REGION_ID = PRICELIST_REGIONS[0].id;

export const getRegionById = (regionId: string): PricelistRegion =>
  PRICELIST_REGIONS.find((region) => region.id === regionId) ?? PRICELIST_REGIONS[0];

/** Regions clustered by their group, preserving both group and region order. */
export const getRegionsByGroup = (): { group: PricelistRegionGroup; regions: PricelistRegion[] }[] =>
  PRICELIST_REGION_GROUPS.map((group) => ({
    group,
    regions: PRICELIST_REGIONS.filter((region) => region.group === group.id),
  })).filter((entry) => entry.regions.length > 0);

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

/**
 * Deterministic default retail status per product + region. Weighted toward the
 * common "Available for sale" / "Draft" states so the demo looks realistic,
 * while still spanning the full dictionary. Pure function of row + region.
 */
export const getSeedRetailStatus = (row: PricelistRow, regionId: string): RetailStatus => {
  const regionIndex = REGION_INDEX.get(regionId) ?? 0;
  const index = Math.floor(hashUnit(row.numericId + 17, regionIndex + 31) * RETAIL_STATUSES.length);
  return RETAIL_STATUSES[Math.min(index, RETAIL_STATUSES.length - 1)].value;
};

/**
 * Read-only source columns pulled from the product/variant card (sections
 * 1.1 / 2.1 / 3.1 of the spec). In this demo they are deterministic functions
 * of the row, mirroring how prices fall back to seeds.
 */
export type PricelistInfoField =
  | "plantModelName"
  | "plant"
  | "dimension"
  | "cbmPerUnit"
  | "capacityPerContainer";

/** Short plant code → full plant name, shown in a tooltip (global/supplier only). */
const PLANT_FULL_NAMES: Record<string, string> = {
  "SH-21": "Shanghai Assembly Plant 21",
  "SH-33": "Shenzhen Assembly Plant 33",
  "SH-40": "Shenyang Assembly Plant 40",
  "SH-53": "Shanghai Assembly Plant 53",
};

/** Full plant name for the short code's tooltip; falls back to a generic label. */
export const getPlantFullName = (code: string): string => PLANT_FULL_NAMES[code] ?? `Plant ${code}`;

/** Deterministic package dimensions (in metres) derived from the row id. */
const getSeedDimensions = (row: PricelistRow): { length: number; width: number; height: number } => {
  const n = row.numericId;
  return {
    length: 1 + (n % 12) * 0.1,
    width: 0.8 + (n % 7) * 0.1,
    height: 0.5 + (n % 5) * 0.1,
  };
};

const formatDimension = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

export const getSeedPlantModelName = (row: PricelistRow): string => `${row.family} ${row.sku}`;

export const getSeedDimension = (row: PricelistRow): string => {
  const { length, width, height } = getSeedDimensions(row);
  return `${formatDimension(length)} × ${formatDimension(width)} × ${formatDimension(height)}`;
};

/** Cubic metres per unit, rounded to 4 decimals (computed from the dimensions). */
export const getSeedCbmPerUnit = (row: PricelistRow): number => {
  const { length, width, height } = getSeedDimensions(row);
  return Math.round(length * width * height * 10000) / 10000;
};

/** Units per full container, derived from the per-unit volume (≈60 m³ usable). */
export const getSeedCapacityPerContainer = (row: PricelistRow): number => {
  const cbm = getSeedCbmPerUnit(row);
  return cbm > 0 ? Math.max(1, Math.floor(60 / cbm)) : 0;
};

/** Formatted display value for a read-only info column. */
export const getInfoFieldValue = (row: PricelistRow, field: PricelistInfoField): string => {
  switch (field) {
    case "plantModelName":
      return getSeedPlantModelName(row);
    case "plant":
      return row.productionSite;
    case "dimension":
      return getSeedDimension(row);
    case "cbmPerUnit":
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(getSeedCbmPerUnit(row));
    case "capacityPerContainer":
      return new Intl.NumberFormat("en-US").format(getSeedCapacityPerContainer(row));
    default:
      return "";
  }
};
