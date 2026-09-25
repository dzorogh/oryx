import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapCustomerOrderListRow,
  mapLogisticsPayload,
  mapOutputListRow,
} from "@/features/logistics/logistics-api";
import { mapOrderPlanPayload } from "@/features/logistics/order-plan/order-plan-types";

describe("mapCustomerOrderListRow", () => {
  it("maps an order without lines to empty products and zero totals", () => {
    const row = mapCustomerOrderListRow({
      id: "6",
      sequenceNumber: "6",
      number: "OMS-6",
      status: "in_progress",
      expectedEndOn: null,
      createdAt: "2026-09-01T10:00:00+00:00",
      description: null,
      products: [],
      reserved: 0,
      shipped: 0,
      openToReserve: 0,
    });
    assert.deepEqual(row.products, []);
    assert.equal(row.reserved, 0);
    assert.equal(row.shipped, 0);
    assert.equal(row.openToReserve, 0);
    assert.equal(row.description, "");
  });

  it("maps ready product lines and totals", () => {
    const row = mapCustomerOrderListRow({
      id: "12",
      sequenceNumber: "12",
      number: "OMS-12",
      status: "in_progress",
      expectedEndOn: "2026-10-01",
      createdAt: "2026-09-01T10:00:00+00:00",
      products: [{ id: 1, productId: 7, quantity: 5, productName: "Sport 250", productUnit: "шт" }],
      reserved: 2,
      shipped: 1,
      openToReserve: 2,
    });
    assert.deepEqual(row.products, [
      { productId: "7", quantity: 5, productName: "Sport 250", productUnit: "шт" },
    ]);
    assert.equal(row.reserved, 2);
    assert.equal(row.openToReserve, 2);
    assert.equal(row.expectedEndOn, "2026-10-01");
  });

  it("maps ordered and createdBy from list RPC rows", () => {
    const row = mapCustomerOrderListRow({
      id: "3",
      sequenceNumber: "3",
      number: "OMS-3",
      status: "in_progress",
      expectedEndOn: null,
      createdAt: "2026-09-01T10:00:00+00:00",
      products: [],
      ordered: 12,
      reserved: 0,
      shipped: 0,
      openToReserve: 0,
      createdBy: "Иван Петров",
    });
    assert.equal(row.ordered, 12);
    assert.equal(row.createdBy, "Иван Петров");
  });
});

describe("mapOutputListRow", () => {
  it("maps plantId from list RPC rows", () => {
    const row = mapOutputListRow({
      id: "9",
      sequenceNumber: "9",
      number: "OUT-9",
      status: "planned",
      expectedEndOn: null,
      createdAt: "2026-09-01T10:00:00+00:00",
      productionOrderId: "4",
      productionOrderNumber: "PRD-4",
      productionOrderSequenceNumber: "4",
      plantId: "2",
      products: [],
      createdBy: "Мария",
    });
    assert.equal(row.plantId, "2");
    assert.equal(row.createdBy, "Мария");
  });
});

