// @ts-nocheck
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANCEL_GUIDANCE_BLOCKED,
  CANCEL_GUIDANCE_CUSTOMER_CLOSE,
  CANCEL_GUIDANCE_EXAMPLE,
  CANCEL_GUIDANCE_HISTORY,
  CANCEL_GUIDANCE_LEAD,
  CANCEL_GUIDANCE_PRODUCTION_CLOSE,
  CANCEL_GUIDANCE_SAFE_CONFIRM,
  oppositeAdjustmentOperation,
  projectCancelGuidance,
  projectDocumentCancelGuidance,
  reservationFollowUpLabel,
  type CancelGuidanceFacts,
} from "@/features/logistics/logistics-cancel-guidance";
import { LOGISTICS_CODE_PREFIXES } from "@/features/logistics/logistics-codes";
import { assertDocumentCanBeCancelled } from "@/features/logistics/logistics-rules";
import type {
  LogisticsSnapshot,
  Reservation,
  ReservationLine,
  StockBalance,
  StockTransaction,
} from "@/features/logistics/logistics-types";

const asSnap = (value: object): LogisticsSnapshot => value as LogisticsSnapshot;
const asDoc = <T>(value: object): T => value as T;

const facts = (overrides: Partial<CancelGuidanceFacts> & Pick<CancelGuidanceFacts, "type" | "status">): CancelGuidanceFacts => ({
  id: "1",
  availableQuantity: 4,
  reservedQuantity: 0,
  ...overrides,
});

const commonCopyPresent = (guidance: ReturnType<typeof projectCancelGuidance>) => {
  assert.equal(guidance.lead, CANCEL_GUIDANCE_LEAD);
  assert.equal(guidance.example, CANCEL_GUIDANCE_EXAMPLE);
  assert.equal(guidance.history, CANCEL_GUIDANCE_HISTORY);
};

const withDoc = <T extends { id: string; number?: string }>(row: T, series = "X") => ({
  series,
  sequenceNumber: row.id,
  ...row,
});

const withLineSnap = <T extends { productId?: string }>(row: T) => ({
  productName: "Товар",
    productUnit: "шт",
  plantId: null,
  plantName: null,
  plantCode: null,
  fromOwnerType: null,
  fromOwnerId: null,
  ...row,
});

const emptySnapshot = (): LogisticsSnapshot => ({
  categories: [],
  products: [],
  plants: [{ id: "m1", code: "PLT-1", name: "Завод", warehouseId: "w1" }],
  warehouses: [{ id: "w1", code: "WH-1", name: "Склад", plantId: "m1" }],
  regions: [],
  settings: { id: "1", codePrefixes: { ...LOGISTICS_CODE_PREFIXES } },
  documentProductLines: [],
  customerOrders: [],
  customerOrderLines: [],
  productionOrders: [],
  productionOrderLines: [],
  reservations: [],
  reservationLines: [],
  transfers: [],
  transferLines: [],
  transferAllocations: [],
  shipments: [],
  shipmentLines: [],
  outputs: [],
  outputLines: [],
  outputAllocations: [],
  adjustments: [],
  adjustmentLines: [],
  transactions: [],
  users: [],
  documentHistory: [],
});

const freeBalance = (productId: string, warehouseId: string, quantity: number): StockBalance => ({
  productId,
  locationType: "warehouse",
  locationId: warehouseId,
  assignedToType: null,
  assignedToId: null,
  stockState: "free",
  ownerType: null,
  ownerId: null,
  quantity,
});

