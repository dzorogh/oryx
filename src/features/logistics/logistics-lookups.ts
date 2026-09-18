import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { LOCATION_LABELS, locationKindLabel } from "@/features/logistics/logistics-labels";
import type { LogisticsSnapshot, LocationType, SourceType, StockBalance } from "@/features/logistics/logistics-types";

export const productById = (snapshot: LogisticsSnapshot, id: string) =>
  snapshot.products.find((item) => item.id === id);

export const productCode = (snapshot: LogisticsSnapshot, id: string): string =>
  productById(snapshot, id)?.code || formatLogisticsCode("product", id);

export const productIdentityLabel = (
  product: { id?: string; code?: string; name: string } | undefined,
  productId: string,
  extra?: string,
): string => {
  const code = product?.code || formatLogisticsCode("product", productId);
  const name = product?.name ?? productId;
  return extra ? `${code} · ${name} · ${extra}` : `${code} · ${name}`;
};

export const warehouseById = (snapshot: LogisticsSnapshot, id: string) =>
  snapshot.warehouses.find((item) => item.id === id);

export const warehouseOwnerLabel = (snapshot: LogisticsSnapshot, warehouseId: string): string => {
  const warehouse = warehouseById(snapshot, warehouseId);
  if (!warehouse?.manufacturerId) {
    return "Общий / РЦ";
  }
  return manufacturerCode(snapshot, warehouse.manufacturerId);
};

export const manufacturerById = (snapshot: LogisticsSnapshot, id: string) =>
  snapshot.manufacturers.find((item) => item.id === id);

export const manufacturerCode = (snapshot: LogisticsSnapshot, id: string): string =>
  manufacturerById(snapshot, id)?.code ?? id;

export const manufacturerIdsForProducts = (
  snapshot: LogisticsSnapshot,
  productIds: string[],
): string[] | null => {
  const selected = [...new Set(productIds.filter(Boolean))];
  if (selected.length === 0) {
    return null;
  }
  let allowed: Set<string> | null = null;
  for (const productId of selected) {
    const plants = new Set(
      [productById(snapshot, productId)?.manufacturerId].filter((id): id is string => Boolean(id)),
    );
    if (plants.size === 0) {
      continue;
    }
    if (!allowed) {
      allowed = plants;
      continue;
    }
    allowed = new Set(Array.from(allowed).filter((id) => plants.has(id)));
  }
  return allowed ? [...allowed] : null;
};

export const manufacturerSelectItems = (snapshot: LogisticsSnapshot, productIds?: string[]) => {
  const allowed = productIds ? manufacturerIdsForProducts(snapshot, productIds) : null;
  return snapshot.manufacturers
    .filter((item) => !allowed || allowed.includes(item.id))
    .map((item) => ({ value: item.id, label: item.code }));
};

export const productsForManufacturer = (snapshot: LogisticsSnapshot, manufacturerId: string) =>
  snapshot.products.filter((product) => !product.manufacturerId || product.manufacturerId === manufacturerId);

export const manufacturersForProduct = (snapshot: LogisticsSnapshot, productId: string) => {
  const allowed = manufacturerIdsForProducts(snapshot, [productId]);
  if (!allowed) {
    return snapshot.manufacturers;
  }
  return snapshot.manufacturers.filter((item) => allowed.includes(item.id));
};

export const linkedManufacturersForProduct = (snapshot: LogisticsSnapshot, productId: string) => {
  const plantId = productById(snapshot, productId)?.manufacturerId;
  if (!plantId) {
    return [];
  }
  return snapshot.manufacturers.filter((item) => item.id === plantId);
};

export const warehouseCode = (snapshot: LogisticsSnapshot, id: string): string =>
  warehouseById(snapshot, id)?.code ?? id;

export const warehouseSelectItems = (snapshot: LogisticsSnapshot) =>
  snapshot.warehouses.map((item) => ({ value: item.id, label: item.code }));

export const customerOrderById = (snapshot: LogisticsSnapshot, id: string) =>
  snapshot.customerOrders.find((item) => item.id === id);

export const productionOrderById = (snapshot: LogisticsSnapshot, id: string) =>
  snapshot.productionOrders.find((item) => item.id === id);

