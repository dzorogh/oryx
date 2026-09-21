import {
  freeAtPlace,
  remainingToReturnForOrderProduct,
  reservationCapForOwner,
  reservedAtPlaceForOwner,
} from "@/features/logistics/logistics-availability";
import { freeWarehouseQuantity, type AdjustmentSourceDocumentType } from "@/features/logistics/logistics-adjustments";
import { manufacturerById } from "@/features/logistics/logistics-lookups";
import {
  reservationDirection,
  shipmentDirection,
  shipmentWarehouseId,
  type AdjustmentOperation,
  type LogisticsSnapshot,
  type OwnerType,
  type ReservationDirection,
  type ReservationLocationType,
  type StockBalance,
} from "@/features/logistics/logistics-types";

export const CANCEL_GUIDANCE_LEAD =
  "Система учитывает количества без серий и партий. После других движений нельзя определить исходные единицы. Удаление старых проводок способно создать отрицательный остаток.";

export const CANCEL_GUIDANCE_EXAMPLE =
  "Пример: выпуск добавил 10 единиц, 8 переместили, осталось 2. Удаление исходных +10 даст −8.";

export const CANCEL_GUIDANCE_HISTORY =
  "Открытие этого окна ничего не меняет. Каждое исправление создаёт новый предметный документ и сохраняет исходную историю.";

export const CANCEL_GUIDANCE_CUSTOMER_CLOSE =
  "Закрытие заказа снимет текущие резервы этого заказа. Уже отгруженный товар и связанные документы — выпуски, перемещения, отгрузки и возвраты — сохранятся. Система не отменяет и не откатывает связанные документы.";

export const CANCEL_GUIDANCE_PRODUCTION_CLOSE =
  "Закрытие заказа на производство снимет резервы на этом месте и удалит остаток незавершённого производства. Завершённые выпуски сохранятся. Система не отменяет и не откатывает связанные документы.";

export const CANCEL_GUIDANCE_SAFE_CONFIRM =
  "У этого документа ещё нет проводок. Подтверждение меняет только статус. Журнал и остатки не изменятся.";

export const CANCEL_GUIDANCE_BLOCKED = {
  needReturn:
    "Сначала оформите возврат отгрузки — товар уже уехал к клиенту и его нельзя снять этим документом.",
  needRelease: "Сначала снимите резерв, чтобы товар снова стал свободным.",
  needDeliver:
    "Сначала отметьте перемещение доставленным. После фактической доставки можно оформить обратное перемещение.",
  needReturnToPlace:
    "Сначала верните количество в исходное место: снимите более поздний резерв, примите перемещение или оформите возврат.",
  needFreeAtDest: "Сначала снимите резерв на складе назначения или верните туда свободный остаток.",
  nothingToReturn:
    "Возвращать нечего: количество уже вернули. Если нужно снова занять товар, создайте резерв свободного остатка.",
  nothingToReserve:
    "Свободного возвращённого товара нет. Сначала снимите более поздний резерв или верните товар на склад отгрузки.",
  nothingToAdjust:
    "Свободного остатка на складе нет. Сначала снимите резерв, примите перемещение или оформите возврат.",
} as const;

export type CancelGuidanceMode = "hidden" | "safe-cancel" | "guidance";

export type CancelGuidanceSubjectType =
  | "reservation"
  | "shipment"
  | "return"
  | "transfer"
  | "output"
  | "adjustment"
  | "customer_order"
  | "production_order";

export type CancelGuidanceSubject = {
  type: CancelGuidanceSubjectType;
  id: string;
};

export type CancelGuidanceActionId =
  | "confirm-cancel"
  | "open-reservation"
  | "open-return"
  | "open-shipment"
  | "open-adjustment"
  | "open-reverse-transfer"
  | "mark-delivered"
  | "close-customer-order"
  | "close-production-order";

export type CancelGuidanceAction = {
  id: CancelGuidanceActionId;
  label: string;
  enabled: boolean;
  blockedReason?: string;
};

export type CancelGuidanceReservationPreset = {
  locationType: ReservationLocationType;
  locationId: string;
  toOwnerType: OwnerType | null;
  toOwnerId: string | null;
  fromOwnerType: OwnerType | null;
  fromOwnerId: string | null;
  productId?: string;
};

export type CancelGuidanceAdjustmentPreset = {
  operation: AdjustmentOperation;
  warehouseId?: string;
  sourceDocumentType?: AdjustmentSourceDocumentType;
  sourceDocumentId?: string;
  productId?: string;
};

