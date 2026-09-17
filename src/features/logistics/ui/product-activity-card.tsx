"use client";

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import {
  productActivity,
  type ProductActivityKind,
  type ProductActivityRow,
} from "@/features/logistics/logistics-related";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ManufacturerLink } from "@/features/logistics/ui/manufacturer-link";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

const SECTION_COPY: Record<
  ProductActivityKind,
  { title: string; href: string; always: boolean }
> = {
  customer_order: { title: "Customer orders", href: "/store/logistics/customer-orders", always: true },
  production_order: { title: "Production orders", href: "/store/logistics/production-orders", always: true },
  transfer: { title: "Transfers", href: "/store/logistics/transfers", always: false },
  output: { title: "Outputs", href: "/store/logistics/outputs", always: false },
  shipment: { title: "Shipments", href: "/store/logistics/shipments", always: false },
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  draft: "Draft",
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
  posted: "Posted",
  sent: "Sent",
  delivered: "Delivered",
};

const formatDue = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const statusVariant = (status: string): "outline" | "secondary" | "default" | "destructive" => {
  if (status === "cancelled") {
    return "destructive";
  }
  if (status === "posted" || status === "delivered" || status === "closed" || status === "done") {
    return "default";
  }
  if (status === "sent" || status === "in_progress" || status === "open") {
    return "secondary";
  }
  return "outline";
};

const ActivityRow = ({
  snapshot,
  row,
  unit,
}: {
  snapshot: LogisticsSnapshot;
  row: ProductActivityRow;
  unit?: string;
}) => {
  const due = formatDue(row.expectedEndOn);
  const details = [
    formatQuantity(row.quantity, unit),
    row.manufacturerId ? null : row.hint,
    row.hasExpectedEnd ? (due ? `Expected end ${due}` : "No expected end") : null,
  ].filter(Boolean);

  return (
    <li className="-mx-3">
      <div className="group/item flex items-start justify-between gap-3 px-3 py-2 transition-colors hover:bg-muted/50">
        <span className="min-w-0">
          <LogisticsCodeBadge code={row.number} href={row.href} />
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {details[0] ? <span className="tabular-nums">{details[0]}</span> : null}
            {row.manufacturerId ? (
              <>
                <span aria-hidden>·</span>
                <ManufacturerLink snapshot={snapshot} manufacturerId={row.manufacturerId} />
              </>
            ) : null}
            {details.slice(1).map((part) => (
              <span key={part}>
                <span aria-hidden>· </span>
                {part}
              </span>
            ))}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 pt-0.5">
          <Badge variant={statusVariant(row.status)}>{STATUS_LABELS[row.status] ?? row.status}</Badge>
          <Link
            href={row.href}
            className="text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100"
            aria-label={`Open ${row.number}`}
          >
            <ArrowUpRight className="size-3" />
          </Link>
        </span>
      </div>
    </li>
  );
};

export const ProductActivityCard = ({
  snapshot,
  productId,
  unit,
  onCreateProduction,
}: {
  snapshot: LogisticsSnapshot;
  productId: string;
  unit?: string;
  onCreateProduction?: () => void;
}) => {
  const groups = productActivity(snapshot, productId).filter(
    (group) => SECTION_COPY[group.kind].always || group.items.length > 0,
  );

  return (
    <Card size="sm" className={cn(logisticsCardClass, "gap-0 overflow-hidden py-0")}>
      <div className="flex flex-col gap-1 px-3 py-2.5">
        <h2 className="text-sm font-semibold">Current activity</h2>
        <p className="text-xs text-muted-foreground">
          Documents that currently involve this product — status and expected end when the document has one.
        </p>
      </div>
      <div className="divide-y divide-[var(--corportal-border-grey)] border-t border-[var(--corportal-border-grey)]">
        {groups.map((group) => {
          const copy = SECTION_COPY[group.kind];
          const isEmpty = group.items.length === 0;
          return (
            <section key={group.kind} className="px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={copy.href}
                    className="group/title inline-flex min-w-0 items-center gap-1 text-foreground hover:text-primary"
                  >
                    <h3 className="truncate text-sm font-semibold">{copy.title}</h3>
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100" />
                  </Link>
                  {isEmpty ? (
                    <span className="text-xs text-muted-foreground">None yet</span>
                  ) : (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                      {group.items.length}
                    </span>
                  )}
                </div>
                {group.kind === "production_order" && onCreateProduction ? (
                  <Button type="button" size="xs" variant="outline" onClick={onCreateProduction}>
                    <Plus data-icon="inline-start" />
                    New production order
                  </Button>
                ) : null}
              </div>
              {isEmpty ? null : (
                <ul className="mt-1">
                  {group.items.map((row) => (
                    <ActivityRow key={row.id} snapshot={snapshot} row={row} unit={unit} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Card>
  );
};
