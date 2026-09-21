import {
  shipmentDirection,
  type LocationType,
  type OwnerType,
  type Shipment,
  type ShipmentDirection,
} from "@/features/logistics/logistics-types";

export type ShipmentLineInput = {
  productId: string;
  quantity: number;
  toOwnerType?: OwnerType | null;
  toOwnerId?: string | null;
};

export type ShipmentCreateAndPostInput = {
  requestKey: string;
  customerOrderId: string;
  fromLocationType: LocationType;
  fromLocationId: string;
  toLocationType: LocationType;
  toLocationId: string;
  lines: ShipmentLineInput[];
  id?: string;
  createdAt?: string | null;
};

export type ShipmentCreateAndPostResult = {
  id: string;
  direction: ShipmentDirection;
};

export const newShipmentRequestKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `shipment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const returnDestinationKey = (line: Pick<ShipmentLineInput, "productId" | "toOwnerType" | "toOwnerId">): string =>
  `${line.productId}:${line.toOwnerType ?? ""}:${line.toOwnerId ?? ""}`;

export const assertUniqueReturnDestinations = (lines: ShipmentLineInput[]): void => {
  const seen = new Set<string>();
  for (const line of lines) {
    const key = returnDestinationKey(line);
    if (seen.has(key)) {
      throw new Error("Одинаковый товар и назначение можно указать только один раз");
    }
    seen.add(key);
  }
};

export const reserveThenShipNextAction = (
  reservationAlreadyCreated: boolean,
): "reserve-then-ship" | "retry-shipment" =>
  reservationAlreadyCreated ? "retry-shipment" : "reserve-then-ship";

export const shipmentIntentionAfterBack = (presetOrderId = "") => ({
  intention: null as ShipmentDirection | null,
  orderId: presetOrderId,
  warehouseId: "",
  reserveThenShip: false,
  reservationId: null as string | null,
});

export const shipmentsForAdjustmentSource = (
  shipments: Array<Pick<Shipment, "id" | "number" | "fromLocationType" | "toLocationType">>,
  kind: ShipmentDirection,
): Array<{ value: string; label: string }> =>
  shipments
    .filter((item) => shipmentDirection(item.fromLocationType, item.toLocationType) === kind)
    .map((item) => ({ value: item.id, label: item.number }));

export const shipmentCreateRpcArgs = (input: ShipmentCreateAndPostInput): Record<string, unknown> => ({
  p_request_key: input.requestKey,
  p_customer_order_id: Number(input.customerOrderId),
  p_from_location_type: input.fromLocationType,
  p_from_location_id: Number(input.fromLocationId),
  p_to_location_type: input.toLocationType,
  p_to_location_id: Number(input.toLocationId),
  p_id: input.id ? Number(input.id) : null,
  p_created_at: input.createdAt || null,
  p_lines: input.lines.map((line) => ({
    product_id: Number(line.productId),
    quantity: line.quantity,
    to_owner_type: line.toOwnerType ?? null,
    to_owner_id: line.toOwnerId ? Number(line.toOwnerId) : null,
  })),
});
