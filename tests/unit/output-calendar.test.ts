import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLocalOutput,
  buildCategoryTree,
  buildOwnerSet,
  computeMonthRange,
  defaultOwnerFilter,
  lastDayOfMonthIso,
  mapOutputCalendarPage,
  monthCell,
  noDateCell,
  openOrdersForProduct,
  outputPassesFilters,
  plantCodesForProduct,
  productVisibleForPlant,
  stockBreakdown,
  stockQuantity,
  type OutputCalendarPage,
} from "@/features/logistics/output-calendar";

const pageFixture = (): OutputCalendarPage => ({
  freeOwnerId: "1",
  categories: [
    { id: "2", parentId: null, name: "ATV" },
    { id: "10", parentId: "2", name: "4x4" },
    { id: "3", parentId: null, name: "Off Road" },
  ],
  products: [
    { id: "1", name: "Force 1100 EFI", unit: "шт", plantId: "5", categoryIds: ["2", "10"] },
    { id: "2", name: "Cross 180", unit: "шт", plantId: "4", categoryIds: ["2"] },
    { id: "99", name: "Orphan Bike", unit: "шт", plantId: null, categoryIds: [] },
  ],
  plants: [{ id: "3" }, { id: "5" }],
  regions: [
    { id: "1", name: "ОАЭ", ownerId: "2" },
    { id: "2", name: "Россия", ownerId: "3" },
  ],
  customerOrders: [
    { id: "10", number: "OMS-10", regionId: "1", ownerId: "20", sequenceNumber: "10" },
    { id: "11", number: "OMS-11", regionId: "2", ownerId: "21", sequenceNumber: "11" },
  ],
  stock: [
    { productId: "1", ownerId: "1", locationKind: "warehouse", locationId: "7", locationSequence: null, quantity: 4 },
    { productId: "1", ownerId: "2", locationKind: "warehouse", locationId: "7", locationSequence: null, quantity: 3 },
    { productId: "1", ownerId: "20", locationKind: "warehouse", locationId: "7", locationSequence: null, quantity: 2 },
  ],
  outputLines: [
    {
      outputId: "100",
      outputNumber: "OUT-A",
      outputSequence: null,
      status: "in_progress",
      expectedEndOn: "2026-11-15",
      productionOrderId: "50",
      productionOrderNumber: "PO-50",
      productionOrderSequence: null,
      plantId: "5",
      productId: "1",
      ownerId: "1",
      quantity: 7,
    },
    {
      outputId: "101",
      outputNumber: "OUT-B",
      outputSequence: null,
      status: "in_progress",
      expectedEndOn: "2026-11-20",
      productionOrderId: "50",
      productionOrderNumber: "PO-50",
      productionOrderSequence: null,
      plantId: "3",
      productId: "1",
      ownerId: "2",
      quantity: 2,
    },
    {
      outputId: "102",
      outputNumber: "OUT-C",
      outputSequence: null,
      status: "draft",
      expectedEndOn: null,
      productionOrderId: "51",
      productionOrderNumber: "PO-51",
      productionOrderSequence: null,
      plantId: "5",
      productId: "1",
      ownerId: "1",
      quantity: 3,
    },
    {
      outputId: "103",
      outputNumber: "OUT-D",
      outputSequence: null,
      status: "in_progress",
      expectedEndOn: "2026-08-10",
      productionOrderId: "52",
      productionOrderNumber: "PO-52",
      productionOrderSequence: null,
      plantId: "5",
      productId: "2",
      ownerId: "1",
      quantity: 1,
    },
  ],
  openOrders: [
    { productionOrderId: "50", number: "PO-50", sequenceNumber: "50", plantId: "5", productId: "1", remaining: 5 },
  ],
});

