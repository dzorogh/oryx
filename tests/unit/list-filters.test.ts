import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyListFilters,
  buildListFilterOptions,
  describeListFilter,
  isListFilterActive,
  matchesListFilter,
  rowDateKey,
  type ListFilterDef,
  type ListMultiFilterDef,
} from "@/features/logistics/ui/list/list-filters";
import { deadlineBucketFilter, lineCountFilter, placeCodeFilter, productFilter } from "@/features/logistics/ui/list/list-filter-defs";

type Row = {
  id: string;
  plantId: string;
  status: string;
  createdAt: string;
  expectedEndOn: string | null;
  qty: number;
  products: Array<{ productId: string; quantity: number; productName?: string | null }>;
};

const rows: Row[] = [
  {
    id: "a",
    plantId: "2",
    status: "draft",
    createdAt: "2026-10-01T09:00:00",
    expectedEndOn: "2026-10-20",
    qty: 5,
    products: [
      { productId: "p1", quantity: 2, productName: "Квадроцикл" },
      { productId: "p2", quantity: 3, productName: "Багги" },
    ],
  },
  {
    id: "b",
    plantId: "10",
    status: "done",
    createdAt: "2026-10-05T18:30:00",
    expectedEndOn: null,
    qty: -4,
    products: [{ productId: "p2", quantity: 1, productName: "Багги" }],
  },
  {
    id: "c",
    plantId: "2",
    status: "cancelled",
    createdAt: "2026-09-28T12:00:00",
    expectedEndOn: "2026-09-30",
    qty: 0,
    products: [],
  },
];

const plant = placeCodeFilter<Row>("plant", "Завод", "plant", (row) => row.plantId);
const product = productFilter<Row>((row) => row.products);
const status: ListMultiFilterDef<Row> = {
  kind: "multi",
  id: "status",
  label: "Статус",
  options: [
    { value: "draft", label: "Черновик" },
    { value: "done", label: "Готов" },
    { value: "cancelled", label: "Отменён" },
  ],
  values: (row) => row.status,
};
const created: ListFilterDef<Row> = { kind: "dateRange", id: "created", label: "Создан", value: (row) => row.createdAt };
const change: ListFilterDef<Row> = { kind: "numberRange", id: "change", label: "Изменение", signed: true, value: (row) => row.qty };
const hasLines: ListFilterDef<Row> = { kind: "flag", id: "lines", label: "С товарами", match: (row) => row.products.length > 0 };

const ids = (list: Row[]) => list.map((row) => row.id);

