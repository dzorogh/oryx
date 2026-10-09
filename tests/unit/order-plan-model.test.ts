import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapLogisticsPayload } from "@/features/logistics/logistics-api";
import type { CustomerOrderLine, ProductionOrder } from "@/features/logistics/logistics-types";
import {
  actionShortage,
  buildOwnerResolver,
  buildPlaceIndex,
  buildPlanSummary,
  buildProduceRows,
  buildProductPlans,
  defaultPlanId,
  planProblems,
  type PlaceInfo,
} from "@/features/logistics/order-plan/order-plan-model";
import {
  mapOrderPlanPayload,
  type OrderPlan,
  type OrderPlanAction,
  type OrderPlanPayload,
} from "@/features/logistics/order-plan/order-plan-types";

const snapshot = mapLogisticsPayload({}).snapshot;

const place = (locationId: string, kind: PlaceInfo["kind"], status: string | null = null): PlaceInfo => ({
  locationId,
  kind,
  entityId: locationId,
  code: `#${locationId}`,
  hint: null,
  plantId: null,
  status,
  goneLabel: null,
  href: null,
  order: Number(locationId),
});

const places = new Map<string, PlaceInfo>([
  ["5", place("5", "warehouse")],
  ["70", place("70", "production_order", "cancelled")],
]);

const action = (overrides: Partial<OrderPlanAction>): OrderPlanAction => ({
  id: "1",
  kind: "reserve",
  variantId: "2",
  quantity: 6,
  locationId: "5",
  ownerId: "1",
  plantId: null,
  available: 4,
  resultDocumentId: null,
  resultKind: null,
  resultNumber: null,
  resultSequence: null,
  ...overrides,
});

const plan = (overrides: Partial<OrderPlan>): OrderPlan => ({
  id: "1",
  name: "План 1",
  createdAt: "2026-09-24T10:00:00Z",
  updatedAt: "2026-09-24T10:00:00Z",
  launchedAt: null,
  archivedAt: null,
  launchedCoverage: null,
  actions: [],
  ...overrides,
});

const line: CustomerOrderLine = {
  id: "l1",
  orderId: "10",
  productId: "2",
  quantity: 10,
  productName: "Cross 180 RX",
  productUnit: "шт",
};

const payload = (ordered: number, warehouse: number): OrderPlanPayload => ({
  coverage: [
    {
      variantId: "2",
      ordered,
      shipped: 0,
      warehouse,
      transfer: 0,
      output: 0,
      places: warehouse > 0 ? [{ kind: "warehouse", locationId: "5", quantity: warehouse, documents: [] }] : [],
    },
  ],
  sources: [],
  plans: [],
});

