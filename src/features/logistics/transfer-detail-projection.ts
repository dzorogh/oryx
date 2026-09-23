import { hrefForOwner } from "@/features/logistics/logistics-availability";
import { computeStockBalances } from "@/features/logistics/logistics-balances";
import { FREE_OWNER_LABEL } from "@/features/logistics/logistics-labels";
import {
  customerOrderById,
  productById,
  regionById,
  regionCode,
  warehouseCode,
} from "@/features/logistics/logistics-lookups";
import {
  isFreeOwner,
  ownerKey,
  type LogisticsSnapshot,
  type OwnerType,
  type StockBalance,
  type StockTransaction,
  type Transfer,
} from "@/features/logistics/logistics-types";

const POSITIVE = 1e-9;

export type TransferOwnerKind = "free" | "order" | "region";
export type TransferProjectionSource = "live" | "history" | "document";
export type TransferCurrentKind = "origin" | "transfer" | "destination";

export type TransferOwnerRef = {
  key: string;
  kind: TransferOwnerKind;
  ownerType: OwnerType | null;
  ownerId: string | null;
  title: string;
  breakdownLabel: string;
  href: string | null;
};

export type TransferOwnerProductLine = {
  productId: string;
  quantity: number;
};

export type TransferOwnerGroup = TransferOwnerRef & {
  total: number;
  lines: TransferOwnerProductLine[];
};

export type TransferProductBreakdown = TransferOwnerRef & {
  quantity: number;
};

export type TransferProductRow = {
  productId: string;
  total: number;
  breakdown: TransferProductBreakdown[];
};

export type TransferRouteNode = {
  role: "origin" | "current" | "destination";
  label: string;
  value: string;
  warehouseId: string | null;
  current: boolean;
};

export type TransferRouteProjection = {
  origin: TransferRouteNode;
  current: TransferRouteNode;
  destination: TransferRouteNode;
  currentKind: TransferCurrentKind;
};

export type TransferDetailProjection = {
  transfer: Transfer;
  route: TransferRouteProjection;
  groups: TransferOwnerGroup[];
  products: TransferProductRow[];
  freeTotal: number;
  canReserveInTransit: boolean;
  source: TransferProjectionSource;
};

type OwnerQuantity = {
  productId: string;
  ownerType: OwnerType | null;
  ownerId: string | null;
  quantity: number;
};

const isPositive = (quantity: number): boolean => quantity > POSITIVE;

export const transferOwnerRef = (
  snapshot: LogisticsSnapshot,
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): TransferOwnerRef => {
  if (isFreeOwner(ownerType, ownerId)) {
    return {
      key: "free",
      kind: "free",
      ownerType: null,
      ownerId: null,
      title: FREE_OWNER_LABEL,
      breakdownLabel: FREE_OWNER_LABEL,
      href: null,
    };
  }

  const href = hrefForOwner(ownerType, ownerId);
  if (ownerType === "order" && ownerId) {
    const number = customerOrderById(snapshot, ownerId)?.number ?? ownerId;
    return {
      key: ownerKey(ownerType, ownerId),
      kind: "order",
      ownerType,
      ownerId,
      title: `Заказ ${number}`,
      breakdownLabel: number,
      href,
    };
  }

  const region = ownerId ? regionById(snapshot, ownerId) : undefined;
  const code = ownerId ? region?.code || regionCode(snapshot, ownerId) : "";
  const name = region?.name;
  const breakdownLabel = name ? `${code} · ${name}` : code;
  return {
    key: ownerKey(ownerType, ownerId),
    kind: "region",
    ownerType: "region",
    ownerId: ownerId ?? null,
    title: name ? `Регион ${code} · ${name}` : `Регион ${code}`,
    breakdownLabel,
    href,
  };
};

const compareOwnerRefs = (left: TransferOwnerRef, right: TransferOwnerRef): number => {
  const rank: Record<TransferOwnerKind, number> = { free: 0, order: 1, region: 2 };
  const byKind = rank[left.kind] - rank[right.kind];
  if (byKind !== 0) {
    return byKind;
  }
  return left.breakdownLabel.localeCompare(right.breakdownLabel);
};

const productOrder = (snapshot: LogisticsSnapshot, transferId: string): string[] => {
  const lineOrder = snapshot.transferLines
    .filter((line) => line.transferId === transferId)
    .map((line) => line.productId);
  const seen = new Set(lineOrder);
  const extras = snapshot.products
    .map((product) => product.id)
    .filter((id) => !seen.has(id))
    .sort((left, right) => {
      const leftName = productById(snapshot, left)?.name ?? left;
      const rightName = productById(snapshot, right)?.name ?? right;
      return leftName.localeCompare(rightName);
    });
  return [...lineOrder, ...extras];
};

