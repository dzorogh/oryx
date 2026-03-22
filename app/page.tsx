"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_ORDER_ID, ORDER_PRESETS, getOrderPresetById } from "@/domain/packing/constants";
import { PackingAppShell } from "@/features/packing-visualization/components/packing-app-shell";
import { OrderViewSection } from "@/features/packing-visualization/components/order-view-section";
import { usePackingResult } from "@/features/packing-visualization/hooks/usePackingResult";
import { expandOrder } from "@/domain/packing/expand-order";

type HomeMainAreaProps = {
  selectedOrderId: number;
};

const HomeMainArea = ({ selectedOrderId }: HomeMainAreaProps) => {
  const activeOrderPreset = useMemo(() => getOrderPresetById(selectedOrderId), [selectedOrderId]);
  const [orderItems, setOrderItems] = useState(() => structuredClone(activeOrderPreset.order));
  const totalUnits = useMemo(() => expandOrder(orderItems).length, [orderItems]);
  const { result, error } = usePackingResult(selectedOrderId, orderItems);
  const [renderMs, setRenderMs] = useState<number | null>(null);

  const handleQuantityChange = (lineIndex: number, quantity: number) => {
    const safe = Math.max(1, Math.min(9_999_999, Math.floor(Number.isFinite(quantity) ? quantity : 1)));
    setOrderItems((prev) => prev.map((item, i) => (i === lineIndex ? { ...item, quantity: safe } : item)));
  };

  useEffect(() => {
    if (error) {
      queueMicrotask(() => {
        setRenderMs(null);
      });
      return;
    }

    const renderStartedAt = performance.now();
    let firstFrameId = 0;
    let secondFrameId = 0;

    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setRenderMs(performance.now() - renderStartedAt);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
    };
  }, [error, result]);

  if (error) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-[#f1f5f9] p-6 text-rose-600"
        aria-label="Ошибка расчета упаковки"
      >
        Ошибка: {error}
      </main>
    );
  }

  return (
    <>
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md sm:px-6">
        <p className="text-xs text-slate-500">
          Упаковка / Заказы / <span className="text-[#3D4C6A]">Визуализация</span>
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1e293b]">
              Заказ №{selectedOrderId}
            </h1>
            <p className="text-sm text-slate-500">
              Позиций: {orderItems.length} · Единиц: {totalUnits}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[#f8f9fa] px-4 py-6 sm:px-6">
        <div className="mt-2">
          <OrderViewSection
            orderItems={orderItems}
            result={result}
            onQuantityChange={handleQuantityChange}
            renderMs={renderMs}
          />
        </div>
      </div>
    </>
  );
};

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
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("orderId", String(nextOrderId));
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  };

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200/80 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Проект</p>
        <p className="mt-1 text-sm font-semibold text-[#3D4C6A]">Упаковка контейнеров</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Заказы">
        <p className="px-2 pb-2 text-xs font-medium text-slate-500">Заказы</p>
        {ORDER_PRESETS.map((preset) => {
          const active = preset.orderId === selectedOrderId;
          return (
            <button
              key={preset.orderId}
              type="button"
              aria-label={`Открыть ${preset.label}`}
              aria-current={active ? "page" : undefined}
              onClick={() => handleOrderChange(preset.orderId)}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#647BEF] ${active
                ? "bg-[#ede9fe] font-medium text-[#3D4C6A] shadow-sm"
                : "text-slate-600 hover:bg-white/80 hover:text-[#3D4C6A]"
                }`}
            >
              {preset.label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <PackingAppShell sidebar={sidebar}>
      <HomeMainArea key={selectedOrderId} selectedOrderId={selectedOrderId} />
    </PackingAppShell>
  );
}
