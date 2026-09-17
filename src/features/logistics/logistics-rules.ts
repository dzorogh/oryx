import { computeStockBalances, remainingToReserve, sumShippedForLine } from "@/features/logistics/logistics-balances";
import type {
  CustomerOrderLine,
  ProductionOrderLine,
  StockBalance,
  StockTransaction,
  TransferAllocation,
  TransferLine,
} from "@/features/logistics/logistics-types";

export const IRREVERSIBLE_DOCUMENT_KINDS = ["reservation", "reservation_release"] as const;

export const RESERVATION_CANCEL_FORBIDDEN =
  "Posted reservations cannot be cancelled. Create a Reservation with operation=release instead.";

export const isIrreversibleDocumentKind = (kind: string): boolean =>
  IRREVERSIBLE_DOCUMENT_KINDS.includes(kind as (typeof IRREVERSIBLE_DOCUMENT_KINDS)[number]);

export const assertDocumentCanBeCancelled = (kind: string): void => {
  if (isIrreversibleDocumentKind(kind)) {
    throw new Error(RESERVATION_CANCEL_FORBIDDEN);
  }
};

export const assertPositiveQuantity = (quantity: number): void => {
  if (!(quantity > 0)) {
    throw new Error("Quantity must be positive");
  }
};

export const assertAllocationWithinLine = (lineQuantity: number, allocated: number): void => {
  if (allocated - lineQuantity > 1e-9) {
    throw new Error("Allocated quantity cannot exceed the document line");
  }
};

export const assertProductMatch = (documentProductId: string, orderProductId: string): void => {
  if (documentProductId !== orderProductId) {
    throw new Error("Product must match the customer order line");
  }
};

export const assertEnoughStock = (available: number, needed: number, label: string): void => {
  if (needed - available > 1e-9) {
    throw new Error(`Not enough ${label} quantity`);
  }
};

export const assertCustomerCapacity = (
  line: CustomerOrderLine,
  balances: StockBalance[],
  extraReserved: number,
): void => {
  const remaining = remainingToReserve(line.quantity, balances, line.id);
  if (extraReserved - remaining > 1e-9) {
    throw new Error("Cannot reserve more than the open customer order quantity");
  }
};

export const assertShipmentCapacity = (
  line: CustomerOrderLine,
  balances: StockBalance[],
  extraShipped: number,
): void => {
  const shipped = sumShippedForLine(balances, line.id);
  if (shipped + extraShipped - line.quantity > 1e-9) {
    throw new Error("Cannot ship more than the ordered quantity");
  }
};

export const assertProductionOutputCapacity = (
  line: ProductionOrderLine,
  alreadyOutput: number,
  extra: number,
): void => {
  if (alreadyOutput + extra - line.quantity > 1e-9) {
    throw new Error("Cannot output more than the production order line");
  }
};

export const transferFreeQuantity = (line: TransferLine, allocations: TransferAllocation[]): number => {
  const allocated = allocations
    .filter((item) => item.lineId === line.id)
    .reduce((sum, item) => sum + item.quantity, 0);
  assertAllocationWithinLine(line.quantity, allocated);
  return line.quantity - allocated;
};

export const balancesFromTransactions = (transactions: StockTransaction[]): StockBalance[] =>
  computeStockBalances(transactions);
