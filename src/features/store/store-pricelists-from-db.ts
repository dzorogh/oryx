import type { StoreCatalogItem } from "@/components/store/pim/products/store-catalog-demo-data";
import type {
  CurrencyCode,
  DealerStatus,
  PricelistCellValue,
  PriceField,
  RetailStatus,
} from "@/components/store/pim/pricelists/pricelists-helpers";
import { isCurrencyCode, isDealerStatus, isRetailStatus } from "@/components/store/pim/pricelists/pricelists-helpers";
import { loadDbCatalogItems } from "@/features/store/store-catalog-from-logistics";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type PricelistRegionGroupRow = {
  id: string;
  label: string;
};

export type PricelistRegionRow = {
  id: string;
  label: string;
  currency: CurrencyCode;
  group: string;
  numericId: number;
};

export type PricelistDbBootstrap = {
  groups: PricelistRegionGroupRow[];
  regions: PricelistRegionRow[];
  rows: Array<StoreCatalogItem & { numericId: number }>;
  /** cellId → value; cellId uses buildPriceCellId / buildStatusCellId shapes */
  prices: Map<string, PricelistCellValue>;
  dealerStatuses: Map<string, DealerStatus>;
  retailStatuses: Map<string, RetailStatus>;
};

type CurrencyRow = { id: number | string; code: string };
type GroupRow = { id: number | string; code: string; name: string; sort_order: number };
type RegionRow = {
  id: number | string;
  code: string;
  name: string;
  group_id: number | string | null;
  default_retail_currency_id: number | string;
  sort_order: number;
  active: boolean;
};
type PriceRow = {
  product_variant_id: number | string;
  price_kind: string;
  region_id: number | string | null;
  currency_id: number | string;
  amount: number | string;
  active: boolean;
};
type StatusRow = {
  product_variant_id: number | string;
  region_id: number | string;
  dealer_status: string;
  retail_status: string;
};

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const priceCellId = (regionCode: string | null, variantId: string, field: PriceField): string =>
  field === "purchase" ? `global:${variantId}:purchase` : `${regionCode}:${variantId}:${field}`;

const statusCellId = (regionCode: string, variantId: string): string =>
  `${regionCode}:${variantId}:dealerStatus`;

const retailStatusCellId = (regionCode: string, variantId: string): string =>
  `${regionCode}:${variantId}:retailStatus`;

/** Loads relational pricing catalogs for the pricelist UI. null when Supabase unset. */
export const loadPricelistDbBootstrap = async (): Promise<PricelistDbBootstrap | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  const catalogItems = await loadDbCatalogItems();
  if (!catalogItems) {
    return null;
  }

  const [currenciesResult, groupsResult, regionsResult, pricesResult, statusesResult] =
    await Promise.all([
      client.from("store_currency").select("id,code").is("deleted_at", null),
      client
        .from("store_region_group")
        .select("id,code,name,sort_order")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
      client
        .from("store_region")
        .select("id,code,name,group_id,default_retail_currency_id,sort_order,active")
        .is("deleted_at", null)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      client
        .from("store_product_price")
        .select("product_variant_id,price_kind,region_id,currency_id,amount,active")
        .eq("active", true),
      client
        .from("store_product_region_status")
        .select("product_variant_id,region_id,dealer_status,retail_status"),
    ]);

  if (currenciesResult.error) throw new Error(currenciesResult.error.message);
  if (groupsResult.error) throw new Error(groupsResult.error.message);
  if (regionsResult.error) throw new Error(regionsResult.error.message);
  if (pricesResult.error) throw new Error(pricesResult.error.message);
  if (statusesResult.error) throw new Error(statusesResult.error.message);

  const currencyCodeById = new Map(
    ((currenciesResult.data ?? []) as CurrencyRow[]).map((row) => [String(row.id), row.code]),
  );
  const groupCodeById = new Map(
    ((groupsResult.data ?? []) as GroupRow[]).map((row) => [String(row.id), row.code]),
  );

  const groups: PricelistRegionGroupRow[] = ((groupsResult.data ?? []) as GroupRow[]).map((row) => ({
    id: row.code,
    label: row.name,
  }));

  const regions: PricelistRegionRow[] = [];
  const regionCodeById = new Map<string, string>();
  for (const row of (regionsResult.data ?? []) as RegionRow[]) {
    const retailCode = currencyCodeById.get(String(row.default_retail_currency_id));
    if (!retailCode || !isCurrencyCode(retailCode)) continue;
    const groupCode = row.group_id != null ? groupCodeById.get(String(row.group_id)) : undefined;
    regions.push({
      id: row.code,
      label: row.name,
      currency: retailCode,
      group: groupCode ?? "cis",
      numericId: Number(row.id),
    });
    regionCodeById.set(String(row.id), row.code);
  }

  const prices = new Map<string, PricelistCellValue>();
  for (const row of (pricesResult.data ?? []) as PriceRow[]) {
    const amount = toNumber(row.amount);
    const currencyRaw = currencyCodeById.get(String(row.currency_id));
    if (amount == null || !currencyRaw || !isCurrencyCode(currencyRaw)) continue;
    if (row.price_kind !== "purchase" && row.price_kind !== "dealer" && row.price_kind !== "retail") {
      continue;
    }
    const variantId = String(row.product_variant_id);
    if (row.price_kind === "purchase") {
      prices.set(priceCellId(null, variantId, "purchase"), { amount, currency: currencyRaw });
      continue;
    }
    if (row.region_id == null) continue;
    const regionCode = regionCodeById.get(String(row.region_id));
    if (!regionCode) continue;
    prices.set(priceCellId(regionCode, variantId, row.price_kind), {
      amount,
      currency: currencyRaw,
    });
  }

  const dealerStatuses = new Map<string, DealerStatus>();
  const retailStatuses = new Map<string, RetailStatus>();
  for (const row of (statusesResult.data ?? []) as StatusRow[]) {
    const regionCode = regionCodeById.get(String(row.region_id));
    if (!regionCode) continue;
    const variantId = String(row.product_variant_id);
    if (isDealerStatus(row.dealer_status)) {
      dealerStatuses.set(statusCellId(regionCode, variantId), row.dealer_status);
    }
    if (isRetailStatus(row.retail_status)) {
      retailStatuses.set(retailStatusCellId(regionCode, variantId), row.retail_status);
    }
  }

  const rows = catalogItems.map((item) => ({
    ...item,
    numericId: Number(item.id) || 0,
  }));

  return { groups, regions, rows, prices, dealerStatuses, retailStatuses };
};
