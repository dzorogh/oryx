// @ts-nocheck
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDocumentTimeline,
  documentCompletedAt,
} from "@/features/logistics/document-timeline";
import { CUSTOMER_ORDER_STATUS_LABELS } from "@/features/logistics/logistics-labels";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { tabIdFromHash } from "@/features/logistics/ui/document/document-tab-hash";

const asSnap = (value: object): LogisticsSnapshot => value as LogisticsSnapshot;

const baseSnap = (overrides: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  asSnap({
    users: [{ id: "1", name: "Демо-пользователь" }, { id: "2", name: "Анна" }],
    documentHistory: [],
    ...overrides,
  });

describe("buildDocumentTimeline", () => {
  it("lifecycle: first snapshot is Создан with status; later snapshots are change lines", () => {
    const snapshot = baseSnap({
      documentHistory: [
        {
          id: "h1",
          documentId: "10",
          status: "draft",
          expectedEndOn: null,
          changedAt: "2026-09-01T10:14:00Z",
          changedBy: "1",
        },
        {
          id: "h2",
          documentId: "10",
          status: "in_progress",
          expectedEndOn: "2026-09-12",
          changedAt: "2026-09-02T09:30:00Z",
          changedBy: "1",
        },
        {
          id: "h3",
          documentId: "10",
          status: "in_progress",
          expectedEndOn: "2026-09-18",
          changedAt: "2026-09-10T16:02:00Z",
          changedBy: "2",
        },
      ],
    });

    const entries = buildDocumentTimeline(snapshot, {
      documentId: "10",
      createdAt: "2026-09-01T10:14:00Z",
      createdBy: "1",
      statusLabels: CUSTOMER_ORDER_STATUS_LABELS,
    });

    assert.equal(entries.length, 3);
    assert.equal(entries[0].title, "Создан");
    assert.equal(entries[0].statusKey, "draft");
    assert.equal(entries[0].by, "Демо-пользователь");

    assert.equal(entries[1].title, "Изменены статус и ожидаемое окончание");
    assert.deepEqual(entries[1].changes, [
      { label: "Статус", from: "Черновик", to: "Открыт" },
      { label: "Ожидаемое окончание", from: "—", to: "12.09.2026" },
    ]);

    assert.equal(entries[2].title, "Изменено ожидаемое окончание");
    assert.deepEqual(entries[2].changes, [
      { label: "Ожидаемое окончание", from: "12.09.2026", to: "18.09.2026" },
    ]);
    assert.equal(entries[2].by, "Анна");
  });

  it("simultaneous status + date change is one entry with two change lines", () => {
    const snapshot = baseSnap({
      documentHistory: [
        {
          id: "h1",
          documentId: "11",
          status: "draft",
          expectedEndOn: null,
          changedAt: "2026-09-01T10:00:00Z",
          changedBy: "1",
        },
        {
          id: "h2",
          documentId: "11",
          status: "in_progress",
          expectedEndOn: "2026-09-12",
          changedAt: "2026-09-02T09:30:00Z",
          changedBy: "1",
        },
      ],
    });

    const entries = buildDocumentTimeline(snapshot, {
      documentId: "11",
      createdAt: "2026-09-01T10:00:00Z",
      createdBy: "1",
      statusLabels: CUSTOMER_ORDER_STATUS_LABELS,
    });

    assert.equal(entries.length, 2);
    assert.equal(entries[1].title, "Изменены статус и ожидаемое окончание");
    assert.equal(entries[1].changes?.length, 2);
  });

  it("posted documents (shipment/adjustment): one Создан и проведён entry", () => {
    const snapshot = baseSnap();
    const entries = buildDocumentTimeline(snapshot, {
      documentId: "20",
      mode: "posted",
      createdAt: "2026-09-22T21:22:00Z",
      createdBy: "1",
      postedDetail: "6 шт со склада",
    });

    assert.equal(entries.length, 1);
    assert.equal(entries[0].title, "Создан и проведён");
    assert.equal(entries[0].kind, "post");
    assert.equal(entries[0].detail, "6 шт со склада");
    assert.equal(entries[0].by, "Демо-пользователь");
  });

  it("reservation: Создан; when posted — Проведён with postedAt", () => {
    const snapshot = baseSnap();
    const draft = buildDocumentTimeline(snapshot, {
      documentId: "30",
      mode: "reservation",
      createdAt: "2026-09-22T21:20:00Z",
      createdBy: "1",
      postedAt: null,
    });
    assert.equal(draft.length, 1);
    assert.equal(draft[0].title, "Создан");

    const posted = buildDocumentTimeline(snapshot, {
      documentId: "30",
      mode: "reservation",
      createdAt: "2026-09-22T21:20:00Z",
      createdBy: "1",
      postedAt: "2026-09-22T21:22:00Z",
      postedDetail: "4 шт",
    });
    assert.equal(posted.length, 2);
    assert.equal(posted[1].title, "Проведён");
    assert.equal(posted[1].at, "2026-09-22T21:22:00Z");
  });

  it("lifecycle without snapshots: one Создан from createdAt", () => {
    const snapshot = baseSnap();
    const entries = buildDocumentTimeline(snapshot, {
      documentId: "40",
      createdAt: "2026-09-03T11:40:00Z",
      createdBy: "1",
    });
    assert.equal(entries.length, 1);
    assert.equal(entries[0].title, "Создан");
    assert.equal(entries[0].at, "2026-09-03T11:40:00Z");
  });

  it("missing author resolves to null (UI shows —)", () => {
    const snapshot = baseSnap({
      documentHistory: [
        {
          id: "h1",
          documentId: "50",
          status: "draft",
          expectedEndOn: null,
          changedAt: "2026-09-01T10:00:00Z",
          changedBy: "999",
        },
      ],
    });
    const entries = buildDocumentTimeline(snapshot, {
      documentId: "50",
      createdAt: "2026-09-01T10:00:00Z",
      createdBy: "999",
    });
    assert.equal(entries[0].by, null);
  });
});

describe("documentCompletedAt", () => {
  it("returns changedAt of first done snapshot; otherwise null", () => {
    const snapshot = baseSnap({
      documentHistory: [
        {
          id: "h1",
          documentId: "60",
          status: "draft",
          expectedEndOn: null,
          changedAt: "2026-09-01T10:00:00Z",
          changedBy: "1",
        },
        {
          id: "h2",
          documentId: "60",
          status: "in_progress",
          expectedEndOn: null,
          changedAt: "2026-09-02T10:00:00Z",
          changedBy: "1",
        },
        {
          id: "h3",
          documentId: "60",
          status: "done",
          expectedEndOn: null,
          changedAt: "2026-09-12T14:05:00Z",
          changedBy: "1",
        },
      ],
    });

    assert.equal(documentCompletedAt(snapshot, "60"), "2026-09-12T14:05:00Z");
    assert.equal(documentCompletedAt(snapshot, "missing"), null);
  });

  it("returns null when a done document was reopened (latest snapshot not done)", () => {
    const snapshot = baseSnap({
      documentHistory: [
        {
          id: "1",
          documentId: "70",
          status: "in_progress",
          expectedEndOn: null,
          changedAt: "2026-09-01T10:00:00Z",
          changedBy: "1",
        },
        {
          id: "2",
          documentId: "70",
          status: "done",
          expectedEndOn: null,
          changedAt: "2026-09-10T10:00:00Z",
          changedBy: "1",
        },
        {
          id: "3",
          documentId: "70",
          status: "in_progress",
          expectedEndOn: null,
          changedAt: "2026-09-11T10:00:00Z",
          changedBy: "1",
        },
      ],
    });

    assert.equal(documentCompletedAt(snapshot, "70"), null);
  });

  it("uses the start of the final uninterrupted done run after a reopen-and-close", () => {
    const snapshot = baseSnap({
      documentHistory: [
        {
          id: "1",
          documentId: "71",
          status: "done",
          expectedEndOn: null,
          changedAt: "2026-09-05T10:00:00Z",
          changedBy: "1",
        },
        {
          id: "2",
          documentId: "71",
          status: "in_progress",
          expectedEndOn: null,
          changedAt: "2026-09-06T10:00:00Z",
          changedBy: "1",
        },
        {
          id: "3",
          documentId: "71",
          status: "done",
          expectedEndOn: null,
          changedAt: "2026-09-12T08:00:00Z",
          changedBy: "1",
        },
        {
          id: "4",
          documentId: "71",
          status: "closed",
          expectedEndOn: null,
          changedAt: "2026-09-12T09:00:00Z",
          changedBy: "1",
        },
      ],
    });

    assert.equal(documentCompletedAt(snapshot, "71"), "2026-09-12T08:00:00Z");
  });

  it("tie-breaks equal changedAt by numeric id order", () => {
    const snapshot = baseSnap({
      documentHistory: [
        {
          id: "10",
          documentId: "80",
          status: "done",
          expectedEndOn: null,
          changedAt: "2026-09-12T14:05:00Z",
          changedBy: "1",
        },
        {
          id: "2",
          documentId: "80",
          status: "in_progress",
          expectedEndOn: null,
          changedAt: "2026-09-12T14:05:00Z",
          changedBy: "1",
        },
      ],
    });

    // Numeric id 2 before 10 → latest after sort is done → completedAt is that done row.
    assert.equal(documentCompletedAt(snapshot, "80"), "2026-09-12T14:05:00Z");
    const entries = buildDocumentTimeline(snapshot, {
      documentId: "80",
      createdAt: "2026-09-12T14:05:00Z",
      createdBy: "1",
      statusLabels: CUSTOMER_ORDER_STATUS_LABELS,
    });
    assert.equal(entries[0].statusKey, "in_progress");
    assert.equal(entries[1].statusKey, "done");
  });
});

describe("tabIdFromHash", () => {
  const tabs = ["products", "movements", "history"];

  it("opens the tab named by the hash", () => {
    assert.equal(tabIdFromHash("#movements", tabs), "movements");
    assert.equal(tabIdFromHash("#co:history", tabs), "history");
  });

  it("unknown or empty hash → null, so the first tab stays selected", () => {
    assert.equal(tabIdFromHash("#outputs", tabs), null);
    assert.equal(tabIdFromHash("", tabs), null);
    assert.equal(tabIdFromHash("#", tabs), null);
  });
});
