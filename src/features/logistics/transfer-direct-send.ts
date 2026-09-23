import { hrefForTransfer } from "@/features/logistics/logistics-availability";
import { resolveOwnerId } from "@/features/logistics/logistics-resolve";
import type { OwnerType } from "@/features/logistics/logistics-types";

export type TransferCreateLine = {
  productId: string;
  quantity: number;
  ownerType?: OwnerType | null;
  ownerId?: string | null;
};

export type TransferCreateAndSendInput = {
  fromWarehouseId: string;
  toWarehouseId: string;
  expectedEndOn?: string | null;
  id?: string;
  createdAt?: string | null;
  lines: TransferCreateLine[];
};

export type TransferCreateAndSendResult = {
  id: string;
  status: "sent";
};

export const freeTransferPayload = (args: {
  fromWarehouseId: string;
  toWarehouseId: string;
  expectedEndOn?: string | null;
  lines: Array<{ productId: string; quantity: number }>;
}): TransferCreateAndSendInput => ({
  fromWarehouseId: args.fromWarehouseId,
  toWarehouseId: args.toWarehouseId,
  expectedEndOn: args.expectedEndOn ?? null,
  lines: args.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  })),
});

export const orderOwnedTransferPayload = (args: {
  fromWarehouseId: string;
  toWarehouseId: string;
  expectedEndOn?: string | null;
  customerOrderId: string;
  lines: Array<{ productId: string; quantity: number }>;
}): TransferCreateAndSendInput => ({
  fromWarehouseId: args.fromWarehouseId,
  toWarehouseId: args.toWarehouseId,
  expectedEndOn: args.expectedEndOn ?? null,
  lines: args.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    ownerType: "order",
    ownerId: args.customerOrderId,
  })),
});

export const transferCreateRpcArgs = async (
  input: TransferCreateAndSendInput,
): Promise<Record<string, unknown>> => {
  const lines = await Promise.all(
    input.lines.map(async (line) => ({
      product_variant_id: Number(line.productId),
      quantity: line.quantity,
      owner_id: Number(await resolveOwnerId(line.ownerType ?? null, line.ownerId ?? null)),
    })),
  );
  return {
    p_from_warehouse_id: Number(input.fromWarehouseId),
    p_to_warehouse_id: Number(input.toWarehouseId),
    p_expected_end_on: input.expectedEndOn || null,
    p_id: input.id ? Number(input.id) : null,
    p_created_at: input.createdAt || null,
    p_lines: lines,
  };
};

export const transferCreateSuccessHref = (transferId: string, sequenceNumber?: string): string =>
  hrefForTransfer(sequenceNumber ?? transferId);

export const openSentTransfer = (
  created: { id: string; sequenceNumber?: string },
  navigate?: (href: string) => void,
): string => {
  const href = hrefForTransfer(created.sequenceNumber ?? created.id);
  navigate?.(href);
  return href;
};