export type CancelGuidanceTransferPreset = {
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: Array<{ productId: string; quantity: number }>;
};

export type SafeCancelRpcKind = "shipment" | "shipment_return" | "production_output";

export type CancelGuidance = {
  mode: CancelGuidanceMode;
  title: string;
  lead: string;
  example: string;
  history: string;
  context: string;
  closeEffects?: string;
  actions: CancelGuidanceAction[];
  documentId: string;
  cancelRpcKind?: SafeCancelRpcKind;
  cancelStatus?: string;
  reservationPreset?: CancelGuidanceReservationPreset;
  adjustmentPreset?: CancelGuidanceAdjustmentPreset;
  transferPreset?: CancelGuidanceTransferPreset;
  returnShipmentId?: string;
  shipmentOrderId?: string;
};

export type CancelGuidanceFacts = {
  type: CancelGuidanceSubjectType;
  id: string;
  status: string;
  reservationDirection?: ReservationDirection;
  availableQuantity: number;
  reservedQuantity: number;
  shippedQuantity?: number;
  transferInTransit?: boolean;
  adjustmentOperation?: AdjustmentOperation;
};

const hiddenGuidance = (id: string): CancelGuidance => ({
  mode: "hidden",
  title: "",
  lead: "",
  example: "",
  history: "",
  context: "",
  actions: [],
  documentId: id,
});

const withCommon = (
  partial: Omit<CancelGuidance, "lead" | "example" | "history">,
): CancelGuidance => ({
  ...partial,
  lead: CANCEL_GUIDANCE_LEAD,
  example: CANCEL_GUIDANCE_EXAMPLE,
  history: CANCEL_GUIDANCE_HISTORY,
});

const isTerminalStatus = (status: string): boolean => status === "cancelled" || status === "closed";

const action = (
  id: CancelGuidanceActionId,
  label: string,
  enabled: boolean,
  blockedReason?: string,
): CancelGuidanceAction =>
  enabled || !blockedReason ? { id, label, enabled } : { id, label, enabled, blockedReason };

export const oppositeAdjustmentOperation = (operation: AdjustmentOperation): AdjustmentOperation =>
  operation === "increase" ? "decrease" : "increase";

export const reservationFollowUpLabel = (direction: ReservationDirection): string => {
  if (direction === "reserve") {
    return "Снять резерв";
  }
  if (direction === "release") {
    return "Зарезервировать снова";
  }
  return "Переназначить";
};

