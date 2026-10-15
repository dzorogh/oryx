import { rpc, rpcJson } from "@/features/oms/oms-api";

export const createWarehouse = (args: { name: string; kind?: "hub" | "customer" }) =>
  rpcJson<number | string>("store_create_warehouse", {
    p_name: args.name,
    p_kind: args.kind ?? "customer",
  }).then(String);

export const updateWarehouse = (args: { id: string; name: string; kind?: "hub" | "customer" | "plant" }) =>
  rpc("store_update_warehouse", {
    p_id: Number(args.id),
    p_name: args.name,
    p_kind: args.kind ?? null,
  });

export const createRegion = (args: { name: string }) =>
  rpcJson<number | string>("store_create_region", { p_name: args.name, p_code: null }).then(String);

export const updateRegion = (args: {
  id: string;
  name: string;
  hubWarehouseId?: string | null;
  orderCurrencyId?: string | null;
}) =>
  rpc("store_update_region", {
    p_id: Number(args.id),
    p_name: args.name,
    p_hub_warehouse_id: args.hubWarehouseId == null || args.hubWarehouseId === "" ? null : Number(args.hubWarehouseId),
    p_order_currency_id:
      args.orderCurrencyId == null || args.orderCurrencyId === "" ? null : Number(args.orderCurrencyId),
  });

export const createPlant = (args: { name: string }) =>
  rpcJson<number | string>("store_create_plant", { p_name: args.name }).then(String);

export const updatePlant = (args: { id: string; name: string }) =>
  rpc("store_update_plant", { p_id: Number(args.id), p_name: args.name });
