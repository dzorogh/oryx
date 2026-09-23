// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  CUSTOMER_ORDER_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  OUTPUT_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  RESERVATION_OPERATION_LABELS,
  TRANSFER_STATUS_LABELS,
  formatExpectedEnd,
} from "@/features/logistics/logistics-labels";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { StatusPill } from "@/features/logistics/ui/status-badge";
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

const STATUS_LABELS: Record<string, string> = {
  ...DOCUMENT_STATUS_LABELS,
  ...TRANSFER_STATUS_LABELS,
  ...PRODUCTION_STATUS_LABELS,
  ...OUTPUT_STATUS_LABELS,
  ...CUSTOMER_ORDER_STATUS_LABELS,
};

const OPERATION_LABELS = RESERVATION_OPERATION_LABELS;

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

const StageIndex = ({ marker }: { marker: StageMarker }) => {
  if (marker === "done") {
    return (
      <span
        className="grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-green-700 bg-green-700 text-white"
        aria-hidden
      >
        <Check className="size-[11px]" strokeWidth={3} />
      </span>
    );
  }
  if (marker === "current") {
    return (
      <span
        className="grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-blue-600 bg-[radial-gradient(circle,theme(colors.blue.600)_0_4px,white_4.5px)]"
        aria-hidden
      />
    );
  }
  return (
    <span
      className="grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-zinc-300 bg-transparent"
      aria-hidden
    />
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
          className="ml-auto text-muted-foreground"
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

const documentCaption = (item: RelatedDocumentItem, parsedExtra?: string): string | null => {
  if (typeof item.coveragePercent === "number") {
    return `${item.coveragePercent}% заказа`;
  }
  if (item.expectedEndOn) {
    const date = formatExpectedEnd(item.expectedEndOn);
    if (parsedExtra && /\d/.test(parsedExtra) && !STATUS_LABELS[parsedExtra.split(" · ")[0] ?? ""]) {
      return `${parsedExtra} · до ${date}`;
    }
    return `до ${date}`;
  }
  if (parsedExtra && !/^[A-Z]{2,4}-\d+$/.test(parsedExtra) && !(parsedExtra in STATUS_LABELS)) {
    return parsedExtra;
  }
  return null;
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
  const caption = documentCaption(item, parsed.extra);
  const showStatus = Boolean(statusLabel && statusKey && statusKey !== "posted");

  return (
    <Link
      href={item.href}
      className="flex min-h-9 min-w-0 items-center gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/60"
    >
      <LogisticsCodeBadge code={item.label} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-muted-foreground" title={caption ?? undefined}>
        {caption}
      </span>
      {showStatus && statusKey ? (
        <span className="shrink-0">
          <StatusPill status={statusKey} label={statusLabel} />
        </span>
      ) : null}
    </Link>
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
  const allPosted = items.every(
    (item) => (item.statusKey ?? parseTrackerMeta(item.meta).statusKey) === "posted",
  );
  if (allPosted) {
    return `${items.length} проведено`;
  }
  const doneCount = items.filter((item) => isDocumentDone(item, doneStatuses)).length;
  if (doneCount === items.length) {
    return `${items.length} ${items.length === 1 ? "завершён" : "завершено"}`;
  }
  const n = items.length;
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "документов";
  if (mod10 === 1 && mod100 !== 11) {
    word = "документ";
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    word = "документа";
  }
  return `${n} ${word}`;
};

const JourneyStage = ({
  stage,
  marker,
  showActions,
}: {
  stage: OrderProgressStage;
  marker: StageMarker;
  showActions: boolean;
}) => {
  const actions = showActions && stage.actions && stage.actions.length > 0 ? stage.actions : null;
  const items = sortStageItems(stage.items, stage.doneStatuses);
  const caption = stageCaption(marker, stage.items, stage.doneStatuses);

  return (
    <div
      className="min-w-0 border-l border-border/60 px-4 py-3.5 first:border-l-0"
      aria-current={marker === "current" ? "step" : undefined}
    >
      <div className="flex items-center gap-2.5">
        <StageIndex marker={marker} />
        <div className="min-w-0">
          <StageTitle title={stage.title} href={stage.href} />
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
        {actions ? <StageOverflow title={stage.title} actions={actions} /> : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-2.5 flex flex-col divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-muted/30">
          {items.map((item) => (
            <DocumentCard key={item.id} item={item} doneStatuses={stage.doneStatuses} />
          ))}
        </div>
      ) : (
        <p className="mt-2.5 text-xs text-muted-foreground/70">Документов пока нет</p>
      )}
    </div>
  );
};

type OrderProgressTrackerProps = {
  canAct: boolean;
  primaryStages: OrderProgressStage[];
  secondaryStages: OrderProgressStage[];
};

/**
 * Customer-order journey card (Производство → … → Отгрузки) with collapsible related stages.
 * Document passport lives in DocumentHeader — this is only the flow strip.
 */
export const OrderProgressTracker = ({
  canAct,
  primaryStages,
  secondaryStages,
}: OrderProgressTrackerProps) => {
  const primaryMarkers = resolveStageMarkers(primaryStages);
  const secondaryMarkers = resolveStageMarkers(secondaryStages);

  const secondarySummary = secondaryStages.map((stage) => {
    if (stage.items.length === 0) {
      return (
        <span key={stage.id} className="inline-flex items-center gap-1.5">
          {stage.title} <span className="text-muted-foreground/50">нет</span>
        </span>
      );
    }
    return (
      <span key={stage.id} className="inline-flex flex-wrap items-center gap-1.5">
        {stage.title}{" "}
        {stage.items.map((item) => (
          <LogisticsCodeBadge key={item.id} code={item.label} href={item.href} />
        ))}
      </span>
    );
  });

  return (
    <Card size="sm" className={cn(logisticsCardClass, "mt-3 gap-0 overflow-hidden py-0 shadow-sm data-[size=sm]:gap-0 data-[size=sm]:py-0")} aria-label="Ход заказа">
      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Ход заказа клиента"
      >
        {primaryStages.map((stage, index) => (
          <JourneyStage
            key={stage.id}
            stage={stage}
            marker={primaryMarkers[index] ?? "pending"}
            showActions={canAct}
          />
        ))}
      </div>

      {secondaryStages.length > 0 ? (
        <Collapsible defaultOpen={false} className="group border-t border-border/60 bg-muted/30">
          <div className="flex flex-wrap items-center gap-3.5 px-5 py-2 text-sm text-muted-foreground">
            <b className="font-semibold text-foreground/80">Связанные</b>
            <div className="flex flex-wrap items-center gap-3">{secondarySummary as ReactNode}</div>
            <CollapsibleTrigger
              type="button"
              className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-foreground/80 hover:bg-muted"
            >
              <span className="group-data-[open]:hidden">Показать</span>
              <span className="hidden group-data-[open]:inline">Скрыть</span>
              <ChevronDown
                className="size-3.5 shrink-0 transition-transform duration-150 group-data-[open]:rotate-180"
                aria-hidden
              />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div
              className="grid grid-cols-1 border-t border-border/60 sm:grid-cols-2"
              aria-label="Связанные документы"
            >
              {secondaryStages.map((stage, index) => (
                <JourneyStage
                  key={stage.id}
                  stage={stage}
                  marker={secondaryMarkers[index] ?? "pending"}
                  showActions={canAct}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </Card>
  );
};
