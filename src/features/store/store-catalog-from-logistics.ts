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
  amount: number | string;
  active: boolean;
};

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const catalogProductionSite = (
  plantId: string | number | null | undefined,
): string => {
  if (plantId == null || plantId === "") return "—";
  // Outside the plant catalog, show code only (place-codes convention).
  return formatLogisticsCode("plant", plantId);
};

export const mapLogisticsProductToCatalogItem = (
  row: VariantRow,
  productionSite: string,
  dealerPrice: number,
  retailPrice: number,
): StoreCatalogItem => {
  const id = String(row.id);
  const inferred = inferCatalogCategory(id, row.name);
  return {
    id,
    name: row.name,
    code: formatLogisticsCode("product", id),
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
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite,
  };
};

/** Loads variants + relational prices. Returns null when Supabase is unset. */
export const loadDbCatalogItems = async (): Promise<StoreCatalogItem[] | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  const [, variantsResult, pricesResult] = await Promise.all([
    loadLogisticsSettings(),
    client
      .from("store_product_variant")
      .select("id,product_id,name,image_url,plant_id")
      .is("deleted_at", null)
      .order("id", { ascending: true }),
    client
      .from("store_product_price")
      .select("product_variant_id,price_kind,amount,active")
      .eq("active", true),
  ]);

  if (variantsResult.error) {
    throw new Error(variantsResult.error.message);
  }
  if (!variantsResult.data) {
    return [];
  }

  const dealerByVariant = new Map<string, number>();
  const retailByVariant = new Map<string, number>();
  for (const row of (pricesResult.data ?? []) as PriceRow[]) {
    const amount = toNumber(row.amount);
    if (amount == null) continue;
    const key = String(row.product_variant_id);
    if (row.price_kind === "dealer") dealerByVariant.set(key, amount);
    if (row.price_kind === "retail") retailByVariant.set(key, amount);
  }

  return (variantsResult.data as VariantRow[]).map((row) => {
    const id = String(row.id);
    const dealer = dealerByVariant.get(id) ?? inferDemoDealerPrice(`${id}:${row.name}`);
    const retail = retailByVariant.get(id) ?? Math.round(dealer * 1.18);
    return mapLogisticsProductToCatalogItem(
      row,
      catalogProductionSite(row.plant_id),
      dealer,
      retail,
    );
  });
};
