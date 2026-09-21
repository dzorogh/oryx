import {
  remainingToReserve,
  remainingToReserveForOrderProduct,
  sumShippedForLine,
  sumShippedForOrderProduct,
} from "@/features/logistics/logistics-balances";
import type {
  CustomerOrderLine,
  OwnerType,
  ProductionOrderLine,
  StockBalance,
  StockTransaction,
  TransferAllocation,
  TransferLine,
} from "@/features/logistics/logistics-types";
import { isOrderOwner } from "@/features/logistics/logistics-types";
import { computeStockBalances } from "@/features/logistics/logistics-balances";

export const IRREVERSIBLE_DOCUMENT_KINDS = [
  "reservation",
  "reservation_release",
  "shipment",
  "shipment_return",
  "production_output",
  "transfer",
] as const;

export const RESERVATION_CANCEL_FORBIDDEN =
  "Posted reservations cannot be cancelled. Create a Reservation that releases to Free instead.";

export const POSTED_DOCUMENT_CANCEL_FORBIDDEN =
  "Posted warehouse documents cannot be cancelled. Create a new business document instead.";

export const SHIPMENT_OWNER_MUST_BE_ORDER =
  "Shipment can only consume stock reserved for a customer order.";

export const isIrreversibleDocumentKind = (kind: string): boolean =>
  IRREVERSIBLE_DOCUMENT_KINDS.includes(kind as (typeof IRREVERSIBLE_DOCUMENT_KINDS)[number]);

export const assertDocumentCanBeCancelled = (kind: string, status?: string | null): void => {
  if (kind === "reservation" || kind === "reservation_release") {
    throw new Error(RESERVATION_CANCEL_FORBIDDEN);
  }
  const posted =
    ((kind === "shipment" || kind === "shipment_return" || kind === "return") && status === "posted") ||
    ((kind === "production_output" || kind === "output") && status === "done") ||
    (kind === "transfer" && (status === "sent" || status === "delivered"));
  if (posted) {
    throw new Error(POSTED_DOCUMENT_CANCEL_FORBIDDEN);
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

export const assertShipmentOwnerIsOrder = (
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): void => {
  if (!isOrderOwner(ownerType, ownerId)) {
    throw new Error(SHIPMENT_OWNER_MUST_BE_ORDER);
  }
};

export const canShipReservedOwner = (
  ownerType: OwnerType | null | undefined,
  ownerId: string | null | undefined,
): boolean => isOrderOwner(ownerType, ownerId);

export const assertCustomerCapacity = (
  line: CustomerOrderLine,
  balances: StockBalance[],
  extraReserved: number,
): void => {
  const remaining = remainingToReserveForOrderProduct(line.quantity, balances, line.orderId, line.productId);
  if (extraReserved - remaining > 1e-9) {
    throw new Error("Cannot reserve more than the open customer order quantity");
  }
};

export const assertShipmentCapacity = (
  line: CustomerOrderLine,
  balances: StockBalance[],
  extraShipped: number,
): void => {
  const shipped = sumShippedForOrderProduct(balances, line.orderId, line.productId);
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

export { remainingToReserve, sumShippedForLine };
