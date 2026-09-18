import { warehouseCode } from "@/features/logistics/logistics-lookups";
import type {
  CustomerOrderLine,
  LogisticsSnapshot,
  StockBalance,
  StockTransaction,
} from "@/features/logistics/logistics-types";

export const ALLOCATION_ATLAS_EPSILON = 1e-9;

export type LineLocationAllocation = {
  inTransit: number;
  byWarehouseId: Record<string, number>;
};

const isPositive = (quantity: number): boolean => quantity > ALLOCATION_ATLAS_EPSILON;

export const isLineFullyShipped = (ordered: number, shipped: number): boolean =>
  shipped + ALLOCATION_ATLAS_EPSILON >= ordered;

export const lineLocationAllocations = (
  balances: StockBalance[],
  customerOrderLineId: string,
): LineLocationAllocation => {
  let inTransit = 0;
  const byWarehouseId: Record<string, number> = {};

  for (const entry of balances) {
    if (entry.stockState !== "reserved" || entry.customerOrderLineId !== customerOrderLineId) {
      continue;
    }
    if (!isPositive(entry.quantity)) {
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

  return { inTransit, byWarehouseId };
};

export const warehouseIdsWithReservedForOrder = (
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
  lines: CustomerOrderLine[],
): string[] => {
  const lineIds = new Set(lines.map((line) => line.id));
  const warehouseIds = new Set<string>();

  for (const entry of balances) {
    if (
      entry.stockState !== "reserved" ||
      entry.locationType !== "warehouse" ||
      entry.customerOrderLineId == null ||
      !lineIds.has(entry.customerOrderLineId) ||
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

const isReservedWarehouseOutputForLine = (
  transaction: StockTransaction,
  customerOrderLineId: string,
): boolean =>
  transaction.sourceType === "production_output" &&
  transaction.customerOrderLineId === customerOrderLineId &&
  transaction.locationType === "warehouse" &&
  transaction.stockState === "reserved" &&
  Math.abs(transaction.quantity) > ALLOCATION_ATLAS_EPSILON;

export const sumProducedForLine = (
  snapshot: LogisticsSnapshot,
  customerOrderLineId: string,
): number => {
  const ledgerOutputIds = new Set<string>();
  let produced = 0;

  for (const transaction of snapshot.transactions) {
    if (!isReservedWarehouseOutputForLine(transaction, customerOrderLineId)) {
      continue;
    }
    produced += transaction.quantity;
    ledgerOutputIds.add(transaction.sourceId);
  }

  const outputByLineId = new Map(snapshot.outputLines.map((line) => [line.id, line.outputId]));
  const outputStatusById = new Map(snapshot.outputs.map((output) => [output.id, output.status]));

  for (const allocation of snapshot.outputAllocations) {
    if (allocation.customerOrderLineId !== customerOrderLineId) {
      continue;
    }
    const outputId = outputByLineId.get(allocation.lineId);
    if (!outputId || ledgerOutputIds.has(outputId)) {
      continue;
    }
    const status = outputStatusById.get(outputId);
    if (status != null && status !== "done") {
      continue;
    }
    produced += allocation.quantity;
  }

  return produced < 0 && produced > -ALLOCATION_ATLAS_EPSILON ? 0 : produced;
};
