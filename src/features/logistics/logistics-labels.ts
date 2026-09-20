import type {
  CustomerOrderStatus,
  DocumentStatus,
  LocationType,
  OutputStatus,
  OwnerType,
  ProductionStatus,
  ReservationDirection,
  SourceType,
  StockState,
  TransferStatus,
} from "@/features/logistics/logistics-types";

export const LOCATION_LABELS: Record<LocationType, string> = {
  warehouse: "Склад",
  production_order_line: "В заказе на производство",
  transfer: "В перемещении",
  customer_order: "У клиента",
};

/** Host entity that holds stock or a reservation — not the stock-place phrasing. */
export const locationKindLabel = (type: LocationType, isPlantWarehouse = false): string => {
  if (type === "warehouse") {
    return isPlantWarehouse ? "Склад завода" : "Склад";
  }
  if (type === "production_order_line") {
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
  order: "Order",
  region: "Region",
};

export const FREE_OWNER_LABEL = "Free";

export const RESERVATION_DIRECTION_LABELS: Record<ReservationDirection, string> = {
  reserve: "Reserve",
  release: "Release",
  reassign: "Reassign",
};

export const RESERVATION_OPERATION_LABELS = RESERVATION_DIRECTION_LABELS;

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  reservation: "Резерв",
  shipment: "Отгрузка",
  shipment_return: "Возврат",
  production_activation: "Остаток заказа на производство",
  production_output: "Выпуск",
  production_close: "Закрытие заказа на производство",
  transfer_send: "Отправка перемещения",
  transfer_complete: "Завершение перемещения",
};

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
