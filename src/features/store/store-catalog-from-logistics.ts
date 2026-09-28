import type {
  CatalogRegionPrices,
  CatalogRegionStatuses,
  DealerStatus,
  RetailStatus,
  StoreCatalogItem,
} from "@/components/store/pim/products/store-catalog-demo-data";
import type { CurrencyCode } from "@/components/store/pim/pricelists/pricelists-helpers";
import { isCurrencyCode, isDealerStatus, isRetailStatus } from "@/components/store/pim/pricelists/pricelists-helpers";
import { CATALOG_NO_SITE_KEY } from "@/components/store/pim/products/catalog/catalog-site-groups";
import { PAGE_SIZE } from "@/components/store/pim/products/catalog/catalog-helpers";
import {
  catalogCategoryCodesForFilter,
  catalogTreeIdForCategoryCodes,
} from "@/features/store/category-tree";
import { loadLogisticsSettings } from "@/features/logistics/logistics-api";
import { formatEntityCode } from "@/lib/entity-codes";
import { preferKorportalMediaConversion } from "@/lib/korportal-media-url";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Только для demo `bike-*` / fallback без связей в БД. Фильтр каталога этим не пользуется. */
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
  product?: {
    id?: string | number;
    name?: string;
    family_id?: string | number | null;
    family?: { id: string | number; name: string } | null;
    categories?: Array<{
      category_id: string | number;
      category: { id: string | number; code: string; name: string } | null;
    }>;
  } | null;
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
type CategoryCodeRow = { id: number | string; code: string };
type PlantIdRow = { plant_id: string | number | null };

export type CatalogQueryFilters = {
  search?: string;
  category?: string;
  familyId?: string;
  site?: string;
  dealerStatus?: string;
  retailStatus?: string;
  regionCode?: string | null;
};

export type CatalogLoadResult = {
  items: StoreCatalogItem[];
  groupTotals: Record<string, number>;
  hasMore: boolean;
};

export type CatalogFilterOptions = {
  sites: string[];
  families: Array<{ id: string; name: string }>;
};

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const catalogProductionSite = (
  plantId: string | number | null | undefined,
): string => {
  if (plantId == null || plantId === "") return CATALOG_NO_SITE_KEY;
  return formatEntityCode("plant", plantId);
};

