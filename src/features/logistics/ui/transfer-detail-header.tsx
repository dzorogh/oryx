"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import type { LogisticsSnapshot, Transfer, TransferStatus } from "@/features/logistics/logistics-types";
import type { TransferRouteNode, TransferRouteProjection } from "@/features/logistics/transfer-detail-projection";

const STATUS_LABELS: Record<TransferStatus, string> = {
  sent: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusTone = (status: TransferStatus): "secondary" | "default" | "destructive" => {
  if (status === "cancelled") {
    return "destructive";
  }
  if (status === "delivered") {
    return "default";
  }
  return "secondary";
};

export type TransferDetailPendingAction = "reserve" | "deliver" | "expected" | null;

const RouteNode = ({
  snapshot,
  node,
}: {
  snapshot: LogisticsSnapshot;
  node: TransferRouteNode;
}) => (
  <div
    data-current={node.current ? "true" : undefined}
    aria-current={node.current ? "location" : undefined}
    className={
      node.current
        ? "min-w-0 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-primary"
        : "min-w-0 px-0.5 py-2"
    }
  >
    <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
      {node.current ? <span className="text-primary">{node.label}</span> : node.label}
    </div>
    <div className="mt-0.5 text-sm font-semibold">
      {node.warehouseId ? <WarehouseLink snapshot={snapshot} warehouseId={node.warehouseId} /> : node.value}
    </div>
  </div>
);

const RouteArrow = () => (
  <span aria-hidden="true" className="px-1 text-lg text-muted-foreground max-md:rotate-90">
    →
  </span>
);

export const TransferDetailHeader = ({
  snapshot,
  transfer,
  route,
  canReserveInTransit,
  pendingAction,
  actionError,
  onReserveInTransit,
  onMarkDelivered,
  onExpectedEndChange,
}: {
  snapshot: LogisticsSnapshot;
  transfer: Transfer;
  route: TransferRouteProjection;
  canReserveInTransit: boolean;
  pendingAction: TransferDetailPendingAction;
  actionError: string | null;
  onReserveInTransit: () => void;
  onMarkDelivered: () => void;
  onExpectedEndChange: (value: string) => void;
}) => {
  const busy = pendingAction != null;
  const showLifecycle = transfer.status === "sent";

  let actions: ReactNode = null;
  if (showLifecycle) {
    actions = (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canReserveInTransit ? (
          <Button
            type="button"
            size="sm"
            className="h-11 min-w-11 md:h-8"
            disabled={busy}
            aria-busy={pendingAction === "reserve"}
            onClick={onReserveInTransit}
          >
            Reserve in transit
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={canReserveInTransit ? "outline" : "default"}
          className="h-11 min-w-11 md:h-8"
          disabled={busy}
          aria-busy={pendingAction === "deliver"}
          onClick={onMarkDelivered}
        >
          Mark delivered
        </Button>
      </div>
    );
  }

  return (
    <header className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{transfer.number}</h1>
            <span className="text-xs text-muted-foreground">Transfer document</span>
            <Badge variant={statusTone(transfer.status)}>{STATUS_LABELS[transfer.status]}</Badge>
          </div>
          <ExpectedEndField
            layout="inline"
            label="Expected"
            value={transfer.expectedEndOn ?? ""}
            onChange={onExpectedEndChange}
          />
        </div>
        {actions}
      </div>

      <div
        className="mt-4 flex flex-col items-stretch gap-1 border-t border-border pt-3 md:flex-row md:items-center md:gap-2"
        aria-label="Transfer route"
      >
        <RouteNode snapshot={snapshot} node={route.origin} />
        <RouteArrow />
        <RouteNode snapshot={snapshot} node={route.current} />
        <RouteArrow />
        <RouteNode snapshot={snapshot} node={route.destination} />
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {busy ? "Working…" : null}
        {actionError}
      </div>
    </header>
  );
};
