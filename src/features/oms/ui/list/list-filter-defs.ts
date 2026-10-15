import { formatEntityCode } from "@/lib/entity-codes";
import { DEADLINE_BUCKETS, deadlineGroupKey } from "./list-deadline";
import type {
  ListDateRangeFilterDef,
  ListFilterOption,
  ListMultiFilterDef,
  ListNumberRangeFilterDef,
} from "./list-filters";

type ProductLine = { productId: string; quantity: number; productName?: string | null };

const lineQuantity = (lines: ProductLine[]) => lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);

/** Lifecycle order for status options, including legacy values some rows still carry. */
export const DOCUMENT_STATUS_ORDER = [
  "draft",
  "planned",
  "in_progress",
  "sent",
  "posted",
  "done",
  "delivered",
  "closed",
  "cancelled",
] as const;

export const statusOptions = (labels: Partial<Record<string, string>>, order: readonly string[]): ListFilterOption[] =>
  order.flatMap((value) => (labels[value] ? [{ value, label: labels[value]! }] : []));

export const productFilter = <TRow>(
  lines: (row: TRow) => ProductLine[],
  options: { quick?: boolean } = {},
): ListMultiFilterDef<TRow> => ({
  kind: "multi",
  id: "product",
  label: "Товар",
  placeholder: "Товар",
  quick: options.quick,
  searchable: true,
  values: (row) => lines(row).map((line) => line.productId),
  optionLabel: (value, row) => lines(row).find((line) => line.productId === value)?.productName || value,
});

export const authorFilter = <TRow extends { createdBy: string }>(): ListMultiFilterDef<TRow> => ({
  kind: "multi",
  id: "author",
  label: "Автор",
  values: (row) => row.createdBy || "—",
  optionLabel: (value) => (value === "—" ? "Без автора" : value),
});

export const createdFilter = <TRow extends { createdAt: string }>(label = "Создан"): ListDateRangeFilterDef<TRow> => ({
  kind: "dateRange",
  id: "created",
  label,
  value: (row) => row.createdAt,
});

export const deadlineBucketFilter = <TRow extends { expectedEndOn: string | null; status: string }>(
  isOpen: (status: string) => boolean,
): ListMultiFilterDef<TRow> => ({
  kind: "multi",
  id: "deadlineBucket",
  label: "Срок",
  options: DEADLINE_BUCKETS.map((bucket) => ({ value: bucket, label: bucket })),
  values: (row) => deadlineGroupKey(row.expectedEndOn, isOpen(row.status)),
});

export const deadlineRangeFilter = <TRow extends { expectedEndOn: string | null }>(): ListDateRangeFilterDef<TRow> => ({
  kind: "dateRange",
  id: "deadlineRange",
  label: "Срок: даты",
  presets: "future",
  value: (row) => row.expectedEndOn,
});

export const quantityFilter = <TRow>(lines: (row: TRow) => ProductLine[], label = "Кол-во"): ListNumberRangeFilterDef<TRow> => ({
  kind: "numberRange",
  id: "quantity",
  label,
  unit: "шт",
  value: (row) => lineQuantity(lines(row)),
});

export const lineCountFilter = <TRow>(lines: (row: TRow) => ProductLine[]): ListNumberRangeFilterDef<TRow> => ({
  kind: "numberRange",
  id: "lineCount",
  label: "Позиций в документе",
  value: (row) => new Set(lines(row).map((line) => line.productId)).size,
});

export const placeCodeFilter = <TRow>(
  id: string,
  label: string,
  kind: "warehouse" | "plant",
  value: (row: TRow) => string | null | undefined,
  options: { quick?: boolean } = {},
): ListMultiFilterDef<TRow> => ({
  kind: "multi",
  id,
  label,
  placeholder: label,
  quick: options.quick,
  optionSort: "number",
  values: (row) => value(row) || null,
  optionLabel: (code) => formatEntityCode(kind, code),
});
