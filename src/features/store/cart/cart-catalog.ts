/** Load cart variant facts: name, photo, plant, logistics, packing, supply costs, prices. */

import { isCurrencyCode, type CurrencyCode } from "@/features/store/domain/currency";
import { isDealerStatus, type DealerStatus } from "@/features/store/domain/statuses";
import { loadLogisticsSettings } from "@/features/logistics/logistics-api";
import { formatEntityCode } from "@/lib/entity-codes";
import { loadRegionPricing } from "@/features/store/store-catalog-from-logistics";
import { productImageUrl } from "@/features/store/store-catalog-from-logistics";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export type CartVariantLogistics = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  stacking: boolean;
  stackingLimit: number | null;
  rotateLength: boolean;
  rotateWidth: boolean;
  maxPerContainer: number | null;
};

export type CartVariantCatalogItem = {
  variantId: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  plantId: string | null;
  plantCode: string | null;
  quantityPerUnit: number;
  logistics: CartVariantLogistics | null;
  /** regionCode → dealer price + currency + status + supply % */
  byRegion: Map<
    string,
    {
      dealerPrice: number | null;
      dealerCurrency: CurrencyCode | null;
      dealerStatus: DealerStatus;
      supplyCostPercent: number | null;
    }
  >;
};

type VariantRow = {
  id: number | string;
  product_id: number | string;
  name: string;
  image_url: string | null;
  plant_id: number | string | null;
  quantity_per_unit: number | string | null;
};

type LogisticsRow = {
  product_variant_id: number | string;
  length_cm: number | string;
  width_cm: number | string;
  height_cm: number | string;
  weight_kg: number | string;
  stacking: boolean;
  stacking_limit: number | string | null;
  rotate_length: boolean;
  rotate_width: boolean;
  max_per_container: number | string | null;
};

type SupplyRow = {
  product_variant_id: number | string;
  region_id: number | string;
  percent: number | string;
};

type RegionRow = { id: number | string; code: string };

