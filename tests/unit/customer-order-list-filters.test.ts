import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  customerOrderFilters,
  customerOrderPaymentState,
  customerOrderSourceKey,
  customerOrderSourceLabel,
  customerOrderTenantLabel,
  matchesCustomerOrderText,
  nextUnpaidDueOn,
  NO_VALUE,
  parseOrderNumbers,
} from "@/features/logistics/customer-order-list-filters";
import type { CustomerOrderListRow } from "@/features/logistics/logistics-list-types";
import { applyListFilters, buildListFilterOptions, type ListFilterState } from "@/features/logistics/ui/list/list-filters";

const row = (patch: Partial<CustomerOrderListRow> = {}): CustomerOrderListRow => ({
  id: "1",
  sequenceNumber: "12",
  number: "OMS-12",
  status: "in_progress",
  expectedEndOn: "2026-10-20",
  createdAt: "2026-10-01T09:00:00",
  description: "Оформлено из корзины",
  products: [{ productId: "7", quantity: 2, productName: "Sport 250" }],
  ordered: 2,
  reserved: 0,
  shipped: 0,
  openToReserve: 2,
  createdBy: "Иван Петров",
  regionId: "1",
  regionCode: "AE",
  tenants: [{ id: "tenant-sharmax-ae", name: "Sharmax UAE" }],
  sourceKind: "plant",
  sourceId: "4",
  payments: [],
  money: null,
  completedAt: null,
  positions: 1,
  ...patch,
});

const pick = (rows: CustomerOrderListRow[], state: ListFilterState) =>
  applyListFilters(rows, customerOrderFilters, state).map((item) => item.id);

const filterDef = (id: string) => {
  const def = customerOrderFilters.find((item) => item.id === id);
  assert.ok(def && def.kind === "multi", `multi filter ${id}`);
  return def;
};

describe("customerOrderPaymentState", () => {
  it("derives the state from the payment schedule", () => {
    assert.equal(customerOrderPaymentState([]), "none");
    assert.equal(customerOrderPaymentState([{ dueOn: "2026-10-01", status: "invoiced", amount: 10 }]), "unpaid");
    assert.equal(
      customerOrderPaymentState([
        { dueOn: "2026-10-01", status: "paid", amount: 10 },
        { dueOn: "2026-11-01", status: "planned", amount: 20 },
      ]),
      "partial",
    );
    assert.equal(customerOrderPaymentState([{ dueOn: "2026-10-01", status: "paid", amount: 10 }]), "paid");
  });

  it("finds the earliest unpaid due date", () => {
    assert.equal(nextUnpaidDueOn([]), null);
    assert.equal(
      nextUnpaidDueOn([
        { dueOn: "2026-09-01", status: "paid", amount: 10 },
        { dueOn: "2026-12-01", status: "planned", amount: 20 },
        { dueOn: "2026-11-01", status: "invoiced", amount: 30 },
      ]),
      "2026-11-01",
    );
  });
});

describe("parseOrderNumbers", () => {
  it("accepts codes and bare numbers separated by commas or spaces", () => {
    assert.deepEqual([...parseOrderNumbers("OMS-12, 15  oms-007;x")], ["12", "15", "7"]);
    assert.equal(parseOrderNumbers("  ").size, 0);
  });
});

describe("customer order source and tenant", () => {
  it("keys and labels plant, hub and missing source", () => {
    assert.equal(customerOrderSourceKey(row()), "plant:4");
    assert.equal(customerOrderSourceKey(row({ sourceKind: null, sourceId: null })), NO_VALUE);
    assert.equal(customerOrderSourceLabel("plant:4"), "PLT-4");
    assert.equal(customerOrderSourceLabel("hub:2"), "WH-2");
    assert.equal(customerOrderSourceLabel(NO_VALUE), "Без источника");
  });

  it("labels tenants of the order region", () => {
    assert.equal(customerOrderTenantLabel(row()), "Sharmax UAE");
    assert.equal(customerOrderTenantLabel(row({ tenants: [] })), "Без тенанта");
  });
});

describe("matchesCustomerOrderText", () => {
  const empty = { search: "", description: "", numbers: "" };

  it("searches number, description and products", () => {
    assert.equal(matchesCustomerOrderText(row(), empty), true);
    assert.equal(matchesCustomerOrderText(row(), { ...empty, search: "sport" }), true);
    assert.equal(matchesCustomerOrderText(row(), { ...empty, search: "oms-12" }), true);
    assert.equal(matchesCustomerOrderText(row(), { ...empty, search: "nothing" }), false);
  });

  it("filters by description and order numbers", () => {
    assert.equal(matchesCustomerOrderText(row(), { ...empty, description: "корзин" }), true);
    assert.equal(matchesCustomerOrderText(row(), { ...empty, description: "склад" }), false);
    assert.equal(matchesCustomerOrderText(row(), { ...empty, numbers: "OMS-3, 12" }), true);
    assert.equal(matchesCustomerOrderText(row(), { ...empty, numbers: "OMS-3" }), false);
  });
});

describe("customerOrderFilters", () => {
  const ae = row({ id: "ae" });
  const ru = row({
    id: "ru",
    regionId: "2",
    regionCode: "RU",
    tenants: [{ id: "tenant-globaldrive", name: "Globaldrive" }],
    sourceKind: "hub",
    sourceId: "3",
  });
  const de = row({ id: "de", regionId: "8", regionCode: "DE", tenants: [], sourceKind: null, sourceId: null });
  const rows = [ae, ru, de];

  it("selects several regions and tenants at once, combining filters with AND", () => {
    assert.deepEqual(pick(rows, { region: ["1", "2"] }), ["ae", "ru"]);
    assert.deepEqual(pick(rows, { region: ["1", "2"], tenant: ["tenant-globaldrive"] }), ["ru"]);
  });

  it("offers an empty option for orders without tenant or source", () => {
    assert.deepEqual(pick(rows, { tenant: [NO_VALUE] }), ["de"]);
    assert.deepEqual(pick(rows, { source: [NO_VALUE, "hub:3"] }), ["ru", "de"]);
    const tenantOptions = buildListFilterOptions(filterDef("tenant"), rows).map((option) => option.label);
    assert.deepEqual(tenantOptions, ["Без тенанта", "Globaldrive", "Sharmax UAE"]);
    const regionOptions = buildListFilterOptions(filterDef("region"), rows).map((option) => option.label);
    assert.deepEqual(regionOptions, ["AE", "DE", "RU"]);
  });

  it("matches closed orders by the «Закрыт» status option", () => {
    assert.deepEqual(pick([row({ id: "c", status: "closed" }), ae], { status: ["done"] }), ["c"]);
  });

  it("filters by payment state and the next unpaid due date", () => {
    const partial = row({
      id: "p",
      payments: [
        { dueOn: "2026-10-05", status: "paid", amount: 10 },
        { dueOn: "2026-11-10", status: "invoiced", amount: 20 },
      ],
    });
    assert.deepEqual(pick([partial, ae], { payment: ["partial", "paid"] }), ["p"]);
    assert.deepEqual(pick([partial, ae], { payment: ["none"] }), ["ae"]);
    assert.deepEqual(pick([partial, ae], { paymentDue: { from: "2026-11-01", to: "2026-11-30" } }), ["p"]);
    assert.deepEqual(pick([partial, ae], { paymentDue: { from: "2026-10-01", to: "2026-10-31" } }), []);
  });

  it("keeps only open orders with unfulfilled quantity under the flag", () => {
    assert.deepEqual(pick([ae, row({ id: "done", status: "done" })], { unfulfilled: true }), ["ae"]);
  });
});
