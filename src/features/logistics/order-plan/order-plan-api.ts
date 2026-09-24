import {
  mapOrderPlanPayload,
  type OrderPlanActionKey,
  type OrderPlanPayload,
} from "@/features/logistics/order-plan/order-plan-types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const call = async (name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(error.message);
  }
  if (!data || typeof data !== "object") {
    throw new Error("Supabase returned no data");
  }
  return data as Record<string, unknown>;
};

const idOrNull = (value: string | null) => (value == null ? null : Number(value));

export const createOrderPlan = async (args: {
  customerOrderId: string;
  copyFromPlanId?: string | null;
}): Promise<{ payload: OrderPlanPayload; planId: string }> => {
  const data = await call("store_create_order_plan", {
    p_customer_order_id: Number(args.customerOrderId),
    p_name: null,
    p_copy_from_plan_id: idOrNull(args.copyFromPlanId ?? null),
  });
  return { payload: mapOrderPlanPayload(data), planId: String(data.planId) };
};

export const renameOrderPlan = async (planId: string, name: string): Promise<OrderPlanPayload> =>
  mapOrderPlanPayload(await call("store_rename_order_plan", { p_plan_id: Number(planId), p_name: name }));

export const setOrderPlanArchived = async (planId: string, archived: boolean): Promise<OrderPlanPayload> =>
  mapOrderPlanPayload(
    await call("store_set_order_plan_archived", { p_plan_id: Number(planId), p_archived: archived }),
  );

export const setOrderPlanAction = async (
  planId: string,
  key: OrderPlanActionKey,
  quantity: number,
): Promise<OrderPlanPayload> =>
  mapOrderPlanPayload(
    await call("store_set_order_plan_action", {
      p_plan_id: Number(planId),
      p_kind: key.kind,
      p_product_variant_id: Number(key.variantId),
      p_location_id: idOrNull(key.locationId),
      p_owner_id: idOrNull(key.ownerId),
      p_plant_id: idOrNull(key.plantId),
      p_quantity: quantity,
    }),
  );

export const launchOrderPlan = async (planId: string): Promise<OrderPlanPayload> =>
  mapOrderPlanPayload(await call("store_launch_order_plan", { p_plan_id: Number(planId) }));
