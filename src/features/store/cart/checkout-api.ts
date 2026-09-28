import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { OrderRates } from "@/features/logistics/order-money";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { documentNumber } from "@/features/logistics/logistics-types";

export type CheckoutOrderLineInput = {
  productVariantId: string;
  quantity: number;
  unitPrice: number;
};

export type CheckoutCustomerOrderInput = {
  regionId: string;
  sourceKind: "hub" | "plant";
  sourceId: string;
  lines: CheckoutOrderLineInput[];
  rates?: OrderRates | null;
  description?: string;
};

export type CheckoutCustomerOrderResult = {
  id: string;
  number: string;
  lines: unknown;
};

export const checkoutCustomerOrder = async (
  args: CheckoutCustomerOrderInput,
): Promise<CheckoutCustomerOrderResult> => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase не настроен");
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase не настроен");
  }
  const { data, error } = await client.rpc("store_checkout_customer_order", {
    p_region_id: Number(args.regionId),
    p_source_kind: args.sourceKind,
    p_source_id: Number(args.sourceId),
    p_lines: args.lines.map((line) => ({
      product_variant_id: Number(line.productVariantId),
      quantity: line.quantity,
      unit_price: line.unitPrice,
    })),
    p_rates: args.rates ?? null,
    p_description: args.description ?? "",
  });
  if (error) throw new Error(error.message);
  const payload = data as {
    id: number | string;
    lines: unknown;
    number_prefix?: string | null;
    sequence_number?: number | string | null;
  };
  const number =
    payload.number_prefix && payload.sequence_number != null
      ? documentNumber(payload.number_prefix, payload.sequence_number)
      : formatLogisticsCode("customerOrder", payload.id);
  return { id: String(payload.id), number, lines: payload.lines };
};
