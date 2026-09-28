import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";

export type VariantStockBucket = "free" | "region" | "order" | "production" | "transit";

export type VariantStockFact = {
  variantId: string;
  warehouseId: string;
  bucket: VariantStockBucket;
  regionId: string | null;
  quantity: number;
};

export type VariantStockRegion = {
  /** Numeric region id as string. */
  id: string;
  code: string;
  hubWarehouseId: string | null;
};

export type VariantStockDetailRow = {
  warehouseId: string;
  isHub: boolean;
  free: number;
  /** Reserve under the selected region only. */
  regionReserve: number;
  /** All region + order reserves on this warehouse. */
  reserveTotal: number;
  production: number;
  transit: number;
};

export type VariantRegionStock = {
  ready: number | null;
  total: number;
  rows: VariantStockDetailRow[];
  missingHub: boolean;
};

const QUANTITY_EPSILON = 1e-9;

const isPresent = (quantity: number): boolean => Math.abs(quantity) > QUANTITY_EPSILON;

const emptyRow = (warehouseId: string, isHub: boolean): VariantStockDetailRow => ({
  warehouseId,
  isHub,
  free: 0,
  regionReserve: 0,
  reserveTotal: 0,
  production: 0,
  transit: 0,
});

const rowTotal = (row: VariantStockDetailRow): number =>
  row.free + row.reserveTotal + row.production + row.transit;

/**
 * Единственный расчёт «Готово / Всего» и детализации для каталога и карточки.
 * Факты не зависят от региона — регион применяется на клиенте.
 */
export const computeVariantRegionStock = (
  facts: readonly VariantStockFact[],
  variantId: string,
  region: VariantStockRegion | null | undefined,
): VariantRegionStock => {
  const hubId = region?.hubWarehouseId ?? null;
  const missingHub = !region || !hubId;
  const byWarehouse = new Map<string, VariantStockDetailRow>();

  const ensureRow = (warehouseId: string): VariantStockDetailRow => {
    const existing = byWarehouse.get(warehouseId);
    if (existing) return existing;
    const created = emptyRow(warehouseId, hubId != null && warehouseId === hubId);
    byWarehouse.set(warehouseId, created);
    return created;
  };

  if (hubId) {
    ensureRow(hubId);
  }

  for (const fact of facts) {
    if (fact.variantId !== variantId || !isPresent(fact.quantity)) continue;
    const row = ensureRow(fact.warehouseId);
    switch (fact.bucket) {
      case "free":
        row.free += fact.quantity;
        break;
      case "region":
        row.reserveTotal += fact.quantity;
        if (region && fact.regionId === region.id) {
          row.regionReserve += fact.quantity;
        }
        break;
      case "order":
        row.reserveTotal += fact.quantity;
        break;
      case "production":
        row.production += fact.quantity;
        break;
      case "transit":
        row.transit += fact.quantity;
        break;
      default:
        break;
    }
  }

  const hubRow = hubId ? byWarehouse.get(hubId) ?? null : null;
  const ready = hubRow ? hubRow.free + hubRow.regionReserve : null;

  const otherRows = [...byWarehouse.values()]
    .filter((row) => !row.isHub)
    .filter((row) => isPresent(rowTotal(row)))
    .sort((left, right) => Number(left.warehouseId) - Number(right.warehouseId));

  const rows: VariantStockDetailRow[] = [];
  if (hubRow) {
    rows.push(hubRow);
  }
  rows.push(...otherRows);

  const total = rows.reduce((sum, row) => sum + rowTotal(row), 0);

  return {
    ready: missingHub ? null : ready,
    total,
    rows,
    missingHub,
  };
};

type StockFactRow = {
  variantId: number | string;
  warehouseId: number | string;
  bucket: string;
  regionId: number | string | null;
  quantity: number | string;
};

const isStockBucket = (value: string): value is VariantStockBucket =>
  value === "free" ||
  value === "region" ||
  value === "order" ||
  value === "production" ||
  value === "transit";

/** Loads flat stock facts once; region is applied in {@link computeVariantRegionStock}. */
export const loadVariantStockFacts = async (): Promise<VariantStockFact[] | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  // Ordering by every column keeps pages stable: tied rows are identical.
  const rows = await fetchAllRows<StockFactRow>((from, to) =>
    client
      .rpc("store_variant_stock_facts")
      .order("variantId")
      .order("warehouseId")
      .order("bucket")
      .order("regionId", { nullsFirst: true })
      .order("quantity")
      .range(from, to),
  );

  return rows
    .filter((row) => isStockBucket(row.bucket))
    .map((row) => ({
      variantId: String(row.variantId),
      warehouseId: String(row.warehouseId),
      bucket: row.bucket as VariantStockBucket,
      regionId: row.regionId == null ? null : String(row.regionId),
      quantity: Number(row.quantity) || 0,
    }));
};
