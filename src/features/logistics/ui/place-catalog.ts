import { FREE_OWNER_LABEL } from "@/features/logistics/logistics-labels";
import { ownerCode, productById } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot, OwnerType, StockBalance } from "@/features/logistics/logistics-types";
import type { CatalogOwnerKind, CatalogProductRow } from "@/features/logistics/ui/catalog-quantity-table";

export type PlaceOwner = {
  ownerType: OwnerType | null;
  ownerId: string | null;
  quantity: number;
};

const ownerKey = (ownerType: OwnerType | null, ownerId: string | null) =>
  `${ownerType ?? "free"}:${ownerId ?? ""}`;

const ownerKind = (ownerType: OwnerType | null): CatalogOwnerKind => ownerType ?? "free";

export const placeOwnersByProduct = (
  balances: StockBalance[],
  locationType: string,
  locationId: string,
): Map<string, PlaceOwner[]> => {
  const map = new Map<string, PlaceOwner[]>();
  for (const entry of balances) {
    if (entry.locationType !== locationType || entry.locationId !== locationId || entry.quantity <= 1e-9) {
      continue;
    }
    if (entry.stockState === "shipped") continue;
    const list = map.get(entry.productId) ?? [];
    list.push({
      ownerType: entry.ownerType,
      ownerId: entry.ownerId,
      quantity: entry.quantity,
    });
    map.set(entry.productId, list);
  }
  return map;
};

export const catalogProductsFromPlace = (
  snapshot: LogisticsSnapshot,
  ownersByProduct: Map<string, PlaceOwner[]>,
  options?: {
    orderOwnerId?: string | null;
    showAll?: boolean;
    hints?: (productId: string, owner: PlaceOwner) => Array<string | number | null>;
    productHints?: (productId: string) => Array<string | number | null>;
    includeProducts?: LogisticsSnapshot["products"];
  },
): CatalogProductRow[] => {
  const products = options?.includeProducts ?? snapshot.products;
  const rows: CatalogProductRow[] = [];
  for (const product of products) {
    const owners = ownersByProduct.get(product.id) ?? [];
    const visible = owners.filter((owner) => {
      if (!options?.orderOwnerId || options.showAll) return true;
      return owner.ownerType === "order" && owner.ownerId === options.orderOwnerId;
    });
    if (options?.includeProducts && visible.length === 0 && owners.length === 0) {
      rows.push({
        id: product.id,
        name: product.name,
        code: product.code,
        unit: product.unit,
        categoryIds: product.categoryIds,
        hints: options.productHints?.(product.id),
        owners: [
          {
            key: `${product.id}:free:`,
            kind: "free",
            label: FREE_OWNER_LABEL,
            limit: null,
            hints: options.productHints?.(product.id) ?? [],
          },
        ],
      });
      continue;
    }
    if (visible.length === 0) continue;
    const resolved = productById(snapshot, product.id) ?? product;
    rows.push({
      id: product.id,
      name: resolved.name,
      code: resolved.code,
      unit: resolved.unit,
      categoryIds: resolved.categoryIds,
      hints: options?.productHints?.(product.id),
      owners: visible.map((owner) => ({
        key: `${product.id}:${ownerKey(owner.ownerType, owner.ownerId)}`,
        kind: ownerKind(owner.ownerType),
        label: owner.ownerType
          ? ownerCode(snapshot, owner.ownerType, owner.ownerId)
          : FREE_OWNER_LABEL,
        limit: owner.quantity,
        hints: options?.hints?.(product.id, owner) ?? [owner.quantity],
      })),
    });
  }
  return rows;
};

/** Склады, у которых каталожная таблица покажет хотя бы одну строку. `keepId` остаётся в списке. */
export const catalogSourceWarehouseIds = (
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
  options?: {
    orderOwnerId?: string | null;
    orderProductIds?: string[] | null;
    showAll?: boolean;
    keepId?: string | null;
  },
): string[] => {
  const showAll = options?.showAll ?? !options?.orderOwnerId;
  const ids = snapshot.warehouses
    .filter((warehouse) => {
      const owners = placeOwnersByProduct(balances, "warehouse", warehouse.id);
      if (options?.orderProductIds) {
        for (const productId of [...owners.keys()]) {
          if (!options.orderProductIds.includes(productId)) owners.delete(productId);
        }
      }
      return catalogProductsFromPlace(snapshot, owners, { orderOwnerId: options?.orderOwnerId, showAll }).length > 0;
    })
    .map((warehouse) => warehouse.id);
  if (options?.keepId && snapshot.warehouses.some((warehouse) => warehouse.id === options.keepId) && !ids.includes(options.keepId)) {
    ids.push(options.keepId);
  }
  return ids;
};

export const parseOwnerQuantityKey = (
  key: string,
): { productId: string; ownerType: OwnerType | null; ownerId: string | null } | null => {
  const [productId, ownerType, ownerId = ""] = key.split(":");
  if (!productId || !ownerType) return null;
  if (ownerType === "free") return { productId, ownerType: null, ownerId: null };
  if (ownerType !== "order" && ownerType !== "region") return null;
  return { productId, ownerType, ownerId: ownerId || null };
};