describe("mapOutputCalendarPage", () => {
  it("maps camelCase payload and drops closed outputs", () => {
    const mapped = mapOutputCalendarPage({
      freeOwnerId: 1,
      categories: [{ id: 2, parentId: null, name: "ATV" }],
      products: [{ id: 1, name: "Force", unit: "шт", plantId: 5, categoryIds: [2, 10] }],
      plants: [{ id: 5 }],
      regions: [{ id: 1, name: "ОАЭ", ownerId: 2 }],
      customerOrders: [{ id: 10, number: "OMS-10", regionId: 1, ownerId: 20, sequenceNumber: 10 }],
      stock: [
        { productId: 1, ownerId: 1, locationKind: "warehouse", locationId: 7, locationSequence: null, quantity: 4 },
        { productId: 1, ownerId: 2, locationKind: "transfer", locationId: 141, locationSequence: 903, quantity: 3 },
      ],
      outputLines: [
        {
          outputId: 100,
          outputNumber: "OUT-100",
          outputSequence: 100,
          status: "draft",
          expectedEndOn: "2026-11-15T00:00:00",
          productionOrderId: 50,
          productionOrderNumber: "PO-50",
          productionOrderSequence: 50,
          plantId: 5,
          productId: 1,
          ownerId: 1,
          quantity: 7,
        },
        {
          outputId: 101,
          outputNumber: "OUT-101",
          outputSequence: null,
          status: "in_progress",
          expectedEndOn: null,
          productionOrderId: 50,
          productionOrderNumber: "PO-50",
          productionOrderSequence: null,
          plantId: 3,
          productId: 1,
          ownerId: 2,
          quantity: 2,
        },
        {
          outputId: 102,
          outputNumber: "OUT-102",
          outputSequence: null,
          status: "done",
          expectedEndOn: "2026-08-01",
          productionOrderId: 50,
          productionOrderNumber: "PO-50",
          productionOrderSequence: null,
          plantId: 5,
          productId: 1,
          ownerId: 1,
          quantity: 9,
        },
      ],
      openOrders: [{ productionOrderId: 50, number: "PO-50", sequenceNumber: 50, plantId: 5, productId: 1, remaining: 5 }],
    });
    assert.equal(mapped.freeOwnerId, "1");
    assert.deepEqual(mapped.products[0].categoryIds, ["2", "10"]);
    assert.deepEqual(mapped.regions[0], { id: "1", name: "ОАЭ", ownerId: "2" });
    assert.deepEqual(mapped.customerOrders[0], {
      id: "10",
      number: "OMS-10",
      regionId: "1",
      ownerId: "20",
      sequenceNumber: "10",
    });
    assert.deepEqual(mapped.stock, [
      { productId: "1", ownerId: "1", locationKind: "warehouse", locationId: "7", locationSequence: null, quantity: 4 },
      { productId: "1", ownerId: "2", locationKind: "transfer", locationId: "141", locationSequence: "903", quantity: 3 },
    ]);
    assert.equal(mapped.outputLines[0]?.outputSequence, "100");
    assert.equal(mapped.outputLines[0]?.productionOrderSequence, "50");
    assert.equal(mapped.outputLines[1]?.outputSequence, null);
    assert.equal(mapped.outputLines.length, 2);
    assert.equal(mapped.outputLines[0]?.expectedEndOn, "2026-11-15");
    assert.equal(mapped.outputLines[0]?.status, "draft");
    assert.equal(mapped.outputLines[1]?.expectedEndOn, null);
    assert.equal(mapped.outputLines[1]?.status, "in_progress");
    assert.deepEqual(mapped.openOrders[0], {
      productionOrderId: "50",
      number: "PO-50",
      sequenceNumber: "50",
      plantId: "5",
      productId: "1",
      remaining: 5,
    });
  });
});

describe("stockBreakdown", () => {
  it("lists stock rows behind Остаток with resolved owners, filtered by owner set", () => {
    const page = pageFixture();
    const all = stockBreakdown("1", page, buildOwnerSet(defaultOwnerFilter(page), page));
    assert.deepEqual(
      all.map((row) => [row.owner.kind, row.quantity]),
      [
        ["free", 4],
        ["region", 3],
        ["order", 2],
      ],
    );
    const regionOnly = stockBreakdown(
      "1",
      page,
      buildOwnerSet({ free: false, regionIds: ["1"], withRegionOrders: false, orderIds: [] }, page),
    );
    assert.equal(regionOnly.length, 1);
    assert.equal(regionOnly[0]?.owner.kind === "region" && regionOnly[0].owner.region.name, "ОАЭ");
  });
});

describe("I/O matrix: приход", () => {
  it("counts draft/in_progress in month; ignores done-like by not including them", () => {
    const page = pageFixture();
    const W = buildOwnerSet(defaultOwnerFilter(page), page);
    const nov = monthCell("1", { year: 2026, month: 11 }, page.outputLines, W, null);
    // OUT-A (7 free) + OUT-B (2 region) when all owners selected
    assert.equal(nov.quantity, 9);
    assert.equal(nov.lines.length, 2);
  });
});

describe("I/O matrix: без срока", () => {
  it("puts null expectedEndOn into no-date cell", () => {
    const page = pageFixture();
    const W = buildOwnerSet(defaultOwnerFilter(page), page);
    const cell = noDateCell("1", page.outputLines, W, null);
    assert.equal(cell.quantity, 3);
    assert.equal(cell.lines[0]?.outputNumber, "OUT-C");
  });
});

describe("I/O matrix: просрочка и диапазон месяцев", () => {
  it("starts the range at the earliest overdue month and runs at least six months", () => {
    const page = pageFixture();
    const today = new Date(2026, 8, 24); // 24 Sep 2026
    const months = computeMonthRange(page.outputLines, today);
    assert.equal(months[0]?.year, 2026);
    assert.equal(months[0]?.month, 8);
    assert.equal(months[months.length - 1]?.month, 2);
    assert.equal(months[months.length - 1]?.year, 2027);
    const W = buildOwnerSet(defaultOwnerFilter(page), page);
    const aug = monthCell("2", { year: 2026, month: 8 }, page.outputLines, W, null);
    assert.equal(aug.quantity, 1);
  });
});

describe("I/O matrix: повтор категории", () => {
  it("places product in each linked category group", () => {
    const page = pageFixture();
    const visible = new Set(page.products.map((p) => p.id));
    const { roots } = buildCategoryTree(page.categories, page.products, visible);
    const atv = roots.find((r) => r.id === "2");
    assert.ok(atv);
    assert.ok(atv.products.some((p) => p.id === "1"));
    const four = atv.children.find((c) => c.id === "10");
    assert.ok(four);
    assert.ok(four.products.some((p) => p.id === "1"));
  });
});

