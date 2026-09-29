"use client";

import { useMemo } from "react";
import { orderPackingItems, type CustomerOrderOmsContext } from "@/features/logistics/customer-order-oms";
import type { CustomerOrderLine } from "@/features/logistics/logistics-types";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { ContainerLoadCalculator } from "@/features/store/packing/container-load-calculator";

/**
 * Checkout calculator on the order lines; recalculates after a quantity change.
 * `tab` — the «Контейнеры» tab; `aside` — compact column next to the «Товары» table.
 */
export const CustomerOrderContainersTab = ({
  lines,
  oms,
  variant = "tab",
}: {
  lines: CustomerOrderLine[];
  oms: CustomerOrderOmsContext;
  variant?: "tab" | "aside";
}) => {
  const { items, missing } = useMemo(
    () =>
      orderPackingItems(
        lines.map((line) => ({ productId: line.productId, productName: line.productName, quantity: line.quantity })),
        oms.variantLogistics,
      ),
    [lines, oms.variantLogistics],
  );
  const aside = variant === "aside";

  return (
    <DocumentSection title={aside ? "Контейнеры" : "Калькулятор контейнеров"}>
      {oms.containerTypes.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Типы контейнеров не заведены.</p>
      ) : (
        <ContainerLoadCalculator
          containerTypes={oms.containerTypes}
          items={items}
          missingNames={missing.map((line) => line.productName)}
          heading={
            aside ? null : (
              <p className="text-sm text-muted-foreground">
                Строки заказа с габаритами товара. Выберите типы контейнеров — укладка пересчитается.
              </p>
            )
          }
          className="space-y-3 px-4 py-4"
          sceneClassName={aside ? "h-[min(300px,45vh)]" : undefined}
        />
      )}
    </DocumentSection>
  );
};