const sortProductLines = (
  snapshot: LogisticsSnapshot,
  transferId: string,
  lines: TransferOwnerProductLine[],
): TransferOwnerProductLine[] => {
  const order = productOrder(snapshot, transferId);
  return [...lines].sort((left, right) => {
    const leftIndex = order.indexOf(left.productId);
    const rightIndex = order.indexOf(right.productId);
    const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    if (safeLeft !== safeRight) {
      return safeLeft - safeRight;
    }
    return left.productId.localeCompare(right.productId);
  });
};

const liveTransferBalances = (balances: StockBalance[], transferId: string): StockBalance[] =>
  balances.filter(
    (entry) =>
      entry.locationType === "transfer" &&
      entry.locationId === transferId &&
      isPositive(entry.quantity) &&
      (entry.stockState === "free" || entry.stockState === "reserved"),
  );

const usableTransferTransactions = (
  transactions: StockTransaction[],
  transferId: string,
): StockTransaction[] =>
  transactions.filter(
    (entry) =>
      entry.locationType === "transfer" &&
      entry.locationId === transferId &&
      !(entry.documentType === "transfer" && entry.quantity < 0),
  );

const quantitiesFromBalances = (entries: StockBalance[]): OwnerQuantity[] => {
  const totals = new Map<string, OwnerQuantity>();
  for (const entry of entries) {
    if (!isPositive(entry.quantity)) {
      continue;
    }
    const free = entry.stockState === "free" || isFreeOwner(entry.ownerType, entry.ownerId);
    if (entry.stockState === "reserved" && isFreeOwner(entry.ownerType, entry.ownerId)) {
      continue;
    }
    const ownerType = free ? null : entry.ownerType;
    const ownerId = free ? null : entry.ownerId;
    const key = `${entry.productId}|${ownerKey(ownerType, ownerId)}`;
    const current = totals.get(key);
    if (current) {
      current.quantity += entry.quantity;
      continue;
    }
    totals.set(key, {
      productId: entry.productId,
      ownerType,
      ownerId,
      quantity: entry.quantity,
    });
  }
  return [...totals.values()].filter((item) => isPositive(item.quantity));
};

const quantitiesFromDocument = (snapshot: LogisticsSnapshot, transferId: string): OwnerQuantity[] => {
  const lines = snapshot.transferLines.filter((line) => line.transferId === transferId);
  const quantities: OwnerQuantity[] = [];

  for (const line of lines) {
    const allocations = snapshot.transferAllocations.filter((item) => item.lineId === line.id);
    const allocated = allocations.reduce((sum, item) => sum + item.quantity, 0);
    const free = line.quantity - allocated;
    if (isPositive(free)) {
      quantities.push({
        productId: line.productId,
        ownerType: null,
        ownerId: null,
        quantity: free,
      });
    }
    for (const allocation of allocations) {
      if (!isPositive(allocation.quantity) || isFreeOwner(allocation.ownerType, allocation.ownerId)) {
        continue;
      }
      quantities.push({
        productId: line.productId,
        ownerType: allocation.ownerType,
        ownerId: allocation.ownerId,
        quantity: allocation.quantity,
      });
    }
  }

  return quantities;
};

const groupsFromQuantities = (
  snapshot: LogisticsSnapshot,
  transferId: string,
  quantities: OwnerQuantity[],
): TransferOwnerGroup[] => {
  const grouped = new Map<string, TransferOwnerGroup>();
  for (const item of quantities) {
    const owner = transferOwnerRef(snapshot, item.ownerType, item.ownerId);
    const current = grouped.get(owner.key);
    if (current) {
      current.total += item.quantity;
      const line = current.lines.find((entry) => entry.productId === item.productId);
      if (line) {
        line.quantity += item.quantity;
      } else {
        current.lines.push({ productId: item.productId, quantity: item.quantity });
      }
      continue;
    }
    grouped.set(owner.key, {
      ...owner,
      total: item.quantity,
      lines: [{ productId: item.productId, quantity: item.quantity }],
    });
  }

  return [...grouped.values()]
    .filter((group) => isPositive(group.total))
    .map((group) => ({
      ...group,
      lines: sortProductLines(
        snapshot,
        transferId,
        group.lines.filter((line) => isPositive(line.quantity)),
      ),
    }))
    .sort(compareOwnerRefs);
};

const productsFromGroups = (
  snapshot: LogisticsSnapshot,
  transferId: string,
  groups: TransferOwnerGroup[],
): TransferProductRow[] => {
  const byProduct = new Map<string, TransferProductRow>();
  for (const group of groups) {
    for (const line of group.lines) {
      const current = byProduct.get(line.productId) ?? {
        productId: line.productId,
        total: 0,
        breakdown: [],
      };
      current.total += line.quantity;
      current.breakdown.push({
        key: group.key,
        kind: group.kind,
        ownerType: group.ownerType,
        ownerId: group.ownerId,
        title: group.title,
        breakdownLabel: group.breakdownLabel,
        href: group.href,
        quantity: line.quantity,
      });
      byProduct.set(line.productId, current);
    }
  }

  const order = productOrder(snapshot, transferId);
  return [...byProduct.values()]
    .filter((row) => isPositive(row.total))
    .map((row) => ({
      ...row,
      breakdown: [...row.breakdown].sort(compareOwnerRefs),
    }))
    .sort((left, right) => {
      const leftIndex = order.indexOf(left.productId);
      const rightIndex = order.indexOf(right.productId);
      const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      if (safeLeft !== safeRight) {
        return safeLeft - safeRight;
      }
      return left.productId.localeCompare(right.productId);
    });
};

