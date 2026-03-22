/// <reference lib="webworker" />

import { generatePackingResult } from "../domain/packing/generate-packing-result";
import type { OrderItemType } from "../domain/packing/types";

type PackingWorkerRequest = {
  requestId: number;
  orderId: number;
  orderItems: OrderItemType[];
};

type PackingWorkerResponse =
  | { requestId: number; ok: true; result: ReturnType<typeof generatePackingResult> }
  | { requestId: number; ok: false; error: string };

const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<PackingWorkerRequest>) => {
  const { requestId, orderId, orderItems } = event.data;
  try {
    const result = generatePackingResult(orderId, orderItems);
    const payload: PackingWorkerResponse = { requestId, ok: true, result };
    ctx.postMessage(payload);
  } catch (loadError) {
    const message = loadError instanceof Error ? loadError.message : "Unknown error";
    const payload: PackingWorkerResponse = { requestId, ok: false, error: message };
    ctx.postMessage(payload);
  }
};