export const projectCancelGuidance = (facts: CancelGuidanceFacts): CancelGuidance => {
  if (isTerminalStatus(facts.status)) {
    return hiddenGuidance(facts.id);
  }

  if (facts.type === "reservation") {
    if (facts.status !== "posted") {
      return hiddenGuidance(facts.id);
    }
    const direction = facts.reservationDirection ?? "reserve";
    const blockedReason = reservationBlockedReason(facts);
    return withCommon({
      mode: "guidance",
      title: "Проведённый резерв нельзя отменить",
      context:
        "Проведённый резерв уже изменил владельца остатка. Чтобы вернуть количество, создайте новый резерв с обратным направлением и текущими лимитами.",
      documentId: facts.id,
      actions: [action("open-reservation", reservationFollowUpLabel(direction), facts.availableQuantity > 0, blockedReason)],
    });
  }

  if (facts.type === "shipment") {
    return withCommon({
      mode: "guidance",
      title: "Проведённую отгрузку нельзя отменить",
      context:
        "Отгрузка уже списала резерв заказа. Чтобы вернуть товар на склад, создайте документ обратного маршрута — исходная отгрузка останется в истории.",
      documentId: facts.id,
      returnShipmentId: facts.id,
      shipmentOrderId: facts.id,
      actions: [action("open-return", "Создать возврат", true)],
    });
  }

  if (facts.type === "return") {
    return withCommon({
      mode: "guidance",
      title: "Проведённый возврат нельзя отменить",
      context:
        "Возврат уже вернул товар на склад. Чтобы снова отгрузить его, создайте документ обратного маршрута — исходный возврат не изменится.",
      documentId: facts.id,
      shipmentOrderId: facts.id,
      actions: [action("open-shipment", "Создать отгрузку", true)],
    });
  }

  if (facts.type === "transfer") {
    if (facts.status === "sent") {
      return withCommon({
        mode: "guidance",
        title: "Отправленное перемещение нельзя отменить",
        context: CANCEL_GUIDANCE_BLOCKED.needDeliver,
        documentId: facts.id,
        actions: [action("mark-delivered", "Отметить доставленным", true)],
      });
    }
    if (facts.status !== "delivered") {
      return hiddenGuidance(facts.id);
    }
    return withCommon({
      mode: "guidance",
      title: "Доставленное перемещение нельзя отменить",
      context:
        "Доставка уже скопировала текущих владельцев на склад назначения. Чтобы вернуть товар, создайте новое перемещение с переставленными складами.",
      documentId: facts.id,
      actions: [
        action(
          "open-reverse-transfer",
          "Создать обратное перемещение",
          facts.availableQuantity > 0,
          transferBlockedReason(facts),
        ),
      ],
    });
  }

  if (facts.type === "output") {
    if (facts.status === "planned") {
      return safeCancelGuidance(facts.id, facts.status, "production_output", "выпуск");
    }
    if (facts.status !== "done") {
      return hiddenGuidance(facts.id);
    }
    return withCommon({
      mode: "guidance",
      title: "Завершённый выпуск нельзя отменить",
      context:
        "Выпуск уже добавил свободный остаток. Чтобы убрать лишнее, создайте корректировку текущего свободного остатка — исходный выпуск и показатель «Произведено» не изменятся.",
      documentId: facts.id,
      actions: [
        action("open-adjustment", "Создать корректировку", facts.availableQuantity > 0, outputBlockedReason(facts)),
      ],
    });
  }

  if (facts.type === "adjustment") {
    const opposite = oppositeAdjustmentOperation(facts.adjustmentOperation ?? "decrease");
    const increaseBack = opposite === "increase";
    return withCommon({
      mode: "guidance",
      title: "Проведённую корректировку нельзя отменить",
      context:
        "Корректировка уже записала новые факты журнала. Создайте новую противоположную операцию по текущему свободному остатку — исходный документ не изменится.",
      documentId: facts.id,
      actions: [
        action(
          "open-adjustment",
          "Создать корректировку",
          increaseBack || facts.availableQuantity > 0,
          CANCEL_GUIDANCE_BLOCKED.nothingToAdjust,
        ),
      ],
    });
  }

  if (facts.type === "customer_order") {
    if (facts.status !== "open") {
      return hiddenGuidance(facts.id);
    }
    return withCommon({
      mode: "guidance",
      title: "Заказ клиента нельзя откатить",
      context: "Заказ сам остатки не меняет, но закрытие освобождает только его текущие резервы.",
      closeEffects: CANCEL_GUIDANCE_CUSTOMER_CLOSE,
      documentId: facts.id,
      actions: [action("close-customer-order", "Закрыть заказ", true)],
    });
  }

  if (facts.type === "production_order") {
    return withCommon({
      mode: "guidance",
      title: "Заказ на производство нельзя откатить",
      context: "Закрытие меняет текущий остаток на месте заказа, но не удаляет уже сделанные выпуски.",
      closeEffects: CANCEL_GUIDANCE_PRODUCTION_CLOSE,
      documentId: facts.id,
      actions: [action("close-production-order", "Закрыть заказ", true)],
    });
  }

  return hiddenGuidance(facts.id);
};

const safeCancelGuidance = (
  id: string,
  status: string,
  cancelRpcKind: SafeCancelRpcKind,
  noun: string,
): CancelGuidance =>
  withCommon({
    mode: "safe-cancel",
    title: `Отменить ${noun}?`,
    context: CANCEL_GUIDANCE_SAFE_CONFIRM,
    documentId: id,
    cancelRpcKind,
    cancelStatus: status,
    actions: [action("confirm-cancel", "Подтвердить отмену", true)],
  });

const reservationBlockedReason = (facts: CancelGuidanceFacts): string | undefined => {
  if (facts.availableQuantity > 0) {
    return undefined;
  }
  if ((facts.shippedQuantity ?? 0) > 0) {
    return CANCEL_GUIDANCE_BLOCKED.needReturn;
  }
  return CANCEL_GUIDANCE_BLOCKED.needReturnToPlace;
};

const transferBlockedReason = (facts: CancelGuidanceFacts): string =>
  facts.reservedQuantity > 0 ? CANCEL_GUIDANCE_BLOCKED.needFreeAtDest : CANCEL_GUIDANCE_BLOCKED.needReturnToPlace;

const outputBlockedReason = (facts: CancelGuidanceFacts): string =>
  facts.reservedQuantity > 0 ? CANCEL_GUIDANCE_BLOCKED.needRelease : CANCEL_GUIDANCE_BLOCKED.nothingToAdjust;