const quantitiesByProduct = (quantities: OwnerQuantity[]): Map<string, OwnerQuantity[]> => {
  const grouped = new Map<string, OwnerQuantity[]>();
  for (const item of quantities) {
    const current = grouped.get(item.productId);
    if (current) {
      current.push(item);
      continue;
    }
    grouped.set(item.productId, [item]);
  }
  return grouped;
};

const ownerQuantityTotal = (quantities: OwnerQuantity[] | undefined): number =>
  (quantities ?? []).reduce((sum, item) => sum + item.quantity, 0);

const historyCoversDocument = (historyTotal: number, documentTotal: number): boolean =>
  isPositive(historyTotal) && historyTotal + POSITIVE >= documentTotal;

const projectOwnerQuantities = (
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
  transfer: Transfer,
): { quantities: OwnerQuantity[]; source: TransferProjectionSource } => {
  const live = quantitiesFromBalances(liveTransferBalances(balances, transfer.id));
  if (live.length > 0) {
    return { quantities: live, source: "live" };
  }

  const history = quantitiesFromBalances(
    computeStockBalances(usableTransferTransactions(snapshot.transactions, transfer.id)),
  );
  const document = quantitiesFromDocument(snapshot, transfer.id);
  const historyByProduct = quantitiesByProduct(history);
  const documentByProduct = quantitiesByProduct(document);
  const productIds = new Set<string>([
    ...snapshot.transferLines.filter((line) => line.transferId === transfer.id).map((line) => line.productId),
    ...historyByProduct.keys(),
    ...documentByProduct.keys(),
  ]);

  const quantities: OwnerQuantity[] = [];
  let usedHistory = false;
  for (const productId of productIds) {
    const historyRows = historyByProduct.get(productId) ?? [];
    const documentRows = documentByProduct.get(productId) ?? [];
    if (historyCoversDocument(ownerQuantityTotal(historyRows), ownerQuantityTotal(documentRows))) {
      quantities.push(...historyRows);
      usedHistory = true;
      continue;
    }
    quantities.push(...documentRows);
  }

  return { quantities, source: usedHistory ? "history" : "document" };
};

const projectRoute = (
  snapshot: LogisticsSnapshot,
  transfer: Transfer,
  source: TransferProjectionSource,
): TransferRouteProjection => {
  const originValue = warehouseCode(snapshot, transfer.fromWarehouseId);
  const destinationValue = warehouseCode(snapshot, transfer.toWarehouseId);
  const transferValue = `Перемещение ${transfer.number}`;

  let currentKind: TransferCurrentKind = "transfer";
  if (transfer.status === "delivered" || transfer.status === "done") {
    currentKind = "destination";
  } else if (transfer.status === "cancelled") {
    currentKind = source === "live" ? "transfer" : "origin";
  }

  const currentValue =
    currentKind === "origin" ? originValue : currentKind === "destination" ? destinationValue : transferValue;
  const currentWarehouseId =
    currentKind === "origin"
      ? transfer.fromWarehouseId
      : currentKind === "destination"
        ? transfer.toWarehouseId
        : null;

  return {
    currentKind,
    origin: {
      role: "origin",
      label: "Откуда",
      value: originValue,
      warehouseId: transfer.fromWarehouseId,
      current: currentKind === "origin",
    },
    current: {
      role: "current",
      label: "Сейчас",
      value: currentValue,
      warehouseId: currentWarehouseId,
      current: currentKind === "transfer",
    },
    destination: {
      role: "destination",
      label: "Куда",
      value: destinationValue,
      warehouseId: transfer.toWarehouseId,
      current: currentKind === "destination",
    },
  };
};

export const projectTransferDetail = (
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
  transfer: Transfer,
): TransferDetailProjection => {
  const { quantities, source } = projectOwnerQuantities(snapshot, balances, transfer);
  const groups = groupsFromQuantities(snapshot, transfer.id, quantities);
  const products = productsFromGroups(snapshot, transfer.id, groups);
  const freeTotal = groups.find((group) => group.kind === "free")?.total ?? 0;

  return {
    transfer,
    route: projectRoute(snapshot, transfer, source),
    groups,
    products,
    freeTotal,
    canReserveInTransit: transfer.status === "sent" && isPositive(freeTotal),
    source,
  };
};
