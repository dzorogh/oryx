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

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Черновик",
  posted: "Проведён",
  cancelled: "Отменён",
};

export const CUSTOMER_ORDER_STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  open: "Открыт",
  closed: "Закрыт",
};

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  draft: "Черновик",
  planned: "Запланирован",
  in_progress: "В работе",
  done: "Готов",
  closed: "Закрыт",
  cancelled: "Отменён",
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  sent: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

export const OUTPUT_STATUS_LABELS: Record<OutputStatus, string> = {
  planned: "Запланирован",
  done: "Готов",
  cancelled: "Отменён",
};

export const OWNER_TYPE_LABELS: Record<OwnerType, string> = {
  order: "Заказ",
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
  output: "Выпуск",
  adjustment: "Корректировка",
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
  output: "Выпуск",
  adjustment: "Корректировка",
};

export const ADJUSTMENT_OPERATION_LABELS: Record<AdjustmentOperation, string> = {
  write_off: "Списание",
  decrease: "Корректировка −",
  increase: "Корректировка +",
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

export const formatExpectedEnd = (value: string | null): string => {
  if (!value) {
    return "—";
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const expectedEndMeta = (status: string, expectedEndOn: string | null, extras: string[] = []): string =>
  [status, ...extras.filter(Boolean), expectedEndOn ? formatExpectedEnd(expectedEndOn) : null]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