describe("mapLogisticsPayload", () => {
  it("maps an empty payload to an empty snapshot", () => {
    const mapped = mapLogisticsPayload({});
    assert.equal(mapped.found, true);
    assert.equal(mapped.balances, null);
    assert.deepEqual(mapped.snapshot.customerOrders, []);
    assert.deepEqual(mapped.snapshot.products, []);
    assert.deepEqual(mapped.snapshot.transactions, []);
  });

  it("maps a partial payload with document kinds and one customer order", () => {
    const mapped = mapLogisticsPayload({
      document_kinds: [{ code: "customer_order", number_prefix: "OMS" }],
      documents: [
        {
          id: 12,
          kind: "customer_order",
          sequence_number: 12,
          description: "",
          status: "in_progress",
          expected_end_on: null,
          created_at: "2026-01-01T00:00:00Z",
          created_by: 1,
        },
      ],
      customer_orders: [
        { id: 12, region_id: 1, stock_location_id: 100, stock_owner_id: 50 },
      ],
      regions: [{ id: 1, code: "REG-1", name: "Север", stock_owner_id: 2 }],
      stock_locations: [{ id: 100, kind: "customer_order" }],
      stock_owners: [
        { id: 1, kind: "free" },
        { id: 50, kind: "customer_order" },
      ],
    });
    assert.equal(mapped.snapshot.customerOrders.length, 1);
    assert.equal(mapped.snapshot.customerOrders[0]?.number, "OMS-12");
    assert.equal(mapped.snapshot.customerOrders[0]?.sequenceNumber, "12");
  });

  it("maps warehouse kind, customer order source and dealer prices", () => {
    const mapped = mapLogisticsPayload({
      document_kinds: [{ code: "customer_order", number_prefix: "OMS" }],
      documents: [
        {
          id: 12,
          kind: "customer_order",
          sequence_number: 12,
          description: "",
          status: "in_progress",
          expected_end_on: null,
          created_at: "2026-01-01T00:00:00Z",
          created_by: 1,
        },
      ],
      customer_orders: [
        {
          id: 12,
          region_id: 1,
          stock_location_id: 100,
          stock_owner_id: 50,
          source_kind: "hub",
          source_plant_id: null,
          source_warehouse_id: 7,
        },
      ],
      warehouses: [
        { id: 7, name: "Hub", stock_location_id: 70, kind: "hub" },
        { id: 8, name: "Shop", stock_location_id: 80 },
        { id: 9, name: "Plant WH", stock_location_id: 90 },
      ],
      plants: [{ id: 3, name: "Plant", warehouse_id: 9 }],
      regions: [{ id: 1, code: "REG-1", name: "Север", stock_owner_id: 2 }],
      stock_locations: [
        { id: 100, kind: "customer_order" },
        { id: 70, kind: "warehouse" },
        { id: 80, kind: "warehouse" },
      ],
      stock_owners: [
        { id: 1, kind: "free" },
        { id: 50, kind: "customer_order" },
      ],
      dealer_prices: [
        { product_variant_id: 4, region_id: 1, amount: 10, currency_id: 2, currency_code: "USD" },
      ],
    });
    assert.equal(mapped.snapshot.warehouses.find((item) => item.id === "7")?.kind, "hub");
    assert.equal(mapped.snapshot.warehouses.find((item) => item.id === "8")?.kind, "customer");
    assert.equal(mapped.snapshot.warehouses.find((item) => item.id === "9")?.kind, "plant");
    assert.equal(mapped.snapshot.customerOrders[0]?.sourceKind, "hub");
    assert.equal(mapped.snapshot.customerOrders[0]?.sourceWarehouseId, "7");
    assert.equal(mapped.snapshot.dealerPrices[0]?.amount, 10);
    assert.equal(mapped.snapshot.dealerPrices[0]?.currencyCode, "USD");
  });

  it("passes through SQL balances when present", () => {
    const mapped = mapLogisticsPayload({
      balances: [
        {
          product_variant_id: 7,
          stock_location_id: 1,
          stock_owner_id: 1,
          location_kind: "warehouse",
          location_entity_id: 1,
          owner_kind: "free",
          owner_entity_id: null,
          stock_state: "free",
          quantity: 4,
        },
      ],
    });
    assert.ok(mapped.balances);
    assert.equal(mapped.balances?.length, 1);
    assert.equal(mapped.balances?.[0]?.productId, "7");
    assert.equal(mapped.balances?.[0]?.locationType, "warehouse");
    assert.equal(mapped.balances?.[0]?.locationId, "1");
    assert.equal(mapped.balances?.[0]?.stockState, "free");
    assert.equal(mapped.balances?.[0]?.quantity, 4);
    assert.equal(mapped.balances?.[0]?.ownerType, null);
    assert.equal(mapped.balances?.[0]?.ownerId, null);
  });

  it("maps customer-order and region owned balances to entity ids", () => {
    const mapped = mapLogisticsPayload({
      balances: [
        {
          product_variant_id: 7,
          stock_location_id: 100,
          stock_owner_id: 50,
          location_kind: "warehouse",
          location_entity_id: 3,
          owner_kind: "customer_order",
          owner_entity_id: 12,
          stock_state: "reserved",
          quantity: 2,
        },
        {
          product_variant_id: 8,
          stock_location_id: 101,
          stock_owner_id: 60,
          location_kind: "production_order",
          location_entity_id: 9,
          owner_kind: "region",
          owner_entity_id: 4,
          stock_state: "reserved",
          quantity: 5,
        },
      ],
    });
    const [order, region] = mapped.balances ?? [];
    assert.equal(order?.ownerType, "order");
    assert.equal(order?.ownerId, "12");
    assert.equal(order?.locationId, "3");
    assert.equal(region?.ownerType, "region");
    assert.equal(region?.ownerId, "4");
    assert.equal(region?.locationId, "9");
  });

  it("maps output line owners to customer order ids, not stock owner ids", () => {
    const mapped = mapLogisticsPayload({
      document_kinds: [
        { code: "customer_order", number_prefix: "OMS" },
        { code: "production_output", number_prefix: "OUT" },
      ],
      documents: [
        { id: 12, kind: "customer_order", sequence_number: 12, status: "in_progress", created_at: "2026-01-01T00:00:00Z" },
        { id: 30, kind: "production_output", sequence_number: 5, status: "draft", created_at: "2026-01-02T00:00:00Z" },
      ],
      customer_orders: [{ id: 12, region_id: 1, stock_location_id: 100, stock_owner_id: 50 }],
      production_outputs: [{ id: 30, production_order_id: 9 }],
      stock_owners: [
        { id: 1, kind: "free" },
        { id: 50, kind: "customer_order" },
      ],
      document_product_lines: [
        { id: 1, document_id: 30, product_variant_id: 7, quantity: 2, from_owner_id: null, to_owner_id: 50 },
        { id: 2, document_id: 30, product_variant_id: 7, quantity: 3, from_owner_id: null, to_owner_id: 1 },
      ],
    });
    const [owned, free] = mapped.snapshot.outputLines;
    assert.equal(owned?.toOwnerType, "order");
    assert.equal(owned?.toOwnerId, "12");
    assert.equal(free?.toOwnerType, null);
    assert.equal(free?.toOwnerId, null);
  });

  it("maps output stock location and passes order_plan through", () => {
    const orderPlan = {
      coverage: [],
      sources: [],
      plans: [
        {
          id: 4,
          name: "План 1",
          createdAt: "2026-09-24T10:00:00Z",
          launchedAt: null,
          archivedAt: null,
          launchedCoverage: null,
          actions: [{ id: 17, kind: "produce", variantId: 2, quantity: 3, locationId: 55, available: null }],
        },
      ],
    };
    const mapped = mapLogisticsPayload({
      document_kinds: [{ code: "production_output", number_prefix: "OUT" }],
      documents: [
        { id: 30, kind: "production_output", sequence_number: 5, status: "draft", created_at: "2026-01-02T00:00:00Z" },
      ],
      production_outputs: [{ id: 30, production_order_id: 9, stock_location_id: 162 }],
      order_plan: orderPlan,
    });
    assert.equal(mapped.snapshot.outputs[0]?.stockLocationId, "162");
    assert.equal(mapped.orderPlan, orderPlan);

    const plan = mapOrderPlanPayload(mapped.orderPlan).plans[0];
    assert.equal(plan?.launchedCoverage, null);
    assert.equal(plan?.actions[0]?.kind, "produce");
    assert.equal(plan?.actions[0]?.available, null);
    assert.equal(plan?.actions[0]?.locationId, "55");
  });

  it("honors found=false from context RPCs", () => {
    const mapped = mapLogisticsPayload({ found: false });
    assert.equal(mapped.found, false);
  });

  it("defaults missing categories and category_ids to empty arrays", () => {
    const mapped = mapLogisticsPayload({
      product_variants: [{ id: 1, product_id: 9, name: "Force", unit: "шт", plant_id: null }],
    });
    assert.deepEqual(mapped.snapshot.categories, []);
    assert.deepEqual(mapped.snapshot.products[0]?.categoryIds, []);
  });

  it("maps stock categories and category_ids", () => {
    const mapped = mapLogisticsPayload({
      categories: [
        { id: 2, parent_id: null, name: "ATV" },
        { id: 10, parent_id: 2, name: "4x4" },
      ],
      product_variants: [{ id: 1, product_id: 9, name: "Force", unit: "шт", plant_id: 5, category_ids: [2, 10] }],
    });
    assert.deepEqual(mapped.snapshot.categories, [
      { id: "2", parentId: null, name: "ATV" },
      { id: "10", parentId: "2", name: "4x4" },
    ]);
    assert.deepEqual(mapped.snapshot.products[0]?.categoryIds, ["2", "10"]);
  });
});
