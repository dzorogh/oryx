import { warehouseCode } from "@/features/logistics/logistics-lookups";
import { ownersEqual } from "@/features/logistics/logistics-types";
import type {
  CustomerOrderLine,
  LogisticsSnapshot,
  StockBalance,
  StockTransaction,
} from "@/features/logistics/logistics-types";

export const ALLOCATION_ATLAS_EPSILON = 1e-9;

export type LineLocationAllocation = {
  inProduction: number;
  inTransit: number;
  byWarehouseId: Record<string, number>;
};

const isPositive = (quantity: number): boolean => quantity > ALLOCATION_ATLAS_EPSILON;

const matchesOrderProduct = (
  entry: Pick<StockBalance, "ownerType" | "ownerId" | "productId">,
  line: Pick<CustomerOrderLine, "orderId" | "productId">,
): boolean =>
  ownersEqual(entry.ownerType, entry.ownerId, "order", line.orderId) && entry.productId === line.productId;

export const isLineFullyShipped = (ordered: number, shipped: number): boolean =>
  shipped + ALLOCATION_ATLAS_EPSILON >= ordered;

export const lineLocationAllocations = (
  balances: StockBalance[],
  line: Pick<CustomerOrderLine, "orderId" | "productId">,
  snapshot?: LogisticsSnapshot,
): LineLocationAllocation => {
  let inProduction = 0;
  let inTransit = 0;
  const byWarehouseId: Record<string, number> = {};

  if (snapshot) {
    for (const outputLine of snapshot.outputLines) {
      if (outputLine.productId !== line.productId) {
        continue;
      }
      if (!ownersEqual(outputLine.toOwnerType, outputLine.toOwnerId, "order", line.orderId)) {
        continue;
      }
      const output = snapshot.outputs.find((item) => item.id === outputLine.outputId);
      if (!output) {
        continue;
      }
      const status = output.status;
      if (status !== "draft" && status !== "planned" && status !== "in_progress") {
        continue;
      }
      inProduction += outputLine.quantity;
    }
  }

  for (const entry of balances) {
    if (entry.stockState !== "reserved" || !matchesOrderProduct(entry, line)) {
      continue;
    }
    if (!isPositive(entry.quantity)) {
      continue;
    }
    if (entry.locationType === "production_order") {
      // Legacy PO-location stock is ignored when snapshot drives inProduction.
      if (!snapshot) {
        inProduction += entry.quantity;
      }
      continue;
    }
    if (entry.locationType === "transfer") {
      inTransit += entry.quantity;
      continue;
    }
    if (entry.locationType === "warehouse") {
      byWarehouseId[entry.locationId] = (byWarehouseId[entry.locationId] ?? 0) + entry.quantity;
    }
  }

  return { inProduction, inTransit, byWarehouseId };
};

export const warehouseIdsWithReservedForOrder = (
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
  lines: CustomerOrderLine[],
): string[] => {
  const orderIds = new Set(lines.map((line) => line.orderId));
  const productIds = new Set(lines.map((line) => line.productId));
  const warehouseIds = new Set<string>();

  for (const entry of balances) {
    if (
      entry.stockState !== "reserved" ||
      entry.locationType !== "warehouse" ||
      entry.ownerType !== "order" ||
      entry.ownerId == null ||
      !orderIds.has(entry.ownerId) ||
      !productIds.has(entry.productId) ||
      !isPositive(entry.quantity)
    ) {
      continue;
    }
    warehouseIds.add(entry.locationId);
  }

  return [...warehouseIds].sort((left, right) =>
    warehouseCode(snapshot, left).localeCompare(warehouseCode(snapshot, right), undefined, {
      numeric: true,
    }),
  );
};

const isReservedWarehouseOutputForOrderProduct = (
  transaction: StockTransaction,
  line: Pick<CustomerOrderLine, "orderId" | "productId">,
): boolean =>
  transaction.documentType === "output" &&
  matchesOrderProduct(transaction, line) &&
  transaction.locationType === "warehouse" &&
  transaction.stockState === "reserved" &&
  Math.abs(transaction.quantity) > ALLOCATION_ATLAS_EPSILON;

export const sumProducedForOrderProduct = (
  snapshot: LogisticsSnapshot,
  orderId: string,
  productId: string,
): number => {
  const line = { orderId, productId };
  const ledgerOutputIds = new Set<string>();
  let produced = 0;

  for (const transaction of snapshot.transactions) {
    if (!isReservedWarehouseOutputForOrderProduct(transaction, line)) {
      continue;
    }
    produced += transaction.quantity;
    ledgerOutputIds.add(transaction.documentId);
  }

  const outputByLineId = new Map(snapshot.outputLines.map((item) => [item.id, item]));
  const outputStatusById = new Map(snapshot.outputs.map((output) => [output.id, output.status]));

  for (const allocation of snapshot.outputAllocations) {
    if (!ownersEqual(allocation.ownerType, allocation.ownerId, "order", orderId)) {
      continue;
    }
    const outputLine = outputByLineId.get(allocation.lineId);
    if (!outputLine || outputLine.productId !== productId) {
      continue;
    }
    if (ledgerOutputIds.has(outputLine.outputId)) {
      continue;
    }
    const status = outputStatusById.get(outputLine.outputId);
    if (status != null && status !== "done") {
      continue;
    }
    produced += allocation.quantity;
  }

  for (const outputLine of snapshot.outputLines) {
    if (outputLine.productId !== productId) {
      continue;
    }
    if (!ownersEqual(outputLine.toOwnerType, outputLine.toOwnerId, "order", orderId)) {
      continue;
    }
    if (ledgerOutputIds.has(outputLine.outputId)) {
      continue;
    }
    if (outputStatusById.get(outputLine.outputId) !== "done") {
      continue;
    }
    produced += outputLine.quantity;
  }

  return produced < 0 && produced > -ALLOCATION_ATLAS_EPSILON ? 0 : produced;
};

export const sumProducedForLine = (
  snapshot: LogisticsSnapshot,
  line: Pick<CustomerOrderLine, "orderId" | "productId">,
): number => sumProducedForOrderProduct(snapshot, line.orderId, line.productId);