describe("list filters", () => {
  it("treats empty values as inactive and keeps every row", () => {
    assert.equal(isListFilterActive(plant, []), false);
    assert.equal(isListFilterActive(created, { from: "", to: "" }), false);
    assert.equal(isListFilterActive(change, { from: " ", to: "abc" }), false);
    assert.equal(isListFilterActive(hasLines, false), false);
    assert.deepEqual(ids(applyListFilters(rows, [plant, created, change, hasLines], {})), ["a", "b", "c"]);
  });

  it("multi filter matches any selected value, including array values", () => {
    assert.deepEqual(ids(applyListFilters(rows, [plant], { plant: ["2"] })), ["a", "c"]);
    assert.deepEqual(ids(applyListFilters(rows, [product], { product: ["p2"] })), ["a", "b"]);
    assert.deepEqual(ids(applyListFilters(rows, [product], { product: ["p1", "missing"] })), ["a"]);
  });

  it("date range compares calendar days inclusively", () => {
    assert.deepEqual(ids(applyListFilters(rows, [created], { created: { from: "2026-10-01", to: "2026-10-05" } })), [
      "a",
      "b",
    ]);
    assert.deepEqual(ids(applyListFilters(rows, [created], { created: { from: "", to: "2026-09-30" } })), ["c"]);
    assert.equal(rowDateKey("2026-10-20"), "2026-10-20");
    assert.equal(rowDateKey(null), null);
  });

  it("date range excludes rows without a date", () => {
    const deadline: ListFilterDef<Row> = { kind: "dateRange", id: "d", label: "Срок", value: (row) => row.expectedEndOn };
    assert.deepEqual(ids(applyListFilters(rows, [deadline], { d: { from: "2026-01-01", to: "" } })), ["a", "c"]);
  });

  it("number range accepts comma decimals and negative bounds", () => {
    assert.deepEqual(ids(applyListFilters(rows, [change], { change: { from: "-5", to: "0" } })), ["b", "c"]);
    assert.deepEqual(ids(applyListFilters(rows, [change], { change: { from: "0,5", to: "" } })), ["a"]);
    const lines = lineCountFilter<Row>((row) => row.products);
    assert.deepEqual(ids(applyListFilters(rows, [lines], { lineCount: { from: "2", to: "" } })), ["a"]);
  });

  it("flag filter keeps only matching rows", () => {
    assert.equal(matchesListFilter(hasLines, true, rows[2]), false);
    assert.deepEqual(ids(applyListFilters(rows, [hasLines], { lines: true })), ["a", "b"]);
  });

  it("combines filters with AND and can skip one filter for facet counts", () => {
    const state = { plant: ["2"], status: ["done"] };
    assert.deepEqual(ids(applyListFilters(rows, [plant, status], state)), []);
    assert.deepEqual(ids(applyListFilters(rows, [plant, status], state, "status")), ["a", "c"]);
  });

  it("builds options with counts, fixed order first and numeric sort for codes", () => {
    const plantOptions = buildListFilterOptions(plant, rows);
    assert.deepEqual(
      plantOptions.map((option) => [option.value, option.count]),
      [
        ["2", 2],
        ["10", 1],
      ],
    );
    assert.match(plantOptions[0].label, /2$/);

    const statusOptions = buildListFilterOptions(status, rows.slice(0, 2));
    assert.deepEqual(
      statusOptions.map((option) => option.value),
      ["draft", "done"],
    );

    const productOptions = buildListFilterOptions(product, rows);
    assert.deepEqual(
      productOptions.map((option) => [option.label, option.count]),
      [
        ["Багги", 2],
        ["Квадроцикл", 1],
      ],
    );
  });

  it("keeps selected options visible even with zero rows", () => {
    const options = buildListFilterOptions(status, [rows[0]], ["cancelled"]);
    assert.deepEqual(
      options.map((option) => [option.value, option.count]),
      [
        ["draft", 1],
        ["cancelled", 0],
      ],
    );
  });

  it("describes active filters for chips", () => {
    const options = buildListFilterOptions(status, rows);
    assert.equal(describeListFilter(status, ["draft"], options), "Статус: Черновик");
    assert.equal(describeListFilter(status, ["draft", "done", "cancelled"], options), "Статус: Черновик, Готов +1");
    assert.equal(describeListFilter(created, { from: "2026-10-01", to: "2026-10-05" }), "Создан: 01.10.2026 – 05.10.2026");
    assert.equal(describeListFilter(created, { from: "2026-10-01", to: "" }), "Создан: с 01.10.2026");
    assert.equal(describeListFilter(change, { from: "", to: "-1" }), "Изменение: до -1");
    assert.equal(describeListFilter(change, { from: "2", to: "x" }), "Изменение: от 2");
    assert.equal(describeListFilter(hasLines, true), "С товарами");
  });

  it("deadline bucket filter follows the deadline grouping", () => {
    const bucket = deadlineBucketFilter<Row>((value) => value !== "done" && value !== "cancelled");
    assert.deepEqual(ids(applyListFilters(rows, [bucket], { deadlineBucket: ["Без срока"] })), ["b"]);
    assert.deepEqual(ids(applyListFilters(rows, [bucket], { deadlineBucket: ["Срок прошёл"] })), ["c"]);
  });
});
