import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allCategoryGroupIds, buildCategoryTree, descendantCategoryIds } from "@/features/logistics/category-tree";
import {
  applyLocalOutput,
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
  unassignedCell,
  plantFilterOptions,
  buildCalendarColumns,
  daysInMonth,
  defaultIncomingFilter,
  defaultPlantPaymentsFilter,
  incomingFilterChanged,
  incomingOrderOptions,
  monthPeriod,
  moneyPeriodCell,
  moneyUnallocatedCell,
  periodCell,
  plantMoneyRows,
  plantPaymentOptions,
  plantPaymentsFilterChanged,
  regionMoneyRows,
  unpaidPaymentDueDates,
  type OutputCalendarMoneyOrder,
  type OutputCalendarPage,
  type OutputCalendarPayment,
} from "@/features/logistics/output-calendar";

const pageFixture = (): OutputCalendarPage => ({
  freeOwnerId: "1",
  productionCurrency: "CNY",
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
    { id: "1", code: "ae", name: "ОАЭ", ownerId: "2" },
    { id: "2", code: "ru", name: "Россия", ownerId: "3" },
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
      status: "draft",
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
      status: "draft",
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
      status: "draft",
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
  moneyOrders: [],
  payments: [],
});

describe("mapOutputCalendarPage", () => {
  it("maps camelCase payload and drops closed outputs", () => {
    const mapped = mapOutputCalendarPage({
      freeOwnerId: 1,
      categories: [{ id: 2, parentId: null, name: "ATV" }],
      products: [{ id: 1, name: "Force", unit: "шт", plantId: 5, categoryIds: [2, 10] }],
      plants: [{ id: 5 }],
      regions: [
        { id: 1, code: "ae", name: "ОАЭ", ownerId: 2 },
        { id: 2, code: "", name: "Без кода", ownerId: 3 },
      ],
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
          status: "draft",
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
    assert.deepEqual(mapped.regions[0], { id: "1", code: "ae", name: "ОАЭ", ownerId: "2" });
    assert.equal(mapped.regions[1]?.code, "REG-2");
    assert.equal(mapped.productionCurrency, "USD");
    assert.deepEqual(mapped.moneyOrders, []);
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
    assert.equal(mapped.outputLines[1]?.status, "draft");
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
  it("counts draft outputs in month; ignores done-like by not including them", () => {
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

describe("Не распределено", () => {
  it("sums open-order plan not yet in outputs, follows plant filter, not owners", () => {
    const page: OutputCalendarPage = {
      ...pageFixture(),
      openOrders: [
        { productionOrderId: "50", number: "PO-50", sequenceNumber: "50", plantId: "5", productId: "1", remaining: 5 },
        { productionOrderId: "60", number: "PO-60", sequenceNumber: "60", plantId: "8", productId: "1", remaining: 2 },
        { productionOrderId: "61", number: "PO-61", sequenceNumber: "61", plantId: "8", productId: "99", remaining: 4 },
      ],
    };
    assert.equal(unassignedCell("1", page.openOrders, null).quantity, 7);
    assert.deepEqual(
      unassignedCell("1", page.openOrders, "8").orders.map((o) => o.number),
      ["PO-60"],
    );
    assert.equal(unassignedCell("2", page.openOrders, null).quantity, 0);
    assert.ok(plantFilterOptions(page.outputLines, page.openOrders).includes("8"));
    assert.ok(productVisibleForPlant("99", page.outputLines, "8", page.openOrders));
    assert.equal(productVisibleForPlant("99", page.outputLines, "8"), false);
  });
});

describe("category collapse helpers", () => {
  it("lists nested subcategories and all group ids", () => {
    const page: OutputCalendarPage = {
      ...pageFixture(),
      categories: [
        { id: "2", parentId: null, name: "ATV" },
        { id: "10", parentId: "2", name: "4x4" },
        { id: "11", parentId: "10", name: "Sport" },
      ],
      products: [{ id: "1", name: "Force", unit: "шт", plantId: "5", categoryIds: ["11"] }],
    };
    const { roots } = buildCategoryTree(page.categories, page.products, new Set(["1"]));
    assert.deepEqual(descendantCategoryIds(roots[0]), ["10", "11"]);
    assert.deepEqual(allCategoryGroupIds(page.categories), ["2", "10", "11", "__uncategorized"]);
  });
});

const RATES = { USD: 1, CNY: 7.12, EUR: 0.86 };

const moneyOrder = (patch: Partial<OutputCalendarMoneyOrder> & Pick<OutputCalendarMoneyOrder, "id">): OutputCalendarMoneyOrder => ({
  kind: "production_order",
  number: `PO-${patch.id}`,
  sequenceNumber: patch.id,
  status: "in_progress",
  plantId: "2",
  regionId: null,
  currencyCode: "CNY",
  amount: null,
  rates: RATES,
  lineTotals: [],
  ...patch,
});

const payment = (
  id: string,
  orderId: string,
  dueOn: string,
  amount: number,
  status: OutputCalendarPayment["status"] = "planned",
): OutputCalendarPayment => ({ id, orderId, dueOn, amount, status });

const moneyFixture = (): OutputCalendarPage => ({
  ...pageFixture(),
  moneyOrders: [
    // PLT-2, CNY: 10 000 by lines; 3000 invoiced overdue in Sep, 2000 planned in Oct, 1000 paid.
    moneyOrder({ id: "61", lineTotals: [{ currencyCode: "CNY", total: 10_000 }] }),
    // PLT-2, USD order, amount 1500 USD; 500 USD planned in Oct.
    moneyOrder({ id: "62", currencyCode: "USD", amount: 1500, lineTotals: [{ currencyCode: "CNY", total: 7120 }] }),
    // PLT-4 cancelled — never shown.
    moneyOrder({ id: "63", plantId: "4", status: "cancelled", amount: 900 }),
    // PLT-5 fully paid.
    moneyOrder({ id: "64", plantId: "5", amount: 400 }),
    // Region 1 (ae): 800 planned in Oct, 200 unallocated.
    moneyOrder({ id: "71", kind: "customer_order", number: "OMS-71", plantId: null, regionId: "1", amount: 1000 }),
    // Region 1: payments exceed the amount — contributes 0 to «Не распределено».
    moneyOrder({ id: "72", kind: "customer_order", number: "OMS-72", plantId: null, regionId: "1", amount: 100 }),
    // Region 2 (ru): EUR, 86 EUR planned on 5 Oct.
    moneyOrder({ id: "73", kind: "customer_order", number: "OMS-73", plantId: null, regionId: "2", currencyCode: "EUR", amount: 86 }),
  ],
  payments: [
    payment("1", "61", "2026-09-10", 3000, "invoiced"),
    payment("2", "61", "2026-10-12", 2000),
    payment("3", "61", "2026-08-01", 1000, "paid"),
    payment("4", "62", "2026-10-12", 500),
    payment("5", "63", "2026-07-01", 900),
    payment("6", "64", "2026-09-01", 400, "paid"),
    payment("7", "71", "2026-10-20", 800),
    payment("8", "72", "2026-10-21", 150, "invoiced"),
    payment("9", "73", "2026-10-05", 86),
  ],
});

const TODAY = "2026-09-25";
const OCT = { year: 2026, month: 10 };
const SEP = { year: 2026, month: 9 };

describe("Деньги: платежи заводам", () => {
  it("shows one row per plant with unpaid payments or unallocated money, cancelled and settled orders excluded", () => {
    const rows = plantMoneyRows(moneyFixture(), defaultPlantPaymentsFilter());
    assert.deepEqual(
      rows.map((row) => row.code),
      ["PLT-2"],
    );
    assert.deepEqual(plantPaymentOptions(moneyFixture()), ["2"]);
  });

  it("sums unpaid payments of the period in the production currency by each order snapshot", () => {
    const [row] = plantMoneyRows(moneyFixture(), defaultPlantPaymentsFilter());
    assert.ok(row);
    const oct = moneyPeriodCell(row, monthPeriod(OCT), [], "CNY", TODAY);
    assert.equal(Math.round(oct.amount), 2000 + 3560);
    assert.equal(oct.overdue, false);
    assert.deepEqual(
      oct.entries.map((entry) => entry.order.number),
      ["PO-61", "PO-62"],
    );
    const sep = moneyPeriodCell(row, monthPeriod(SEP), [], "CNY", TODAY);
    assert.equal(sep.amount, 3000);
    assert.equal(sep.overdue, true);
    const aug = moneyPeriodCell(row, monthPeriod({ year: 2026, month: 8 }), [], "CNY", TODAY);
    assert.equal(aug.amount, 0, "paid payments are not in the calendar");
  });

  it("follows the production currency", () => {
    const [row] = plantMoneyRows(moneyFixture(), defaultPlantPaymentsFilter());
    assert.ok(row);
    const oct = moneyPeriodCell(row, monthPeriod(OCT), [], "USD", TODAY);
    assert.ok(Math.abs(oct.amount - (2000 / 7.12 + 500)) < 1e-9);
  });

  it("puts Σ max(0, unallocated) into «Не распределено»", () => {
    const [row] = plantMoneyRows(moneyFixture(), defaultPlantPaymentsFilter());
    assert.ok(row);
    const cell = moneyUnallocatedCell(row, "CNY");
    // PO-61: 10 000 − 6000 = 4000 CNY; PO-62: 1500 − 500 = 1000 USD = 7120 CNY.
    assert.equal(Math.round(cell.amount), 4000 + 7120);
    assert.deepEqual(
      cell.entries.map((entry) => [entry.order.number, Math.round(entry.rest)]),
      [
        ["PO-61", 4000],
        ["PO-62", 1000],
      ],
    );
  });
});

describe("Деньги: поступления от клиентов", () => {
  it("groups customer orders by region code; overpaid orders add 0", () => {
    const rows = regionMoneyRows(moneyFixture(), defaultIncomingFilter());
    assert.deepEqual(
      rows.map((row) => row.code),
      ["ae", "ru"],
    );
    const ae = rows[0];
    assert.ok(ae);
    assert.equal(moneyUnallocatedCell(ae, "CNY").amount, 200);
    assert.equal(moneyPeriodCell(ae, monthPeriod(OCT), [], "CNY", TODAY).amount, 950);
    const ru = rows[1];
    assert.ok(ru);
    assert.ok(Math.abs(moneyPeriodCell(ru, monthPeriod(OCT), [], "CNY", TODAY).amount - 712) < 1e-9);
    assert.deepEqual(
      incomingOrderOptions(moneyFixture()).map((order) => order.number),
      ["OMS-71", "OMS-72", "OMS-73"],
    );
  });
});

describe("Деньги: фильтры панелей независимы", () => {
  it("a plant filter does not touch incoming rows and vice versa", () => {
    const page = moneyFixture();
    const plantFilter = { hiddenPlantIds: ["2"], hiddenStatuses: [] };
    assert.equal(plantMoneyRows(page, plantFilter).length, 0);
    assert.equal(regionMoneyRows(page, defaultIncomingFilter()).length, 2);
    assert.ok(plantPaymentsFilterChanged(plantFilter));
    const incoming = { ...defaultIncomingFilter(), hiddenRegionIds: ["2"], hiddenOrderIds: ["72"] };
    assert.deepEqual(
      regionMoneyRows(page, incoming).map((row) => row.code),
      ["ae"],
    );
    assert.equal(plantMoneyRows(page, defaultPlantPaymentsFilter()).length, 1);
    assert.ok(incomingFilterChanged(incoming));
    assert.equal(incomingFilterChanged(defaultIncomingFilter()), false);
  });

  it("status filter hides payments of that status only", () => {
    const [row] = plantMoneyRows(moneyFixture(), defaultPlantPaymentsFilter());
    assert.ok(row);
    assert.equal(moneyPeriodCell(row, monthPeriod(SEP), ["invoiced"], "CNY", TODAY).amount, 0);
    assert.equal(moneyPeriodCell(row, monthPeriod(OCT), ["invoiced"], "CNY", TODAY).entries.length, 2);
  });
});

describe("Деньги: диапазон месяцев", () => {
  it("overdue unpaid payments of live orders widen the range back; cancelled orders do not", () => {
    const page = moneyFixture();
    const dates = unpaidPaymentDueDates(page);
    assert.equal(dates.includes("2026-07-01"), false, "cancelled PO-63");
    assert.equal(dates.includes("2026-08-01"), false, "paid");
    const withOld: OutputCalendarPage = {
      ...page,
      payments: [...page.payments, payment("10", "61", "2026-06-15", 10)],
    };
    const months = computeMonthRange([], new Date(2026, 8, 25), unpaidPaymentDueDates(withOld));
    assert.deepEqual(months[0], { year: 2026, month: 6 });
    const later = computeMonthRange([], new Date(2026, 8, 25), ["2027-06-01"]);
    assert.deepEqual(later.at(-1), { year: 2027, month: 6 });
  });
});

describe("Раскрытие месяца", () => {
  it("expands a month into every day, empty days included", () => {
    const months = [SEP, OCT, { year: 2026, month: 11 }];
    const columns = buildCalendarColumns(months, new Set([2026 * 12 + 10]));
    assert.equal(columns.length, 1 + 31 + 1);
    assert.equal(columns[1]?.kind, "day");
    assert.equal(columns[1]?.kind === "day" && columns[1].iso, "2026-10-01");
    assert.equal(columns[31]?.kind === "day" && columns[31].iso, "2026-10-31");
    assert.equal(daysInMonth({ year: 2028, month: 2 }), 29);
    const two = buildCalendarColumns(months, new Set([2026 * 12 + 9, 2026 * 12 + 11]));
    assert.equal(two.length, 30 + 1 + 30);
  });

  it("days add up to the collapsed month for products and money rows", () => {
    const page = moneyFixture();
    const W = buildOwnerSet(defaultOwnerFilter(page), page);
    const nov = { year: 2026, month: 11 };
    const days = buildCalendarColumns([nov], new Set([2026 * 12 + 11]));
    const productDays = days.reduce((sum, column) => sum + periodCell("1", column.period, page.outputLines, W, null).quantity, 0);
    assert.equal(productDays, monthCell("1", nov, page.outputLines, W, null).quantity);
    assert.equal(productDays, 9);

    const [row] = plantMoneyRows(page, defaultPlantPaymentsFilter());
    assert.ok(row);
    const octDays = buildCalendarColumns([OCT], new Set([2026 * 12 + 10]));
    const moneyDays = octDays.reduce((sum, column) => sum + moneyPeriodCell(row, column.period, [], "CNY", TODAY).amount, 0);
    assert.ok(Math.abs(moneyDays - moneyPeriodCell(row, monthPeriod(OCT), [], "CNY", TODAY).amount) < 1e-9);
    const twelfth = octDays.find((column) => column.kind === "day" && column.day === 12);
    assert.ok(twelfth);
    assert.equal(Math.round(moneyPeriodCell(row, twelfth.period, [], "CNY", TODAY).amount), 5560);
  });

  it("a moved payment lands in its new day", () => {
    const page = moneyFixture();
    const moved: OutputCalendarPage = {
      ...page,
      payments: page.payments.map((p) => (p.id === "2" ? { ...p, dueOn: "2026-10-27" } : p)),
    };
    const [row] = plantMoneyRows(moved, defaultPlantPaymentsFilter());
    assert.ok(row);
    const day = (iso: string) => moneyPeriodCell(row, { from: iso, to: iso }, [], "CNY", TODAY).amount;
    assert.equal(day("2026-10-27"), 2000);
    assert.equal(Math.round(day("2026-10-12")), 3560);
  });
});

describe("mapOutputCalendarPage: деньги", () => {
  it("maps money orders and payments", () => {
    const mapped = mapOutputCalendarPage({
      productionCurrency: "CNY",
      moneyOrders: [
        {
          id: 61,
          kind: "production_order",
          number: "PO-61",
          sequenceNumber: 61,
          status: "in_progress",
          plantId: 2,
          regionId: null,
          currencyCode: "CNY",
          amount: null,
          rates: { USD: 1, CNY: "7.12" },
          lineTotals: [{ currencyCode: "CNY", total: "10000.000000" }],
        },
      ],
      payments: [
        { id: 1, orderId: 61, dueOn: "2026-09-10", amount: "3000.0000", status: "invoiced" },
        { id: 2, orderId: 61, dueOn: "2026-09-11", amount: 1, status: "bogus" },
      ],
    });
    assert.equal(mapped.productionCurrency, "CNY");
    assert.deepEqual(mapped.moneyOrders[0]?.rates, { USD: 1, CNY: 7.12 });
    assert.equal(mapped.moneyOrders[0]?.plantId, "2");
    assert.deepEqual(mapped.moneyOrders[0]?.lineTotals, [{ currencyCode: "CNY", total: 10000 }]);
    assert.deepEqual(mapped.payments, [{ id: "1", orderId: "61", dueOn: "2026-09-10", amount: 3000, status: "invoiced" }]);
  });
});
