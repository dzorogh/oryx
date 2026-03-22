import { generatePackingResult } from "@/domain/packing/generate-packing-result";
import type { OrderItemType, PackingResult } from "@/domain/packing/types";

let requestSeq = 0;

type PackingWorkerRequest = {
  requestId: number;
  orderId: number;
  orderItems: OrderItemType[];
};

type PackingWorkerResponse =
  | { requestId: number; ok: true; result: PackingResult }
  | { requestId: number; ok: false; error: string };

/** Откладывает расчёт на следующий macrotask, чтобы React успел отрисовать кадр (без Worker). */
const runOnMainThreadDeferred = (orderId: number, orderItems: OrderItemType[]) =>
  new Promise<ReturnType<typeof generatePackingResult>>((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(generatePackingResult(orderId, orderItems));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    }, 0);
  });

let worker: Worker | null = null;

const getWorker = (): Worker => {
  if (worker) {
    return worker;
  }
  worker = new Worker(new URL("../workers/packing-result.worker.ts", import.meta.url), {
    type: "module",
  });
  return worker;
};

/**
 * Выполняет расчёт упаковки вне основного потока UI (Web Worker в браузере).
 * Без Worker (тесты, SSR) — откладывает вызов на следующий macrotask.
 */
export const runPackingAsync = (
  orderId: number,
  orderItems: OrderItemType[],
): Promise<ReturnType<typeof generatePackingResult>> => {
  if (typeof Worker === "undefined") {
    return runOnMainThreadDeferred(orderId, orderItems);
  }

  const requestId = ++requestSeq;

  return new Promise((resolve, reject) => {
    const w = getWorker();

    let handleWorkerError: () => void;

    const handleMessage = (event: MessageEvent<PackingWorkerResponse>) => {
      const data = event.data;
      if (data.requestId !== requestId) {
        return;
      }
      w.removeEventListener("message", handleMessage);
      w.removeEventListener("error", handleWorkerError);
      if (data.ok) {
        resolve(data.result);
        return;
      }
      reject(new Error(data.error));
    };

    handleWorkerError = () => {
      w.removeEventListener("message", handleMessage);
      w.removeEventListener("error", handleWorkerError);
      worker = null;
      reject(new Error("Worker error"));
    };

    w.addEventListener("message", handleMessage);
    w.addEventListener("error", handleWorkerError);

    const payload: PackingWorkerRequest = { requestId, orderId, orderItems };
    try {
      w.postMessage(payload);
    } catch {
      w.removeEventListener("message", handleMessage);
      void runOnMainThreadDeferred(orderId, orderItems).then(resolve, reject);
    }
  });
};
