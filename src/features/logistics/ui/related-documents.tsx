// english-ui:ignore-file
"use client";

import { Children, createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RelatedDocumentItem } from "@/features/logistics/logistics-related";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  OUTPUT_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
} from "@/features/logistics/logistics-labels";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";

const STATUS_LABELS = {
  ...DOCUMENT_STATUS_LABELS,
  ...TRANSFER_STATUS_LABELS,
  ...PRODUCTION_STATUS_LABELS,
  ...OUTPUT_STATUS_LABELS,
  ...CUSTOMER_ORDER_STATUS_LABELS,
} as Record<string, string>;

const parseMeta = (meta: string): { status?: string; extra?: string } => {
  const [first, ...rest] = meta.split(" · ");
  if (first in STATUS_LABELS) {
    return {
      status: STATUS_LABELS[first],
      extra: rest.join(" · ") || undefined,
    };
  }
  return { extra: meta || undefined };
};

const statusVariant = (meta: string): "outline" | "secondary" | "default" | "destructive" => {
  const status = meta.split(" · ")[0];
  if (status === "cancelled") {
    return "destructive";
  }
  if (status === "posted" || status === "delivered" || status === "closed" || status === "done") {
    return "default";
  }
  if (status === "sent" || status === "in_progress" || status === "reserved" || status === "open") {
    return "secondary";
  }
  return "outline";
};

type RelatedDocumentAction = {
  label: string;
  onClick: () => void;
};

type RelatedDocumentsProps = {
  title: string;
  href?: string;
  items: RelatedDocumentItem[];
  onCreate?: () => void;
  createLabel?: string;
  actions?: RelatedDocumentAction[];
  empty?: string;
  quiet?: boolean;
};

const InBoardContext = createContext(false);

const Title = ({ title, href }: { title: string; href?: string }) =>
  href ? (
    <Link
      href={href}
      className="group/title inline-flex min-w-0 items-center gap-1 text-foreground hover:text-primary"
    >
      <h2 className="truncate text-sm font-semibold">{title}</h2>
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100" />
    </Link>
  ) : (
    <h2 className="truncate text-sm font-semibold">{title}</h2>
  );

export const RelatedDocuments = ({
  title,
  href,
  items,
  onCreate,
  createLabel = "Создать",
  actions,
  empty = "Пока нет",
  quiet = false,
}: RelatedDocumentsProps) => {
  const inBoard = useContext(InBoardContext);
  const buttons = actions ?? (onCreate ? [{ label: createLabel, onClick: onCreate }] : []);
  const isEmpty = items.length === 0;

  const body = (
    <section className={cn("px-3 py-2.5", quiet ? "bg-transparent" : null)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Title title={title} href={href} />
          {isEmpty ? (
            <span className="text-xs text-muted-foreground">{empty}</span>
          ) : (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
              {items.length}
            </span>
          )}
        </div>
        {buttons.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {buttons.map((action) => (
              <Button key={action.label} type="button" size="xs" variant="outline" onClick={action.onClick}>
                <Plus data-icon="inline-start" />
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {isEmpty ? null : (
        <ul className="mt-1">
          {items.map((item) => {
            const parsed = parseMeta(item.meta);
            return (
              <li key={item.id} className="-mx-3">
                <Link
                  href={item.href}
                  className="group/item flex items-center justify-between gap-3 px-3 py-1.5 transition-colors hover:bg-muted/50"
                >
                  <LogisticsCodeBadge code={item.label} />
                  <span className="flex shrink-0 items-center gap-2">
                    {item.statusLabel || parsed.status ? (
                      <Badge variant={statusVariant(item.meta)}>{item.statusLabel ?? parsed.status}</Badge>
                    ) : null}
                    {parsed.extra ? (
                      <span className="text-xs tabular-nums text-muted-foreground">{parsed.extra}</span>
                    ) : null}
                    <ArrowUpRight className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  if (inBoard) {
    return body;
  }

  return (
    <Card size="sm" className={cn(logisticsCardClass, "gap-0 py-0", quiet ? "bg-muted/20" : null)}>
      {body}
    </Card>
  );
};

export const RelatedDocumentsBoard = ({
  children,
  quiet = false,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  quiet?: boolean;
}) => {
  const cells = Children.toArray(children);
  if (cells.length === 0) {
    return null;
  }

  return (
    <InBoardContext.Provider value={true}>
      <Card
        size="sm"
        className={cn(
          logisticsCardClass,
          "gap-0 overflow-hidden py-0",
          quiet ? "bg-muted/20" : null,
        )}
      >
        <div className="divide-y divide-[var(--corportal-border-grey)]">{cells}</div>
      </Card>
    </InBoardContext.Provider>
  );
};
