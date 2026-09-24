import type {
  AdjustmentOperation,
  CustomerOrderStatus,
  DocumentStatus,
  DocumentType,
  LocationType,
  OutputStatus,
  OwnerType,
  ProductionStatus,
  ReservationDirection,
  ShipmentDirection,
  SourceType,
  StockState,
  TransferStatus,
} from "@/features/logistics/logistics-types";

export const LOCATION_LABELS: Record<LocationType, string> = {
  warehouse: "Склад",
  production_order: "Заказ на производство",
  transfer: "Перемещение",
  customer_order: "Заказ клиента",
};

/** Host entity that holds stock or a reservation — not the stock-place phrasing. */
export const locationKindLabel = (type: LocationType, isPlantWarehouse = false): string => {
  if (type === "warehouse") {
    return isPlantWarehouse ? "Склад завода" : "Склад";
  }
  if (type === "production_order") {
    return "Заказ на производство";
  }
  if (type === "transfer") {
    return "Перемещение";
  }
  if (type === "customer_order") {
    return "Заказ клиента";
  }
  return type;
};

export const STOCK_STATE_LABELS: Record<StockState, string> = {
  free: "Свободно",
  reserved: "Зарезервировано",
  shipped: "Отгружено",
};

export const DOCUMENT_STATUS_LABELS: Partial<Record<DocumentStatus, string>> = {
  draft: "Черновик",
  in_progress: "В работе",
  done: "Готов",
  posted: "Проведён",
  cancelled: "Отменён",
  open: "Открыт",
  closed: "Закрыт",
  planned: "Запланирован",
  sent: "Отправлен",
  delivered: "Доставлен",
};

export const CUSTOMER_ORDER_STATUS_LABELS: Partial<Record<CustomerOrderStatus, string>> = {
  draft: "Черновик",
  in_progress: "Открыт",
  done: "Закрыт",
  cancelled: "Отменён",
  open: "Открыт",
  closed: "Закрыт",
};

export const PRODUCTION_STATUS_LABELS: Partial<Record<ProductionStatus, string>> = {
  draft: "Черновик",
  planned: "Запланирован",
  in_progress: "В работе",
  done: "Готов",
  closed: "Закрыт",
  cancelled: "Отменён",
  open: "Открыт",
  posted: "Проведён",
  sent: "Отправлен",
  delivered: "Доставлен",
};

export const TRANSFER_STATUS_LABELS: Partial<Record<TransferStatus, string>> = {
  draft: "Черновик",
  in_progress: "Отправлен",
  done: "Доставлен",
  cancelled: "Отменён",
  sent: "Отправлен",
  delivered: "Доставлен",
};

export const OUTPUT_STATUS_LABELS: Partial<Record<OutputStatus, string>> = {
  draft: "Черновик",
  planned: "Запланирован",
  in_progress: "В работе",
  done: "Готов",
  cancelled: "Отменён",
};

export const OWNER_TYPE_LABELS: Record<OwnerType, string> = {
  order: "Заказ клиента",
  region: "Регион",
};

export const FREE_OWNER_LABEL = "Свободно";

export const ASSIGNED_TO_LABEL = "Закреплено за";

export const LEDGER_ASSIGNED_TO_KIND_LABELS: Record<OwnerType | "free", string> = {
  free: "Свободно",
  order: "Заказ клиента",
  region: "Регион",
};

export const LEDGER_DOCUMENT_KIND_LABELS: Record<DocumentType, string> = {
  reservation: "Резерв",
  shipment: "Отгрузка",
  return: "Возврат",
  transfer: "Перемещение",
  production_order: "Заказ на производство",
  production_output: "Выпуск",
  output: "Выпуск",
  adjustment: "Корректировка",
  customer_order: "Заказ клиента",
};

export const SHIPMENT_DIRECTION_LABELS: Record<ShipmentDirection, string> = {
  shipment: "Отгрузка",
  return: "Возврат",
};

export const RESERVATION_DIRECTION_LABELS: Record<ReservationDirection, string> = {
  reserve: "Резерв",
  release: "Снятие",
  reassign: "Переназначение",
};

export const RESERVATION_OPERATION_LABELS = RESERVATION_DIRECTION_LABELS;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  reservation: "Резерв",
  shipment: "Отгрузка",
  return: "Возврат",
  transfer: "Перемещение",
  production_order: "Заказ на производство",
  production_output: "Выпуск",
  output: "Выпуск",
  adjustment: "Корректировка",
  customer_order: "Заказ клиента",
};

export const ADJUSTMENT_OPERATION_LABELS: Record<AdjustmentOperation | "mixed", string> = {
  write_off: "Списание",
  decrease: "Уменьшение",
  increase: "Увеличение",
  mixed: "Корректировка",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = DOCUMENT_TYPE_LABELS;

const MINUS_SIGN = "\u2212";

const UNIT_DISPLAY_LABELS: Record<string, string> = {
  pcs: "шт",
};

export const formatQuantity = (quantity: number, unit?: string): string => {
  const normalized = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
  if (!unit) {
    return normalized;
  }
  const displayUnit = UNIT_DISPLAY_LABELS[unit] ?? unit;
  return `${normalized} ${displayUnit}`;
};

/** Ledger/movement qty: always `+` or Unicode minus (−), never a hyphen-minus dash. Zero is unsigned. */
export const formatSignedQuantity = (quantity: number, unit?: string): string => {
  if (Math.abs(quantity) < 1e-9) {
    return formatQuantity(0, unit);
  }
  const magnitude = formatQuantity(Math.abs(quantity), unit);
  return quantity > 0 ? `+${magnitude}` : `${MINUS_SIGN}${magnitude}`;
};

/** Tailwind class for signed qty: green plus, red minus, muted zero/neutral. */
export const signedQuantityClassName = (quantity: number): string => {
  if (Math.abs(quantity) < 1e-9) {
    return "text-muted-foreground";
  }
  return quantity > 0 ? "text-green-700" : "text-red-700";
};

export const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Compact date-time for document header meta fields: «23.09.2026, 14:09». */
export const formatMetaTimestamp = (value: string | null): string => {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

export const formatExpectedEnd = (value: string | null): string => {
  if (!value) {
    return "—";
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", SHORT_DATE_OPTIONS);
};

/** Date part of an ISO timestamp in the same format as {@link formatExpectedEnd}: «24 сент. 2026 г.». */
export const formatDate = (value: string | null): string => {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("ru-RU", SHORT_DATE_OPTIONS);
};

export const expectedEndMeta = (status: string, expectedEndOn: string | null, extras: string[] = []): string =>
  [status, ...extras.filter(Boolean), expectedEndOn ? formatExpectedEnd(expectedEndOn) : null]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
