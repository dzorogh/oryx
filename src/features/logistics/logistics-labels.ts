import type {
  CustomerOrderStatus,
  DocumentStatus,
  LocationType,
  OutputStatus,
  ProductionStatus,
  SourceType,
  StockState,
  TransferStatus,
} from "@/features/logistics/logistics-types";

export const LOCATION_LABELS: Record<LocationType, string> = {
  warehouse: "Warehouse",
  production_order_line: "In production",
  transfer: "In transfer",
  customer_order: "At customer",
};

/** Host entity that holds stock or a reservation — not the stock-place phrasing. */
export const locationKindLabel = (type: LocationType, isPlantWarehouse = false): string => {
  if (type === "warehouse") {
    return isPlantWarehouse ? "Plant warehouse" : "Warehouse";
  }
  if (type === "production_order_line") {
    return "Production order";
  }
  if (type === "transfer") {
    return "Transfer";
  }
  if (type === "customer_order") {
    return "Customer order";
  }
  return type;
};

export const STOCK_STATE_LABELS: Record<StockState, string> = {
  free: "Free",
  reserved: "Reserved",
  shipped: "Shipped",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  posted: "Posted",
  cancelled: "Cancelled",
};

export const CUSTOMER_ORDER_STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  open: "Open",
  closed: "Closed",
};

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  draft: "Draft",
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const OUTPUT_STATUS_LABELS: Record<OutputStatus, string> = {
  planned: "Planned",
  done: "Done",
  cancelled: "Cancelled",
};

export const RESERVATION_OPERATION_LABELS: Record<"reserve" | "release", string> = {
  reserve: "Reserve",
  release: "Release",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  reservation: "Reservation",
  shipment: "Shipment",
  shipment_return: "Return",
  production_activation: "Production stock",
  production_output: "Output",
  production_close: "Close production order",
  transfer_send: "Send transfer",
  transfer_complete: "Complete transfer",
};

const MINUS_SIGN = "\u2212";

export const formatQuantity = (quantity: number, unit?: string): string => {
  const normalized = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
  return unit ? `${normalized} ${unit}` : normalized;
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
  return new Date(value).toLocaleString("en-US", {
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
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const expectedEndMeta = (status: string, expectedEndOn: string | null, extras: string[] = []): string =>
  [status, ...extras.filter(Boolean), expectedEndOn ? formatExpectedEnd(expectedEndOn) : null]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