describe("I/O matrix: без категории", () => {
  it("collects products without categoryIds as uncategorized", () => {
    const page = pageFixture();
    const visible = new Set(page.products.map((p) => p.id));
    const { uncategorized } = buildCategoryTree(page.categories, page.products, visible);
    assert.deepEqual(
      uncategorized.map((p) => p.id),
      ["99"],
    );
  });
});

describe("I/O matrix: переключатель заказов региона", () => {
  it("includes the region's order owners only while the switch is on", () => {
    const page = pageFixture();
    const base = { free: false, regionIds: ["1"], orderIds: [] as string[] };
    const on = buildOwnerSet({ ...base, withRegionOrders: true }, page);
    assert.ok(on.has("2"));
    assert.ok(on.has("20"));
    assert.equal(on.has("21"), false);
    assert.equal(stockQuantity("1", page.stock, on), 5);
    const off = buildOwnerSet({ ...base, withRegionOrders: false }, page);
    assert.ok(off.has("2"));
    assert.equal(off.has("20"), false);
    assert.equal(stockQuantity("1", page.stock, off), 3);
  });
});

describe("I/O matrix: двойной путь владельца", () => {
  it("counts order owner once when selected directly and via region switch", () => {
    const page = pageFixture();
    const filter = {
      free: false,
      regionIds: ["1"],
      withRegionOrders: true,
      orderIds: ["10"],
    };
    const W = buildOwnerSet(filter, page);
    assert.equal(W.size, 2); // region 2 + order 20
    assert.ok(W.has("2"));
    assert.ok(W.has("20"));
    assert.equal(stockQuantity("1", page.stock, W), 5); // 3 + 2, not double
  });
});

describe("I/O matrix: фильтр завода", () => {
  it("filters month qty by plant; stock stays owner-only", () => {
    const page = pageFixture();
    const W = buildOwnerSet(defaultOwnerFilter(page), page);
    const novAll = monthCell("1", { year: 2026, month: 11 }, page.outputLines, W, null);
    const novPlt3 = monthCell("1", { year: 2026, month: 11 }, page.outputLines, W, "3");
    assert.equal(novAll.quantity, 9);
    assert.equal(novPlt3.quantity, 2);
    assert.equal(stockQuantity("1", page.stock, W), 9);
    assert.ok(productVisibleForPlant("1", page.outputLines, "3"));
    assert.equal(productVisibleForPlant("2", page.outputLines, "3"), false);
    assert.deepEqual(plantCodesForProduct("1", page.outputLines), ["PLT-3", "PLT-5"]);
  });
});

describe("I/O matrix: осталось разложить и дата месяца", () => {
  it("exposes remaining on open PO and last day of month", () => {
    const page = pageFixture();
    const orders = openOrdersForProduct("1", page.openOrders);
    assert.equal(orders[0]?.remaining, 5);
    assert.equal(orders[0]?.number, "PO-50");
    assert.equal(lastDayOfMonthIso({ year: 2026, month: 11 }), "2026-11-30");
  });
});

describe("applyLocalOutput", () => {
  it("appends an isNew line and drops the open order when remaining hits zero", () => {
    const page = pageFixture();
    const next = applyLocalOutput(page, {
      outputId: "200",
      outputNumber: "Новый выпуск",
      outputSequence: null,
      status: "draft",
      expectedEndOn: "2026-12-31",
      productionOrderId: "50",
      productionOrderNumber: "PO-50",
      productionOrderSequence: null,
      plantId: "5",
      productId: "1",
      ownerId: "1",
      quantity: 5,
    });
    assert.equal(next.outputLines.at(-1)?.isNew, true);
    assert.equal(next.outputLines.at(-1)?.quantity, 5);
    assert.equal(
      next.openOrders.some((order) => order.productionOrderId === "50" && order.productId === "1"),
      false,
    );
  });
});

describe("I/O matrix: флаг новый обходит фильтры", () => {
  it("includes isNew lines even when owner and plant filters exclude them", () => {
    const page = pageFixture();
    const W = new Set(["1"]); // free only
    const fresh: (typeof page.outputLines)[number] = {
      outputId: "999",
      outputNumber: "OUT-NEW",
      outputSequence: null,
      status: "draft",
      expectedEndOn: "2026-12-31",
      productionOrderId: "50",
      productionOrderNumber: "PO-50",
      productionOrderSequence: null,
      plantId: "99",
      productId: "1",
      ownerId: "999",
      quantity: 4,
      isNew: true,
    };
    assert.equal(outputPassesFilters(fresh, W, "5"), true);
    const cell = monthCell("1", { year: 2026, month: 12 }, [...page.outputLines, fresh], W, "5");
    assert.equal(cell.quantity, 4);
    assert.equal(cell.hasFresh, true);
    assert.ok(productVisibleForPlant("1", [...page.outputLines, fresh], "5"));
  });
});
