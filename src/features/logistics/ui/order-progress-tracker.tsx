// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RelatedDocumentItem } from "@/features/logistics/logistics-related";
import type { CustomerOrderStatus } from "@/features/logistics/logistics-types";
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  OUTPUT_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  RESERVATION_OPERATION_LABELS,
  TRANSFER_STATUS_LABELS,
  formatExpectedEnd,
} from "@/features/logistics/logistics-labels";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

export type OrderProgressAction = {
  label: string;
  onClick: () => void;
};

export type OrderProgressStage = {
  id: string;
  title: string;
  href?: string;
  items: RelatedDocumentItem[];
  actions?: OrderProgressAction[];
  /** Terminal success statuses for this stage (meta status key). */
  doneStatuses: readonly string[];
};

export type StageMarker = "done" | "current" | "pending";

const ORDER_STATUS_LABELS = CUSTOMER_ORDER_STATUS_LABELS;

const STATUS_LABELS: Record<string, string> = {
  ...DOCUMENT_STATUS_LABELS,
  ...TRANSFER_STATUS_LABELS,
  ...PRODUCTION_STATUS_LABELS,
  ...OUTPUT_STATUS_LABELS,
  ...CUSTOMER_ORDER_STATUS_LABELS,
};

const OPERATION_LABELS = RESERVATION_OPERATION_LABELS;

const statusTone = (statusKey: string): "outline" | "secondary" | "default" | "destructive" => {
  if (statusKey === "cancelled") {
    return "destructive";
  }
  if (
    statusKey === "posted" ||
    statusKey === "delivered" ||
    statusKey === "closed" ||
    statusKey === "done"
  ) {
    return "default";
  }
  if (
    statusKey === "sent" ||
    statusKey === "in_progress" ||
    statusKey === "reserved" ||
    statusKey === "open" ||
    statusKey === "planned"
  ) {
    return "secondary";
  }
  return "outline";
};

export const parseTrackerMeta = (
  meta: string,
): { statusKey?: string; statusLabel?: string; extra?: string } => {
  const parts = meta.split(" · ").filter(Boolean);
  if (parts.length === 0) {
    return {};
  }

  const first = parts[0];
  const second = parts[1];

  if ((first === "reserve" || first === "release" || first === "reassign") && second && second in STATUS_LABELS) {
    return {
      statusKey: second,
      statusLabel: STATUS_LABELS[second],
      extra: [OPERATION_LABELS[first], ...parts.slice(2)].filter(Boolean).join(" · ") || undefined,
    };
  }

  if (first in STATUS_LABELS) {
    return {
      statusKey: first,
      statusLabel: STATUS_LABELS[first],
      extra: parts.slice(1).join(" · ") || undefined,
    };
  }

  return { extra: meta };
};

export const documentStatusKey = (item: RelatedDocumentItem): string | undefined =>
  item.statusKey ?? parseTrackerMeta(item.meta).statusKey;

export const isDocumentDone = (
  item: RelatedDocumentItem,
  doneStatuses: readonly string[],
): boolean => {
  const statusKey = documentStatusKey(item);
  return statusKey != null && doneStatuses.includes(statusKey);
};

export const isDocumentActive = (
  item: RelatedDocumentItem,
  doneStatuses: readonly string[],
): boolean => {
  const statusKey = documentStatusKey(item);
  return statusKey !== "cancelled" && !isDocumentDone(item, doneStatuses);
};

type StageProgress = "empty" | "active" | "complete";

export const stageProgress = (
  items: RelatedDocumentItem[],
  doneStatuses: readonly string[],
): StageProgress => {
  if (items.length === 0) {
    return "empty";
  }
  const allDone = items.every((item) => isDocumentDone(item, doneStatuses));
  return allDone ? "complete" : "active";
};

/** Assign done/current/pending markers. Several stages can be current at once. */
export const resolveStageMarkers = (
  stages: Array<{ items: RelatedDocumentItem[]; doneStatuses: readonly string[] }>,
): StageMarker[] => {
  const progress = stages.map((stage) => stageProgress(stage.items, stage.doneStatuses));
  return progress.map((value, index) => {
    if (value === "complete" || value === "active") {
      return value === "complete" ? "done" : "current";
    }
    const laterHasDocuments = progress.slice(index + 1).some((item) => item !== "empty");
    return laterHasDocuments ? "done" : "pending";
  });
};

