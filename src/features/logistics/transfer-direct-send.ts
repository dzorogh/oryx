import { hrefForTransfer } from "@/features/logistics/logistics-availability";
import type { OwnerType } from "@/features/logistics/logistics-types";

export type TransferCreateLine = {
  productId: string;
  quantity: number;
  ownerType?: OwnerType | null;
  ownerId?: string | null;
};

export type TransferCreateAndSendInput = {
  requestKey: string;
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

export const newTransferRequestKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const freeTransferPayload = (args: {
  requestKey: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  expectedEndOn?: string | null;
  lines: Array<{ productId: string; quantity: number }>;
}): TransferCreateAndSendInput => ({
  requestKey: args.requestKey,
  fromWarehouseId: args.fromWarehouseId,
  toWarehouseId: args.toWarehouseId,
  expectedEndOn: args.expectedEndOn ?? null,
  lines: args.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  })),
});

export const orderOwnedTransferPayload = (args: {
  requestKey: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  expectedEndOn?: string | null;
  customerOrderId: string;
  lines: Array<{ productId: string; quantity: number }>;
}): TransferCreateAndSendInput => ({
  requestKey: args.requestKey,
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

export const transferCreateRpcArgs = (input: TransferCreateAndSendInput): Record<string, unknown> => ({
  p_request_key: input.requestKey,
  p_from_warehouse_id: Number(input.fromWarehouseId),
  p_to_warehouse_id: Number(input.toWarehouseId),
  p_expected_end_on: input.expectedEndOn || null,
  p_id: input.id ? Number(input.id) : null,
  p_created_at: input.createdAt || null,
  p_lines: input.lines.map((line) => ({
    product_id: Number(line.productId),
    quantity: line.quantity,
    owner_type: line.ownerType ?? null,
    owner_id: line.ownerId ? Number(line.ownerId) : null,
  })),
});

export const sentTransferHref = (id: string): string => hrefForTransfer(id);

export const openSentTransfer = (
  result: TransferCreateAndSendResult,
  navigate: (href: string) => void,
): void => {
  if (result.status !== "sent") {
    throw new Error(`Expected sent transfer, received ${result.status}`);
  }
  navigate(sentTransferHref(result.id));
};
