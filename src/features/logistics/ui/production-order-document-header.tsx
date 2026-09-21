// english-ui:ignore-file
"use client";

import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCTION_STATUS_LABELS } from "@/features/logistics/logistics-labels";
import type { LogisticsSnapshot, ProductionOrder, ProductionStatus } from "@/features/logistics/logistics-types";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { ManufacturerLink } from "@/features/logistics/ui/manufacturer-link";
import { ProductionStatusBadge } from "@/features/logistics/ui/status-badge";

const WORKFLOW_STATUSES = (["draft", "planned", "in_progress", "done"] as const) satisfies readonly ProductionStatus[];

export const ProductionOrderDocumentHeader = ({
  snapshot,
  order,
  statusRef,
  statusPending,
  datePending,
  statusError,
  dateError,
  statusMessage,
  dateMessage,
  onStatusChange,
  onExpectedEndChange,
  onClose,
  closeDisabled = false,
}: {
  snapshot: LogisticsSnapshot;
  order: ProductionOrder;
  statusRef?: Ref<HTMLDivElement>;
  statusPending?: boolean;
  datePending?: boolean;
  statusError?: string | null;
  dateError?: string | null;
  statusMessage?: string | null;
  dateMessage?: string | null;
  onStatusChange: (status: ProductionStatus) => void;
  onExpectedEndChange: (value: string) => void;
  onClose?: () => void;
  closeDisabled?: boolean;
}) => {
  const terminal = order.status === "closed" || order.status === "cancelled";
  const statusItems = WORKFLOW_STATUSES.map((status) => ({
    value: status,
    label: PRODUCTION_STATUS_LABELS[status],
  }));
  const terminalNote =
    order.status === "closed"
      ? "Документ закрыт: операции с товарами недоступны."
      : order.status === "cancelled"
        ? "Документ отменён: операции с товарами недоступны."
        : null;

  let closeAction: ReactNode = null;
  if (!terminal && onClose) {
    closeAction = (
      <Button type="button" className="h-9 shrink-0" disabled={closeDisabled} onClick={onClose}>
        Закрыть заказ
      </Button>
    );
  }

  return (
    <header className="min-w-0 rounded-lg border border-border bg-card p-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(10rem,1.1fr)_minmax(6.5rem,0.55fr)_minmax(8.5rem,0.7fr)_minmax(10rem,0.8fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Заказ на производство</p>
          <h1 className="text-2xl font-semibold tracking-tight">{order.number}</h1>
        </div>

        <div className="min-w-0 space-y-1">
          <span className="block text-[11px] text-muted-foreground">Производитель</span>
          <div className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-semibold">
            <ManufacturerLink snapshot={snapshot} manufacturerId={order.manufacturerId} />
          </div>
        </div>

        <div
          ref={statusRef}
          tabIndex={terminal ? -1 : undefined}
          aria-busy={statusPending || undefined}
          className="min-w-0 space-y-1 outline-none"
        >
          <span className="block text-[11px] text-muted-foreground" id="production-status-label">
            Статус
          </span>
          {terminal ? (
            <div className="flex h-9 items-center">
              <ProductionStatusBadge status={order.status} />
            </div>
          ) : (
            <Select
              items={statusItems}
              value={order.status}
              disabled={statusPending}
              onValueChange={(value) => {
                if (!value || statusPending) {
                  return;
                }
                onStatusChange(value as ProductionStatus);
              }}
            >
              <SelectTrigger
                id="production-status"
                className="h-9 bg-background"
                aria-labelledby="production-status-label"
                aria-invalid={statusError ? true : undefined}
                aria-errormessage={statusError ? "production-status-error" : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          {statusError ? (
            <p id="production-status-error" role="alert" className="text-xs text-destructive">
              {statusError}
            </p>
          ) : null}
          {statusMessage ? (
            <p role="status" className="text-xs text-muted-foreground">
              {statusMessage}
            </p>
          ) : null}
          {terminalNote ? <p className="text-xs text-muted-foreground">{terminalNote}</p> : null}
        </div>

        <div aria-busy={datePending || undefined} className="min-w-0">
          <ExpectedEndField
            layout="stack"
            id="production-expected-end"
            value={order.expectedEndOn ?? ""}
            disabled={datePending}
            invalid={Boolean(dateError)}
            errorId={dateError ? "production-expected-end-error" : undefined}
            onChange={(value) => {
              if (datePending) {
                return;
              }
              onExpectedEndChange(value);
            }}
          />
          {dateError ? (
            <p id="production-expected-end-error" role="alert" className="mt-1 text-xs text-destructive">
              {dateError}
            </p>
          ) : null}
          {dateMessage ? (
            <p role="status" className="mt-1 text-xs text-muted-foreground">
              {dateMessage}
            </p>
          ) : null}
        </div>

        <div className="flex items-end justify-start lg:justify-end">{closeAction}</div>
      </div>
    </header>
  );
};
