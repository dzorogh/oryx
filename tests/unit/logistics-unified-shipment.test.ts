import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hrefForDocument, remainingToReturnForOrderProduct } from "@/features/logistics/logistics-availability";
import { LOGISTICS_CODE_PREFIXES } from "@/features/logistics/logistics-codes";
import { documentLabel } from "@/features/logistics/logistics-lookups";
import { calculateOrderDocumentCoverage } from "@/features/logistics/order-document-coverage";
import { relatedReturnsForOrder, relatedShipments } from "@/features/logistics/logistics-related";
import { assertShipmentCapacity, assertShipmentOwnerIsOrder } from "@/features/logistics/logistics-rules";
import {
  assertUniqueReturnDestinations,
  reserveThenShipNextAction,
  shipmentCreateRpcArgs,
  shipmentIntentionAfterBack,
  shipmentsForAdjustmentSource,
} from "@/features/logistics/shipment-direct-post";
import {
  shipmentDirection,
  shipmentWarehouseId,
  type LogisticsSnapshot,
  type Shipment,
} from "@/features/logistics/logistics-types";
import type { CustomerOrderLine, StockBalance } from "@/features/logistics/logistics-types";

const shipped = (orderId: string, productId: string, quantity: number): StockBalance => ({
  productId,
  locationType: "customer_order",
  locationId: orderId,
  assignedToType: "order",
  assignedToId: orderId,
  stockState: "shipped",
  ownerType: "order",
  ownerId: orderId,
  quantity,
});

const shipment = (overrides: Partial<Shipment> & Pick<Shipment, "id" | "fromLocationType" | "toLocationType">): Shipment => ({
  number: `SHP-${overrides.id}`,
  customerOrderId: "12",
  fromLocationId: overrides.fromLocationType === "warehouse" ? "w1" : "12",
  toLocationId: overrides.toLocationType === "warehouse" ? "w1" : "12",
  createdAt: "",
  createdBy: "1",
  ...overrides,
});

const snapshotWithDocs = (): LogisticsSnapshot => ({
  products: [],
  manufacturers: [],
  warehouses: [],
  regions: [],
  settings: { id: "1", codePrefixes: { ...LOGISTICS_CODE_PREFIXES } },
  customerOrders: [],
  customerOrderLines: [{ id: "l1", orderId: "12", productId: "7", quantity: 6 }],
  productionOrders: [],
  productionOrderLines: [],
  reservations: [],
  reservationLines: [],
  transfers: [],
  transferLines: [],
  transferAllocations: [],
  shipments: [
    shipment({ id: "s1", fromLocationType: "warehouse", toLocationType: "customer_order" }),
    shipment({ id: "r1", fromLocationType: "customer_order", toLocationType: "warehouse", toLocationId: "w9" }),
  ],
  shipmentLines: [
    { id: "sl1", shipmentId: "s1", productId: "7", quantity: 4, toOwnerType: "order", toOwnerId: "12" },
    { id: "rl1", shipmentId: "r1", productId: "7", quantity: 2, toOwnerType: null, toOwnerId: null },
  ],
  outputs: [],
  outputLines: [],
  outputAllocations: [],
  adjustments: [],
  adjustmentLines: [],
  transactions: [],
  users: [],
  documentHistory: [],
});

