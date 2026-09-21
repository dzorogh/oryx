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
  "adjustment",
] as const;

export const RESERVATION_CANCEL_FORBIDDEN =
  "Проведённый резерв нельзя отменить. Создайте резерв со снятием в «Свободно».";

export const POSTED_DOCUMENT_CANCEL_FORBIDDEN =
  "Проведённый складской документ нельзя отменить. Создайте новый документ.";

export const ADJUSTMENT_CANCEL_FORBIDDEN =
  "Проведённую корректировку нельзя отменить. Создайте новый документ.";

export const SHIPMENT_OWNER_MUST_BE_ORDER =
  "Отгрузка может списать только резерв заказа клиента.";

export const isIrreversibleDocumentKind = (kind: string): boolean =>
  IRREVERSIBLE_DOCUMENT_KINDS.includes(kind as (typeof IRREVERSIBLE_DOCUMENT_KINDS)[number]);

export const assertDocumentCanBeCancelled = (kind: string, status?: string | null): void => {
  if (kind === "reservation" || kind === "reservation_release") {
    throw new Error(RESERVATION_CANCEL_FORBIDDEN);
  }
  if (kind === "adjustment") {
    throw new Error(ADJUSTMENT_CANCEL_FORBIDDEN);
  }
  if (kind === "shipment" || kind === "shipment_return" || kind === "return") {
    throw new Error(
      "Проведённый документ отгрузки или возврата нельзя отменить. Создайте документ обратного маршрута.",
    );
  }
  const posted =
    ((kind === "production_output" || kind === "output") && status === "done") ||
    (kind === "transfer" && (status === "sent" || status === "delivered"));
  if (posted) {
    throw new Error(POSTED_DOCUMENT_CANCEL_FORBIDDEN);
  }
};

export const assertPositiveQuantity = (quantity: number): void => {
  if (!(quantity > 0)) {
    throw new Error("Количество должно быть больше нуля");
  }
};

export const assertAllocationWithinLine = (lineQuantity: number, allocated: number): void => {
  if (allocated - lineQuantity > 1e-9) {
    throw new Error("Закреплённое количество не может превышать строку документа");
  }
};

export const assertProductMatch = (documentProductId: string, orderProductId: string): void => {
  if (documentProductId !== orderProductId) {
    throw new Error("Товар должен совпадать со строкой заказа клиента");
  }
};

export const assertEnoughStock = (available: number, needed: number, label: string): void => {
  if (needed - available > 1e-9) {
    throw new Error(
      `Недостаточно ${label === "reserved" ? "зарезервированного" : label === "free" ? "свободного" : label} количества`,
    );
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
    throw new Error("Нельзя зарезервировать больше открытого количества заказа");
  }
};

export const assertShipmentCapacity = (
  line: CustomerOrderLine,
  balances: StockBalance[],
  extraShipped: number,
): void => {
  const shipped = sumShippedForOrderProduct(balances, line.orderId, line.productId);
  if (shipped + extraShipped - line.quantity > 1e-9) {
    throw new Error("Нельзя отгрузить больше заказанного количества");
  }
};

export const assertProductionOutputCapacity = (
  line: ProductionOrderLine,
  alreadyOutput: number,
  extra: number,
): void => {
  if (alreadyOutput + extra - line.quantity > 1e-9) {
    throw new Error("Нельзя выпустить больше строки заказа на производство");
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