const toNum = (value: number | string | null | undefined): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const loadCartVariantCatalog = async (
  variantIds: readonly string[],
): Promise<CartVariantCatalogItem[]> => {
  if (!variantIds.length) return [];
  if (!isSupabaseConfigured()) return [];
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  const ids = variantIds.map(Number).filter((n) => Number.isFinite(n));
  if (!ids.length) return [];

  const [, variantsResult, logisticsRows, supplyRows, regionsResult, pricing] = await Promise.all([
    loadLogisticsSettings(),
    client
      .from("store_product_variant")
      .select("id,product_id,name,image_url,plant_id,quantity_per_unit")
      .in("id", ids)
      .is("deleted_at", null),
    fetchAllRows<LogisticsRow>((from, to) =>
      client
        .from("store_product_variant_logistics")
        .select(
          "product_variant_id,length_cm,width_cm,height_cm,weight_kg,stacking,stacking_limit,rotate_length,rotate_width,max_per_container",
        )
        .in("product_variant_id", ids)
        .order("product_variant_id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<SupplyRow>((from, to) =>
      client
        .from("store_product_supply_cost")
        .select("product_variant_id,region_id,percent")
        .in("product_variant_id", ids)
        .order("product_variant_id", { ascending: true })
        .range(from, to),
    ),
    client.from("store_region").select("id,code").is("deleted_at", null),
    loadRegionPricing(variantIds),
  ]);

  if (variantsResult.error) throw new Error(variantsResult.error.message);
  if (regionsResult.error) throw new Error(regionsResult.error.message);

  const regionCodeById = new Map(
    ((regionsResult.data ?? []) as RegionRow[]).map((row) => [String(row.id), row.code]),
  );

  const logisticsByVariant = new Map<string, CartVariantLogistics>();
  for (const row of logisticsRows) {
    const lengthCm = toNum(row.length_cm);
    const widthCm = toNum(row.width_cm);
    const heightCm = toNum(row.height_cm);
    const weightKg = toNum(row.weight_kg);
    if (lengthCm == null || widthCm == null || heightCm == null || weightKg == null) continue;
    logisticsByVariant.set(String(row.product_variant_id), {
      lengthCm,
      widthCm,
      heightCm,
      weightKg,
      stacking: Boolean(row.stacking),
      stackingLimit: toNum(row.stacking_limit),
      rotateLength: Boolean(row.rotate_length),
      rotateWidth: Boolean(row.rotate_width),
      maxPerContainer: toNum(row.max_per_container),
    });
  }

  const supplyByVariantRegion = new Map<string, number>();
  for (const row of supplyRows) {
    const regionCode = regionCodeById.get(String(row.region_id));
    const percent = toNum(row.percent);
    if (!regionCode || percent == null) continue;
    supplyByVariantRegion.set(`${row.product_variant_id}:${regionCode}`, percent);
  }

  const items: CartVariantCatalogItem[] = [];
  for (const row of (variantsResult.data ?? []) as VariantRow[]) {
    const variantId = String(row.id);
    const byRegion = new Map<
      string,
      {
        dealerPrice: number | null;
        dealerCurrency: CurrencyCode | null;
        dealerStatus: DealerStatus;
        supplyCostPercent: number | null;
      }
    >();

    const prices = pricing?.pricesByVariant.get(variantId);
    const statuses = pricing?.statusesByVariant.get(variantId);

    const regionCodes = new Set<string>([
      ...Object.keys(prices ?? {}),
      ...Object.keys(statuses ?? {}),
    ]);
    for (const code of regionCodes) {
      const price = prices?.[code];
      const status = statuses?.[code];
      const dealerRaw = price?.dealer?.currency;
      const dealerCurrency =
        dealerRaw && isCurrencyCode(dealerRaw) ? dealerRaw : null;
      const dealerStatus: DealerStatus =
        status?.dealer && isDealerStatus(status.dealer) ? status.dealer : "unavailable";
      byRegion.set(code, {
        dealerPrice: price?.dealer?.amount ?? null,
        dealerCurrency,
        dealerStatus,
        supplyCostPercent: supplyByVariantRegion.get(`${variantId}:${code}`) ?? null,
      });
    }

    // Ensure supply-only regions appear
    for (const [key, percent] of supplyByVariantRegion) {
      if (!key.startsWith(`${variantId}:`)) continue;
      const code = key.slice(variantId.length + 1);
      if (byRegion.has(code)) {
        const existing = byRegion.get(code)!;
        byRegion.set(code, { ...existing, supplyCostPercent: percent });
      } else {
        byRegion.set(code, {
          dealerPrice: null,
          dealerCurrency: null,
          dealerStatus: "unavailable",
          supplyCostPercent: percent,
        });
      }
    }

    const plantId = row.plant_id == null ? null : String(row.plant_id);
    items.push({
      variantId,
      productId: String(row.product_id),
      name: row.name,
      imageUrl: productImageUrl(variantId, row.image_url),
      plantId,
      plantCode: plantId ? formatEntityCode("plant", plantId) : null,
      quantityPerUnit: Math.max(1, Math.floor(toNum(row.quantity_per_unit) ?? 1)),
      logistics: logisticsByVariant.get(variantId) ?? null,
      byRegion,
    });
  }

  return items;
};

export type StoreContainerTypeRow = {
  code: string;
  name: string;
  innerLengthMm: number;
  innerWidthMm: number;
  innerHeightMm: number;
  maxWeightKg: number;
};

export const loadContainerTypes = async (): Promise<StoreContainerTypeRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const { data, error } = await client
    .from("store_container_type")
    .select("code,name,inner_length_mm,inner_width_mm,inner_height_mm,max_weight_kg,sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{
    code: string;
    name: string;
    inner_length_mm: number | string;
    inner_width_mm: number | string;
    inner_height_mm: number | string;
    max_weight_kg: number | string;
  }>).map((row) => ({
    code: row.code,
    name: row.name,
    innerLengthMm: Number(row.inner_length_mm),
    innerWidthMm: Number(row.inner_width_mm),
    innerHeightMm: Number(row.inner_height_mm),
    maxWeightKg: Number(row.max_weight_kg),
  }));
};
