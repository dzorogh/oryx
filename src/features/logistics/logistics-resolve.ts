import type { OwnerType } from "@/features/logistics/logistics-types";
import { FREE_OWNER_ID } from "@/features/logistics/logistics-types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const requireClient = () => {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }
  return client;
};

const str = (value: unknown): string => String(value);

const selectAll = async (table: string, columns: string): Promise<Record<string, unknown>[]> => {
  const client = requireClient();
  const { data, error } = await client.from(table).select(columns).order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Record<string, unknown>[];
};

let locationMapCache: Map<string, string> | null = null;
let locationMapAt = 0;

export const resolveStockLocationId = async (
  locationType: string,
  locationEntityId: string,
): Promise<string> => {
  if (locationMapCache && Date.now() - locationMapAt < 2000) {
    const cached = locationMapCache.get(`${locationType}:${locationEntityId}`);
    if (cached) return cached;
  }
  const [warehouses, customerOrders, productionOrders, transfers, outputs] = await Promise.all([
    selectAll("store_warehouse", "id,stock_location_id"),
    selectAll("store_customer_order", "id,stock_location_id"),
    selectAll("store_production_order", "id,stock_location_id"),
    selectAll("store_transfer", "id,stock_location_id"),
    selectAll("store_production_output", "id,stock_location_id"),
  ]);
  const map = new Map<string, string>();
  for (const row of warehouses) map.set(`warehouse:${row.id}`, str(row.stock_location_id));
  for (const row of customerOrders) map.set(`customer_order:${row.id}`, str(row.stock_location_id));
  for (const row of productionOrders) map.set(`production_order:${row.id}`, str(row.stock_location_id));
  for (const row of transfers) map.set(`transfer:${row.id}`, str(row.stock_location_id));
  for (const row of outputs) map.set(`production_output:${row.id}`, str(row.stock_location_id));
  locationMapCache = map;
  locationMapAt = Date.now();
  const id = map.get(`${locationType}:${locationEntityId}`);
  if (!id) {
    throw new Error(`Место ${locationType}/${locationEntityId} не найдено`);
  }
  return id;
};

export const resolveOwnerId = async (
  ownerType: OwnerType | null | undefined,
  ownerEntityId: string | null | undefined,
): Promise<string> => {
  if (!ownerType || !ownerEntityId) {
    return FREE_OWNER_ID;
  }
  if (ownerType === "order") {
    const rows = await selectAll("store_customer_order", "id,stock_owner_id");
    const row = rows.find((item) => str(item.id) === String(ownerEntityId));
    if (!row) throw new Error(`Владелец заказа ${ownerEntityId} не найден`);
    return str(row.stock_owner_id);
  }
  const rows = await selectAll("store_region", "id,stock_owner_id");
  const row = rows.find((item) => str(item.id) === String(ownerEntityId));
  if (!row) throw new Error(`Владелец региона ${ownerEntityId} не найден`);
  return str(row.stock_owner_id);
};