const parsePlantIdFromSiteCode = (site: string): number | null => {
  const match = site.trim().match(/^(?:PLT-)?(\d+)$/i);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveCategoryFromProduct = (
  product: VariantRow["product"],
): { categoryId: string; category: string; family: string } => {
  const categories = product?.categories ?? [];
  const codes = categories
    .map((row) => row.category?.code)
    .filter((code): code is string => Boolean(code));
  const names = categories
    .map((row) => row.category?.name)
    .filter((name): name is string => Boolean(name));
  const treeId = catalogTreeIdForCategoryCodes(codes);
  const categoryId = treeId ?? codes[0] ?? "";
  const category = names[0] ?? "";
  const familyName = product?.family?.name?.trim() || "";
  return {
    categoryId: categoryId || "uncategorized",
    category: category || "—",
    family: familyName || "—",
  };
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
    categoryId?: string;
    category?: string;
    family?: string;
  },
): StoreCatalogItem => {
  const id = String(row.id);
  const fromProduct = resolveCategoryFromProduct(row.product);
  return {
    id,
    productId: String(row.product_id),
    name: row.name,
    code: formatEntityCode("product", id),
    imageSrc: productImageUrl(id, row.image_url) ?? "",
    imageAlt: row.name,
    categoryId: extras?.categoryId ?? fromProduct.categoryId,
    category: extras?.category ?? fromProduct.category,
    family: extras?.family ?? fromProduct.family,
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

const ALL_FILTER = "all";

type VariantQueryMode = "page" | "plant_ids";

const resolveRegionId = async (
  client: SupabaseClient,
  regionCode: string | null | undefined,
): Promise<number | null> => {
  if (!regionCode) {
    return null;
  }
  const { data, error } = await client
    .from("store_region")
    .select("id")
    .eq("code", regionCode)
    .is("deleted_at", null)
    .eq("active", true)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.id == null ? null : Number(data.id);
};

const resolveCategoryIds = async (
  client: SupabaseClient,
  categoryFilter: string | undefined,
): Promise<number[] | null> => {
  if (!categoryFilter || categoryFilter === ALL_FILTER) {
    return null;
  }
  const codes = catalogCategoryCodesForFilter(categoryFilter);
  if (codes.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from("store_category")
    .select("id,code")
    .in("code", codes)
    .is("deleted_at", null);
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as CategoryCodeRow[]).map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
};

const resolveProductIdsForCategories = async (
  client: SupabaseClient,
  categoryIds: number[],
): Promise<number[]> => {
  const { data, error } = await client
    .from("store_product_category")
    .select("product_id")
    .in("category_id", categoryIds);
  if (error) {
    throw new Error(error.message);
  }
  return [
    ...new Set(
      ((data ?? []) as Array<{ product_id: number | string }>)
        .map((row) => Number(row.product_id))
        .filter((id) => Number.isFinite(id)),
    ),
  ];
};

const buildVariantQuery = (
  client: SupabaseClient,
  mode: VariantQueryMode,
  filters: CatalogQueryFilters,
  productIdsForCategory: number[] | null,
  regionId: number | null,
) => {
  const needsFamilyJoin = Boolean(filters.familyId && filters.familyId !== ALL_FILTER);
  const needsStatusJoin =
    regionId != null &&
    ((filters.dealerStatus && filters.dealerStatus !== ALL_FILTER) ||
      (filters.retailStatus && filters.retailStatus !== ALL_FILTER));

  const categorySelect =
    "categories:store_product_category(category_id,category:store_category(id,code,name))";
  const productSelect = `product:store_product${needsFamilyJoin ? "!inner" : ""}(id,name,family_id,family:store_product_family(id,name),${categorySelect})`;
  const statusSelect = needsStatusJoin
    ? ",region_status:store_product_region_status!inner(region_id,dealer_status,retail_status)"
    : "";

  const select =
    mode === "plant_ids"
      ? needsFamilyJoin || needsStatusJoin
        ? `plant_id,${productSelect}${statusSelect}`
        : "plant_id"
      : `id,product_id,name,image_url,plant_id,${productSelect}${statusSelect}`;

  let query = client.from("store_product_variant").select(select).is("deleted_at", null);

  if (productIdsForCategory) {
    query = query.in("product_id", productIdsForCategory);
  }

  if (filters.familyId && filters.familyId !== ALL_FILTER) {
    query = query.eq("product.family_id", Number(filters.familyId));
  }

  if (filters.site && filters.site !== ALL_FILTER) {
    if (filters.site === CATALOG_NO_SITE_KEY) {
      query = query.is("plant_id", null);
    } else {
      const plantId = parsePlantIdFromSiteCode(filters.site);
      if (plantId == null) {
        query = query.eq("id", -1);
      } else {
        query = query.eq("plant_id", plantId);
      }
    }
  }

  const search = filters.search?.trim() ?? "";
  if (search) {
    const escaped = search.replace(/[%_,.()]/g, "");
    const codeMatch = search.match(/^(?:PRD-)?(\d+)$/i);
    if (codeMatch?.[1]) {
      query = query.or(`name.ilike.%${escaped}%,id.eq.${codeMatch[1]}`);
    } else {
      query = query.ilike("name", `%${escaped}%`);
    }
  }

  if (needsStatusJoin && regionId != null) {
    query = query.eq("region_status.region_id", regionId);
    if (filters.dealerStatus && filters.dealerStatus !== ALL_FILTER) {
      query = query.eq("region_status.dealer_status", filters.dealerStatus);
    }
    if (filters.retailStatus && filters.retailStatus !== ALL_FILTER) {
      query = query.eq("region_status.retail_status", filters.retailStatus);
    }
  }

  return query
    .order("plant_id", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true }) as unknown as {
    range: (
      from: number,
      to: number,
    ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
  };
};

const countGroupTotals = (rows: PlantIdRow[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    const siteKey = catalogProductionSite(row.plant_id);
    totals[siteKey] = (totals[siteKey] ?? 0) + 1;
  }
  return totals;
};

/** Options for site / family filter dropdowns from store refs. */
export const loadCatalogFilterOptions = async (): Promise<CatalogFilterOptions | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  const [plantsResult, familiesResult] = await Promise.all([
    client.from("store_plant").select("id").is("deleted_at", null).order("id", { ascending: true }),
    client
      .from("store_product_family")
      .select("id,name")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  if (plantsResult.error) {
    throw new Error(plantsResult.error.message);
  }
  if (familiesResult.error) {
    throw new Error(familiesResult.error.message);
  }

  const sites = [
    ...((plantsResult.data ?? []) as Array<{ id: number | string }>).map((row) =>
      formatEntityCode("plant", row.id),
    ),
    CATALOG_NO_SITE_KEY,
  ];

  const families = ((familiesResult.data ?? []) as Array<{ id: number | string; name: string }>).map(
    (row) => ({ id: String(row.id), name: row.name }),
  );

  return { sites, families };
};

/**
 * Loads variants (+ prices/statuses) for the catalog.
 * With `limit` — one page; without — all matching rows (pricelists).
 * Returns null when Supabase is unset.
 */
export const loadDbCatalogItems = async (options?: {
  offset?: number;
  limit?: number;
  filters?: CatalogQueryFilters;
}): Promise<CatalogLoadResult | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  const filters = options?.filters ?? {};
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = options?.limit;
  const paginate = limit != null && Number.isFinite(limit) && limit > 0;
  const pageSize = paginate ? Math.max(1, Math.floor(limit)) : PAGE_SIZE;

  const [categoryIds, regionId] = await Promise.all([
    resolveCategoryIds(client, filters.category),
    resolveRegionId(client, filters.regionCode),
    loadLogisticsSettings(),
  ]);

  // Empty category resolution means the tree node has no DB codes — no rows match.
  if (categoryIds && categoryIds.length === 0) {
    return { items: [], groupTotals: {}, hasMore: false };
  }

  let productIdsForCategory: number[] | null = null;
  if (categoryIds) {
    productIdsForCategory = await resolveProductIdsForCategories(client, categoryIds);
    if (productIdsForCategory.length === 0) {
      return { items: [], groupTotals: {}, hasMore: false };
    }
  }

  const plantPromise = fetchAllRows<PlantIdRow>((from, to) =>
    buildVariantQuery(client, "plant_ids", filters, productIdsForCategory, regionId).range(from, to) as PromiseLike<{
      data: PlantIdRow[] | null;
      error: { message: string } | null;
    }>,
  );

  const variantsPromise = paginate
    ? buildVariantQuery(client, "page", filters, productIdsForCategory, regionId)
        .range(offset, offset + pageSize - 1)
        .then((result) => {
          if (result.error) {
            throw new Error(result.error.message);
          }
          return (result.data ?? []) as VariantRow[];
        })
    : fetchAllRows<VariantRow>((from, to) =>
        buildVariantQuery(client, "page", filters, productIdsForCategory, regionId).range(from, to) as PromiseLike<{
          data: VariantRow[] | null;
          error: { message: string } | null;
        }>,
      );

  const [plantRows, variants] = await Promise.all([plantPromise, variantsPromise]);
  const groupTotals = countGroupTotals(plantRows);
  const hasMore = paginate ? offset + variants.length < plantRows.length : false;

  const pricing = await loadRegionPricing(variants.map((row) => String(row.id)));
  if (!pricing) {
    return null;
  }

  const items = variants.map((row) => {
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

  return { items, groupTotals, hasMore };
};