export const projectDocumentCancelGuidance = (
  subject: CancelGuidanceSubject,
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
): CancelGuidance => {
  const facts = cancelGuidanceFactsFromSnapshot(subject, snapshot, balances);
  if (!facts) {
    return hiddenGuidance(subject.id);
  }
  const guidance = projectCancelGuidance(facts);
  return attachPresets(guidance, subject, snapshot, balances);
};

export const cancelGuidanceFactsFromSnapshot = (
  subject: CancelGuidanceSubject,
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
): CancelGuidanceFacts | null => {
  if (subject.type === "reservation") {
    const doc = snapshot.reservations.find((item) => item.id === subject.id);
    if (!doc) {
      return null;
    }
    const lines = snapshot.reservationLines.filter((line) => line.reservationId === doc.id);
    const direction = reservationDirection(doc, lines);
    const availability = reservationReverseAvailability(doc, lines, balances);
    return {
      type: "reservation",
      id: doc.id,
      status: doc.status,
      reservationDirection: direction,
      availableQuantity: availability.quantity,
      reservedQuantity: availability.reservedQuantity,
      shippedQuantity: availability.shippedQuantity,
    };
  }

  if (subject.type === "shipment" || subject.type === "return") {
    const doc = snapshot.shipments.find((item) => item.id === subject.id);
    if (!doc) {
      return null;
    }
    const direction = shipmentDirection(doc.fromLocationType, doc.toLocationType);
    const lines = snapshot.shipmentLines.filter((line) => line.shipmentId === doc.id);
    const warehouseId = shipmentWarehouseId(doc);
    if (direction === "shipment") {
      const availableQuantity = lines.reduce(
        (sum, line) => sum + remainingToReturnForOrderProduct(balances, doc.customerOrderId, line.productId),
        0,
      );
      return {
        type: "shipment",
        id: doc.id,
        status: "posted",
        availableQuantity,
        reservedQuantity: 0,
      };
    }
    const availableQuantity = lines.reduce(
      (sum, line) =>
        sum +
        reservedAtPlaceForOwner(balances, line.productId, "warehouse", warehouseId, "order", doc.customerOrderId),
      0,
    );
    return {
      type: "return",
      id: doc.id,
      status: "posted",
      availableQuantity,
      reservedQuantity: availableQuantity,
    };
  }

  if (subject.type === "transfer") {
    const doc = snapshot.transfers.find((item) => item.id === subject.id);
    if (!doc) {
      return null;
    }
    const lines = snapshot.transferLines.filter((line) => line.transferId === doc.id);
    const availableQuantity = lines.reduce(
      (sum, line) => sum + freeAtPlace(balances, line.productId, "warehouse", doc.toWarehouseId),
      0,
    );
    const reservedQuantity = lines.reduce(
      (sum, line) =>
        sum +
        balances
          .filter(
            (entry) =>
              entry.productId === line.productId &&
              entry.locationType === "warehouse" &&
              entry.locationId === doc.toWarehouseId &&
              entry.stockState === "reserved",
          )
          .reduce((inner, entry) => inner + entry.quantity, 0),
      0,
    );
    return {
      type: "transfer",
      id: doc.id,
      status: doc.status,
      availableQuantity,
      reservedQuantity,
      transferInTransit: doc.status === "sent",
    };
  }

  if (subject.type === "output") {
    const doc = snapshot.outputs.find((item) => item.id === subject.id);
    if (!doc) {
      return null;
    }
    const place = outputStockPlace(snapshot, doc.id, doc.productionOrderId);
    const lines = snapshot.outputLines.filter((line) => line.outputId === doc.id);
    const availableQuantity = place
      ? lines.reduce((sum, line) => sum + freeAtPlace(balances, line.productId, place.locationType, place.locationId), 0)
      : 0;
    const reservedQuantity = place
      ? lines.reduce(
          (sum, line) =>
            sum +
            balances
              .filter(
                (entry) =>
                  entry.productId === line.productId &&
                  entry.locationType === place.locationType &&
                  entry.locationId === place.locationId &&
                  entry.stockState === "reserved",
              )
              .reduce((inner, entry) => inner + entry.quantity, 0),
          0,
        )
      : 0;
    return {
      type: "output",
      id: doc.id,
      status: doc.status,
      availableQuantity,
      reservedQuantity,
    };
  }

  if (subject.type === "adjustment") {
    const doc = snapshot.adjustments.find((item) => item.id === subject.id);
    if (!doc) {
      return null;
    }
    const lines = snapshot.adjustmentLines.filter((line) => line.adjustmentId === doc.id);
    const availableQuantity = lines.reduce(
      (sum, line) => sum + freeWarehouseQuantity(balances, line.productId, doc.warehouseId),
      0,
    );
    return {
      type: "adjustment",
      id: doc.id,
      status: doc.status,
      availableQuantity,
      reservedQuantity: 0,
      adjustmentOperation: doc.operation,
    };
  }

  if (subject.type === "customer_order") {
    const doc = snapshot.customerOrders.find((item) => item.id === subject.id);
    if (!doc) {
      return null;
    }
    return {
      type: "customer_order",
      id: doc.id,
      status: doc.status,
      availableQuantity: 0,
      reservedQuantity: 0,
    };
  }

  const doc = snapshot.productionOrders.find((item) => item.id === subject.id);
  if (!doc) {
    return null;
  }
  return {
    type: "production_order",
    id: doc.id,
    status: doc.status,
    availableQuantity: 0,
    reservedQuantity: 0,
  };
};