const shippedBalance = (
  productId: string,
  orderId: string,
  quantity: number,
): StockBalance => ({
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

const reservedBalance = (
  productId: string,
  warehouseId: string,
  quantity: number,
  ownerType: "order" | "region" = "order",
  ownerId = "12",
): StockBalance => ({
  productId,
  locationType: "warehouse",
  locationId: warehouseId,
  assignedToType: ownerType,
  assignedToId: ownerId,
  stockState: "reserved",
  ownerType,
  ownerId,
  quantity,
});

describe("помощник отмены складских документов", () => {
  it("для проведённого резерва открывает обратное направление и не предлагает удалить проводки", () => {
    const reserve = projectCancelGuidance(
      facts({ type: "reservation", status: "posted", reservationDirection: "reserve" }),
    );
    commonCopyPresent(reserve);
    assert.equal(reserve.mode, "guidance");
    assert.equal(reserve.actions[0]?.id, "open-reservation");
    assert.equal(reserve.actions[0]?.label, reservationFollowUpLabel("reserve"));
    assert.equal(reserve.actions[0]?.enabled, true);
    assert.match(reserve.context, /новый резерв/);

    const release = projectCancelGuidance(
      facts({ type: "reservation", status: "posted", reservationDirection: "release" }),
    );
    assert.equal(release.actions[0]?.label, "Зарезервировать снова");

    const reassign = projectCancelGuidance(
      facts({ type: "reservation", status: "posted", reservationDirection: "reassign" }),
    );
    assert.equal(reassign.actions[0]?.label, "Переназначить");
  });

  it("для проведённой отгрузки предлагает возврат и не меняет исходные факты", () => {
    const guidance = projectCancelGuidance(facts({ type: "shipment", status: "posted" }));
    commonCopyPresent(guidance);
    assert.equal(guidance.mode, "guidance");
    assert.deepEqual(guidance.actions, [{ id: "open-return", label: "Создать возврат", enabled: true }]);
    assert.equal(guidance.returnShipmentId, "1");
  });

  it("для проведённого возврата предлагает отгрузку обратного маршрута", () => {
    const guidance = projectCancelGuidance(facts({ type: "return", status: "posted" }));
    commonCopyPresent(guidance);
    assert.equal(guidance.actions[0]?.id, "open-shipment");
    assert.equal(guidance.actions[0]?.label, "Создать отгрузку");
    assert.equal(guidance.actions[0]?.enabled, true);
  });

  it("для отправленного перемещения сначала требует отметить доставку", () => {
    const guidance = projectCancelGuidance(facts({ type: "transfer", status: "sent", transferInTransit: true }));
    commonCopyPresent(guidance);
    assert.equal(guidance.actions[0]?.id, "mark-delivered");
    assert.equal(guidance.actions[0]?.label, "Отметить доставленным");
    assert.equal(guidance.actions[0]?.enabled, true);
    assert.equal(guidance.context, CANCEL_GUIDANCE_BLOCKED.needDeliver);
    assert.equal(
      guidance.actions.some((action) => action.id === "open-reverse-transfer"),
      false,
    );
  });

  it("для доставленного перемещения открывает обратное перемещение", () => {
    const guidance = projectCancelGuidance(facts({ type: "transfer", status: "delivered" }));
    assert.equal(guidance.mode, "guidance");
    assert.equal(guidance.actions[0]?.id, "open-reverse-transfer");
    assert.equal(guidance.actions[0]?.label, "Создать обратное перемещение");
    assert.equal(guidance.actions[0]?.enabled, true);
  });

  it("для завершённого выпуска предлагает корректировку текущего свободного остатка", () => {
    const guidance = projectCancelGuidance(facts({ type: "output", status: "done" }));
    commonCopyPresent(guidance);
    assert.equal(guidance.actions[0]?.id, "open-adjustment");
    assert.equal(guidance.actions[0]?.label, "Создать корректировку");
    assert.match(guidance.context, /корректировку текущего свободного остатка/);
  });

  it("для проведённой корректировки предлагает противоположную операцию без изменения исходной", () => {
    assert.equal(oppositeAdjustmentOperation("write_off"), "increase");
    assert.equal(oppositeAdjustmentOperation("decrease"), "increase");
    assert.equal(oppositeAdjustmentOperation("increase"), "decrease");

    const guidance = projectCancelGuidance(
      facts({ type: "adjustment", status: "posted", adjustmentOperation: "write_off" }),
    );
    commonCopyPresent(guidance);
    assert.equal(guidance.actions[0]?.id, "open-adjustment");
    assert.equal(guidance.actions[0]?.enabled, true);
    assert.match(guidance.context, /противоположную операцию/);
  });

  it("для открытого заказа клиента подробно описывает закрытие и не обещает откат связанных документов", () => {
    const guidance = projectCancelGuidance(facts({ type: "customer_order", status: "open" }));
    commonCopyPresent(guidance);
    assert.equal(guidance.actions[0]?.id, "close-customer-order");
    assert.equal(guidance.actions[0]?.label, "Закрыть заказ");
    assert.equal(guidance.closeEffects, CANCEL_GUIDANCE_CUSTOMER_CLOSE);
    assert.doesNotMatch(guidance.closeEffects ?? "", /откатит связанные|каскадн/i);
    assert.match(guidance.closeEffects ?? "", /не отменяет и не откатывает связанные документы/);
  });

  it("для активного заказа на производство описывает отмену незавершённых выпусков", () => {
    const guidance = projectCancelGuidance(facts({ type: "production_order", status: "in_progress" }));
    commonCopyPresent(guidance);
    assert.equal(guidance.actions[0]?.id, "close-production-order");
    assert.equal(guidance.actions[0]?.label, "Закрыть заказ");
    assert.equal(guidance.closeEffects, CANCEL_GUIDANCE_PRODUCTION_CLOSE);
    assert.match(guidance.closeEffects ?? "", /запланированные выпуски/);
    assert.match(guidance.closeEffects ?? "", /Складской остаток не списывается/);
    assert.match(guidance.closeEffects ?? "", /Завершённые выпуски и связанные документы не отменяются/);
  });

  it("для безопасного черновика подтверждает только смену статуса", () => {
    const shipment = projectCancelGuidance(facts({ type: "shipment", status: "draft" }));
    assert.equal(shipment.mode, "guidance");
    assert.equal(shipment.actions[0]?.id, "open-return");
    assert.throws(() => assertDocumentCanBeCancelled("shipment", "draft"));

    const ret = projectCancelGuidance(facts({ type: "return", status: "draft" }));
    assert.equal(ret.actions[0]?.id, "open-shipment");
    assert.throws(() => assertDocumentCanBeCancelled("shipment_return", "draft"));

    const output = projectCancelGuidance(facts({ type: "output", status: "draft" }));
    assert.equal(output.cancelRpcKind, "production_output");
    assert.doesNotThrow(() => assertDocumentCanBeCancelled("production_output", "draft"));
  });

  it("скрывает действие для закрытого или отменённого документа и не добавляет отмену черновика резерва", () => {
    assert.equal(projectCancelGuidance(facts({ type: "shipment", status: "cancelled" })).mode, "hidden");
    assert.equal(projectCancelGuidance(facts({ type: "customer_order", status: "closed" })).mode, "hidden");
    assert.equal(projectCancelGuidance(facts({ type: "production_order", status: "closed" })).mode, "hidden");
    assert.equal(projectCancelGuidance(facts({ type: "production_order", status: "cancelled" })).mode, "hidden");
    assert.equal(projectCancelGuidance(facts({ type: "transfer", status: "cancelled" })).mode, "hidden");
    assert.equal(projectCancelGuidance(facts({ type: "output", status: "cancelled" })).mode, "hidden");
    assert.equal(projectCancelGuidance(facts({ type: "reservation", status: "draft" })).mode, "hidden");
  });

  it("если обратное действие недоступно, объясняет предыдущий шаг и не включает небезопасную операцию", () => {
    const shippedReservation = projectCancelGuidance(
      facts({
        type: "reservation",
        status: "posted",
        reservationDirection: "reserve",
        availableQuantity: 0,
        shippedQuantity: 8,
      }),
    );
    assert.equal(shippedReservation.actions[0]?.enabled, false);
    assert.equal(shippedReservation.actions[0]?.blockedReason, CANCEL_GUIDANCE_BLOCKED.needReturn);

    const emptyShipment = projectCancelGuidance(facts({ type: "shipment", status: "posted", availableQuantity: 0 }));
    assert.equal(emptyShipment.actions[0]?.enabled, true);
    assert.equal(emptyShipment.actions[0]?.id, "open-return");

    const reservedTransfer = projectCancelGuidance(
      facts({ type: "transfer", status: "delivered", availableQuantity: 0, reservedQuantity: 5 }),
    );
    assert.equal(reservedTransfer.actions[0]?.enabled, false);
    assert.equal(reservedTransfer.actions[0]?.blockedReason, CANCEL_GUIDANCE_BLOCKED.needFreeAtDest);

    const reservedOutput = projectCancelGuidance(
      facts({ type: "output", status: "done", availableQuantity: 0, reservedQuantity: 3 }),
    );
    assert.equal(reservedOutput.actions[0]?.enabled, false);
    assert.equal(reservedOutput.actions[0]?.blockedReason, CANCEL_GUIDANCE_BLOCKED.needRelease);

    const emptyAdjustment = projectCancelGuidance(
      facts({
        type: "adjustment",
        status: "posted",
        adjustmentOperation: "increase",
        availableQuantity: 0,
      }),
    );
    assert.equal(emptyAdjustment.actions[0]?.enabled, false);
    assert.equal(emptyAdjustment.actions[0]?.blockedReason, CANCEL_GUIDANCE_BLOCKED.nothingToAdjust);
  });

  it("собирает пресеты форм из снимка: обратный резерв, возврат, корректировка и обратное перемещение", () => {
    const snapshot = emptySnapshot();
    const reservation = {
      id: "r1",
      number: "RSV-1",
      locationType: "warehouse",
      locationId: "w1",
      toOwnerType: "order",
      toOwnerId: "12",
      status: "posted",
      origin: "manual",
      note: "",
      createdAt: "",
      createdBy: "1",
    };
    const reservationLine = {
      id: "rl1",
      reservationId: "r1",
      productId: "7",
      quantity: 4,
      fromOwnerType: null,
      fromOwnerId: null,
    };
    snapshot.reservations = [reservation];
    snapshot.reservationLines = [reservationLine];
    snapshot.shipments = [
      {
        id: "s1",
        number: "SHP-1",
        customerOrderId: "12",
        fromLocationType: "warehouse",
        fromLocationId: "w1",
        toLocationType: "customer_order",
        toLocationId: "12",
        createdAt: "",
        createdBy: "1",
      },
      {
        id: "ret1",
        number: "SHP-2",
        customerOrderId: "12",
        fromLocationType: "customer_order",
        fromLocationId: "12",
        toLocationType: "warehouse",
        toLocationId: "w1",
        createdAt: "",
        createdBy: "1",
      },
    ];
    snapshot.shipmentLines = [
      { id: "sl1", shipmentId: "s1", productId: "7", quantity: 4, toOwnerType: "order", toOwnerId: "12" },
      { id: "retl1", shipmentId: "ret1", productId: "7", quantity: 2, toOwnerType: null, toOwnerId: null },
    ];
    snapshot.transfers = [
      {
        id: "t1",
        number: "TR-1",
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
        status: "delivered",
        createdAt: "",
        createdBy: "1",
        expectedEndOn: null,
      },
    ];
    snapshot.warehouses.push({ id: "w2", code: "WH-2", name: "Другой", plantId: null });
    snapshot.transferLines = [{ id: "tl1", transferId: "t1", productId: "7", quantity: 8 }];
    snapshot.outputs = [
      {
        id: "o1",
        number: "OUT-1",
        productionOrderId: "p1",
        status: "done",
        createdAt: "",
        createdBy: "1",
        expectedEndOn: null,
      },
    ];
    snapshot.outputLines = [{
      id: "ol1",
      outputId: "o1",
      productionOrderLineId: "pl1",
      productId: "7",
      quantity: 10,
      productName: "Товар",
            productUnit: "шт",
      toOwnerType: null,
      toOwnerId: null,
    }];
    snapshot.productionOrders = [
      {
        id: "p1",
        number: "PO-1",
        plantId: "m1",
        status: "done",
        createdAt: "",
        createdBy: "1",
        expectedEndOn: null,
      },
    ];
    snapshot.adjustments = [
      {
        id: "a1",
        number: "ADJ-1",
        operation: "write_off",
        warehouseId: "w1",
        explanation: "Лишний выпуск",
        sourceDocumentType: "output",
        sourceDocumentId: "o1",
        status: "posted",
        createdAt: "",
        createdBy: "1",
      },
    ];
    snapshot.adjustmentLines = [{ id: "al1", adjustmentId: "a1", productId: "7", quantity: 2 }];
    const added: StockTransaction = {
      id: "tx1",
      createdAt: "",
      productId: "7",
      quantity: 10,
      locationType: "warehouse",
      locationId: "w1",
      assignedToType: null,
      assignedToId: null,
      documentType: "output",
      documentId: "o1",
      stockState: "free",
      ownerType: null,
      ownerId: null,
    };
    snapshot.transactions = [added];

    const balances = [reservedBalance("7", "w1", 4), freeBalance("7", "w2", 8), freeBalance("7", "w1", 6)];

    const reverseReserve = projectDocumentCancelGuidance({ type: "reservation", id: "r1" }, snapshot, balances);
    assert.deepEqual(reverseReserve.reservationPreset, {
      locationType: "warehouse",
      locationId: "w1",
      toOwnerType: null,
      toOwnerId: null,
      fromOwnerType: "order",
      fromOwnerId: "12",
      productId: "7",
    });
    assert.equal(reverseReserve.actions[0]?.enabled, true);

    const shipment = projectDocumentCancelGuidance({ type: "shipment", id: "s1" }, snapshot, balances);
    assert.equal(shipment.returnShipmentId, "s1");
    assert.equal(shipment.actions[0]?.enabled, true);

    const ret = projectDocumentCancelGuidance({ type: "return", id: "ret1" }, snapshot, balances);
    assert.equal(ret.shipmentOrderId, "12");
    assert.equal(ret.actions[0]?.id, "open-shipment");
    assert.equal(ret.actions[0]?.enabled, true);

    const transfer = projectDocumentCancelGuidance({ type: "transfer", id: "t1" }, snapshot, balances);
    assert.deepEqual(transfer.transferPreset, {
      fromWarehouseId: "w2",
      toWarehouseId: "w1",
      lines: [{ productId: "7", quantity: 8 }],
    });

    const output = projectDocumentCancelGuidance({ type: "output", id: "o1" }, snapshot, balances);
    assert.equal(output.adjustmentPreset?.operation, "decrease");
    assert.equal(output.adjustmentPreset?.warehouseId, "w1");
    assert.equal(output.adjustmentPreset?.sourceDocumentType, "output");

    const adjustment = projectDocumentCancelGuidance({ type: "adjustment", id: "a1" }, snapshot, balances);
    assert.equal(adjustment.adjustmentPreset?.operation, "increase");
    assert.equal(adjustment.adjustmentPreset?.warehouseId, "w1");
  });

  it("через снимок блокирует недоступный откат и скрывает закрытые заказы", () => {
    const snapshot = emptySnapshot();
    snapshot.reservations = [
      {
        id: "r-shipped",
        number: "RSV-2",
        locationType: "warehouse",
        locationId: "w1",
        toOwnerType: "order",
        toOwnerId: "12",
        status: "posted",
        origin: "manual",
        note: "",
        createdAt: "",
        createdBy: "1",
      },
    ];
    snapshot.reservationLines = [
      {
        id: "rl-empty",
        reservationId: "r-shipped",
        productId: "7",
        quantity: 8,
        fromOwnerType: null,
        fromOwnerId: null,
      },
      {
        id: "rl-left",
        reservationId: "r-shipped",
        productId: "8",
        quantity: 3,
        fromOwnerType: null,
        fromOwnerId: null,
      },
    ];
    snapshot.shipments = [
      {
        id: "s-empty",
        number: "SHP-2",
        customerOrderId: "12",
        fromLocationType: "warehouse",
        fromLocationId: "w1",
        toLocationType: "customer_order",
        toLocationId: "12",
        createdAt: "",
        createdBy: "1",
      },
    ];
    snapshot.shipmentLines = [
      { id: "sl-empty", shipmentId: "s-empty", productId: "7", quantity: 4, toOwnerType: "order", toOwnerId: "12" },
    ];
    snapshot.transfers = [
      {
        id: "t-reserved",
        number: "TR-2",
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
        status: "delivered",
        createdAt: "",
        createdBy: "1",
        expectedEndOn: null,
      },
    ];
    snapshot.warehouses.push({ id: "w2", code: "WH-2", name: "Другой", plantId: null });
    snapshot.transferLines = [{ id: "tl-reserved", transferId: "t-reserved", productId: "7", quantity: 8 }];
    snapshot.customerOrders = [
      {
        id: "c-open",
        number: "OMS-1",
        status: "open",
        createdAt: "",
        createdBy: "1",
        expectedEndOn: null,
        description: "",
      },
      {
        id: "c-closed",
        number: "OMS-2",
        status: "closed",
        createdAt: "",
        createdBy: "1",
        expectedEndOn: null,
        description: "",
      },
    ];
    snapshot.productionOrders = [
      {
        id: "p-open",
        number: "PO-2",
        plantId: "m1",
        status: "in_progress",
        createdAt: "",
        createdBy: "1",
        expectedEndOn: null,
      },
      {
        id: "p-closed",
        number: "PO-3",
        plantId: "m1",
        status: "closed",
        createdAt: "",
        createdBy: "1",
        expectedEndOn: null,
      },
    ];

    const shippedReservation = projectDocumentCancelGuidance(
      { type: "reservation", id: "r-shipped" },
      snapshot,
      [shippedBalance("7", "12", 8), reservedBalance("8", "w1", 3)],
    );
    assert.equal(shippedReservation.mode, "guidance");
    assert.equal(shippedReservation.actions[0]?.enabled, true);
    assert.equal(shippedReservation.reservationPreset?.productId, "8");

    const fullyShippedReservation = projectDocumentCancelGuidance(
      { type: "reservation", id: "r-shipped" },
      snapshot,
      [shippedBalance("7", "12", 8), shippedBalance("8", "12", 3)],
    );
    assert.equal(fullyShippedReservation.actions[0]?.enabled, false);
    assert.equal(fullyShippedReservation.actions[0]?.blockedReason, CANCEL_GUIDANCE_BLOCKED.needReturn);

    const emptyShipment = projectDocumentCancelGuidance({ type: "shipment", id: "s-empty" }, snapshot, []);
    assert.equal(emptyShipment.actions[0]?.enabled, true);
    assert.equal(emptyShipment.actions[0]?.id, "open-return");

    const reservedTransfer = projectDocumentCancelGuidance(
      { type: "transfer", id: "t-reserved" },
      snapshot,
      [reservedBalance("7", "w2", 8)],
    );
    assert.equal(reservedTransfer.actions[0]?.enabled, false);
    assert.equal(reservedTransfer.actions[0]?.blockedReason, CANCEL_GUIDANCE_BLOCKED.needFreeAtDest);

    const openCustomer = projectDocumentCancelGuidance({ type: "customer_order", id: "c-open" }, snapshot, []);
    assert.equal(openCustomer.mode, "guidance");
    assert.equal(openCustomer.actions[0]?.id, "close-customer-order");
    assert.equal(openCustomer.closeEffects, CANCEL_GUIDANCE_CUSTOMER_CLOSE);

    assert.equal(
      projectDocumentCancelGuidance({ type: "customer_order", id: "c-closed" }, snapshot, []).mode,
      "hidden",
    );

    const openProduction = projectDocumentCancelGuidance({ type: "production_order", id: "p-open" }, snapshot, []);
    assert.equal(openProduction.mode, "guidance");
    assert.equal(openProduction.actions[0]?.id, "close-production-order");
    assert.equal(openProduction.closeEffects, CANCEL_GUIDANCE_PRODUCTION_CLOSE);

    assert.equal(
      projectDocumentCancelGuidance({ type: "production_order", id: "p-closed" }, snapshot, []).mode,
      "hidden",
    );
  });
});
