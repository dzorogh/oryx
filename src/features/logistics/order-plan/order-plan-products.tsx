"use client";

import { Card } from "@/components/ui/card";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import type { ProductPlan } from "@/features/logistics/order-plan/order-plan-model";
import { CoverageBar, ProblemDot } from "@/features/logistics/order-plan/order-plan-visuals";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

export const OrderPlanProducts = ({
  products,
  selectedId,
  onSelect,
}: {
  products: ProductPlan[];
  selectedId: string | null;
  onSelect: (variantId: string) => void;
}) => (
  <Card size="sm" className={cn(logisticsCardClass, "gap-0 overflow-hidden py-0 shadow-sm data-[size=sm]:gap-0 data-[size=sm]:py-0")}>
    <div className="flex items-baseline gap-1.5 border-b border-border/60 px-3.5 py-2.5">
      <h3 className="text-[13px] font-semibold">Товары</h3>
      <small className="text-xs text-zinc-400">{products.length}</small>
    </div>
    <div role="listbox" aria-label="Товары заказа">
      {products.map((product) => {
        const selected = product.variantId === selectedId;
        const excess = product.remaining < -1e-9;
        return (
          <button
            key={product.variantId}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(product.variantId)}
            className={cn(
              "block w-full border-b border-border/60 px-3.5 pt-2.5 pb-3 text-left last:border-b-0 hover:bg-zinc-50",
              selected && "bg-zinc-100 shadow-[inset_3px_0_0_#18181b] hover:bg-zinc-100",
            )}
          >
            <span className="flex items-baseline justify-between gap-2.5">
              <span className="truncate text-[13px] font-medium">{product.name}</span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap tabular-nums",
                  product.covered <= 0 && "font-medium text-zinc-400",
                  excess && "text-amber-600",
                )}
              >
                {product.shortageCount > 0 ? <ProblemDot tone="red" /> : excess ? <ProblemDot tone="amber" /> : null}
                {formatQuantity(product.covered)} / {formatQuantity(product.ordered)}
              </span>
            </span>
            {product.subtitle ? (
              <span className="block text-xs leading-tight text-zinc-500">{product.subtitle}</span>
            ) : null}
            <CoverageBar bar={product.bar} />
          </button>
        );
      })}
    </div>
  </Card>
);
