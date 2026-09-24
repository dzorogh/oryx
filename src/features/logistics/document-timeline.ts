import {
  CUSTOMER_ORDER_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  formatExpectedEnd,
  OUTPUT_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  TRANSFER_STATUS_LABELS,
} from "@/features/logistics/logistics-labels";
import type {
  DocumentHistoryEntry,
  LogisticsSnapshot,
} from "@/features/logistics/logistics-types";

const formatDateCompact = (value: string | null): string => {
  if (!value) {
    return "—";
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`;
  }
  return formatExpectedEnd(value);
};

export type DocumentTimelineKind =
  | "create"
  | "work"
  | "done"
  | "cancel"
  | "date"
  | "post"
  | "edit";

export type DocumentTimelineChange = {
  label: string;
  from: string | null;
  to: string;
};

export type DocumentTimelineEntry = {
  id: string;
  kind: DocumentTimelineKind;
  title: string;
  at: string;
  by: string | null;
  changes?: DocumentTimelineChange[];
  detail?: string | null;
  /** Status key for pill rendering in the UI, when the title embeds a status. */
  statusKey?: string | null;
};

export type DocumentTimelineInput = {
  documentId: string;
  /** When set, history is synthesized for documents without a status cycle. */
  mode?: "lifecycle" | "posted";
  createdAt: string;
  createdBy?: string | null;
  postedAt?: string | null;
  /** Optional detail line for synthesized posted entries. */
  postedDetail?: string | null;
  /** Override status labels (e.g. customer order maps in_progress → «Открыт»). */
  statusLabels?: Partial<Record<string, string>>;
};

const DEFAULT_STATUS_LABELS: Record<string, string> = {
  ...DOCUMENT_STATUS_LABELS,
  ...PRODUCTION_STATUS_LABELS,
  ...TRANSFER_STATUS_LABELS,
  ...OUTPUT_STATUS_LABELS,
  ...CUSTOMER_ORDER_STATUS_LABELS,
};

const statusLabel = (
  status: string | null | undefined,
  labels: Partial<Record<string, string>>,
): string => {
  if (!status) {
    return "—";
  }
  return labels[status] ?? DEFAULT_STATUS_LABELS[status] ?? status;
};

const userName = (snapshot: LogisticsSnapshot, userId: string | null | undefined): string | null => {
  if (!userId) {
    return null;
  }
  return snapshot.users.find((user) => user.id === userId)?.name ?? null;
};

const historyForDocument = (
  snapshot: LogisticsSnapshot,
  documentId: string,
): DocumentHistoryEntry[] =>
  snapshot.documentHistory
    .filter((entry) => entry.documentId === documentId)
    .sort((left, right) => {
      const byTime = left.changedAt.localeCompare(right.changedAt);
      if (byTime !== 0) {
        return byTime;
      }
      const leftId = Number(left.id);
      const rightId = Number(right.id);
      if (!Number.isNaN(leftId) && !Number.isNaN(rightId)) {
        return leftId - rightId;
      }
      return left.id.localeCompare(right.id);
    });

const toneForStatus = (status: string | null | undefined): DocumentTimelineKind => {
  if (status === "cancelled") {
    return "cancel";
  }
  if (status === "done" || status === "closed" || status === "delivered" || status === "posted") {
    return "done";
  }
  if (
    status === "in_progress" ||
    status === "open" ||
    status === "sent" ||
    status === "planned" ||
    status === "reserved"
  ) {
    return "work";
  }
  return "edit";
};

const changeTitle = (changes: DocumentTimelineChange[]): string => {
  if (changes.length === 0) {
    return "Изменён документ";
  }
  if (changes.length === 1) {
    const [change] = changes;
    if (change.label === "Статус") {
      return "Изменён статус";
    }
    if (change.label === "Ожидаемое окончание") {
      return "Изменено ожидаемое окончание";
    }
    return `Изменено: ${change.label}`;
  }
  const labels = changes.map((change) => change.label.toLowerCase());
  if (labels.includes("статус") && labels.includes("ожидаемое окончание")) {
    return "Изменены статус и ожидаемое окончание";
  }
  return `Изменены ${labels.join(" и ")}`;
};

const snapshotChanges = (
  previous: DocumentHistoryEntry | null,
  current: DocumentHistoryEntry,
  labels: Partial<Record<string, string>>,
): DocumentTimelineChange[] => {
  const changes: DocumentTimelineChange[] = [];
  if ((previous?.status ?? null) !== (current.status ?? null)) {
    changes.push({
      label: "Статус",
      from: previous ? statusLabel(previous.status, labels) : null,
      to: statusLabel(current.status, labels),
    });
  }
  if ((previous?.expectedEndOn ?? null) !== (current.expectedEndOn ?? null)) {
    changes.push({
      label: "Ожидаемое окончание",
      from: previous ? formatDateCompact(previous.expectedEndOn) : null,
      to: formatDateCompact(current.expectedEndOn),
    });
  }
  return changes;
};

const lifecycleTimeline = (
  snapshot: LogisticsSnapshot,
  input: DocumentTimelineInput,
): DocumentTimelineEntry[] => {
  const labels = input.statusLabels ?? {};
  const history = historyForDocument(snapshot, input.documentId);
  if (history.length === 0) {
    return [
      {
        id: `${input.documentId}:created`,
        kind: "create",
        title: "Создан",
        at: input.createdAt,
        by: userName(snapshot, input.createdBy),
        statusKey: null,
      },
    ];
  }

  return history.map((entry, index) => {
    const previous = index === 0 ? null : history[index - 1] ?? null;
    if (index === 0) {
      return {
        id: entry.id,
        kind: "create",
        title: "Создан",
        at: entry.changedAt,
        by: userName(snapshot, entry.changedBy) ?? userName(snapshot, input.createdBy),
        statusKey: entry.status,
      };
    }

    const changes = snapshotChanges(previous, entry, labels);
    return {
      id: entry.id,
      kind: toneForStatus(entry.status),
      title: changeTitle(changes),
      at: entry.changedAt,
      by: userName(snapshot, entry.changedBy),
      changes,
      statusKey: entry.status,
    };
  });
};

const postedTimeline = (
  snapshot: LogisticsSnapshot,
  input: DocumentTimelineInput,
): DocumentTimelineEntry[] => [
  {
    id: `${input.documentId}:posted`,
    kind: "post",
    title: "Создан и проведён",
    at: input.postedAt ?? input.createdAt,
    by: userName(snapshot, input.createdBy),
    detail: input.postedDetail ?? null,
    statusKey: "posted",
  },
];

/**
 * Build the universal document history timeline.
 * Lifecycle documents use `documentHistory` snapshots (one entry per save).
 * Posted documents synthesize a client-side event without DB changes.
 */
export const buildDocumentTimeline = (
  snapshot: LogisticsSnapshot,
  input: DocumentTimelineInput,
): DocumentTimelineEntry[] => {
  const mode = input.mode ?? "lifecycle";
  if (mode === "posted") {
    return postedTimeline(snapshot, input);
  }
  return lifecycleTimeline(snapshot, input);
};

/** First done/closed/delivered snapshot of the final uninterrupted terminal run; null if latest isn't done. */
export const documentCompletedAt = (
  snapshot: LogisticsSnapshot,
  documentId: string,
): string | null => {
  const history = historyForDocument(snapshot, documentId);
  if (history.length === 0) {
    return null;
  }
  const isDone = (status: string | null | undefined) =>
    status === "done" || status === "closed" || status === "delivered";
  const latest = history[history.length - 1];
  if (!isDone(latest.status)) {
    return null;
  }
  let firstOfRun = latest;
  for (let index = history.length - 2; index >= 0; index -= 1) {
    const entry = history[index];
    if (!isDone(entry.status)) {
      break;
    }
    firstOfRun = entry;
  }
  return firstOfRun.changedAt;
};
