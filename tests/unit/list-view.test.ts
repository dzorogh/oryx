import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deadlineFilterMatch, deadlineGroupKey } from "@/features/logistics/ui/list/list-deadline";
import type { ListColumnDef, ListSortDef } from "@/features/logistics/ui/list/list-types";
import {
  buildListViewPersisted,
  buildSortDefs,
  compareSortValues,
  getDefaultVisibleColumnIds,
  groupRows,
  nextHeaderSort,
  parseListViewPersisted,
  serializeListViewPersisted,
  sortRows,
} from "@/features/logistics/ui/list/list-view-state";

type Row = { id: string; name: string; qty: number | null; createdAt: string; number?: string };

const columns: ListColumnDef<Row>[] = [
  { id: "number", label: "Номер", locked: true, render: () => null },
  { id: "name", label: "Название", render: () => null },
  { id: "hidden", label: "Скрытая", defaultHidden: true, render: () => null },
];

const sortDefs: ListSortDef<Row>[] = [
  { id: "name", label: "Название", type: "text", value: (row) => row.name },
  { id: "qty", label: "Кол-во", type: "number", value: (row) => row.qty },
  { id: "created", label: "Создан", type: "date", value: (row) => row.createdAt },
  { id: "number", label: "Номер", type: "text", value: (row) => row.number ?? "" },
];

const formatDate = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

