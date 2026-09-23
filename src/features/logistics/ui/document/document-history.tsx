// english-ui:ignore-file
"use client";

import {
  Calendar,
  Check,
  FileText,
  Pencil,
  Play,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  DocumentTimelineEntry,
  DocumentTimelineKind,
} from "@/features/logistics/document-timeline";
import { formatTimestamp } from "@/features/logistics/logistics-labels";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { StatusPill } from "@/features/logistics/ui/status-badge";
import { cn } from "@/lib/utils";

const ICON: Record<DocumentTimelineKind, typeof FileText> = {
  create: FileText,
  work: Play,
  done: Check,
  cancel: X,
  date: Calendar,
  post: Check,
  edit: Pencil,
};

const toneClass = (kind: DocumentTimelineKind): string => {
  if (kind === "done" || kind === "post") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (kind === "work") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (kind === "cancel") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-border bg-background text-muted-foreground";
};

const ChangeList = ({ entry }: { entry: DocumentTimelineEntry }) => {
  if (!entry.changes || entry.changes.length === 0) {
    return null;
  }
  return (
    <dl className="mt-1.5 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3.5 gap-y-1 text-sm">
      {entry.changes.map((change) => (
        <div key={change.label} className="contents">
          <dt className="text-muted-foreground">{change.label}</dt>
          <dd className="m-0 flex flex-wrap items-center gap-1.5 text-muted-foreground">
            {change.from != null ? (
              <>
                <s className="text-muted-foreground/60">{change.from}</s>
                <span aria-hidden>→</span>
              </>
            ) : null}
            <span className="font-medium text-foreground">{change.to}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
};

const EntryTitle = ({
  entry,
  statusSlot,
}: {
  entry: DocumentTimelineEntry;
  statusSlot?: ReactNode;
}) => (
  <div className="flex flex-wrap items-center gap-2 pt-1 text-sm font-semibold">
    <span>{entry.title}</span>
    {statusSlot}
  </div>
);

export const DocumentHistory = ({
  entries,
  renderStatus,
}: {
  entries: DocumentTimelineEntry[];
  /** Optional: render a status pill for create/post entries that carry statusKey. */
  renderStatus?: (statusKey: string) => ReactNode;
}) => (
  <DocumentSection title="История">
    {entries.length === 0 ? (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">Истории пока нет.</p>
    ) : (
      <ol className="list-none space-y-0 px-4 pt-3.5 pb-1.5">
        {entries.map((entry, index) => {
          const Icon = ICON[entry.kind] ?? FileText;
          const statusSlot =
            entry.statusKey && (entry.kind === "create" || entry.kind === "post")
              ? (renderStatus?.(entry.statusKey) ?? <StatusPill status={entry.statusKey} />)
              : null;
          return (
            <li
              key={entry.id}
              className="relative grid grid-cols-[28px_minmax(0,1fr)_auto] gap-3 pb-4 last:pb-2"
            >
              {index < entries.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute top-7 bottom-0 left-[13.5px] w-px bg-border"
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] grid size-7 place-items-center rounded-full border",
                  toneClass(entry.kind),
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <EntryTitle entry={entry} statusSlot={statusSlot} />
                <ChangeList entry={entry} />
                {entry.detail ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{entry.detail}</p>
                ) : null}
              </div>
              <div className="pt-1 text-right text-xs whitespace-nowrap text-muted-foreground">
                <b className="block font-medium text-foreground/80">{formatTimestamp(entry.at)}</b>
                <span>{entry.by ?? "—"}</span>
              </div>
            </li>
          );
        })}
      </ol>
    )}
  </DocumentSection>
);
