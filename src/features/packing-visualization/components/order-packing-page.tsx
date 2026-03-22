"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrderPresetById } from "@/domain/packing/constants";
import { OrderViewSection } from "@/features/packing-visualization/components/order-view-section";
import { usePackingResult } from "@/features/packing-visualization/hooks/usePackingResult";
import { expandOrder } from "@/domain/packing/expand-order";
import { isPackingPlacementValid } from "@/domain/packing/result-validation";
import { Alert, AlertDescription } from "@/components/ui/alert";

type OrderPackingDynamicContentProps = {
  selectedOrderId: number;
};

export const OrderPackingDynamicContent = ({ selectedOrderId }: OrderPackingDynamicContentProps) => {
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
      <div className="bg-card px-4 pb-3 pt-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          Позиций: {orderItems.length} · Единиц: {totalUnits}
        </p>
      </div>

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