describe("order plan model", () => {
  it("reserve shortage is quantity − available on a draft and 0 on a launched plan", () => {
    const reserve = action({ quantity: 6, available: 4 });
    assert.equal(actionShortage(reserve, places, false), 2);
    assert.equal(actionShortage(reserve, places, true), 0);
  });

  it("produce into a cancelled PO counts as full shortage", () => {
    const produce = action({ kind: "produce", locationId: "70", ownerId: null, available: null, quantity: 3 });
    assert.equal(actionShortage(produce, places, false), 3);
  });

  it("remaining below zero counts as excess in planProblems", () => {
    const draft = plan({ actions: [action({ quantity: 4, available: 18 })] });
    const products = buildProductPlans({ snapshot, lines: [line], payload: payload(10, 8), plan: draft, places });
    assert.equal(products[0]?.remaining, -2);
    assert.equal(products[0]?.excess, 2);
    const problems = planProblems(products, false);
    assert.equal(problems.excess, 1);
    assert.equal(problems.shortages, 0);
    assert.equal(problems.firstVariantId, "2");
  });

  it("a product already covered, with no plan actions, is covered and not excess", () => {
    const products = buildProductPlans({ snapshot, lines: [line], payload: payload(10, 10), plan: plan({}), places });
    assert.equal(products[0]?.isCovered, true);
    assert.equal(products[0]?.excess, 0);
    assert.equal(products[0]?.remaining, 0);
    assert.deepEqual(planProblems(products, false), { shortages: 0, excess: 0, firstVariantId: null });
  });

  it("reserve above the order before the plan is not excess and does not block launch", () => {
    const products = buildProductPlans({ snapshot, lines: [line], payload: payload(10, 12), plan: plan({}), places });
    assert.equal(products[0]?.isCovered, true);
    assert.equal(products[0]?.excess, 0);
    assert.equal(products[0]?.remaining, 0);
    assert.equal(products[0]?.bar.overflow, 0);
    assert.deepEqual(planProblems(products, false), { shortages: 0, excess: 0, firstVariantId: null });
  });

  it("excess added by the plan is min(plan, have + plan − ordered)", () => {
    const draft = plan({ actions: [action({ quantity: 4, available: 18 })] });
    const products = buildProductPlans({ snapshot, lines: [line], payload: payload(10, 8), plan: draft, places });
    assert.equal(products[0]?.excess, Math.min(4, 8 + 4 - 10));
    assert.equal(products[0]?.remaining, -2);
    assert.equal(products[0]?.isCovered, false);
    assert.equal(products[0]?.bar.overflow, 2);

    const alreadyOver = buildProductPlans({
      snapshot,
      lines: [line],
      payload: payload(10, 12),
      plan: plan({ actions: [action({ quantity: 3, available: 18 })] }),
      places,
    });
    assert.equal(alreadyOver[0]?.excess, Math.min(3, 12 + 3 - 10));
    assert.equal(alreadyOver[0]?.remaining, -3);
    assert.equal(alreadyOver[0]?.isCovered, false);
    assert.equal(alreadyOver[0]?.bar.overflow, 3);
    assert.equal(planProblems(alreadyOver, false).excess, 1);
  });

  it("a launched plan reads launchedCoverage, not live coverage", () => {
    const launched = plan({
      launchedAt: "2026-09-24T12:00:00Z",
      launchedCoverage: mapOrderPlanPayload({
        plans: [{ launchedCoverage: [{ variantId: 2, ordered: 10, shipped: 0, warehouse: 1, transfer: 0, output: 0 }] }],
      }).plans[0]!.launchedCoverage,
      actions: [action({ quantity: 4, available: null })],
    });
    const [product] = buildProductPlans({ snapshot, lines: [line], payload: payload(10, 10), plan: launched, places });
    assert.equal(product?.have, 1);
    assert.equal(product?.remaining, 5);
    assert.deepEqual(
      product?.haveGroups.map((group) => [group.kind, group.total, group.rows[0]?.place]),
      [["warehouse", 1, null]],
    );
  });

  it("«Уже есть» splits by place with documents and feeds the summary", () => {
    const live: OrderPlanPayload = {
      coverage: [
        {
          variantId: "2",
          ordered: 10,
          shipped: 2,
          warehouse: 3,
          transfer: 0,
          output: 0,
          places: [
            { kind: "warehouse", locationId: "5", quantity: 3, documents: [{ kind: "reservation", number: "RSV-931", sequence: "931" }] },
            { kind: "shipped", locationId: "99", quantity: 2, documents: [{ kind: "shipment", number: "SHP-911", sequence: "911" }] },
          ],
        },
      ],
      sources: [],
      plans: [],
    };
    const products = buildProductPlans({ snapshot, lines: [line], payload: live, plan: plan({}), places });
    const groups = products[0]!.haveGroups;
    assert.deepEqual(groups.map((group) => [group.kind, group.total]), [["shipped", 2], ["warehouse", 3]]);
    assert.equal(groups[0]?.rows[0]?.place, null);
    assert.equal(groups[1]?.rows[0]?.place?.code, "#5");
    assert.equal(groups[1]?.rows[0]?.documents[0]?.href, "/store/logistics/reservations/931");

    const summary = buildPlanSummary({ snapshot, plan: plan({}), products, places, ownerOf: buildOwnerResolver(snapshot) });
    assert.deepEqual(
      summary.have.map((group) => [group.title, group.hint, group.rows.map((row) => row.quantity)]),
      [
        ["Отгружено", "SHP-911", [2]],
        ["#5", "RSV-931", [3]],
      ],
    );
    assert.equal(summary.uncovered[0]?.quantity, 5);
  });

  it("«Заказать дополнительно» skips ready and cancelled POs but keeps an existing action", () => {
    const po = (id: string, status: ProductionOrder["status"]): ProductionOrder => ({
      id,
      series: "PO",
      sequenceNumber: id,
      number: `PO-${id}`,
      plantId: "1",
      stockLocationId: `L${id}`,
      status,
      createdAt: "2026-09-24T10:00:00Z",
      createdBy: "",
      expectedEndOn: null,
    });
    const withOrders = {
      ...snapshot,
      productionOrders: [po("1", "draft"), po("2", "in_progress"), po("3", "done"), po("4", "cancelled")],
    };
    const poPlaces = buildPlaceIndex(withOrders);
    const open = buildProduceRows({ snapshot: withOrders, variantId: "2", plantId: "1", plan: null, places: poPlaces, onlyTaken: false });
    assert.deepEqual(open.existing.map((row) => row.place?.code), ["PO-1", "PO-2"]);

    const draft = plan({ actions: [action({ kind: "produce", locationId: "L3", ownerId: null, available: null, quantity: 2 })] });
    const kept = buildProduceRows({ snapshot: withOrders, variantId: "2", plantId: "1", plan: draft, places: poPlaces, onlyTaken: false });
    assert.deepEqual(kept.existing.map((row) => [row.place?.code, row.take]), [["PO-1", 0], ["PO-2", 0], ["PO-3", 2]]);
  });

  it("defaultPlanId prefers the newest non-archived plan", () => {
    const plans = [
      plan({ id: "1", createdAt: "2026-09-20T10:00:00Z" }),
      plan({ id: "2", createdAt: "2026-09-22T10:00:00Z" }),
      plan({ id: "3", createdAt: "2026-09-23T10:00:00Z", archivedAt: "2026-09-23T11:00:00Z" }),
    ];
    assert.equal(defaultPlanId(plans), "2");
    assert.equal(defaultPlanId([plans[2]!]), "3");
  });
});
