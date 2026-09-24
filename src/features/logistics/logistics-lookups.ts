import { hrefForCustomerOrder, hrefForRegion } from "@/features/logistics/logistics-availability";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import {
  FREE_OWNER_LABEL,
  LOCATION_LABELS,
  OWNER_TYPE_LABELS,
  locationKindLabel,
} from "@/features/logistics/logistics-labels";
import {
  isFreeOwner,
  type LogisticsSnapshot,
  type LocationType,
  type OwnerType,
  type SourceType,
  type StockBalance,
} from "@/features/logistics/logistics-types";

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
  if (!warehouse?.plantId) {
    return "Общий / РЦ";
  }
  return plantCode(snapshot, warehouse.plantId ?? "");
};

export const plantById = (snapshot: LogisticsSnapshot, id: string) =>
  snapshot.plants.find((item) => item.id === id);

export const plantCode = (snapshot: LogisticsSnapshot, id: string): string =>
  plantById(snapshot, id)?.code ?? id;

export const plantIdsForProducts = (
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
      [productById(snapshot, productId)?.plantId].filter((id): id is string => Boolean(id)),
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

export const plantSelectItems = (snapshot: LogisticsSnapshot, productIds?: string[]) => {
  const allowed = productIds ? plantIdsForProducts(snapshot, productIds) : null;
  return snapshot.plants
    .filter((item) => !allowed || allowed.includes(item.id))
    .map((item) => ({ value: item.id, label: item.code }));
};

export const productsForPlant = (snapshot: LogisticsSnapshot, plantId: string) =>
  snapshot.products.filter((product) => !product.plantId || product.plantId === plantId);

export const plantsForProduct = (snapshot: LogisticsSnapshot, productId: string) => {
  const allowed = plantIdsForProducts(snapshot, [productId]);
  if (!allowed) {
    return snapshot.plants;
  }
  return snapshot.plants.filter((item) => allowed.includes(item.id));
};

export const linkedPlantsForProduct = (snapshot: LogisticsSnapshot, productId: string) => {
  const plantId = productById(snapshot, productId)?.plantId;
  if (!plantId) {
    return [];
  }
  return snapshot.plants.filter((item) => item.id === plantId);
};

export const warehouseCode = (snapshot: LogisticsSnapshot, id: string): string =>
  warehouseById(snapshot, id)?.code ?? id;

export const warehouseSelectItems = (snapshot: LogisticsSnapshot, excludeId?: string) =>
  snapshot.warehouses
    .filter((item) => item.id !== excludeId)
    .map((item) => ({ value: item.id, label: item.code }));

export const regionById = (snapshot: LogisticsSnapshot, id: string) =>
  snapshot.regions.find((item) => item.id === id);

export const regionCode = (snapshot: LogisticsSnapshot, id: string): string =>
  regionById(snapshot, id)?.code || formatLogisticsCode("region", id);

export const regionSelectItems = (snapshot: LogisticsSnapshot) =>
  snapshot.regions.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));

export const customerOrderById = (snapshot: LogisticsSnapshot, id: string) =>
  snapshot.customerOrders.find((item) => item.id === id);

export const ownerCode = (
  snapshot: LogisticsSnapshot,
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): string => {
  if (isFreeOwner(ownerType, ownerId) || !ownerId) {
    return FREE_OWNER_LABEL;
  }
  if (ownerType === "order") {
    return customerOrderById(snapshot, ownerId)?.number ?? formatLogisticsCode("customerOrder", ownerId);
  }
  return regionCode(snapshot, ownerId);
};

export const ownerHref = (
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): string | null => {
  if (!ownerId) {
    return null;
  }
  if (ownerType === "order") {
    return hrefForCustomerOrder(ownerId);
  }
  if (ownerType === "region") {
    return hrefForRegion(ownerId);
  }
  return null;
};

export const ownerKindLabel = (ownerType: OwnerType | null | undefined): string =>
  ownerType ? OWNER_TYPE_LABELS[ownerType] : FREE_OWNER_LABEL;

export const ownerLabel = (
  snapshot: LogisticsSnapshot,
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): string => {
  if (isFreeOwner(ownerType, ownerId)) {
    return FREE_OWNER_LABEL;
  }
  if (ownerType === "order" && ownerId) {
    return customerOrderById(snapshot, ownerId)?.number ?? ownerId;
  }
  if (ownerType === "region" && ownerId) {
    const region = regionById(snapshot, ownerId);
    return region ? region.code : formatLogisticsCode("region", ownerId);
  }
  return ownerId ?? FREE_OWNER_LABEL;
};

