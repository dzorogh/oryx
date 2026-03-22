"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CONTAINER_DIMENSIONS,
  DEFAULT_ORDER_ID,
  ORDER_PRESETS,
  getOrderPresetById,
} from "@/domain/packing/constants";
import { PackingAppShell } from "@/features/packing-visualization/components/packing-app-shell";
import { PackingKanbanBoard } from "@/features/packing-visualization/components/packing-kanban-board";
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
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("orderId", String(nextOrderId));
    router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  };

  const activeOrderPreset = useMemo(() => getOrderPresetById(selectedOrderId), [selectedOrderId]);
  const totalUnits = useMemo(() => expandOrder(activeOrderPreset.order).length, [activeOrderPreset.order]);
  const { result, isLoading, error } = usePackingResult(selectedOrderId);
  const hasContainers = useMemo(() => result.containers.length > 0, [result.containers]);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [isContainersBoardOpen, setIsContainersBoardOpen] = useState(false);

  useEffect(() => {
    if (isLoading || error) {
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
  }, [isLoading, error, result]);

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
              Позиций: {activeOrderPreset.order.length} · Единиц: {totalUnits}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {isLoading ? (
          <div
            className="mt-6 flex min-h-[min(70vh,520px)] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-6 py-16 shadow-sm"
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Загрузка результата упаковки"
          >
            <div
              className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-[#647BEF] border-t-transparent"
              aria-hidden
            />
            <p className="text-center text-sm text-slate-600">Загрузка результата упаковки…</p>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Сцена</h2>
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[0_2px_8px_rgba(45,55,72,0.06)]">
                {hasContainers ? (
                  <MultiContainerScene
                    containers={result.containers}
                    containerSize={CONTAINER_DIMENSIONS}
                    orderItems={activeOrderPreset.order}
                  />
                ) : (
                  <p className="py-16 text-center text-sm text-slate-500">Нет контейнеров для отображения.</p>
                )}
              </div>
            </div>

            <section className="mt-8 rounded-2xl border border-slate-200/90 bg-white shadow-sm" aria-label="По контейнерам">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                <button
                  type="button"
                  id="containers-kanban-toggle"
                  aria-expanded={isContainersBoardOpen}
                  aria-controls="containers-kanban-panel"
                  onClick={() => setIsContainersBoardOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left font-semibold uppercase tracking-wide transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#647BEF]"
                >
                  <span>По контейнерам</span>
                  <span
                    className={`inline-flex shrink-0 text-slate-500 transition-transform duration-200 ${
                      isContainersBoardOpen ? "rotate-180" : "rotate-0"
                    }`}
                    aria-hidden
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
              </h2>
              <div
                id="containers-kanban-panel"
                role="region"
                aria-labelledby="containers-kanban-toggle"
                hidden={!isContainersBoardOpen}
                className="border-t border-slate-100 px-3 pb-4 pt-1"
              >
                <PackingKanbanBoard containers={result.containers} orderItems={activeOrderPreset.order} />
              </div>
            </section>

            <div className="mt-8">
              <ResultPanel result={result} orderItems={activeOrderPreset.order} renderMs={renderMs} />
            </div>
          </>
        )}
      </div>
    </PackingAppShell>
  );
}