const reservationReverseAvailability = (
  doc: {
    locationType: ReservationLocationType;
    locationId: string;
    toOwnerType: OwnerType | null;
    toOwnerId: string | null;
  },
  lines: Array<{ productId: string; fromOwnerType: OwnerType | null; fromOwnerId: string | null }>,
  balances: StockBalance[],
): { quantity: number; reservedQuantity: number; shippedQuantity: number } => {
  const direction = reservationDirection(doc, lines);
  let quantity = 0;
  let reservedQuantity = 0;
  let shippedQuantity = 0;
  for (const line of lines) {
    const reverse = reverseReservationOwners(direction, doc, line);
    quantity += reservationCapForOwner(
      balances,
      line.productId,
      doc.locationType,
      doc.locationId,
      reverse.fromOwnerType,
      reverse.fromOwnerId,
      reverse.toOwnerType,
      reverse.toOwnerId,
    );
    reservedQuantity += reservedAtPlaceForOwner(
      balances,
      line.productId,
      doc.locationType,
      doc.locationId,
      doc.toOwnerType,
      doc.toOwnerId,
    );
    shippedQuantity += balances
      .filter(
        (entry) =>
          entry.productId === line.productId &&
          entry.locationType === "customer_order" &&
          entry.stockState === "shipped" &&
          entry.ownerType === doc.toOwnerType &&
          entry.ownerId === doc.toOwnerId,
      )
      .reduce((sum, entry) => sum + entry.quantity, 0);
  }
  return { quantity, reservedQuantity, shippedQuantity };
};

const reverseReservationOwners = (
  direction: ReservationDirection,
  doc: { toOwnerType: OwnerType | null; toOwnerId: string | null },
  line: { fromOwnerType: OwnerType | null; fromOwnerId: string | null },
): {
  fromOwnerType: OwnerType | null;
  fromOwnerId: string | null;
  toOwnerType: OwnerType | null;
  toOwnerId: string | null;
} => {
  if (direction === "reserve") {
    return {
      fromOwnerType: doc.toOwnerType,
      fromOwnerId: doc.toOwnerId,
      toOwnerType: null,
      toOwnerId: null,
    };
  }
  if (direction === "release") {
    return {
      fromOwnerType: null,
      fromOwnerId: null,
      toOwnerType: line.fromOwnerType,
      toOwnerId: line.fromOwnerId,
    };
  }
  return {
    fromOwnerType: doc.toOwnerType,
    fromOwnerId: doc.toOwnerId,
    toOwnerType: line.fromOwnerType,
    toOwnerId: line.fromOwnerId,
  };
};

const outputStockPlace = (
  snapshot: LogisticsSnapshot,
  outputId: string,
  productionOrderId: string,
): { locationType: "warehouse" | "production_order"; locationId: string } | null => {
  const added = snapshot.transactions.find(
    (entry) => entry.documentType === "output" && entry.documentId === outputId && entry.quantity > 0,
  );
  if (added && (added.locationType === "warehouse" || added.locationType === "production_order")) {
    return { locationType: added.locationType, locationId: added.locationId };
  }
  const production = snapshot.productionOrders.find((item) => item.id === productionOrderId);
  const warehouseId = production ? manufacturerById(snapshot, production.manufacturerId)?.warehouseId : undefined;
  if (warehouseId) {
    return { locationType: "warehouse", locationId: warehouseId };
  }
  return null;
};

