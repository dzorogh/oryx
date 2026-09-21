import type { StockPlaceFilter } from "@/features/logistics/logistics-balances";
import { productById } from "@/features/logistics/logistics-lookups";
import { LOGISTICS_PATHS } from "@/features/logistics/logistics-paths";
import type { LocationType, LogisticsSnapshot } from "@/features/logistics/logistics-types";
import type { StockMatrixLocationFilter, StockMatrixOwnerFilter } from "@/features/logistics/stock-product-matrix";

export const STOCK_PATH = LOGISTICS_PATHS.stock;

export const STOCK_GROUPS = ["products", "warehouses", "regions"] as const;
export type StockGroup = (typeof STOCK_GROUPS)[number];

export type StockOwnerFilter = StockMatrixOwnerFilter;
export type StockLocationFilter = StockMatrixLocationFilter;

export type StockViewFilter = {
  group: StockGroup;
  owner: StockOwnerFilter;
  location: StockLocationFilter;
  warehouseId: string | null;
  regionId: string | null;
  query: string;
};

export type StockHrefInput = Partial<StockViewFilter> & {
  place?: StockPlaceFilter;
  state?: string | null;
  orderId?: string | null;
};

export const defaultStockViewFilter = (group: StockGroup = "products"): StockViewFilter => ({
  group,
  owner: "all",
  location: "all",
  warehouseId: null,
  regionId: null,
  query: "",
});

const isStockGroup = (value: string): value is StockGroup =>
  (STOCK_GROUPS as readonly string[]).includes(value);

const isOwnerFilter = (value: string): value is StockOwnerFilter =>
  value === "all" || value === "free" || value === "region" || value === "order";

const isLocationFilter = (value: string): value is StockLocationFilter =>
  value === "all" || value === "warehouse" || value === "production" || value === "transfer";

export const parseStockPlace = (raw: string | null): StockPlaceFilter => {
  if (!raw || raw === "all") {
    return { kind: "all" };
  }
  if (raw === "warehouse" || raw === "production_order" || raw === "transfer" || raw === "customer_order") {
    return { kind: "locationType", locationType: raw };
  }
  if (raw === "production_order_line") {
    return { kind: "locationType", locationType: "production_order" };
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

const locationFromPlaceType = (locationType: LocationType): StockLocationFilter | null => {
  if (locationType === "warehouse") {
    return "warehouse";
  }
  if (locationType === "production_order") {
    return "production";
  }
  if (locationType === "transfer") {
    return "transfer";
  }
  return null;
};

const applyLegacyPlace = (filter: StockViewFilter, place: StockPlaceFilter | undefined, groupExplicit: boolean): StockViewFilter => {
  if (!place || place.kind === "all") {
    return filter;
  }
  if (place.kind === "warehouse") {
    return {
      ...filter,
      group: groupExplicit ? filter.group : "warehouses",
      warehouseId: place.warehouseId,
    };
  }
  const location = locationFromPlaceType(place.locationType);
  if (!location) {
    return filter;
  }
  return { ...filter, location };
};

export const parseStockViewFilter = (
  params: URLSearchParams | { get: (key: string) => string | null },
): StockViewFilter => {
  const groupRaw = params.get("group") ?? "";
  const ownerRaw = params.get("owner") ?? "";
  const locationRaw = params.get("location") ?? "";
  return {
    group: isStockGroup(groupRaw) ? groupRaw : "products",
    owner: isOwnerFilter(ownerRaw) && ownerRaw !== "all" ? ownerRaw : "all",
    location: isLocationFilter(locationRaw) && locationRaw !== "all" ? locationRaw : "all",
    warehouseId: params.get("warehouse") || null,
    regionId: params.get("region") || null,
    query: params.get("q") ?? "",
  };
};

const knownOptionId = (id: string | null, options: ReadonlyArray<{ id: string }>): string | null =>
  id && options.some((option) => option.id === id) ? id : null;

export const normalizeStockViewFilter = (
  filter: StockViewFilter,
  snapshot?: Pick<LogisticsSnapshot, "warehouses" | "regions">,
): StockViewFilter => {
  if (!snapshot) {
    return filter;
  }
  const warehouseId = knownOptionId(filter.warehouseId, snapshot.warehouses);
  const regionId = knownOptionId(filter.regionId, snapshot.regions);
  if (warehouseId === filter.warehouseId && regionId === filter.regionId) {
    return filter;
  }
  return { ...filter, warehouseId, regionId };
};

export const isDefaultStockViewFilter = (filter: StockViewFilter): boolean =>
  filter.owner === "all" &&
  filter.location === "all" &&
  !filter.warehouseId &&
  !filter.regionId &&
  filter.query.trim() === "";

export const stockHref = (filter: StockHrefInput = {}): string => {
  const { place, state: _state, orderId: _orderId, ...rest } = filter;
  const groupExplicit = Object.prototype.hasOwnProperty.call(filter, "group");
  const next = applyLegacyPlace({ ...defaultStockViewFilter(), ...rest }, place, groupExplicit);
  const params = new URLSearchParams();
  if (next.group !== "products") {
    params.set("group", next.group);
  }
  if (next.owner !== "all") {
    params.set("owner", next.owner);
  }
  if (next.location !== "all") {
    params.set("location", next.location);
  }
  if (next.warehouseId) {
    params.set("warehouse", next.warehouseId);
  }
  if (next.regionId) {
    params.set("region", next.regionId);
  }
  const query = next.query.trim();
  if (query) {
    params.set("q", query);
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

export const stockFilterForGroup = (filter: StockViewFilter, group: StockGroup): StockViewFilter => {
  const next = { ...filter, group };
  if (group === "products") {
    return { ...next, warehouseId: null };
  }
  if (group === "warehouses") {
    return { ...next, location: "all" };
  }
  return { ...next, owner: "all" };
};

export const filterRowsByProductQuery = <T extends { productId: string }>(
  rows: T[],
  snapshot: LogisticsSnapshot,
  query: string,
): T[] =>
  rows.filter((row) => matchesProductQuery(productById(snapshot, row.productId), query, row.productId));

export const filterSectionsByProductQuery = <T extends { rows: Array<{ productId: string }> }>(
  sections: T[],
  snapshot: LogisticsSnapshot,
  query: string,
): T[] =>
  sections
    .map((section) => ({
      ...section,
      rows: filterRowsByProductQuery(section.rows, snapshot, query),
    }))
    .filter((section) => section.rows.length > 0);

export const stockMatrixFilterForGroup = (filter: StockViewFilter) => {
  if (filter.group === "products") {
    return {
      owner: filter.owner,
      location: filter.location,
      regionId: filter.regionId,
    };
  }
  if (filter.group === "warehouses") {
    return {
      owner: filter.owner,
      location: "warehouse" as const,
      warehouseId: filter.warehouseId,
      regionId: filter.regionId,
    };
  }
  return {
    owner: "region" as const,
    location: filter.location,
    warehouseId: filter.warehouseId,
    regionId: filter.regionId,
  };
};
