"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CONTAINER_DIMENSIONS,
  DEFAULT_ORDER_ID,
  ORDER_PRESETS,
  getOrderPresetById,
} from "@/domain/packing/constants";
import { MultiContainerScene } from "@/features/packing-visualization/components/multi-container-scene";
import { ResultPanel } from "@/features/packing-visualization/components/result-panel";
import { usePackingResult } from "@/features/packing-visualization/hooks/usePackingResult";
import { expandOrder } from "@/domain/packing/expand-order";

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allowedOrderIds = useMemo(() => new Set(ORDER_PRESETS.map((preset) => preset.orderId)), []);
  const selectedOrderId = useMemo(() => {
    const selectedOrderIdFromQuery = searchParams.get("orderId");
    const parsedOrderId = Number(selectedOrderIdFromQuery);
    if (Number.isNaN(parsedOrderId) || !allowedOrderIds.has(parsedOrderId)) {
      return DEFAULT_ORDER_ID;
    }
    return parsedOrderId;
  }, [allowedOrderIds, searchParams]);

  const handleOrderChange = (nextOrderId: number) => {
    if (!allowedOrderIds.has(nextOrderId)) {
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("orderId", String(nextOrderId));
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  };

  const activeOrderPreset = useMemo(() => getOrderPresetById(selectedOrderId), [selectedOrderId]);
  const totalUnits = useMemo(() => expandOrder(activeOrderPreset.order).length, [activeOrderPreset.order]);
  const { result, isLoading, error } = usePackingResult(selectedOrderId);
  const hasContainers = useMemo(() => result.containers.length > 0, [result.containers]);

  if (isLoading) {
    return <main className="min-h-screen p-6 text-slate-100">Загрузка результата упаковки...</main>;
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 text-rose-300" aria-label="Ошибка расчета упаковки">
        Ошибка: {error}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">3D визуализация упаковки контейнеров</h1>
        <p className="text-slate-300">
          Все контейнеры отображаются на одной сцене — можно вращать и осматривать укладку.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/70 p-4" aria-label="Выбор заказа">
        <label htmlFor="order-select" className="text-sm font-medium text-slate-100">
          Выберите заказ
        </label>
        <select
          id="order-select"
          className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
          value={selectedOrderId}
          onChange={(event) => handleOrderChange(Number(event.target.value))}
          aria-label="Переключение заказа для упаковки"
        >
          {ORDER_PRESETS.map((preset) => (
            <option key={preset.orderId} value={preset.orderId}>
              {preset.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-slate-300">
          Позиций: {activeOrderPreset.order.length} | Единиц: {totalUnits}
        </p>
      </section>

      {hasContainers ? (
        <MultiContainerScene
          containers={result.containers}
          containerSize={CONTAINER_DIMENSIONS}
          orderItems={activeOrderPreset.order}
        />
      ) : (
        <p className="text-slate-300">Нет контейнеров для отображения.</p>
      )}

      <ResultPanel result={result} orderItems={activeOrderPreset.order} />
    </main>
  );
}
