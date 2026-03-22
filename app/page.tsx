"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_ORDER_ID, ORDER_PRESETS, getOrderPresetById } from "@/domain/packing/constants";
import { PackingAppShell } from "@/features/packing-visualization/components/packing-app-shell";
import { OrderViewSection } from "@/features/packing-visualization/components/order-view-section";
import { usePackingResult } from "@/features/packing-visualization/hooks/usePackingResult";
import { expandOrder } from "@/domain/packing/expand-order";
import { isPackingPlacementValid } from "@/domain/packing/result-validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

type HomeMainAreaProps = {
  selectedOrderId: number;
};

const HomeMainArea = ({ selectedOrderId }: HomeMainAreaProps) => {
  const activeOrderPreset = useMemo(() => getOrderPresetById(selectedOrderId), [selectedOrderId]);
  const [orderItems, setOrderItems] = useState(() => structuredClone(activeOrderPreset.order));
  const totalUnits = useMemo(() => expandOrder(orderItems).length, [orderItems]);
  const { result, error, isLoading } = usePackingResult(selectedOrderId, orderItems);
  const [renderMs, setRenderMs] = useState<number | null>(null);

  const handleQuantityChange = (lineIndex: number, quantity: number) => {
    const safe = Math.max(0, Math.min(9_999_999, Math.floor(Number.isFinite(quantity) ? quantity : 0)));
    setOrderItems((prev) => prev.map((item, i) => (i === lineIndex ? { ...item, quantity: safe } : item)));
  };

  useEffect(() => {
    if (error || !result || !isPackingPlacementValid(result.validation)) {
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
      <main className="flex min-h-screen items-center justify-center p-6" aria-label="Ошибка расчета упаковки">
        <Alert variant="destructive" className="max-w-xl">
          <AlertDescription>Ошибка: {error}</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <>
      <header className="border-b bg-card px-4 py-4 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList className="sm:gap-2">
            <BreadcrumbItem>
              <span className="text-muted-foreground">Упаковка</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="text-muted-foreground">Заказы</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Визуализация</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Заказ №{selectedOrderId}</h1>
            <p className="text-sm text-muted-foreground">
              Позиций: {orderItems.length} · Единиц: {totalUnits}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <OrderViewSection
          orderItems={orderItems}
          result={result}
          isPackingLoading={isLoading}
          onQuantityChange={handleQuantityChange}
          renderMs={renderMs}
        />
      </div>
    </>
  );
};

const HomePageContent = () => {
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
      <div className="border-b px-4 py-4">
        <p className="mt-1 text-sm font-semibold">Магазин и каталог</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Заказы">
        <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">Заказы</p>
        {ORDER_PRESETS.map((preset) => {
          const active = preset.orderId === selectedOrderId;
          return (
            <Button
              key={preset.orderId}
              type="button"
              variant={active ? "secondary" : "ghost"}
              aria-label={`Открыть ${preset.label}`}
              aria-current={active ? "page" : undefined}
              onClick={() => handleOrderChange(preset.orderId)}
              className="h-auto w-full justify-start px-3 py-2.5 text-left text-sm font-normal"
            >
              {preset.label}
            </Button>
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
};

const HomePageFallback = () => (
  <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground" role="status" aria-live="polite">
    Загрузка…
  </div>
);

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageContent />
    </Suspense>
  );
}