describe("list-view-state", () => {
  it("sorts empty values to the end", () => {
    const rows: Row[] = [
      { id: "1", name: "b", qty: null, createdAt: "2026-01-02" },
      { id: "2", name: "a", qty: 5, createdAt: "" },
      { id: "3", name: "c", qty: 1, createdAt: "2026-01-01" },
    ];
    const sorted = sortRows(rows, { field: "qty", direction: "asc" }, sortDefs);
    assert.deepEqual(
      sorted.map((row) => row.id),
      ["3", "2", "1"],
    );
  });

  it("keeps stable order for equal sort values", () => {
    const rows: Row[] = [
      { id: "1", name: "same", qty: 1, createdAt: "2026-01-01" },
      { id: "2", name: "same", qty: 1, createdAt: "2026-01-02" },
    ];
    const sorted = sortRows(rows, { field: "name", direction: "asc" }, sortDefs);
    assert.deepEqual(sorted.map((row) => row.id), ["1", "2"]);
  });

  it("groups rows by key", () => {
    const rows: Row[] = [
      { id: "1", name: "a", qty: 1, createdAt: "2026-01-01" },
      { id: "2", name: "b", qty: 1, createdAt: "2026-01-01" },
      { id: "3", name: "a", qty: 2, createdAt: "2026-01-02" },
    ];
    const groups = groupRows(rows, "name", [
      {
        id: "name",
        label: "Название",
        key: (row) => row.name,
        renderHeader: (key) => key,
      },
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups.find((group) => group.key === "a")?.rows.length, 2);
  });

  it("ignores unknown ids in persisted state", () => {
    const parsed = parseListViewPersisted(
      JSON.stringify({
        hiddenColumns: ["unknown", "hidden"],
        collapsedColumns: ["missing"],
        sort: { field: "unknown", direction: "asc" },
        group: "nope",
      }),
      columns,
      sortDefs,
      ["name"],
    );
    assert.deepEqual(parsed?.hiddenColumns, ["hidden"]);
    assert.deepEqual(parsed?.collapsedColumns, []);
    assert.equal(parsed?.sort, null);
    assert.equal(parsed?.group, null);
  });

  it("returns defaults for broken storage", () => {
    assert.equal(parseListViewPersisted("{not-json", columns, sortDefs, []), null);
  });

  it("compareSortValues handles text desc", () => {
    assert.ok(compareSortValues("b", "a", "desc", "text") < 0);
  });

  it("sorts text numbers naturally", () => {
    const rows: Row[] = [
      { id: "1", name: "a", qty: 1, createdAt: "", number: "OMS-10" },
      { id: "2", name: "a", qty: 1, createdAt: "", number: "OMS-9" },
    ];
    const sorted = sortRows(rows, { field: "number", direction: "asc" }, sortDefs);
    assert.deepEqual(sorted.map((row) => row.id), ["2", "1"]);
  });

  it("default visible columns skip defaultHidden", () => {
    assert.deepEqual(getDefaultVisibleColumnIds(columns), ["number", "name"]);
  });

  it("keeps empty values last when sorting descending", () => {
    const rows: Row[] = [
      { id: "1", name: "a", qty: null, createdAt: "" },
      { id: "2", name: "b", qty: 1, createdAt: "2026-01-01" },
      { id: "3", name: "c", qty: 9, createdAt: "2026-02-01" },
    ];
    assert.deepEqual(
      sortRows(rows, { field: "created", direction: "desc" }, sortDefs).map((row) => row.id),
      ["3", "2", "1"],
    );
    assert.deepEqual(
      sortRows(rows, { field: "qty", direction: "desc" }, sortDefs).map((row) => row.id),
      ["3", "2", "1"],
    );
  });

  it("orders groups by the declared order, unknown keys last", () => {
    const rows: Row[] = [
      { id: "1", name: "Позже", qty: 1, createdAt: "" },
      { id: "2", name: "Другое", qty: 1, createdAt: "" },
      { id: "3", name: "Просрочен", qty: 1, createdAt: "" },
    ];
    const groups = groupRows(rows, "bucket", [
      { id: "bucket", label: "Срок", key: (row) => row.name, renderHeader: (key) => key, order: ["Просрочен", "Позже"] },
    ]);
    assert.deepEqual(groups.map((group) => group.key), ["Просрочен", "Позже", "Другое"]);
  });

  it("builds sort fields from sortable columns after explicit defs", () => {
    const sortable: ListColumnDef<Row>[] = [
      { id: "name", label: "Название", sortType: "text", sortValue: (row) => row.name, render: () => null },
      { id: "qty", label: "Кол-во", sortType: "number", sortValue: (row) => row.qty, render: () => null },
      { id: "plain", label: "Без сортировки", render: () => null },
    ];
    const defs = buildSortDefs(sortable, [
      { id: "created", label: "Создан", type: "date", value: (row) => row.createdAt },
      { id: "name", label: "Название", type: "text", value: (row) => row.name },
    ]);
    assert.deepEqual(defs.map((def) => def.id), ["created", "name", "qty"]);
  });

  it("never restores a hidden locked column from storage", () => {
    const parsed = parseListViewPersisted(JSON.stringify({ hiddenColumns: ["number", "name"] }), columns, sortDefs, []);
    assert.deepEqual(parsed?.hiddenColumns, ["name"]);
  });

  it("cycles header sort asc → desc → default for every field type", () => {
    const defaultSort = { field: "created", direction: "desc" as const };
    assert.deepEqual(nextHeaderSort(null, "qty", defaultSort), { field: "qty", direction: "asc" });
    assert.deepEqual(nextHeaderSort({ field: "name", direction: "desc" }, "qty", defaultSort), {
      field: "qty",
      direction: "asc",
    });
    assert.deepEqual(nextHeaderSort({ field: "qty", direction: "asc" }, "qty", defaultSort), {
      field: "qty",
      direction: "desc",
    });
    assert.deepEqual(nextHeaderSort({ field: "qty", direction: "desc" }, "qty", defaultSort), defaultSort);
    assert.deepEqual(nextHeaderSort({ field: "created", direction: "asc" }, "created", defaultSort), {
      field: "created",
      direction: "desc",
    });
  });

  it("round-trips persisted list view state", () => {
    const visibleIds = ["number", "name"];
    const collapsedIds = ["name"];
    const sort = { field: "name", direction: "asc" as const };
    const group = "name";
    const built = buildListViewPersisted(columns, visibleIds, collapsedIds, sort, group);
    const parsed = parseListViewPersisted(serializeListViewPersisted(built), columns, sortDefs, [group]);
    assert.deepEqual(parsed?.hiddenColumns, built.hiddenColumns);
    assert.deepEqual(parsed?.collapsedColumns, built.collapsedColumns);
    assert.deepEqual(parsed?.sort, built.sort);
    assert.equal(parsed?.group, built.group);
  });

  it("groups rows even when the grouped column is hidden from the table", () => {
    const rows: Row[] = [
      { id: "1", name: "alpha", qty: 1, createdAt: "" },
      { id: "2", name: "beta", qty: 1, createdAt: "" },
      { id: "3", name: "alpha", qty: 2, createdAt: "" },
    ];
    const groups = groupRows(rows, "name", [
      { id: "name", label: "Название", key: (row) => row.name, renderHeader: (key) => key },
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups.find((group) => group.key === "alpha")?.rows.length, 2);
  });
});

describe("list-deadline", () => {
  it("matches overdue only for open documents", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = formatDate(new Date(today.getTime() - 86_400_000));
    assert.equal(deadlineFilterMatch(yesterday, "overdue", true), true);
    assert.equal(deadlineFilterMatch(yesterday, "overdue", false), false);
  });

  it("matches week window with local bare dates", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    const inSevenDays = formatDate(new Date(today.getTime() + 7 * 86_400_000));
    const inEightDays = formatDate(new Date(today.getTime() + 8 * 86_400_000));
    assert.equal(deadlineFilterMatch(todayStr, "week", true), true);
    assert.equal(deadlineFilterMatch(inSevenDays, "week", true), true);
    assert.equal(deadlineFilterMatch(inEightDays, "week", true), false);
  });

  it("assigns deadline buckets relative to today", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    const yesterday = formatDate(new Date(today.getTime() - 86_400_000));
    const inThreeDays = formatDate(new Date(today.getTime() + 3 * 86_400_000));
    const inTenDays = formatDate(new Date(today.getTime() + 10 * 86_400_000));

    assert.equal(deadlineGroupKey(null, true), "Без срока");
    assert.equal(deadlineGroupKey(yesterday, true), "Просрочен");
    assert.equal(deadlineGroupKey(yesterday, false), "Срок прошёл");
    assert.equal(deadlineGroupKey(todayStr, true), "Ближайшие 7 дней");
    assert.equal(deadlineGroupKey(inThreeDays, true), "Ближайшие 7 дней");
    assert.equal(deadlineGroupKey(inTenDays, true), "Позже");
  });
});
