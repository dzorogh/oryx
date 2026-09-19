import {
  LOCATION_TYPES,
  isFreeOwner,
  ownersEqual,
  type CustomerOrderLine,
  type LocationType,
  type OwnerType,
  type StockBalance,
  type StockState,
  type StockTransaction,
} from "@/features/logistics/logistics-types";

export type StockPlaceFilter =
  | { kind: "all" }
  | { kind: "locationType"; locationType: LocationType }
  | { kind: "warehouse"; warehouseId: string };

export type ProductStockLocation = {
  locationType: LocationType;
  locationId: string;
  quantity: number;
  free: number;
  reserved: number;
  shipped: number;
};

export type ProductStockSummary = {
  productId: string;
  total: number;
  byType: Record<LocationType, number>;
  locations: ProductStockLocation[];
};

const emptyByType = (): Record<LocationType, number> =>
  Object.fromEntries(LOCATION_TYPES.map((type) => [type, 0])) as Record<LocationType, number>;

const matchesPlace = (entry: StockBalance, place: StockPlaceFilter): boolean => {
  if (place.kind === "all") {
    return true;
  }
  if (place.kind === "warehouse") {
    return entry.locationType === "warehouse" && entry.locationId === place.warehouseId;
  }
  return entry.locationType === place.locationType;
};

const balanceKey = (entry: Omit<StockBalance, "quantity">): string =>
  [
    entry.productId,
    entry.locationType,
    entry.locationId,
    entry.stockState,
    entry.ownerType ?? "",
    entry.ownerId ?? "",
  ].join("|");

export const computeStockBalances = (transactions: StockTransaction[]): StockBalance[] => {
  const totals = new Map<string, StockBalance>();

  for (const tx of transactions) {
    const key = balanceKey(tx);
    const current = totals.get(key);
    if (current) {
      current.quantity += tx.quantity;
      continue;
    }
    totals.set(key, {
      productId: tx.productId,
      locationType: tx.locationType,
      locationId: tx.locationId,
      stockState: tx.stockState,
      ownerType: tx.ownerType,
      ownerId: tx.ownerId,
      quantity: tx.quantity,
    });
  }

  return [...totals.values()]
    .filter((entry) => Math.abs(entry.quantity) > 1e-9)
    .sort((left, right) => {
      const product = left.productId.localeCompare(right.productId);
      if (product !== 0) {
        return product;
      }
      const location = left.locationId.localeCompare(right.locationId);
      if (location !== 0) {
        return location;
      }
      return left.stockState.localeCompare(right.stockState);
    });
};

export const getBalanceQuantity = (
  balances: StockBalance[],
  match: Omit<StockBalance, "quantity">,
): number => {
  const found = balances.find(
    (entry) =>
      entry.productId === match.productId &&
      entry.locationType === match.locationType &&
      entry.locationId === match.locationId &&
      entry.stockState === match.stockState &&
      ownersEqual(entry.ownerType, entry.ownerId, match.ownerType, match.ownerId),
  );
  return found?.quantity ?? 0;
};

export const sumReservedForOwner = (
  balances: StockBalance[],
  ownerType: OwnerType | null,
  ownerId: string | null,
  productId?: string,
): number => {
  if (isFreeOwner(ownerType, ownerId)) {
    return 0;
  }
  return balances
    .filter(
      (entry) =>
        entry.stockState === "reserved" &&
        ownersEqual(entry.ownerType, entry.ownerId, ownerType, ownerId) &&
        (productId == null || entry.productId === productId),
    )
    .reduce((sum, entry) => sum + entry.quantity, 0);
};

export const sumShippedForOrderProduct = (
  balances: StockBalance[],
  orderId: string,
  productId: string,
): number =>
  balances
    .filter(
      (entry) =>
        entry.stockState === "shipped" &&
        entry.productId === productId &&
        ownersEqual(entry.ownerType, entry.ownerId, "order", orderId),
    )
    .reduce((sum, entry) => sum + entry.quantity, 0);

export const remainingToReserveForOrderProduct = (
  ordered: number,
  balances: StockBalance[],
  orderId: string,
  productId: string,
): number =>
  ordered -
  sumShippedForOrderProduct(balances, orderId, productId) -
  sumReservedForOwner(balances, "order", orderId, productId);

export const sumReservedForLine = (balances: StockBalance[], line: CustomerOrderLine): number =>
  sumReservedForOwner(balances, "order", line.orderId, line.productId);

export const sumShippedForLine = (balances: StockBalance[], line: CustomerOrderLine): number =>
  sumShippedForOrderProduct(balances, line.orderId, line.productId);

export const openQuantityForLine = (
  ordered: number,
  balances: StockBalance[],
  line: CustomerOrderLine,
): number => ordered - sumShippedForLine(balances, line);

export const remainingToReserve = (
  ordered: number,
  balances: StockBalance[],
  line: CustomerOrderLine,
): number => remainingToReserveForOrderProduct(ordered, balances, line.orderId, line.productId);

export const sumLocationState = (
  balances: StockBalance[],
  match: Pick<StockBalance, "locationType" | "locationId" | "stockState"> & { productId?: string },
): number =>
  balances
    .filter(
      (entry) =>
        entry.locationType === match.locationType &&
        entry.locationId === match.locationId &&
        entry.stockState === match.stockState &&
        (match.productId == null || entry.productId === match.productId),
    )
    .reduce((sum, entry) => sum + entry.quantity, 0);

export const summarizeProductStock = (
  balances: StockBalance[],
  filter: {
    place: StockPlaceFilter;
    stockState: StockState | "all";
    customerOrderId?: string | null;
    ownerType?: OwnerType | null;
    ownerId?: string | null;
  } = {
    place: { kind: "all" },
    stockState: "all",
  },
): ProductStockSummary[] => {
  const grouped = new Map<string, ProductStockSummary>();
  const ownerType = filter.ownerType ?? (filter.customerOrderId ? "order" : undefined);
  const ownerId = filter.ownerId ?? filter.customerOrderId ?? undefined;

  for (const entry of balances) {
    if (filter.stockState !== "all" && entry.stockState !== filter.stockState) {
      continue;
    }
    if (!matchesPlace(entry, filter.place)) {
      continue;
    }
    if (ownerType !== undefined && ownerId !== undefined) {
      if (!ownersEqual(entry.ownerType, entry.ownerId, ownerType, ownerId)) {
        continue;
      }
    }

    const current = grouped.get(entry.productId) ?? {
      productId: entry.productId,
      total: 0,
      byType: emptyByType(),
      locations: [],
    };
    current.total += entry.quantity;
    current.byType[entry.locationType] += entry.quantity;
    const location = current.locations.find(
      (item) => item.locationType === entry.locationType && item.locationId === entry.locationId,
    );
    if (location) {
      location.quantity += entry.quantity;
      location[entry.stockState] += entry.quantity;
    } else {
      current.locations.push({
        locationType: entry.locationType,
        locationId: entry.locationId,
        quantity: entry.quantity,
        free: entry.stockState === "free" ? entry.quantity : 0,
        reserved: entry.stockState === "reserved" ? entry.quantity : 0,
        shipped: entry.stockState === "shipped" ? entry.quantity : 0,
      });
    }
    grouped.set(entry.productId, current);
  }

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      locations: row.locations
        .filter((item) => Math.abs(item.quantity) > 1e-9)
        .sort((left, right) => right.quantity - left.quantity || left.locationId.localeCompare(right.locationId)),
    }))
    .filter((row) => Math.abs(row.total) > 1e-9)
    .sort((left, right) => left.productId.localeCompare(right.productId));
};
