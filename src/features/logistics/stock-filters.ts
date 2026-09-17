import type { StockPlaceFilter } from "@/features/logistics/logistics-balances";
import { LOGISTICS_PATHS } from "@/features/logistics/logistics-paths";
import { LOCATION_TYPES, type LocationType, type StockState } from "@/features/logistics/logistics-types";

export const STOCK_PATH = LOGISTICS_PATHS.stock;

export type StockStateFilter = StockState | "all";

export type StockViewFilter = {
  state: StockStateFilter;
  place: StockPlaceFilter;
  query: string;
  orderId: string | null;
};

export const defaultStockViewFilter = (): StockViewFilter => ({
  state: "all",
  place: { kind: "all" },
  query: "",
  orderId: null,
});

const isLocationType = (value: string): value is LocationType =>
  (LOCATION_TYPES as readonly string[]).includes(value);

const isStockState = (value: string): value is StockState =>
  value === "free" || value === "reserved" || value === "shipped";

export const parseStockPlace = (raw: string | null): StockPlaceFilter => {
  if (!raw || raw === "all") {
    return { kind: "all" };
  }
  if (isLocationType(raw)) {
    return { kind: "locationType", locationType: raw };
  }
  if (raw.startsWith("warehouse:")) {
    const warehouseId = raw.slice("warehouse:".length);
    return warehouseId ? { kind: "warehouse", warehouseId } : { kind: "all" };
  }
  return { kind: "all" };
};

export const serializeStockPlace = (place: StockPlaceFilter): string => {
  if (place.kind === "warehouse") {
    return `warehouse:${place.warehouseId}`;
  }
  if (place.kind === "locationType") {
    return place.locationType;
  }
  return "all";
};

export const parseStockState = (raw: string | null): StockStateFilter =>
  raw && isStockState(raw) ? raw : "all";

export const parseStockViewFilter = (
  params: URLSearchParams | { get: (key: string) => string | null },
): StockViewFilter => ({
  state: parseStockState(params.get("state")),
  place: parseStockPlace(params.get("place")),
  query: params.get("q") ?? "",
  orderId: params.get("order") || null,
});

export const isDefaultStockViewFilter = (filter: StockViewFilter): boolean =>
  filter.state === "all" &&
  filter.place.kind === "all" &&
  filter.query.trim() === "" &&
  !filter.orderId;

export const stockHref = (filter: Partial<StockViewFilter> = {}): string => {
  const next: StockViewFilter = { ...defaultStockViewFilter(), ...filter };
  const params = new URLSearchParams();
  if (next.state !== "all") {
    params.set("state", next.state);
  }
  const place = serializeStockPlace(next.place);
  if (place !== "all") {
    params.set("place", place);
  }
  const query = next.query.trim();
  if (query) {
    params.set("q", query);
  }
  if (next.orderId) {
    params.set("order", next.orderId);
  }
  const qs = params.toString();
  return qs ? `${STOCK_PATH}?${qs}` : STOCK_PATH;
};

export const matchesProductQuery = (
  product: { name: string; sku: string; code?: string } | undefined,
  query: string,
  fallbackId: string,
): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [product?.code, product?.name, product?.sku, fallbackId].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(needle);
};