const sortStageItems = (
  items: RelatedDocumentItem[],
  doneStatuses: readonly string[],
): RelatedDocumentItem[] =>
  [...items].sort((left, right) => {
    const leftActive = isDocumentActive(left, doneStatuses) ? 0 : 1;
    const rightActive = isDocumentActive(right, doneStatuses) ? 0 : 1;
    if (leftActive !== rightActive) {
      return leftActive - rightActive;
    }
    return left.label.localeCompare(right.label);
  });

const StageTitle = ({ title, href }: { title: string; href?: string }) =>
  href ? (
    <Link href={href} className="block truncate whitespace-nowrap text-sm font-semibold text-foreground hover:text-primary">
      {title}
    </Link>
  ) : (
    <span className="block truncate whitespace-nowrap text-sm font-semibold text-foreground">{title}</span>
  );

const StageIndex = ({ marker, index }: { marker: StageMarker; index: number }) => {
  if (marker === "done") {
    return (
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
        aria-hidden
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (marker === "current") {
    return (
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary text-[10px] font-semibold text-primary"
        aria-hidden
      >
        {index + 1}
      </span>
    );
  }
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground"
      aria-hidden
    >
      {index + 1}
    </span>
  );
};

const StageOverflow = ({
  title,
  actions,
}: {
  title: string;
  actions: OrderProgressAction[];
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Действия: ${title}`}
          className="text-muted-foreground"
        />
      }
    >
      <MoreHorizontal className="size-3.5" aria-hidden />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-48">
      {actions.map((action) => (
        <DropdownMenuItem key={action.label} onClick={action.onClick}>
          {action.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

const documentDateLabel = (item: RelatedDocumentItem, extra?: string): string | undefined => {
  if (item.expectedEndOn) {
    return formatExpectedEnd(item.expectedEndOn);
  }
  if (!extra || /занято|выпущено/.test(extra) || !/\d/.test(extra) || /^[A-Z]{2,4}-\d+/.test(extra)) {
    return undefined;
  }
  return extra;
};

const DocumentCard = ({
  item,
  doneStatuses,
}: {
  item: RelatedDocumentItem;
  doneStatuses: readonly string[];
}) => {
  const parsed = parseTrackerMeta(item.meta);
  const statusKey = item.statusKey ?? parsed.statusKey;
  const statusLabel =
    parsed.statusLabel ?? (statusKey && statusKey in STATUS_LABELS ? STATUS_LABELS[statusKey] : undefined);
  const active = isDocumentActive(item, doneStatuses);
  const dateLabel = documentDateLabel(item, parsed.extra);
  const coverage =
    typeof item.coveragePercent === "number" ? `${item.coveragePercent}% заказа` : null;

  return (
    <li className="min-w-0">
      <Link
        href={item.href}
        className={cn(
          "block min-w-0 rounded-lg border p-2 transition-colors hover:bg-muted/40",
          active
            ? "border-primary/40 bg-background shadow-[inset_0_-2px_0_0] shadow-primary/70"
            : "border-border/70 bg-background/70 text-muted-foreground",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <LogisticsCodeBadge code={item.label} className={cn(!active && "opacity-80")} />
          {statusLabel ? (
            <Badge variant={statusTone(statusKey ?? "")}>{statusLabel}</Badge>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] tabular-nums">
          <span className="whitespace-nowrap">{coverage}</span>
          {dateLabel ? <span className="whitespace-nowrap">{dateLabel}</span> : null}
        </div>
        {active && typeof item.coveragePercent === "number" ? (
          <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, item.coveragePercent))}%` }}
            />
          </div>
        ) : null}
      </Link>
    </li>
  );
};

const stageCaption = (
  marker: StageMarker,
  items: RelatedDocumentItem[],
  doneStatuses: readonly string[],
): string => {
  if (items.length === 0) {
    return marker === "done" ? "Пройдено" : "Не начато";
  }
  const activeCount = items.filter((item) => isDocumentActive(item, doneStatuses)).length;
  if (activeCount > 0) {
    return `${activeCount} в работе`;
  }
  return `${items.length} завершено`;
};