describe("единый документ отгрузки и возврата", () => {
  it("считает направление только из маршрута", () => {
    assert.equal(shipmentDirection("warehouse", "customer_order"), "shipment");
    assert.equal(shipmentDirection("customer_order", "warehouse"), "return");
    assert.throws(
      () => shipmentDirection("warehouse", "warehouse"),
      /Допустимы только маршруты/,
    );
  });

  it("ограничивает возврат текущим shipped-балансом заказа и товара", () => {
    const balances = [shipped("12", "7", 4), shipped("12", "8", 1), shipped("99", "7", 10)];
    assert.equal(remainingToReturnForOrderProduct(balances, "12", "7"), 4);
    assert.equal(remainingToReturnForOrderProduct(balances, "12", "8"), 1);
    assert.equal(remainingToReturnForOrderProduct(balances, "12", "missing"), 0);
  });

  it("открывает возврат на той же карточке, что и отгрузку", () => {
    assert.equal(hrefForDocument("shipment", "915"), "/store/logistics/shipments/915");
    assert.equal(hrefForDocument("return", "915"), "/store/logistics/shipments/915");
  });

  it("отгрузка берёт только резерв заказа и не превышает заказ", () => {
    const line: CustomerOrderLine = {
      id: "l1",
      orderId: "12",
      productId: "7",
      quantity: 6,
    };
    assert.doesNotThrow(() => assertShipmentOwnerIsOrder("order", "12"));
    assert.throws(() => assertShipmentOwnerIsOrder(null, null), /резерв заказа/);
    assert.doesNotThrow(() => assertShipmentCapacity(line, [shipped("12", "7", 2)], 4));
    assert.throws(() => assertShipmentCapacity(line, [shipped("12", "7", 2)], 5), /больше заказанного/);
  });

  it("разрешает один товар в возврате только с разными назначениями", () => {
    assert.doesNotThrow(() =>
      assertUniqueReturnDestinations([
        { productId: "7", quantity: 1, toOwnerType: null, toOwnerId: null },
        { productId: "7", quantity: 1, toOwnerType: "order", toOwnerId: "12" },
      ]),
    );
    assert.throws(
      () =>
        assertUniqueReturnDestinations([
          { productId: "7", quantity: 1, toOwnerType: null, toOwnerId: null },
          { productId: "7", quantity: 2, toOwnerType: null, toOwnerId: null },
        ]),
      /только один раз/,
    );
  });

  it("после успешного резерва повторяет только отгрузку", () => {
    assert.equal(reserveThenShipNextAction(false), "reserve-then-ship");
    assert.equal(reserveThenShipNextAction(true), "retry-shipment");
  });

  it("смена намерения возвращает на первый шаг и очищает форму", () => {
    assert.deepEqual(shipmentIntentionAfterBack("12"), {
      intention: null,
      orderId: "12",
      warehouseId: "",
      reserveThenShip: false,
      reservationId: null,
    });
  });

  it("разводит отгрузки и возвраты заказа по разным спискам", () => {
    const snapshot = snapshotWithDocs();
    assert.deepEqual(relatedShipments(snapshot, "12").map((item) => item.id), ["s1"]);
    assert.deepEqual(relatedReturnsForOrder(snapshot, "12").map((item) => item.id), ["r1"]);
    assert.equal(relatedReturnsForOrder(snapshot, "12")[0]?.href, "/store/logistics/shipments/r1");
  });

  it("считает покрытие возврата отдельно от отгрузки", () => {
    const snapshot = snapshotWithDocs();
    const coverage = calculateOrderDocumentCoverage(snapshot, "12");
    assert.equal(coverage.shipment.get("s1"), 67);
    assert.equal(coverage.return.get("r1"), 33);
    assert.equal(coverage.shipment.has("r1"), false);
    assert.equal(coverage.return.has("s1"), false);
  });

  it("берёт склад возврата из места назначения", () => {
    const outbound = shipment({ id: "s1", fromLocationType: "warehouse", fromLocationId: "w1", toLocationType: "customer_order" });
    const inbound = shipment({ id: "r1", fromLocationType: "customer_order", toLocationType: "warehouse", toLocationId: "w9" });
    assert.equal(shipmentWarehouseId(outbound), "w1");
    assert.equal(shipmentWarehouseId(inbound), "w9");
  });

  it("подписывает журналный return кодом SHP", () => {
    const snapshot = snapshotWithDocs();
    assert.equal(documentLabel(snapshot, "return", "r1"), "SHP-r1");
  });

  it("передаёт destination owner в RPC без потерь", () => {
    const mapped = shipmentCreateRpcArgs({
      requestKey: "k1",
      customerOrderId: "12",
      fromLocationType: "customer_order",
      fromLocationId: "12",
      toLocationType: "warehouse",
      toLocationId: "40",
      lines: [
        { productId: "7", quantity: 1, toOwnerType: "region", toOwnerId: "3" },
        { productId: "8", quantity: 2, toOwnerType: null, toOwnerId: null },
      ],
    });
    assert.deepEqual(mapped.p_lines, [
      { product_id: 7, quantity: 1, to_owner_type: "region", to_owner_id: 3 },
      { product_id: 8, quantity: 2, to_owner_type: null, to_owner_id: null },
    ]);
  });

  it("в источнике корректировки не смешивает отгрузки и возвраты", () => {
    const snapshot = snapshotWithDocs();
    assert.deepEqual(shipmentsForAdjustmentSource(snapshot.shipments, "shipment").map((item) => item.value), ["s1"]);
    assert.deepEqual(shipmentsForAdjustmentSource(snapshot.shipments, "return").map((item) => item.value), ["r1"]);
  });
});
