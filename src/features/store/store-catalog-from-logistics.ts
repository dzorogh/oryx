import type { StoreCatalogItem } from "@/components/store/pim/products/store-catalog-demo-data";
import { loadLogisticsSettings } from "@/features/logistics/logistics-api";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { preferKorportalMediaConversion } from "@/lib/korportal-media-url";
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
  sku: string,
  name: string,
): { categoryId: string; category: string; family: string } => {
  const haystack = `${sku} ${name}`.toUpperCase();
  const match = CATEGORY_BY_TOKEN.find((entry) => entry.tokens.some((token) => haystack.includes(token)));
  if (match) {
    const family = name.split(/\s+/)[0] || match.family;
    return { categoryId: match.categoryId, category: match.category, family };
  }
  const family = name.split(/\s+/)[0] || "Equipment";
  return { categoryId: "atv-4x4", category: "4x4", family };
};

export const inferDemoDealerPrice = (sku: string): number => 2490 + (hashSeed(sku) % 90) * 100;

export const productImageUrl = (_sku: string, imageUrl?: string | null): string | null =>
  preferKorportalMediaConversion(imageUrl);

type LogisticsProductRow = {
  id: string | number;
  sku: string;
  name: string;
  image_url?: string | null;
  dealer_price?: number | string | null;
  retail_price?: number | string | null;
  category?: string | null;
  family?: string | null;
};

type ProductPlantRow = {
  product_id: string | number;
  manufacturer_id: string | number;
};

type ManufacturerRow = {
  id: string | number;
  code?: string | null;
  name: string;
};

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const mapLogisticsProductToCatalogItem = (
  row: LogisticsProductRow,
  productionSite: string,
): StoreCatalogItem => {
  const inferred = inferCatalogCategory(row.sku, row.name);
  const dealerPrice = toNumber(row.dealer_price) ?? inferDemoDealerPrice(row.sku);
  const retailPrice = toNumber(row.retail_price) ?? Math.round(dealerPrice * 1.18);
  const id = String(row.id);
  return {
    id,
    name: row.name,
    sku: row.sku,
    code: formatLogisticsCode("product", id),
    imageSrc: productImageUrl(row.sku, row.image_url) ?? "",
    imageAlt: row.name,
    categoryId: inferred.categoryId,
    category: row.category?.trim() || inferred.category,
    family: row.family?.trim() || inferred.family,
    brand: "Oryx",
    stock: 0,
    updatedAt: "2026-09-01T00:00:00.000Z",
    dealerPrice,
    retailPrice,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite,
  };
};

/** Loads the shared logistics/store product list. Returns null when Supabase is unset. */
export const loadDbCatalogItems = async (): Promise<StoreCatalogItem[] | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  const [, productsResult, linksResult, manufacturersResult] = await Promise.all([
    loadLogisticsSettings(),
    client
      .from("logistics_product")
      .select("id,sku,name,image_url,dealer_price,retail_price,category,family")
      .order("id", { ascending: true }),
    client.from("logistics_product_manufacturer").select("product_id,manufacturer_id"),
    client.from("logistics_manufacturer").select("id,name"),
  ]);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }
  if (!productsResult.data) {
    return [];
  }

  const manufacturers = new Map(
    ((manufacturersResult.data ?? []) as ManufacturerRow[]).map((row) => [
      String(row.id),
      String(row.code || row.name || row.id),
    ]),
  );
  const plantsByProduct = new Map<string, string[]>();
  for (const link of (linksResult.data ?? []) as ProductPlantRow[]) {
    const productId = String(link.product_id);
    const plant = manufacturers.get(String(link.manufacturer_id));
    if (!plant) {
      continue;
    }
    const current = plantsByProduct.get(productId) ?? [];
    if (!current.includes(plant)) {
      current.push(plant);
    }
    plantsByProduct.set(productId, current);
  }

  return (productsResult.data as LogisticsProductRow[]).map((row) => {
    const plants = plantsByProduct.get(String(row.id)) ?? [];
    return mapLogisticsProductToCatalogItem(row, plants.join(", ") || "—");
  });
};
