import {
  shipmentDirection,
  type LocationType,
  type OwnerType,
  type Shipment,
  type ShipmentDirection,
} from "@/features/logistics/logistics-types";
import { resolveOwnerId, resolveStockLocationId } from "@/features/logistics/logistics-resolve";

export type ShipmentLineInput = {
  productId: string;
  quantity: number;
  toOwnerType?: OwnerType | null;
  toOwnerId?: string | null;
};

export type ShipmentCreateAndPostInput = {
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

export const returnDestinationKey = (
  line: Pick<ShipmentLineInput, "productId" | "toOwnerType" | "toOwnerId">,
): string => `${line.productId}:${line.toOwnerType ?? ""}:${line.toOwnerId ?? ""}`;

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

export const shipmentCreateRpcArgs = async (
  input: ShipmentCreateAndPostInput,
): Promise<Record<string, unknown>> => {
  shipmentDirection(input.fromLocationType, input.toLocationType);
  const fromLocationId = await resolveStockLocationId(input.fromLocationType, input.fromLocationId);
  const toLocationId = await resolveStockLocationId(input.toLocationType, input.toLocationId);
  const lines = await Promise.all(
    input.lines.map(async (line) => ({
      product_variant_id: Number(line.productId),
      quantity: line.quantity,
      to_owner_id: line.toOwnerId
        ? Number(await resolveOwnerId(line.toOwnerType ?? null, line.toOwnerId))
        : null,
    })),
  );
  return {
    p_from_location_id: Number(fromLocationId),
    p_to_location_id: Number(toLocationId),
    p_lines: lines,
    p_id: input.id ? Number(input.id) : null,
    p_created_at: input.createdAt || null,
  };
};

/** Test helper: build args without resolving stock ids (entity ids passed as location ids). */
export const shipmentCreateRpcArgsSync = (input: ShipmentCreateAndPostInput): Record<string, unknown> => ({
  p_from_location_id: Number(input.fromLocationId),
  p_to_location_id: Number(input.toLocationId),
  p_lines: input.lines.map((line) => ({
    product_variant_id: Number(line.productId),
    quantity: line.quantity,
    to_owner_id: line.toOwnerId ? Number(line.toOwnerId) : null,
  })),
});
