// english-ui:ignore-file
"use client";

import { FieldSelect } from "@/features/logistics/ui/field-select";
import { QuantityField } from "@/features/logistics/ui/quantity-field";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import {
  customerOrderById,
  productById,
  productIdentityLabel,
} from "@/features/logistics/logistics-lookups";
import { remainingToReserveForLine } from "@/features/logistics/logistics-availability";
import type { LogisticsSnapshot, ProductionOrderLine, StockBalance } from "@/features/logistics/logistics-types";

export type ProductionOutputDraftLine = {
  productionLineId: string;
  productId: string;
  quantity: string;
  allocOrderLineId: string;
  allocQty: string;
};

export const buildProductionOutputDrafts = (
  eligible: ProductionOrderLine[],
  _remainingByLineId?: Map<string, number> | ((lineId: string) => number),
): ProductionOutputDraftLine[] =>
  eligible.map((line) => ({
    productionLineId: line.id,
    productId: line.productId,
    quantity: "0",
    allocOrderLineId: "none",
    allocQty: "0",
  }));

export const ProductionOutputLinesFields = ({
  snapshot,
  balances,
  drafts,
  remainingByLineId,
  disabled,
  onChange,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  drafts: ProductionOutputDraftLine[];
  remainingByLineId: (lineId: string) => number;
  disabled?: boolean;
  onChange: (next: ProductionOutputDraftLine[]) => void;
}) => {
  if (drafts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Нет строк с оставшимся количеством для выпуска.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {drafts.map((draft, index) => {
        const remaining = remainingByLineId(draft.productionLineId);
        const quantity = Number(draft.quantity) || 0;
        const openOrderItems = snapshot.customerOrderLines
          .filter((line) => {
            const customerOrder = snapshot.customerOrders.find((item) => item.id === line.orderId);
            return customerOrder?.status === "open" && line.productId === draft.productId;
          })
          .map((line) => ({
            value: line.id,
            label: `${customerOrderById(snapshot, line.orderId)?.number ?? line.orderId} · можно ${formatQuantity(remainingToReserveForLine(line, balances))}`,
          }));
        const allocLine = snapshot.customerOrderLines.find((line) => line.id === draft.allocOrderLineId);
        const allocMax = allocLine
          ? Math.min(quantity || remaining, remainingToReserveForLine(allocLine, balances))
          : 0;

        const patch = (partial: Partial<ProductionOutputDraftLine>) => {
          onChange(
            drafts.map((item, itemIndex) => (itemIndex === index ? { ...item, ...partial } : item)),
          );
        };

        return (
          <div
            key={draft.productionLineId}
            className="flex flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0"
          >
            <p className="text-sm font-medium">
              {productIdentityLabel(
                productById(snapshot, draft.productId),
                draft.productId,
                `осталось ${formatQuantity(remaining)}`,
              )}
            </p>
            <AvailabilityPanel snapshot={snapshot} balances={balances} productId={draft.productId} />
            <QuantityField
              value={draft.quantity}
              onChange={(value) => patch({ quantity: value })}
              max={remaining}
              disabled={disabled}
            />
            <FieldSelect
              label="Под заказ клиента"
              value={draft.allocOrderLineId}
              disabled={disabled}
              items={[{ value: "none", label: "Нет — свободно на складе" }, ...openOrderItems]}
              onChange={(value) =>
                patch({
                  allocOrderLineId: value || "none",
                  allocQty: value && value !== "none" ? draft.allocQty : "0",
                })
              }
            />
            {draft.allocOrderLineId !== "none" ? (
              <QuantityField
                label="Занятое количество"
                value={draft.allocQty}
                onChange={(value) => patch({ allocQty: value })}
                min={0}
                max={allocMax}
                disabled={disabled}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
