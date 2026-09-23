// english-ui:ignore-file
import { cn } from "@/lib/utils";
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

type PillTone = "draft" | "work" | "done" | "cancel" | "neutral";

const toneFor = (value: string): PillTone => {
  if (value === "cancelled") {
    return "cancel";
  }
  if (
    value === "posted" ||
    value === "delivered" ||
    value === "closed" ||
    value === "shipped" ||
    value === "done"
  ) {
    return "done";
  }
  if (
    value === "sent" ||
    value === "reserved" ||
    value === "in_progress" ||
    value === "planned" ||
    value === "open"
  ) {
    return "work";
  }
  if (value === "draft") {
    return "draft";
  }
  return "neutral";
};

const TONE_CLASS: Record<PillTone, string> = {
  draft: "border-zinc-200 bg-zinc-100 text-zinc-600",
  work: "border-blue-200 bg-blue-50 text-blue-600",
  done: "border-green-200 bg-green-50 text-green-700",
  cancel: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-border bg-background text-foreground/80",
};

export const StatusPill = ({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) => {
  const tone = toneFor(status);
  const text =
    label ??
    DOCUMENT_STATUS_LABELS[status as DocumentStatus] ??
    CUSTOMER_ORDER_STATUS_LABELS[status as CustomerOrderStatus] ??
    PRODUCTION_STATUS_LABELS[status as ProductionStatus] ??
    TRANSFER_STATUS_LABELS[status as TransferStatus] ??
    OUTPUT_STATUS_LABELS[status as OutputStatus] ??
    status;
  return (
    <span
      data-slot="status-pill"
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      <i className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {text}
    </span>
  );
};

export const DocumentStatusBadge = ({ status }: { status: DocumentStatus | "draft" | "posted" }) => (
  <StatusPill status={status} />
);

export const ShipmentDirectionBadge = ({ direction }: { direction: ShipmentDirection }) => (
  <StatusPill status={direction === "return" ? "reserved" : "neutral"} label={SHIPMENT_DIRECTION_LABELS[direction]} />
);

export const TransferStatusBadge = ({ status }: { status: TransferStatus }) => (
  <StatusPill status={status} label={TRANSFER_STATUS_LABELS[status]} />
);

export const CustomerOrderStatusBadge = ({ status }: { status: CustomerOrderStatus }) => (
  <StatusPill status={status} label={CUSTOMER_ORDER_STATUS_LABELS[status]} />
);

export const ProductionStatusBadge = ({ status }: { status: ProductionStatus }) => (
  <StatusPill status={status} label={PRODUCTION_STATUS_LABELS[status]} />
);

export const OutputStatusBadge = ({ status }: { status: OutputStatus }) => (
  <StatusPill status={status} label={OUTPUT_STATUS_LABELS[status]} />
);

export const StockStateBadge = ({ state }: { state: StockState }) => (
  <StatusPill status={state} label={STOCK_STATE_LABELS[state]} />
);
