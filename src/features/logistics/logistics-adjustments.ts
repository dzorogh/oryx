import { getBalanceQuantity } from "@/features/logistics/logistics-balances";
import {
  ADJUSTMENT_CANCEL_FORBIDDEN,
  assertEnoughStock,
  assertPositiveQuantity,
} from "@/features/logistics/logistics-rules";
import {
  ADJUSTMENT_OPERATIONS,
  ADJUSTMENT_STATUSES,
  type AdjustmentOperation,
  type AdjustmentStatus,
  type StockBalance,
} from "@/features/logistics/logistics-types";

export { ADJUSTMENT_OPERATIONS, ADJUSTMENT_STATUSES };
export type { AdjustmentOperation, AdjustmentStatus };

export const ADJUSTMENT_SOURCE_DOCUMENT_TYPES = [
  "reservation",
  "shipment",
  "return",
  "transfer",
  "production_order",
  "output",
] as const;
export type AdjustmentSourceDocumentType = (typeof ADJUSTMENT_SOURCE_DOCUMENT_TYPES)[number];

export const ADJUSTMENT_EXPLANATION_REQUIRED = "Укажите объяснение корректировки";
export { ADJUSTMENT_CANCEL_FORBIDDEN };
export const ADJUSTMENT_QUANTITY_POSITIVE = "Количество должно быть больше нуля";
export const ADJUSTMENT_NOT_ENOUGH_FREE = "Недостаточно свободного остатка в выбранном месте";
export const ADJUSTMENT_WAREHOUSE_REQUIRED = "Выберите склад";
export const ADJUSTMENT_LINES_REQUIRED = "Добавьте хотя бы одну строку товара";
export const ADJUSTMENT_DUPLICATE_PRODUCT = "Один товар можно указать только один раз";
export const ADJUSTMENT_ONLY_FREE_WAREHOUSE =
  "Корректировка работает только со свободным остатком на складе";
export const ADJUSTMENT_LOCATION_MUST_BE_WAREHOUSE = "Место корректировки должно быть складом";
export const ADJUSTMENT_OWNER_MUST_BE_FREE = "Корректировка меняет только свободный остаток";

export type AdjustmentLineInput = {
  productId: string;
  quantity: number;
};

export type AdjustmentDraft = {
  operation: AdjustmentOperation;
  warehouseId: string;
  explanation: string;
  lines: AdjustmentLineInput[];
  sourceDocumentType?: AdjustmentSourceDocumentType | null;
  sourceDocumentId?: string | null;
};

export type AdjustmentFact = {
  productId: string;
  quantity: number;
  locationType: "warehouse";
  locationId: string;
  assignedToType: null;
  assignedToId: null;
  documentType: "adjustment";
};

export const isAdjustmentOperation = (value: string): value is AdjustmentOperation =>
  ADJUSTMENT_OPERATIONS.includes(value as AdjustmentOperation);

export const isAdjustmentSourceDocumentType = (value: string): value is AdjustmentSourceDocumentType =>
  ADJUSTMENT_SOURCE_DOCUMENT_TYPES.includes(value as AdjustmentSourceDocumentType);

export const normalizeAdjustmentExplanation = (value: string): string => value.trim();

export const assertAdjustmentExplanation = (value: string): string => {
  const explanation = normalizeAdjustmentExplanation(value);
  if (!explanation) {
    throw new Error(ADJUSTMENT_EXPLANATION_REQUIRED);
  }
  return explanation;
};

export const adjustmentDecreasesStock = (operation: AdjustmentOperation): boolean =>
  operation !== "increase";

export const adjustmentSignedQuantity = (operation: AdjustmentOperation, quantity: number): number => {
  if (!(quantity > 0)) {
    throw new Error(ADJUSTMENT_QUANTITY_POSITIVE);
  }
  assertPositiveQuantity(quantity);
  return operation === "increase" ? quantity : -quantity;
};

export const freeWarehouseQuantity = (
  balances: StockBalance[],
  productId: string,
  warehouseId: string,
): number =>
  getBalanceQuantity(balances, {
    productId,
    locationType: "warehouse",
    locationId: warehouseId,
    stockState: "free",
    ownerType: null,
    ownerId: null,
  });

export const assertAdjustmentAvailability = (
  operation: AdjustmentOperation,
  available: number,
  needed: number,
): void => {
  if (!adjustmentDecreasesStock(operation)) {
    return;
  }
  if (needed - available > 1e-9) {
    throw new Error(ADJUSTMENT_NOT_ENOUGH_FREE);
  }
  assertEnoughStock(available, needed, "free");
};

export const assertAdjustmentPlace = (locationType: string, assignedToType: string | null | undefined): void => {
  if (locationType !== "warehouse") {
    throw new Error(ADJUSTMENT_LOCATION_MUST_BE_WAREHOUSE);
  }
  if (assignedToType != null && assignedToType !== "") {
    throw new Error(ADJUSTMENT_OWNER_MUST_BE_FREE);
  }
};

export const assertAdjustmentLines = (
  draft: Pick<AdjustmentDraft, "operation" | "warehouseId" | "lines">,
  balances: StockBalance[],
): AdjustmentLineInput[] => {
  if (!draft.warehouseId) {
    throw new Error(ADJUSTMENT_WAREHOUSE_REQUIRED);
  }
  if (draft.lines.length === 0) {
    throw new Error(ADJUSTMENT_LINES_REQUIRED);
  }
  const seen = new Set<string>();
  return draft.lines.map((line) => {
    if (!line.productId) {
      throw new Error(ADJUSTMENT_LINES_REQUIRED);
    }
    if (seen.has(line.productId)) {
      throw new Error(ADJUSTMENT_DUPLICATE_PRODUCT);
    }
    seen.add(line.productId);
    if (!(line.quantity > 0)) {
      throw new Error(ADJUSTMENT_QUANTITY_POSITIVE);
    }
    assertAdjustmentAvailability(
      draft.operation,
      freeWarehouseQuantity(balances, line.productId, draft.warehouseId),
      line.quantity,
    );
    return line;
  });
};

export const buildAdjustmentFacts = (
  draft: AdjustmentDraft,
  balances: StockBalance[],
): AdjustmentFact[] => {
  assertAdjustmentExplanation(draft.explanation);
  const lines = assertAdjustmentLines(draft, balances);
  return lines.map((line) => ({
    productId: line.productId,
    quantity: adjustmentSignedQuantity(draft.operation, line.quantity),
    locationType: "warehouse",
    locationId: draft.warehouseId,
    assignedToType: null,
    assignedToId: null,
    documentType: "adjustment" as const,
  }));
};

export const assertAdjustmentCanBeCancelled = (status?: string | null): void => {
  void status;
  throw new Error(ADJUSTMENT_CANCEL_FORBIDDEN);
};
