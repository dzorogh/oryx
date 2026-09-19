import { isFreeOwner, type StockBalance } from "@/features/logistics/logistics-types";

export const ON_HAND_LOCATION_TYPES = ["warehouse", "production_order_line", "transfer"] as const;

export type StockMatrixOwnerFilter = "all" | "free" | "region" | "order";
export type StockMatrixLocationFilter = "all" | "warehouse" | "production" | "transfer";

export type StockMatrixFilter = {
  owner?: StockMatrixOwnerFilter;
  location?: StockMatrixLocationFilter;
  warehouseId?: string | null;
  regionId?: string | null;
};

export type StockOwnerQuantities = {
  free: number;
  regionReserve: number;
  orderReserve: number;
};

export type StockLocationQuantities = {
  warehouses: number;
  production: number;
  transfers: number;
};

export type StockProductMatrixRow = {
  productId: string;
  owner: StockOwnerQuantities;
  location: StockLocationQuantities;
};

export type StockWarehouseProductRow = {
  warehouseId: string;
  productId: string;
  free: number;
  regionReserve: number;
  orderReserve: number;
  onHand: number;
};

export type StockWarehouseSection = {
  warehouseId: string;
  rows: StockWarehouseProductRow[];
};

export type StockRegionProductRow = {
  regionId: string;
  productId: string;
  warehouses: number;
  production: number;
  transfers: number;
  regionReserve: number;
};

export type StockRegionSection = {
  regionId: string;
  rows: StockRegionProductRow[];
};

const QUANTITY_EPSILON = 1e-9;

const isPresent = (quantity: number): boolean => Math.abs(quantity) > QUANTITY_EPSILON;

export const isOnHandBalance = (entry: StockBalance): boolean =>
  entry.stockState !== "shipped" &&
  entry.locationType !== "customer_order" &&
  (ON_HAND_LOCATION_TYPES as readonly string[]).includes(entry.locationType);

export const ownerBucket = (entry: StockBalance): keyof StockOwnerQuantities | null => {
  if (isFreeOwner(entry.ownerType, entry.ownerId)) {
    return "free";
  }
  if (entry.ownerType === "region") {
    return "regionReserve";
  }
  if (entry.ownerType === "order") {
    return "orderReserve";
  }
  return null;
};

export const locationBucket = (entry: StockBalance): keyof StockLocationQuantities | null => {
  if (entry.locationType === "warehouse") {
    return "warehouses";
  }
  if (entry.locationType === "production_order_line") {
    return "production";
  }
  if (entry.locationType === "transfer") {
    return "transfers";
  }
  return null;
};

const matchesOwnerFilter = (entry: StockBalance, owner: StockMatrixOwnerFilter = "all"): boolean => {
  if (owner === "all") {
    return true;
  }
  if (owner === "free") {
    return isFreeOwner(entry.ownerType, entry.ownerId);
  }
  return entry.ownerType === owner;
};

const matchesLocationFilter = (entry: StockBalance, location: StockMatrixLocationFilter = "all"): boolean => {
  if (location === "all") {
    return true;
  }
  if (location === "warehouse") {
    return entry.locationType === "warehouse";
  }
  if (location === "production") {
    return entry.locationType === "production_order_line";
  }
  return entry.locationType === "transfer";
};

export const matchesStockMatrixFilter = (entry: StockBalance, filter: StockMatrixFilter = {}): boolean => {
  if (!isOnHandBalance(entry)) {
    return false;
  }
  if (!matchesOwnerFilter(entry, filter.owner)) {
    return false;
  }
  if (!matchesLocationFilter(entry, filter.location)) {
    return false;
  }
  if (filter.warehouseId && !(entry.locationType === "warehouse" && entry.locationId === filter.warehouseId)) {
    return false;
  }
  if (filter.regionId && !(entry.ownerType === "region" && entry.ownerId === filter.regionId)) {
    return false;
  }
  return true;
};

const emptyOwner = (): StockOwnerQuantities => ({ free: 0, regionReserve: 0, orderReserve: 0 });
const emptyLocation = (): StockLocationQuantities => ({ warehouses: 0, production: 0, transfers: 0 });

