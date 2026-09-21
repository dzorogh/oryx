// english-ui:ignore-file
import { Badge } from "@/components/ui/badge";
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  OUTPUT_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  STOCK_STATE_LABELS,
  SHIPMENT_DIRECTION_LABELS,
  TRANSFER_STATUS_LABELS,
} from "@/features/logistics/logistics-labels";
import type {
  CustomerOrderStatus,
  DocumentStatus,
  ShipmentDirection,
  OutputStatus,
  ProductionStatus,
  StockState,
  TransferStatus,
} from "@/features/logistics/logistics-types";

const tone = (value: string): "outline" | "secondary" | "default" | "destructive" => {
  if (value === "cancelled") {
    return "destructive";
  }
  if (value === "posted" || value === "delivered" || value === "closed" || value === "shipped" || value === "done") {
    return "default";
  }
  if (value === "sent" || value === "reserved" || value === "in_progress" || value === "planned") {
    return "secondary";
  }
  return "outline";
};

export const DocumentStatusBadge = ({ status }: { status: DocumentStatus | "draft" | "posted" }) => (
  <Badge variant={tone(status)}>{DOCUMENT_STATUS_LABELS[status as DocumentStatus] ?? status}</Badge>
);

export const ShipmentDirectionBadge = ({ direction }: { direction: ShipmentDirection }) => (
  <Badge variant={direction === "return" ? "secondary" : "default"}>{SHIPMENT_DIRECTION_LABELS[direction]}</Badge>
);

export const TransferStatusBadge = ({ status }: { status: TransferStatus }) => (
  <Badge variant={tone(status)}>{TRANSFER_STATUS_LABELS[status]}</Badge>
);

export const CustomerOrderStatusBadge = ({ status }: { status: CustomerOrderStatus }) => (
  <Badge variant={tone(status)}>{CUSTOMER_ORDER_STATUS_LABELS[status]}</Badge>
);

export const ProductionStatusBadge = ({ status }: { status: ProductionStatus }) => (
  <Badge variant={tone(status)}>{PRODUCTION_STATUS_LABELS[status]}</Badge>
);

export const OutputStatusBadge = ({ status }: { status: OutputStatus }) => (
  <Badge variant={tone(status)}>{OUTPUT_STATUS_LABELS[status]}</Badge>
);

export const StockStateBadge = ({ state }: { state: StockState }) => (
  <Badge variant={tone(state)}>{STOCK_STATE_LABELS[state]}</Badge>
);