const JourneyStage = ({
  stage,
  marker,
  index,
  showActions,
  quiet,
}: {
  stage: OrderProgressStage;
  marker: StageMarker;
  index: number;
  showActions: boolean;
  quiet?: boolean;
}) => {
  const actions = showActions && stage.actions && stage.actions.length > 0 ? stage.actions : null;
  const items = sortStageItems(stage.items, stage.doneStatuses);
  const caption = stageCaption(marker, stage.items, stage.doneStatuses);

  return (
    <li
      className={cn(
        "min-w-0",
        quiet
          ? "py-1"
          : cn(
            "border-b border-[var(--corportal-border-grey)] p-3.5 last:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0",
            marker === "current" && "bg-primary/5",
          ),
      )}
      aria-current={marker === "current" ? "step" : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {quiet ? null : <StageIndex marker={marker} index={index} />}
          <div className="min-w-0">
            <StageTitle title={stage.title} href={stage.href} />
            <p className="text-[11px] text-muted-foreground">{caption}</p>
          </div>
        </div>
        {actions ? <StageOverflow title={stage.title} actions={actions} /> : null}
      </div>

      {items.length > 0 ? (
        <ul className="mt-3 grid gap-1.5">
          {items.map((item) => (
            <DocumentCard key={item.id} item={item} doneStatuses={stage.doneStatuses} />
          ))}
        </ul>
      ) : null}
    </li>
  );
};

type OrderProgressTrackerProps = {
  orderNumber: string;
  status: CustomerOrderStatus;
  expectedEndOn: string | null;
  description?: string | null;
  canAct: boolean;
  onCloseOrder: () => void;
  onExpectedEndChange: (value: string) => void;
  primaryStages: OrderProgressStage[];
  secondaryStages: OrderProgressStage[];
  toolbarExtra?: ReactNode;
};

export const OrderProgressTracker = ({
  orderNumber,
  status,
  expectedEndOn,
  description,
  canAct,
  onCloseOrder,
  onExpectedEndChange,
  primaryStages,
  secondaryStages,
  toolbarExtra,
}: OrderProgressTrackerProps) => {
  const primaryMarkers = resolveStageMarkers(primaryStages);
  const secondaryMarkers = resolveStageMarkers(secondaryStages);

  return (
    <Card size="sm" className={logisticsCardClass}>
      <CardHeader className="gap-0 space-y-3 pb-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{orderNumber}</h1>
              <Badge variant={status === "closed" ? "default" : "secondary"}>
                {ORDER_STATUS_LABELS[status]}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <ExpectedEndField
              layout="inline"
              label="Ожидаемое окончание"
              value={expectedEndOn ?? ""}
              onChange={onExpectedEndChange}
            />
            {!expectedEndOn ? (
              <span className="text-xs text-muted-foreground" data-testid="expected-end-unset">
                Не задано
              </span>
            ) : null}
            {toolbarExtra}
            {canAct ? (
              <Button type="button" size="sm" onClick={onCloseOrder} className="shrink-0">
                Закрыть заказ клиента
              </Button>
            ) : null}
          </div>
        </div>

        {description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}

        <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

        <ol
          className="grid grid-cols-1 overflow-hidden rounded-lg border border-[var(--corportal-border-grey)] lg:grid-cols-4"
          aria-label="Ход заказа клиента"
        >
          {primaryStages.map((stage, index) => (
            <JourneyStage
              key={stage.id}
              stage={stage}
              marker={primaryMarkers[index] ?? "pending"}
              index={index}
              showActions={canAct}
            />
          ))}
        </ol>

        {secondaryStages.length > 0 ? (
          <Collapsible defaultOpen={false} className="group rounded-lg bg-muted/30">
            <CollapsibleTrigger
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3.5 py-3 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Связанные
              </span>
              <ChevronDown
                className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[open]:rotate-180"
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ol className="grid grid-cols-2 items-start gap-x-8 px-3.5 pb-3" aria-label="Связанные документы">
                {secondaryStages.map((stage, index) => (
                  <JourneyStage
                    key={stage.id}
                    stage={stage}
                    marker={secondaryMarkers[index] ?? "pending"}
                    index={index}
                    showActions={canAct}
                    quiet
                  />
                ))}
              </ol>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </CardHeader>
    </Card>
  );
};
