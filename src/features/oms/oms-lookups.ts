import { hrefForCustomerOrder, hrefForRegion } from "@/features/oms/oms-availability";
import { formatEntityCode, type EntityCodeKind } from "@/lib/entity-codes";
import {
  FREE_OWNER_LABEL,
  LOCATION_LABELS,
  OWNER_TYPE_LABELS,
  locationKindLabel,
} from "@/features/oms/oms-labels";
import {
  isFreeOwner,
  type OmsSnapshot,
  type LocationType,
  type OwnerType,
  type SourceType,
  type StockBalance,
} from "@/features/oms/oms-types";

export const productById = (snapshot: OmsSnapshot, id: string) =>
  snapshot.products.find((item) => item.id === id);

export const productCode = (snapshot: OmsSnapshot, id: string): string =>
  productById(snapshot, id)?.code || formatEntityCode("product", id);

export const productIdentityLabel = (
  product: { id?: string; code?: string; name: string } | undefined,
  productId: string,
  extra?: string,
): string => {
  const code = product?.code || formatEntityCode("product", productId);
  const name = product?.name ?? productId;
  return extra ? `${code} · ${name} · ${extra}` : `${code} · ${name}`;
};

export const warehouseById = (snapshot: OmsSnapshot, id: string) =>
  snapshot.warehouses.find((item) => item.id === id);

export const warehouseOwnerLabel = (snapshot: OmsSnapshot, warehouseId: string): string => {
  const warehouse = warehouseById(snapshot, warehouseId);
  if (!warehouse?.plantId) {
    return "Общий / РЦ";
  }
  return plantCode(snapshot, warehouse.plantId ?? "");
};

export const plantById = (snapshot: OmsSnapshot, id: string) =>
  snapshot.plants.find((item) => item.id === id);

export const plantCode = (snapshot: OmsSnapshot, id: string): string =>
  plantById(snapshot, id)?.code ?? id;

export const plantIdsForProducts = (
  snapshot: OmsSnapshot,
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

export const plantSelectItems = (snapshot: OmsSnapshot, productIds?: string[]) => {
  const allowed = productIds ? plantIdsForProducts(snapshot, productIds) : null;
  return snapshot.plants
    .filter((item) => !allowed || allowed.includes(item.id))
    .map((item) => ({ value: item.id, label: item.code }));
};

export const productsForPlant = (snapshot: OmsSnapshot, plantId: string) =>
  snapshot.products.filter((product) => !product.plantId || product.plantId === plantId);

export const plantsForProduct = (snapshot: OmsSnapshot, productId: string) => {
  const allowed = plantIdsForProducts(snapshot, [productId]);
  if (!allowed) {
    return snapshot.plants;
  }
  return snapshot.plants.filter((item) => allowed.includes(item.id));
};

export const linkedPlantsForProduct = (snapshot: OmsSnapshot, productId: string) => {
  const plantId = productById(snapshot, productId)?.plantId;
  if (!plantId) {
    return [];
  }
  return snapshot.plants.filter((item) => item.id === plantId);
};

export const warehouseCode = (snapshot: OmsSnapshot, id: string): string =>
  warehouseById(snapshot, id)?.code ?? id;

export const warehouseSelectItems = (snapshot: OmsSnapshot, excludeId?: string) =>
  snapshot.warehouses
    .filter((item) => item.id !== excludeId)
    .map((item) => ({ value: item.id, label: item.code }));

export const regionById = (snapshot: OmsSnapshot, id: string) =>
  snapshot.regions.find((item) => item.id === id);

export const regionCode = (snapshot: OmsSnapshot, id: string): string =>
  regionById(snapshot, id)?.code || formatEntityCode("region", id);

export const regionSelectItems = (snapshot: OmsSnapshot) =>
  snapshot.regions.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }));

export const customerOrderById = (snapshot: OmsSnapshot, id: string) =>
  snapshot.customerOrders.find((item) => item.id === id);

export const ownerCode = (
  snapshot: OmsSnapshot,
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): string => {
  if (isFreeOwner(ownerType, ownerId) || !ownerId) {
    return FREE_OWNER_LABEL;
  }
  if (ownerType === "order") {
    return customerOrderById(snapshot, ownerId)?.number ?? formatEntityCode("customer_order", ownerId);
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
  snapshot: OmsSnapshot,
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
    return region ? region.code : formatEntityCode("region", ownerId);
  }
  return ownerId ?? FREE_OWNER_LABEL;
};

export const ownerSelectItems = (snapshot: OmsSnapshot, ownerType: OwnerType | "free" | "") => {
  if (ownerType === "order") {
    return snapshot.customerOrders.map((item) => ({ value: item.id, label: item.number }));
  }
  if (ownerType === "region") {
    return regionSelectItems(snapshot);
  }
  return [];
};

export const productionOrderById = (snapshot: OmsSnapshot, id: string) =>
  snapshot.productionOrders.find((item) => item.id === id);

/** Journal location is the production order. Leftover line ids still resolve to the parent. */
export const productionOrderIdForLocation = (snapshot: OmsSnapshot, locationId: string): string | null => {
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
  snapshot: OmsSnapshot,
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

export const locationLabel = (snapshot: OmsSnapshot, type: LocationType, id: string): string => {
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
  snapshot: OmsSnapshot,
  type: LocationType,
  id: string,
): string => {
  const identity = locationIdentity(snapshot, type, id);
  return `${locationKindLabel(type, identity.isPlantWarehouse)} ${identity.title}`;
};

export const orderNumber = (snapshot: OmsSnapshot, orderId: string | null): string => {
  if (!orderId) {
    return "—";
  }
  return customerOrderById(snapshot, orderId)?.number ?? orderId;
};

const DOCUMENT_CODE_KINDS: Partial<Record<SourceType, EntityCodeKind>> = {
  reservation: "reservation",
  shipment: "shipment",
  return: "shipment",
  output: "production_output",
  production_output: "production_output",
  production_order: "production_order",
  transfer: "transfer",
  adjustment: "adjustment",
};

const documentCode = (documentType: SourceType, documentId: string) => {
  const kind = DOCUMENT_CODE_KINDS[documentType];
  return kind ? formatEntityCode(kind, documentId) || documentId : documentId;
};

export const documentLabel = (
  snapshot: OmsSnapshot,
  documentType: SourceType,
  documentId: string,
): string => {
  const fallback = documentCode(documentType, documentId);
  switch (documentType) {
    case "reservation":
      return snapshot.reservations.find((item) => item.id === documentId)?.number ?? fallback;
    case "shipment":
    case "return":
      return snapshot.shipments.find((item) => item.id === documentId)?.number ?? fallback;
    case "output":
    case "production_output":
      return snapshot.outputs.find((item) => item.id === documentId)?.number ?? fallback;
    case "production_order":
      return productionOrderById(snapshot, documentId)?.number ?? fallback;
    case "transfer":
      return snapshot.transfers.find((item) => item.id === documentId)?.number ?? fallback;
    case "adjustment":
      return snapshot.adjustments.find((item) => item.id === documentId)?.number ?? fallback;
    default:
      return fallback;
  }
};

export const sourceLabel = documentLabel;

export const balancesForProduct = (balances: StockBalance[], productId: string) =>
  balances.filter((entry) => entry.productId === productId);