export const ownerSelectItems = (snapshot: LogisticsSnapshot, ownerType: OwnerType | "free" | "") => {
  if (ownerType === "order") {
    return snapshot.customerOrders.map((item) => ({ value: item.id, label: item.number }));
  }
  if (ownerType === "region") {
    return regionSelectItems(snapshot);
  }
  return [];
};

export const productionOrderById = (snapshot: LogisticsSnapshot, id: string) =>
  snapshot.productionOrders.find((item) => item.id === id);

/** Journal location is the production order. Leftover line ids still resolve to the parent. */
export const productionOrderIdForLocation = (snapshot: LogisticsSnapshot, locationId: string): string | null => {
  if (productionOrderById(snapshot, locationId)) {
    return locationId;
  }
  return snapshot.productionOrderLines.find((line) => line.id === locationId)?.orderId ?? null;
};

export type LocationIdentity = {
  title: string;
  hint: string | null;
  plantId: string | null;
  isPlantWarehouse: boolean;
};

export const locationIdentity = (
  snapshot: LogisticsSnapshot,
  type: LocationType,
  id: string,
): LocationIdentity => {
  if (type === "warehouse") {
    const warehouse = warehouseById(snapshot, id);
    const linkedPlantCode = warehouse?.plantId
      ? plantCode(snapshot, warehouse.plantId)
      : null;
    const title = warehouseCode(snapshot, id);
    return {
      title,
      hint: linkedPlantCode && linkedPlantCode !== title ? linkedPlantCode : null,
      plantId: warehouse?.plantId ?? null,
      isPlantWarehouse: Boolean(warehouse?.plantId),
    };
  }
  if (type === "transfer") {
    const transfer = snapshot.transfers.find((item) => item.id === id);
    return {
      title: transfer?.number ?? id,
      hint: transfer
        ? `${warehouseCode(snapshot, transfer.fromWarehouseId)} → ${warehouseCode(snapshot, transfer.toWarehouseId)}`
        : null,
      plantId: null,
      isPlantWarehouse: false,
    };
  }
  if (type === "production_order") {
    const order = productionOrderById(snapshot, productionOrderIdForLocation(snapshot, id) ?? id);
    return {
      title: order?.number ?? id,
      hint: order ? plantCode(snapshot, order.plantId ?? "") : null,
      plantId: order?.plantId ?? null,
      isPlantWarehouse: false,
    };
  }
  if (type === "customer_order") {
    return {
      title: customerOrderById(snapshot, id)?.number ?? id,
      hint: null,
      plantId: null,
      isPlantWarehouse: false,
    };
  }
  if (type === "production_output") {
    const output = snapshot.outputs.find((item) => item.id === id);
    const order = output ? productionOrderById(snapshot, output.productionOrderId) : undefined;
    return {
      title: output?.number ?? id,
      hint: order?.plantId ? plantCode(snapshot, order.plantId) : null,
      plantId: order?.plantId ?? null,
      isPlantWarehouse: false,
    };
  }
  return { title: id, hint: null, plantId: null, isPlantWarehouse: false };
};

export const locationLabel = (snapshot: LogisticsSnapshot, type: LocationType, id: string): string => {
  if (type === "warehouse") {
    return warehouseCode(snapshot, id);
  }
  if (type === "transfer") {
    const transfer = snapshot.transfers.find((item) => item.id === id);
    return transfer ? `Перемещение ${transfer.number}` : id;
  }
  if (type === "production_order") {
    return locationIdentity(snapshot, type, id).title;
  }
  if (type === "customer_order") {
    return customerOrderById(snapshot, id)?.number ?? id;
  }
  if (type === "production_output") {
    return locationIdentity(snapshot, type, id).title;
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

export const documentLabel = (
  snapshot: LogisticsSnapshot,
  documentType: SourceType,
  documentId: string,
): string => {
  switch (documentType) {
    case "reservation":
      return snapshot.reservations.find((item) => item.id === documentId)?.number ?? documentId;
    case "shipment":
      return snapshot.shipments.find((item) => item.id === documentId)?.number ?? documentId;
    case "return":
      return snapshot.shipments.find((item) => item.id === documentId)?.number ?? documentId;
    case "output":
      return snapshot.outputs.find((item) => item.id === documentId)?.number ?? documentId;
    case "production_order":
      return productionOrderById(snapshot, documentId)?.number ?? documentId;
    case "transfer":
      return snapshot.transfers.find((item) => item.id === documentId)?.number ?? documentId;
    case "adjustment":
      return snapshot.adjustments.find((item) => item.id === documentId)?.number ?? documentId;
    default:
      return documentId;
  }
};

export const sourceLabel = documentLabel;

export const balancesForProduct = (balances: StockBalance[], productId: string) =>
  balances.filter((entry) => entry.productId === productId);
