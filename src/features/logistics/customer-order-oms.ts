/** Customer order card facts from `store_document_context`: tenants, packing, files, payment events. */

import type { MixedPackItem } from "@/domain/packing/mixed-containers";
import type { DocumentTimelineEntry } from "@/features/logistics/document-timeline";
import { sumReservedForLine, sumShippedForLine } from "@/features/logistics/logistics-balances";
import type { CustomerOrderLine, StockBalance } from "@/features/logistics/logistics-types";
import {
  formatOrderMoney,
  mapTransferMoney,
  PAYMENT_STATUS_LABELS,
  isPaymentStatus,
  type PaymentsSummary,
  type PaymentStatus,
  type TransferMoney,
} from "@/features/logistics/order-money";
import { pluralRu } from "@/features/logistics/order-plan/order-plan-model";

export type StoreTenant = {
  id: string;
  name: string;
  regionId: string | null;
  sortOrder: number;
};

export type VariantLogistics = {
  productVariantId: string;
  quantityPerUnit: number;
  /** Null when the variant has no dimensions. */
  dimensions: {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    weightKg: number;
    stacking: boolean;
    stackingLimit: number | null;
    rotateLength: boolean;
    rotateWidth: boolean;
  } | null;
  maxPerContainer: number | null;
};

export type ContainerTypeRow = {
  code: string;
  name: string;
  innerLengthMm: number;
  innerWidthMm: number;
  innerHeightMm: number;
  maxWeightKg: number;
};

export type OrderPaymentEvent = {
  id: string;
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  dueOn: string;
  changedAt: string;
};

export type DocumentFile = {
  id: string;
  documentId: string;
  storagePath: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
};

export type CustomerOrderOmsContext = {
  tenants: StoreTenant[];
  variantLogistics: VariantLogistics[];
  containerTypes: ContainerTypeRow[];
  transferMoney: TransferMoney[];
  paymentEvents: OrderPaymentEvent[];
  files: DocumentFile[];
};

export const EMPTY_CUSTOMER_ORDER_OMS: CustomerOrderOmsContext = {
  tenants: [],
  variantLogistics: [],
  containerTypes: [],
  transferMoney: [],
  paymentEvents: [],
  files: [],
};

const num = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const rows = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

/** Maps the customer order keys of `store_document_context`; missing keys map to empty lists. */
export const mapCustomerOrderOmsContext = (payload: {
  tenants?: unknown;
  variant_logistics?: unknown;
  container_types?: unknown;
  transfer_money?: unknown;
  order_payment_events?: unknown;
  document_files?: unknown;
}): CustomerOrderOmsContext => ({
  tenants: rows(payload.tenants).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? row.id),
    regionId: row.region_id == null ? null : String(row.region_id),
    sortOrder: num(row.sort_order) ?? 0,
  })),
  variantLogistics: rows(payload.variant_logistics).map((row) => {
    const lengthCm = num(row.length_cm);
    const widthCm = num(row.width_cm);
    const heightCm = num(row.height_cm);
    const weightKg = num(row.weight_kg);
    return {
      productVariantId: String(row.product_variant_id),
      quantityPerUnit: Math.max(1, Math.floor(num(row.quantity_per_unit) ?? 1)),
      dimensions:
        lengthCm != null && widthCm != null && heightCm != null && weightKg != null
          ? {
              lengthCm,
              widthCm,
              heightCm,
              weightKg,
              stacking: row.stacking !== false,
              stackingLimit: num(row.stacking_limit),
              rotateLength: row.rotate_length === true,
              rotateWidth: row.rotate_width === true,
            }
          : null,
      maxPerContainer: num(row.max_per_container),
    };
  }),
  containerTypes: rows(payload.container_types).map((row) => ({
    code: String(row.code),
    name: String(row.name ?? row.code),
    innerLengthMm: Number(row.inner_length_mm),
    innerWidthMm: Number(row.inner_width_mm),
    innerHeightMm: Number(row.inner_height_mm),
    maxWeightKg: Number(row.max_weight_kg),
  })),
  transferMoney: mapTransferMoney(payload.transfer_money),
  paymentEvents: rows(payload.order_payment_events).flatMap((row) =>
    isPaymentStatus(row.status)
      ? [
          {
            id: String(row.id),
            paymentId: String(row.payment_id),
            status: row.status,
            amount: num(row.amount) ?? 0,
            dueOn: String(row.due_on ?? "").slice(0, 10),
            changedAt: String(row.changed_at),
          },
        ]
      : [],
  ),
  files: rows(payload.document_files).map((row) => ({
    id: String(row.id),
    documentId: String(row.document_id),
    storagePath: String(row.storage_path),
    name: String(row.name),
    sizeBytes: num(row.size_bytes) ?? 0,
    mimeType: String(row.mime_type ?? ""),
    createdAt: String(row.created_at),
  })),
});

