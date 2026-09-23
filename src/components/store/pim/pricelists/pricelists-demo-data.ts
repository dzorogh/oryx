// english-ui:ignore-file
import { getVariantCatalogItems } from "../products/detail/product-detail-demo-data";
import type { StoreCatalogItem } from "../products/store-catalog-demo-data";
import type { PricelistDbBootstrap } from "@/features/store/store-pricelists-from-db";
import {
  buildPriceCellId,
  buildRetailStatusCellId,
  buildStatusCellId,
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
  global: "Глобальный",
  supplier: "Поставщик",
  dealer: "Дилер",
};

export const PRICELIST_SCOPE_DESCRIPTIONS: Record<PricelistScope, string> = {
  global: "Заводские цены и доступность по регионам — общая база для списков поставщика и дилера.",
  supplier: "Полная цепочка цен региона: от заводской себестоимости через дилерскую до розничной, с наценками в одном месте.",
  dealer: "Розничные цены региона и расходы, из которых складывается маржа по каждому товару.",
};

export const parsePricelistScope = (value: string | null | undefined): PricelistScope =>
  value === "supplier" || value === "dealer" ? value : "global";

export const scopeHasRegion = (scope: PricelistScope): boolean => scope !== "global";

/** Region group (CIS, MENA, …) used to cluster regions for bulk management. */
export type PricelistRegionGroup = {
  id: string;
  label: string;
};

const FALLBACK_REGION_GROUPS: PricelistRegionGroup[] = [
  { id: "cis", label: "СНГ" },
  { id: "mena", label: "Ближний Восток и Северная Африка" },
  { id: "europe", label: "Европа" },
  { id: "americas", label: "Америка" },
  { id: "apac", label: "Азиатско-Тихоокеанский регион" },
];

export type PricelistRegion = {
  id: string;
  label: string;
  currency: CurrencyCode;
  /** Region group this region belongs to (references region groups). */
  group: string;
};

const FALLBACK_REGIONS: PricelistRegion[] = [
  { id: "ae", label: "ОАЭ", currency: "AED", group: "mena" },
  { id: "ru", label: "Россия", currency: "RUB", group: "cis" },
  { id: "kz", label: "Казахстан", currency: "KZT", group: "cis" },
  { id: "by", label: "Беларусь", currency: "BYN", group: "cis" },
  { id: "uz", label: "Узбекистан", currency: "UZS", group: "cis" },
  { id: "mx", label: "Мексика", currency: "MXN", group: "americas" },
  { id: "de", label: "Германия", currency: "EUR", group: "europe" },
  { id: "us", label: "США", currency: "USD", group: "americas" },
  { id: "in", label: "Индия", currency: "INR", group: "apac" },
  { id: "om", label: "Оман", currency: "OMR", group: "mena" },
];

let dbBootstrap: PricelistDbBootstrap | null = null;
let pricelistRowsCache: PricelistRow[] | null = null;

/** Apply relational Store pricing catalogs; clears row cache. */
export const applyPricelistDbBootstrap = (bootstrap: PricelistDbBootstrap | null) => {
  dbBootstrap = bootstrap;
  pricelistRowsCache = null;
};

export const getPricelistRegionGroups = (): PricelistRegionGroup[] =>
  dbBootstrap?.groups.length ? dbBootstrap.groups : FALLBACK_REGION_GROUPS;

/** Offline fallback list; prefer getPricelistRegionGroups() at runtime. */
export const PRICELIST_REGION_GROUPS = FALLBACK_REGION_GROUPS;

export const getRegionGroupById = (groupId: string): PricelistRegionGroup =>
  getPricelistRegionGroups().find((group) => group.id === groupId) ?? getPricelistRegionGroups()[0];

export const getPricelistRegions = (): PricelistRegion[] =>
  dbBootstrap?.regions.length
    ? dbBootstrap.regions.map(({ id, label, currency, group }) => ({ id, label, currency, group }))
    : FALLBACK_REGIONS;

/** Offline fallback list; prefer getPricelistRegions() at runtime. */
export const PRICELIST_REGIONS = FALLBACK_REGIONS;

export const DEFAULT_REGION_ID = FALLBACK_REGIONS[0].id;

export const getRegionById = (regionId: string): PricelistRegion =>
  getPricelistRegions().find((region) => region.id === regionId) ?? getPricelistRegions()[0];

/** Regions clustered by their group, preserving both group and region order. */
export const getRegionsByGroup = (): { group: PricelistRegionGroup; regions: PricelistRegion[] }[] =>
  getPricelistRegionGroups()
    .map((group) => ({
      group,
      regions: getPricelistRegions().filter((region) => region.group === group.id),
    }))
    .filter((entry) => entry.regions.length > 0);

export const parseRegionId = (value: string | null | undefined): string => {
  const regions = getPricelistRegions();
  return regions.some((region) => region.id === value)
    ? (value as string)
    : (regions[0]?.id ?? DEFAULT_REGION_ID);
};

export type PricelistRow = StoreCatalogItem & { numericId: number };

/** Variant rows enriched with a stable numeric id shown in the Name column. */
export const getPricelistRows = (): PricelistRow[] => {
  if (pricelistRowsCache) {
    return pricelistRowsCache;
  }

  if (dbBootstrap?.rows.length) {
    pricelistRowsCache = dbBootstrap.rows;
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

const regionIndexMap = (): Map<string, number> =>
  new Map(getPricelistRegions().map((region, index) => [region.id, index]));

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
  const regionIndex = regionIndexMap().get(regionId) ?? 0;
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
    return baseUsd * FIELD_FACTOR.purchase * getDealerMarkupFactor(row, regionId);
  }
  return baseUsd * FIELD_FACTOR[field];
};

/**
 * Relational Store price when present; otherwise deterministic offline seed.
 * Collab overlays still win at call sites via `collab.getCell(...) ?? getSeed…`.
 */
export const getSeedCellValue = (
  row: PricelistRow,
  field: PriceField,
  region: PricelistRegion,
): PricelistCellValue => {
  const fromDb = dbBootstrap?.prices.get(
    buildPriceCellId(field === "purchase" ? null : region.id, row.id, field),
  );
  if (fromDb) {
    return fromDb;
  }
  const currency = getDefaultCurrency(field, region.currency);
  const usd = getSeedUsdAmount(row, field, region.id);
  const amount = Math.max(1, Math.round(usd / CURRENCY_USD_RATE[currency]));
  return { amount, currency };
};

/** Relational dealer status when present; otherwise deterministic offline seed. */
export const getSeedDealerStatus = (row: PricelistRow, regionId: string): DealerStatus => {
  const fromDb = dbBootstrap?.dealerStatuses.get(buildStatusCellId(regionId, row.id));
  if (fromDb) {
    return fromDb;
  }
  const regionIndex = regionIndexMap().get(regionId) ?? 0;
  const availabilityThreshold = (row.numericId % 11) / 10;

  if (hashUnit(row.numericId, regionIndex) < availabilityThreshold) {
    return "available";
  }

  return "unavailable";
};

/** Relational retail status when present; otherwise deterministic offline seed. */
export const getSeedRetailStatus = (row: PricelistRow, regionId: string): RetailStatus => {
  const fromDb = dbBootstrap?.retailStatuses.get(buildRetailStatusCellId(regionId, row.id));
  if (fromDb) {
    return fromDb;
  }
  const regionIndex = regionIndexMap().get(regionId) ?? 0;
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