const firstAvailable = <T,>(items: T[], hasQty: (item: T) => boolean): T | undefined =>
  items.find(hasQty) ?? items[0];

const attachPresets = (
  guidance: CancelGuidance,
  subject: CancelGuidanceSubject,
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
): CancelGuidance => {
  if (guidance.mode === "hidden") {
    return guidance;
  }

  if (subject.type === "reservation") {
    const doc = snapshot.reservations.find((item) => item.id === subject.id);
    const lines = snapshot.reservationLines.filter((line) => line.reservationId === subject.id);
    if (!doc || lines.length === 0) {
      return guidance;
    }
    const direction = reservationDirection(doc, lines);
    const chosen =
      firstAvailable(lines, (line) => {
        const reverse = reverseReservationOwners(direction, doc, line);
        return (
          reservationCapForOwner(
            balances,
            line.productId,
            doc.locationType,
            doc.locationId,
            reverse.fromOwnerType,
            reverse.fromOwnerId,
            reverse.toOwnerType,
            reverse.toOwnerId,
          ) > 0
        );
      }) ?? lines[0];
    const reverse = reverseReservationOwners(direction, doc, chosen);
    return {
      ...guidance,
      reservationPreset: {
        locationType: doc.locationType,
        locationId: doc.locationId,
        toOwnerType: reverse.toOwnerType,
        toOwnerId: reverse.toOwnerId,
        fromOwnerType: reverse.fromOwnerType,
        fromOwnerId: reverse.fromOwnerId,
        productId: chosen.productId,
      },
    };
  }

  if (subject.type === "return" || subject.type === "shipment") {
    const doc = snapshot.shipments.find((item) => item.id === subject.id);
    if (!doc) {
      return guidance;
    }
    return {
      ...guidance,
      returnShipmentId: doc.id,
      shipmentOrderId: doc.customerOrderId,
    };
  }

  if (subject.type === "output") {
    const doc = snapshot.outputs.find((item) => item.id === subject.id);
    const outputLines = snapshot.outputLines.filter((line) => line.outputId === subject.id);
    const place = doc ? outputStockPlace(snapshot, doc.id, doc.productionOrderId) : null;
    const chosen = place
      ? firstAvailable(
          outputLines,
          (line) => freeAtPlace(balances, line.productId, place.locationType, place.locationId) > 0,
        )
      : outputLines[0];
    if (!doc || !chosen || !place || place.locationType !== "warehouse") {
      return {
        ...guidance,
        adjustmentPreset: {
          operation: "decrease",
          sourceDocumentType: "output",
          sourceDocumentId: subject.id,
          productId: chosen?.productId,
        },
      };
    }
    return {
      ...guidance,
      adjustmentPreset: {
        operation: "decrease",
        warehouseId: place.locationId,
        sourceDocumentType: "output",
        sourceDocumentId: doc.id,
        productId: chosen.productId,
      },
    };
  }

  if (subject.type === "adjustment") {
    const doc = snapshot.adjustments.find((item) => item.id === subject.id);
    const adjustmentLines = snapshot.adjustmentLines.filter((line) => line.adjustmentId === subject.id);
    if (!doc) {
      return guidance;
    }
    const opposite = oppositeAdjustmentOperation(doc.operation);
    const chosen =
      opposite === "increase"
        ? adjustmentLines[0]
        : firstAvailable(
            adjustmentLines,
            (line) => freeWarehouseQuantity(balances, line.productId, doc.warehouseId) > 0,
          );
    return {
      ...guidance,
      adjustmentPreset: {
        operation: opposite,
        warehouseId: doc.warehouseId,
        productId: chosen?.productId,
      },
    };
  }

  if (subject.type === "transfer") {
    const doc = snapshot.transfers.find((item) => item.id === subject.id);
    if (!doc) {
      return guidance;
    }
    const lines = snapshot.transferLines
      .filter((line) => line.transferId === doc.id)
      .map((line) => ({
        productId: line.productId,
        quantity: Math.min(
          line.quantity,
          Math.max(0, freeAtPlace(balances, line.productId, "warehouse", doc.toWarehouseId)),
        ),
      }))
      .filter((line) => line.quantity > 0);
    return {
      ...guidance,
      transferPreset: {
        fromWarehouseId: doc.toWarehouseId,
        toWarehouseId: doc.fromWarehouseId,
        lines,
      },
    };
  }

  return guidance;
};