/** Tenants that have the order region, in catalog order. */
export const tenantsForRegion = (tenants: StoreTenant[], regionId: string): StoreTenant[] =>
  tenants
    .filter((tenant) => tenant.regionId === regionId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));

/** «—» / «A» / «A, B». */
export const tenantLabel = (tenants: StoreTenant[], regionId: string): string => {
  const names = tenantsForRegion(tenants, regionId).map((tenant) => tenant.name);
  return names.length ? names.join(", ") : "—";
};

export type OrderFulfillmentSummary = {
  positions: number;
  ordered: number;
  shipped: number;
  reserved: number;
  uncovered: number;
};

/**
 * Header fulfillment totals: per line reserved is capped at ordered − shipped;
 * uncovered is Σ(остаток − резерв) and 0 when the order is not open.
 */
export const summarizeOrderFulfillment = (
  lines: CustomerOrderLine[],
  balances: StockBalance[],
  open: boolean,
): OrderFulfillmentSummary => {
  let ordered = 0;
  let shipped = 0;
  let reserved = 0;
  let uncovered = 0;
  for (const line of lines) {
    const lineShipped = sumShippedForLine(balances, line);
    const remaining = Math.max(0, line.quantity - lineShipped);
    const lineReserved = Math.min(sumReservedForLine(balances, line), remaining);
    ordered += line.quantity;
    shipped += lineShipped;
    reserved += lineReserved;
    if (open) uncovered += remaining - lineReserved;
  }
  return { positions: lines.length, ordered, shipped, reserved, uncovered };
};

export type DeadlineCountdown = {
  kind: "left" | "today" | "overdue";
  days: number;
};

