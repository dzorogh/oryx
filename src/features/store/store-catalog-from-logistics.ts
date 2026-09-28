import type {
  CatalogRegionPrices,
  CatalogRegionStatuses,
  DealerStatus,
  RetailStatus,
  StoreCatalogItem,
} from "@/components/store/pim/products/store-catalog-demo-data";
import type { CurrencyCode } from "@/components/store/pim/pricelists/pricelists-helpers";
import { isCurrencyCode, isDealerStatus, isRetailStatus } from "@/components/store/pim/pricelists/pricelists-helpers";
import { loadLogisticsSettings } from "@/features/logistics/logistics-api";
import { formatEntityCode } from "@/lib/entity-codes";
import { preferKorportalMediaConversion } from "@/lib/korportal-media-url";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const hashSeed = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const CATEGORY_BY_TOKEN: Array<{ tokens: string[]; categoryId: string; category: string; family: string }> = [
  { tokens: ["XFORCE", "FORCE"], categoryId: "atv-4x4", category: "4x4", family: "Force" },
  { tokens: ["PREDATOR", "5000"], categoryId: "atv-side-by-side", category: "Side-by-Side", family: "Utility" },
  { tokens: ["CROSS"], categoryId: "off-road-enduro", category: "Enduro", family: "Cross" },
  { tokens: ["ENDURO"], categoryId: "off-road-enduro", category: "Enduro", family: "Enduro" },
  { tokens: ["VESPITO", "SCOOTER", "MOPED"], categoryId: "road-scooter", category: "Scooter", family: "Scooter" },
  { tokens: ["CUSTOM"], categoryId: "road-custom-bike", category: "Custom Bike", family: "Custom" },
  { tokens: ["GP", "GL", "RR", "RST", "FX", "BANDIT", "PHANTOM"], categoryId: "road-street-bike", category: "Street Bike", family: "Road" },
  { tokens: ["JUNIOR", "SPORT", "POWER", "EXPERT", "CRUISER", "HUMMER", "ACTIVATOR", "RAIZER"], categoryId: "atv-4x2", category: "4x2", family: "ATV" },
];

export const inferCatalogCategory = (
  id: string,
  name: string,
): { categoryId: string; category: string; family: string } => {
  const haystack = `${id} ${name}`.toUpperCase();
  const match = CATEGORY_BY_TOKEN.find((entry) => entry.tokens.some((token) => haystack.includes(token)));
  if (match) {
    const family = name.split(/\s+/)[0] || match.family;
    return { categoryId: match.categoryId, category: match.category, family };
  }
  const family = name.split(/\s+/)[0] || "Equipment";
  return { categoryId: "atv-4x4", category: "4x4", family };
};

export const inferDemoDealerPrice = (seed: string): number => 2490 + (hashSeed(seed) % 90) * 100;

export const productImageUrl = (_seed: string, imageUrl?: string | null): string | null =>
  preferKorportalMediaConversion(imageUrl);

type VariantRow = {
  id: string | number;
  product_id: string | number;
  name: string;
  image_url?: string | null;
  plant_id?: string | number | null;
};

type PriceRow = {
  product_variant_id: string | number;
  price_kind: string;
  region_id: string | number | null;
  currency_id: string | number;
  amount: number | string;
  active: boolean;
};

type StatusRow = {
  product_variant_id: string | number;
  region_id: string | number;
  dealer_status: string;
  retail_status: string;
};

type CurrencyRow = { id: number | string; code: string };
type RegionRow = { id: number | string; code: string };

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const catalogProductionSite = (
  plantId: string | number | null | undefined,
): string => {
  if (plantId == null || plantId === "") return "—";
  return formatEntityCode("plant", plantId);
};

export const mapLogisticsProductToCatalogItem = (
  row: VariantRow,
  productionSite: string,
  dealerPrice: number | null,
  retailPrice: number | null,
  extras?: {
    dealerStatus?: DealerStatus;
    retailStatus?: RetailStatus;
    dealerCurrency?: CurrencyCode | null;
    retailCurrency?: CurrencyCode | null;
    regionPrices?: Record<string, CatalogRegionPrices>;
    regionStatuses?: Record<string, CatalogRegionStatuses>;
  },
): StoreCatalogItem => {
  const id = String(row.id);
  const inferred = inferCatalogCategory(id, row.name);
  return {
    id,
    productId: String(row.product_id),
    name: row.name,
    code: formatEntityCode("product", id),
    imageSrc: productImageUrl(id, row.image_url) ?? "",
    imageAlt: row.name,
    categoryId: inferred.categoryId,
    category: inferred.category,
    family: inferred.family,
    brand: "Oryx",
    stock: 0,
    updatedAt: "2026-09-01T00:00:00.000Z",
    dealerPrice,
    retailPrice,
    dealerCurrency: extras?.dealerCurrency ?? null,
    retailCurrency: extras?.retailCurrency ?? null,
    dealerStatus: extras?.dealerStatus ?? "available",
    retailStatus: extras?.retailStatus ?? "available",
    productionSite,
    regionPrices: extras?.regionPrices,
    regionStatuses: extras?.regionStatuses,
  };
};

