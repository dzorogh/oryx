export type DealerStatus = "available" | "unavailable";

export const DEALER_STATUSES: { value: DealerStatus; label: string }[] = [
  { value: "available", label: "Доступен" },
  { value: "unavailable", label: "Недоступен" },
];

export const DEALER_STATUS_LABELS: Record<DealerStatus, string> = {
  available: "Доступен",
  unavailable: "Недоступен",
};

export const isDealerStatus = (value: unknown): value is DealerStatus =>
  value === "available" || value === "unavailable";

/**
 * Retail status is a per-product + region marketing flag. It does NOT gate a
 * product's inclusion in the regional pricelists (that stays driven by the
 * dealer status); it is editable on the supplier list and read-only on dealer.
 */
export type RetailStatus =
  | "draft"
  | "available"
  | "preorder"
  | "temporarily_unavailable"
  | "discontinued"
  | "banned"
  | "hidden"
  | "pending_approval"
  | "archived";

export const RETAIL_STATUSES: { value: RetailStatus; label: string }[] = [
  { value: "draft", label: "Черновик" },
  { value: "available", label: "В продаже" },
  { value: "preorder", label: "Только предзаказ" },
  { value: "temporarily_unavailable", label: "Временно недоступен" },
  { value: "discontinued", label: "Снят с производства" },
  { value: "banned", label: "Запрещён" },
  { value: "hidden", label: "Скрыт" },
  { value: "pending_approval", label: "На согласовании" },
  { value: "archived", label: "В архиве" },
];

export const DEFAULT_RETAIL_STATUS: RetailStatus = "draft";

export const RETAIL_STATUS_LABELS: Record<RetailStatus, string> = Object.fromEntries(
  RETAIL_STATUSES.map((status) => [status.value, status.label]),
) as Record<RetailStatus, string>;

export const isRetailStatus = (value: unknown): value is RetailStatus =>
  typeof value === "string" && RETAIL_STATUSES.some((status) => status.value === value);

export const formatRetailStatus = (value: RetailStatus): string => RETAIL_STATUS_LABELS[value];
