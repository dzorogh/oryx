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

const emptySnapshot = (): LogisticsSnapshot => ({
  products: [],
  manufacturers: [{ id: "m1", code: "PLT-1", name: "Завод", warehouseId: "w1" }],
  warehouses: [{ id: "w1", code: "WH-1", name: "Склад", manufacturerId: "m1" }],
  regions: [],
  settings: { id: "1", codePrefixes: { ...LOGISTICS_CODE_PREFIXES } },
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
  returns: [],
  returnLines: [],
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

  it("для проведённого возврата предлагает снова зарезервировать свободный товар", () => {
    const guidance = projectCancelGuidance(facts({ type: "return", status: "posted" }));
    commonCopyPresent(guidance);
    assert.equal(guidance.actions[0]?.id, "open-reservation");
    assert.equal(guidance.actions[0]?.label, "Зарезервировать снова");
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

  it("для активного заказа на производство описывает снятие резервов и сохранение выпусков", () => {
    const guidance = projectCancelGuidance(facts({ type: "production_order", status: "in_progress" }));
    commonCopyPresent(guidance);
    assert.equal(guidance.actions[0]?.id, "close-production-order");
    assert.equal(guidance.actions[0]?.label, "Закрыть заказ");
    assert.equal(guidance.closeEffects, CANCEL_GUIDANCE_PRODUCTION_CLOSE);
    assert.match(guidance.closeEffects ?? "", /незавершённого производства/);
    assert.match(guidance.closeEffects ?? "", /выпуски сохранятся/);
  });

  it("для безопасного черновика подтверждает только смену статуса", () => {
    const shipment = projectCancelGuidance(facts({ type: "shipment", status: "draft" }));
    assert.equal(shipment.mode, "safe-cancel");
    assert.equal(shipment.cancelRpcKind, "shipment");
    assert.equal(shipment.actions[0]?.id, "confirm-cancel");
    assert.equal(shipment.actions[0]?.label, "Подтвердить отмену");
    assert.equal(shipment.context, CANCEL_GUIDANCE_SAFE_CONFIRM);
    assert.doesNotThrow(() => assertDocumentCanBeCancelled("shipment", "draft"));

    const ret = projectCancelGuidance(facts({ type: "return", status: "draft" }));
    assert.equal(ret.cancelRpcKind, "shipment_return");
    assert.doesNotThrow(() => assertDocumentCanBeCancelled("shipment_return", "draft"));

    const output = projectCancelGuidance(facts({ type: "output", status: "planned" }));
    assert.equal(output.cancelRpcKind, "production_output");
    assert.doesNotThrow(() => assertDocumentCanBeCancelled("production_output", "planned"));
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
    assert.equal(emptyShipment.actions[0]?.enabled, false);
    assert.equal(emptyShipment.actions[0]?.blockedReason, CANCEL_GUIDANCE_BLOCKED.nothingToReturn);

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
    const reservation: Reservation = {
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
    const reservationLine: ReservationLine = {
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
        warehouseId: "w1",
        status: "posted",
        createdAt: "",
        createdBy: "1",
      },
    ];
    snapshot.shipmentLines = [{ id: "sl1", shipmentId: "s1", productId: "7", quantity: 4 }];
    snapshot.returns = [
      { id: "ret1", number: "RET-1", shipmentId: "s1", status: "posted", createdAt: "", createdBy: "1" },
    ];
    snapshot.returnLines = [{ id: "retl1", returnId: "ret1", shipmentLineId: "sl1", quantity: 2 }];
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
    snapshot.warehouses.push({ id: "w2", code: "WH-2", name: "Другой", manufacturerId: null });
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
    snapshot.outputLines = [{ id: "ol1", outputId: "o1", productionOrderLineId: "pl1", productId: "7", quantity: 10 }];
    snapshot.productionOrders = [
      {
        id: "p1",
        number: "PO-1",
        manufacturerId: "m1",
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
    assert.equal(ret.reservationPreset?.toOwnerType, "order");
    assert.equal(ret.reservationPreset?.locationId, "w1");
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
});