const onHandFromOwner = (owner: StockOwnerQuantities): number =>
  owner.free + owner.regionReserve + owner.orderReserve;

const regionReserveFromLocation = (location: StockLocationQuantities): number =>
  location.warehouses + location.production + location.transfers;

const filteredOnHand = (balances: StockBalance[], filter: StockMatrixFilter = {}): StockBalance[] =>
  balances.filter((entry) => matchesStockMatrixFilter(entry, filter));

export const projectProductStockMatrix = (
  balances: StockBalance[],
  filter: StockMatrixFilter = {},
): StockProductMatrixRow[] => {
  const grouped = new Map<string, StockProductMatrixRow>();

  for (const entry of filteredOnHand(balances, filter)) {
    const ownerKey = ownerBucket(entry);
    const locationKey = locationBucket(entry);
    if (!ownerKey || !locationKey) {
      continue;
    }
    const current = grouped.get(entry.productId) ?? {
      productId: entry.productId,
      owner: emptyOwner(),
      location: emptyLocation(),
    };
    current.owner[ownerKey] += entry.quantity;
    current.location[locationKey] += entry.quantity;
    grouped.set(entry.productId, current);
  }

  return [...grouped.values()]
    .filter((row) => isPresent(onHandFromOwner(row.owner)))
    .sort((left, right) => left.productId.localeCompare(right.productId));
};

export const projectWarehouseProductMatrix = (
  balances: StockBalance[],
  filter: StockMatrixFilter = {},
): StockWarehouseSection[] => {
  const grouped = new Map<string, Map<string, StockWarehouseProductRow>>();

  for (const entry of filteredOnHand(balances, { ...filter, location: "warehouse" })) {
    const ownerKey = ownerBucket(entry);
    if (!ownerKey) {
      continue;
    }
    const warehouseId = entry.locationId;
    const byProduct = grouped.get(warehouseId) ?? new Map<string, StockWarehouseProductRow>();
    const current = byProduct.get(entry.productId) ?? {
      warehouseId,
      productId: entry.productId,
      free: 0,
      regionReserve: 0,
      orderReserve: 0,
      onHand: 0,
    };
    current[ownerKey] += entry.quantity;
    current.onHand = current.free + current.regionReserve + current.orderReserve;
    byProduct.set(entry.productId, current);
    grouped.set(warehouseId, byProduct);
  }

  return [...grouped.entries()]
    .map(([warehouseId, byProduct]) => ({
      warehouseId,
      rows: [...byProduct.values()]
        .filter((row) => isPresent(row.onHand))
        .sort((left, right) => left.productId.localeCompare(right.productId)),
    }))
    .filter((section) => section.rows.length > 0)
    .sort((left, right) => left.warehouseId.localeCompare(right.warehouseId));
};

export const projectRegionProductMatrix = (
  balances: StockBalance[],
  filter: StockMatrixFilter = {},
): StockRegionSection[] => {
  const grouped = new Map<string, Map<string, StockRegionProductRow>>();

  for (const entry of filteredOnHand(balances, { ...filter, owner: "region" })) {
    if (entry.ownerType !== "region" || !entry.ownerId) {
      continue;
    }
    const locationKey = locationBucket(entry);
    if (!locationKey) {
      continue;
    }
    const regionId = entry.ownerId;
    const byProduct = grouped.get(regionId) ?? new Map<string, StockRegionProductRow>();
    const current = byProduct.get(entry.productId) ?? {
      regionId,
      productId: entry.productId,
      warehouses: 0,
      production: 0,
      transfers: 0,
      regionReserve: 0,
    };
    current[locationKey] += entry.quantity;
    current.regionReserve = regionReserveFromLocation(current);
    byProduct.set(entry.productId, current);
    grouped.set(regionId, byProduct);
  }

  return [...grouped.entries()]
    .map(([regionId, byProduct]) => ({
      regionId,
      rows: [...byProduct.values()]
        .filter((row) => isPresent(row.regionReserve))
        .sort((left, right) => left.productId.localeCompare(right.productId)),
    }))
    .filter((section) => section.rows.length > 0)
    .sort((left, right) => left.regionId.localeCompare(right.regionId));
};