export type RegionPricing = {
  pricesByVariant: Map<string, Record<string, CatalogRegionPrices>>;
  statusesByVariant: Map<string, Record<string, CatalogRegionStatuses>>;
};

/**
 * Dealer/retail prices and statuses of every region, keyed by variant id and region code.
 * Pass `variantIds` to read only those variants (product card). Returns null when Supabase is unset.
 */
export const loadRegionPricing = async (variantIds?: readonly string[]): Promise<RegionPricing | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }
  const ids = variantIds?.map(Number);

  const [priceRows, statusRows, currenciesResult, regionsResult] = await Promise.all([
    fetchAllRows<PriceRow>((from, to) => {
      const query = client
        .from("store_product_price")
        .select("product_variant_id,price_kind,region_id,currency_id,amount,active")
        .eq("active", true)
        .not("region_id", "is", null);
      return (ids ? query.in("product_variant_id", ids) : query).order("id", { ascending: true }).range(from, to);
    }),
    fetchAllRows<StatusRow>((from, to) => {
      const query = client
        .from("store_product_region_status")
        .select("product_variant_id,region_id,dealer_status,retail_status");
      return (ids ? query.in("product_variant_id", ids) : query).order("id", { ascending: true }).range(from, to);
    }),
    client.from("store_currency").select("id,code").is("deleted_at", null),
    client.from("store_region").select("id,code").is("deleted_at", null).eq("active", true),
  ]);

  if (currenciesResult.error) {
    throw new Error(currenciesResult.error.message);
  }
  if (regionsResult.error) {
    throw new Error(regionsResult.error.message);
  }

  const currencyCodeById = new Map(
    ((currenciesResult.data ?? []) as CurrencyRow[]).map((row) => [String(row.id), row.code]),
  );
  const regionCodeById = new Map(
    ((regionsResult.data ?? []) as RegionRow[]).map((row) => [String(row.id), row.code]),
  );

  const pricesByVariant = new Map<string, Record<string, CatalogRegionPrices>>();
  for (const row of priceRows) {
    if (row.price_kind !== "dealer" && row.price_kind !== "retail") continue;
    const amount = toNumber(row.amount);
    const currencyRaw = currencyCodeById.get(String(row.currency_id));
    const regionCode = regionCodeById.get(String(row.region_id));
    if (amount == null || !currencyRaw || !isCurrencyCode(currencyRaw) || !regionCode) continue;
    const variantId = String(row.product_variant_id);
    const current = pricesByVariant.get(variantId) ?? {};
    const regionPrices = current[regionCode] ?? { dealer: null, retail: null };
    regionPrices[row.price_kind] = { amount, currency: currencyRaw };
    current[regionCode] = regionPrices;
    pricesByVariant.set(variantId, current);
  }

  const statusesByVariant = new Map<string, Record<string, CatalogRegionStatuses>>();
  for (const row of statusRows) {
    const regionCode = regionCodeById.get(String(row.region_id));
    if (!regionCode) continue;
    if (!isDealerStatus(row.dealer_status) || !isRetailStatus(row.retail_status)) continue;
    const variantId = String(row.product_variant_id);
    const current = statusesByVariant.get(variantId) ?? {};
    current[regionCode] = { dealer: row.dealer_status, retail: row.retail_status };
    statusesByVariant.set(variantId, current);
  }

  return { pricesByVariant, statusesByVariant };
};

/** Loads variants + prices/statuses for all regions. Returns null when Supabase is unset. */
export const loadDbCatalogItems = async (): Promise<StoreCatalogItem[] | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  const [, variants, pricing] = await Promise.all([
    loadLogisticsSettings(),
    fetchAllRows<VariantRow>((from, to) =>
      client
        .from("store_product_variant")
        .select("id,product_id,name,image_url,plant_id")
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(from, to),
    ),
    loadRegionPricing(),
  ]);

  if (!pricing) {
    return null;
  }

  return variants.map((row) => {
    const id = String(row.id);
    const regionPrices = pricing.pricesByVariant.get(id);
    const regionStatuses = pricing.statusesByVariant.get(id);
    return mapLogisticsProductToCatalogItem(
      row,
      catalogProductionSite(row.plant_id),
      null,
      null,
      {
        regionPrices,
        regionStatuses,
        dealerStatus: "unavailable",
        retailStatus: "draft",
      },
    );
  });
};