/** Days until / past expected end for an open order; null when closed or no date. */
export const deadlineCountdown = (
  expectedEndOn: string | null | undefined,
  open: boolean,
  today: Date = new Date(),
): DeadlineCountdown | null => {
  if (!open || !expectedEndOn) return null;
  const end = new Date(`${expectedEndOn}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((end.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays > 0) return { kind: "left", days: diffDays };
  if (diffDays === 0) return { kind: "today", days: 0 };
  return { kind: "overdue", days: -diffDays };
};

/** Share of the time from the order creation day to the expected end already passed, 0–100; null without a date. */
export const deadlineProgress = (
  createdAt: string,
  expectedEndOn: string | null | undefined,
  today: Date = new Date(),
): number | null => {
  if (!expectedEndOn) return null;
  const created = new Date(createdAt);
  const end = new Date(`${expectedEndOn}T00:00:00`);
  if (Number.isNaN(created.getTime()) || Number.isNaN(end.getTime())) return null;
  const startDay = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const total = end.getTime() - startDay;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((todayDay - startDay) / total) * 100)));
};

export type HeaderTone = "neutral" | "warning" | "danger";

const daysLabel = (days: number): string => `${days} ${pluralRu(days, "день", "дня", "дней")}`;

/** «через 11 дней» / «срок сегодня» / «просрочен на 9 дней». */
export const deadlineCountdownLabel = (countdown: DeadlineCountdown): { text: string; tone: HeaderTone } => {
  if (countdown.kind === "today") return { text: "срок сегодня", tone: "warning" };
  if (countdown.kind === "overdue") return { text: `просрочен на ${daysLabel(countdown.days)}`, tone: "danger" };
  return { text: `через ${daysLabel(countdown.days)}`, tone: "neutral" };
};

export const headerPercent = (part: number, total: number): number => {
  if (total <= 0) return part > 0 ? 100 : 0;
  if (part <= 0) return 0;
  if (part >= total) return 100;
  return Math.min(99, Math.round((part / total) * 100));
};

/** Widths of the «Выполнение» bar segments in percent of ordered; never more than 100 together. */
export const fulfillmentSegments = (
  summary: OrderFulfillmentSummary,
): { shipped: number; reserved: number; uncovered: number } => {
  const segment = (qty: number): number => {
    if (!(qty > 0) || !(summary.ordered > 0)) return 0;
    return Math.max(1, headerPercent(qty, summary.ordered));
  };
  const shipped = segment(summary.shipped);
  const reserved = Math.min(segment(summary.reserved), 100 - shipped);
  const uncovered = Math.min(segment(summary.uncovered), 100 - shipped - reserved);
  return { shipped, reserved, uncovered };
};

/** «Оплата» panel: percent paid and one due line — «Срок платежа 25.09.2026 · просрочен» or a closing note. */
export const paymentProgress = (
  summary: Pick<PaymentsSummary, "paid" | "total" | "nextDueOn" | "overdue">,
  paymentCount: number,
): { paidPct: number; dueText: string; overdue: boolean; muted: boolean } => {
  const paidPct = headerPercent(summary.paid, summary.total);
  if (summary.nextDueOn) {
    const [year, month, day] = summary.nextDueOn.slice(0, 10).split("-");
    const date = day && month && year ? `${day}.${month}.${year}` : summary.nextDueOn;
    return {
      paidPct,
      dueText: `Срок платежа ${date}${summary.overdue ? " · просрочен" : ""}`,
      overdue: summary.overdue,
      muted: false,
    };
  }
  if (paymentCount <= 0) {
    return { paidPct, dueText: "Платежей в графике нет", overdue: false, muted: true };
  }
  if (summary.paid >= summary.total) {
    return { paidPct, dueText: "Оплачен полностью", overdue: false, muted: true };
  }
  return { paidPct, dueText: "Все платежи графика оплачены", overdue: false, muted: true };
};

/** Price × ordered quantity in the price currency; null without a price. */
export const lineAmount = (unitPrice: number | null, quantity: number): number | null =>
  unitPrice == null ? null : unitPrice * quantity;

/** Transfer carries goods of more than one owner (another order, a region, free stock). */
export const MIXED_OWNERS_WARNING = "В перемещении товары разных владельцев";

export const DOCUMENT_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_FILE_LIMIT_LABEL = "10 МБ";
export const DOCUMENT_FILE_BUCKET = "store-documents";

/** Rejection text for a file over the bucket limit; null when it fits. */
export const documentFileSizeError = (sizeBytes: number): string | null =>
  sizeBytes > DOCUMENT_FILE_MAX_BYTES ? `Файл больше ${DOCUMENT_FILE_LIMIT_LABEL} — такой не загрузить` : null;

/** «PDF» for «invoice.pdf»; empty when the name has no extension. */
export const fileExtension = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toUpperCase() : "";
};

/** Name without the extension. */
export const fileBaseName = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
};

export const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024) return `${sizeBytes} Б`;
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(kb)} КБ`;
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(kb / 1024)} МБ`;
};

/** Storage key `<documentId>/<unique>-<ascii name>`: Storage keys reject most non-ASCII characters. */
export const documentFileStoragePath = (documentId: string, name: string, unique: string): string => {
  const extension = fileExtension(name).toLowerCase();
  const base = fileBaseName(name)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "")
    .slice(0, 60);
  return `${documentId}/${unique}-${base || "file"}${extension ? `.${extension}` : ""}`;
};

export type PackingLine = { productId: string; productName: string; quantity: number };

/** Packing items for the order lines with dimensions; lines without dimensions are listed apart. */
export const orderPackingItems = (
  lines: PackingLine[],
  logistics: VariantLogistics[],
): { items: MixedPackItem[]; missing: PackingLine[] } => {
  const byVariant = new Map(logistics.map((row) => [row.productVariantId, row]));
  const items: MixedPackItem[] = [];
  const missing: PackingLine[] = [];
  for (const line of lines) {
    if (!(line.quantity > 0)) continue;
    const row = byVariant.get(line.productId);
    const dims = row?.dimensions;
    if (!row || !dims) {
      missing.push(line);
      continue;
    }
    items.push({
      id: Number(line.productId),
      name: line.productName,
      lengthMm: Math.round(dims.lengthCm * 10),
      widthMm: Math.round(dims.widthCm * 10),
      heightMm: Math.round(dims.heightCm * 10),
      weightKg: dims.weightKg,
      quantity: line.quantity,
      quantityPerUnit: row.quantityPerUnit,
      stacking: dims.stacking,
      stackingLimit: dims.stackingLimit,
      rotateLength: dims.rotateLength,
      rotateWidth: dims.rotateWidth,
      maxPerContainer: row.maxPerContainer,
    });
  }
  return { items, missing };
};

export type OrderSystemNotice = {
  id: string;
  createdAtIso: string;
  title: string;
  description?: string;
  tone: "info" | "success" | "warning";
};

/** The comments feed orders by plain string comparison, so every notice carries a UTC `toISOString()`. */
const toIso = (value: string): string => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? value : new Date(time).toISOString();
};

const formatDay = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : iso;
};

/**
 * Author-less feed entries of a customer order: creation, status and planned date changes
 * (document history), payment status changes. Rebuilt from the context on every load.
 */
export const buildOrderSystemNotices = (input: {
  documentId: string;
  createdAt: string;
  timeline: DocumentTimelineEntry[];
  paymentEvents: OrderPaymentEvent[];
  currencyCode: string | null;
}): OrderSystemNotice[] => {
  const notices: OrderSystemNotice[] = [
    { id: `order-${input.documentId}-created`, createdAtIso: toIso(input.createdAt), title: "Заказ создан", tone: "info" },
  ];
  for (const entry of input.timeline) {
    if (entry.kind === "create") continue;
    for (const change of entry.changes ?? []) {
      const isStatus = change.label === "Статус";
      notices.push({
        id: `order-${input.documentId}-history-${entry.id}-${isStatus ? "status" : "date"}`,
        createdAtIso: toIso(entry.at),
        title: isStatus ? `Статус заказа — ${change.to}` : `Ожидаемое окончание — ${change.to}`,
        description: change.from ? `Было: ${change.from}` : undefined,
        tone: isStatus && entry.kind === "cancel" ? "warning" : isStatus && entry.kind === "done" ? "success" : "info",
      });
    }
  }
  for (const event of input.paymentEvents) {
    const amount = input.currencyCode ? formatOrderMoney(event.amount, input.currencyCode) : String(event.amount);
    notices.push({
      id: `order-${input.documentId}-payment-${event.id}`,
      createdAtIso: toIso(event.changedAt),
      title: `Платёж — ${PAYMENT_STATUS_LABELS[event.status]}`,
      description: `${amount} · срок ${formatDay(event.dueOn)}`,
      tone: event.status === "paid" ? "success" : "info",
    });
  }
  return notices.sort((left, right) =>
    left.createdAtIso < right.createdAtIso ? -1 : left.createdAtIso > right.createdAtIso ? 1 : 0,
  );
};