export type LocationIdentity = {
  title: string;
  hint: string | null;
  manufacturerId: string | null;
  isPlantWarehouse: boolean;
};

export const locationIdentity = (
  snapshot: LogisticsSnapshot,
  type: LocationType,
  id: string,
): LocationIdentity => {
  if (type === "warehouse") {
    const warehouse = warehouseById(snapshot, id);
    const plantCode = warehouse?.manufacturerId
      ? manufacturerCode(snapshot, warehouse.manufacturerId)
      : null;
    const title = warehouseCode(snapshot, id);
    return {
      title,
      hint: plantCode && plantCode !== title ? plantCode : null,
      manufacturerId: warehouse?.manufacturerId ?? null,
      isPlantWarehouse: Boolean(warehouse?.manufacturerId),
    };
  }
  if (type === "transfer") {
    const transfer = snapshot.transfers.find((item) => item.id === id);
    return {
      title: transfer?.number ?? id,
      hint: transfer
        ? `${warehouseCode(snapshot, transfer.fromWarehouseId)} → ${warehouseCode(snapshot, transfer.toWarehouseId)}`
        : null,
      manufacturerId: null,
      isPlantWarehouse: false,
    };
  }
  if (type === "production_order_line") {
    const line = snapshot.productionOrderLines.find((item) => item.id === id);
    const order = line ? productionOrderById(snapshot, line.orderId) : undefined;
    return {
      title: order?.number ?? id,
      hint: order ? manufacturerCode(snapshot, order.manufacturerId) : null,
      manufacturerId: order?.manufacturerId ?? null,
      isPlantWarehouse: false,
    };
  }
  if (type === "customer_order") {
    return {
      title: customerOrderById(snapshot, id)?.number ?? id,
      hint: null,
      manufacturerId: null,
      isPlantWarehouse: false,
    };
  }
  return { title: id, hint: null, manufacturerId: null, isPlantWarehouse: false };
};

export const locationLabel = (snapshot: LogisticsSnapshot, type: LocationType, id: string): string => {
  if (type === "warehouse") {
    return warehouseCode(snapshot, id);
  }
  if (type === "transfer") {
    const transfer = snapshot.transfers.find((item) => item.id === id);
    return transfer ? `Перемещение ${transfer.number}` : id;
  }
  if (type === "production_order_line") {
    return locationIdentity(snapshot, type, id).title;
  }
  if (type === "customer_order") {
    return customerOrderById(snapshot, id)?.number ?? id;
  }
  return `${LOCATION_LABELS[type]} ${id}`;
};

export const locationHostLabel = (
  snapshot: LogisticsSnapshot,
  type: LocationType,
  id: string,
): string => {
  const identity = locationIdentity(snapshot, type, id);
  return `${locationKindLabel(type, identity.isPlantWarehouse)} ${identity.title}`;
};

export const orderNumber = (snapshot: LogisticsSnapshot, orderId: string | null): string => {
  if (!orderId) {
    return "—";
  }
  return customerOrderById(snapshot, orderId)?.number ?? orderId;
};

export const sourceLabel = (
  snapshot: LogisticsSnapshot,
  sourceType: SourceType,
  sourceId: string,
): string => {
  switch (sourceType) {
    case "reservation":
      return snapshot.reservations.find((item) => item.id === sourceId)?.number ?? sourceId;
    case "shipment":
      return snapshot.shipments.find((item) => item.id === sourceId)?.number ?? sourceId;
    case "shipment_return":
      return snapshot.returns.find((item) => item.id === sourceId)?.number ?? sourceId;
    case "production_output":
      return snapshot.outputs.find((item) => item.id === sourceId)?.number ?? sourceId;
    case "production_activation":
    case "production_close":
      return productionOrderById(snapshot, sourceId)?.number ?? sourceId;
    case "transfer_send":
    case "transfer_complete":
      return snapshot.transfers.find((item) => item.id === sourceId)?.number ?? sourceId;
    default:
      return sourceId;
  }
};

export const balancesForProduct = (balances: StockBalance[], productId: string) =>
  balances.filter((entry) => entry.productId === productId);
