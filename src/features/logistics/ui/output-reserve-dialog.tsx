// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createProductionOutput, reserveInProductionOutput } from "@/features/logistics/logistics-api";
import {
  freeInDraftOutput,
  openOrderLinesForProduct,
  remainingPlanForProductionProduct,
  remainingToReserveInProductionOutputsForLine,
} from "@/features/logistics/logistics-availability";
import { formatQuantity, OWNER_TYPE_LABELS } from "@/features/logistics/logistics-labels";
import {
  customerOrderById,
  ownerLabel,
  productById,
  productIdentityLabel,
  productionOrderById,
} from "@/features/logistics/logistics-lookups";
import type { OwnerType } from "@/features/logistics/logistics-types";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";

/** Without `outputId` the user picks a new draft output or an existing draft of the production order. */
export type OutputReserveTarget = {
  productionOrderId: string;
  productId: string;
  outputId?: string;
};

type Destination =
  | { kind: "new"; key: string; available: number }
  | { kind: "draft"; key: string; outputId: string; outputNumber: string; available: number };

export const OutputReserveDialog = ({
  target,
  onClose,
  reload,
}: {
  target: OutputReserveTarget | null;
  onClose: () => void;
  reload: () => Promise<void>;
}) => {
  const formStore = useLogisticsStore({ kind: "form", form: "output", enabled: target !== null });
  const { snapshot, balances } = formStore;
  const [ownerType, setOwnerType] = useState<OwnerType>("order");
  const [orderLineId, setOrderLineId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [destinationKey, setDestinationKey] = useState("");
  const [quantity, setQuantity] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const productionOrder = target ? productionOrderById(snapshot, target.productionOrderId) : undefined;
  const product = target ? productById(snapshot, target.productId) : undefined;

  const destinations = useMemo<Destination[]>(() => {
    if (!target) {
      return [];
    }
    const drafts = snapshot.outputs
      .filter(
        (output) =>
          output.productionOrderId === target.productionOrderId &&
          output.status === "draft" &&
          (!target.outputId || output.id === target.outputId),
      )
      .map((output) => ({
        kind: "draft" as const,
        key: `draft:${output.id}`,
        outputId: output.id,
        outputNumber: output.number,
        available: freeInDraftOutput(snapshot, output.id, target.productId),
      }))
      .filter((item) => item.available > 0);
    if (target.outputId) {
      return drafts;
    }
    const plan = snapshot.productionOrderLines
      .filter((line) => line.orderId === target.productionOrderId && line.productId === target.productId)
      .reduce((sum, line) => sum + line.quantity, 0);
    const planRoom = remainingPlanForProductionProduct(snapshot, target.productionOrderId, target.productId, plan);
    return planRoom > 0 ? [{ kind: "new" as const, key: "new", available: planRoom }, ...drafts] : drafts;
  }, [snapshot, target]);

  const orderLines = useMemo(
    () =>
      target
        ? openOrderLinesForProduct(snapshot, balances, target.productId)
            .map((line) => ({ line, cap: remainingToReserveInProductionOutputsForLine(line, balances, snapshot) }))
            .filter((item) => item.cap > 0)
        : [],
    [balances, snapshot, target],
  );

  const destination = destinations.find((item) => item.key === destinationKey) ?? destinations[0];
  const selectedOrder =
    orderLines.find((item) => item.line.id === orderLineId) ?? (orderLines.length === 1 ? orderLines[0] : undefined);
  const regions = snapshot.regions;
  const selectedRegion =
    regions.find((item) => item.id === regionId) ?? (regions.length === 1 ? regions[0] : undefined);
  const ownerCap = ownerType === "order" ? (selectedOrder?.cap ?? 0) : Number.POSITIVE_INFINITY;
  const max = destination ? Math.max(0, Math.min(destination.available, ownerCap)) : 0;
  const value = quantity ?? String(max);
  const ownerId = ownerType === "order" ? selectedOrder?.line.orderId : selectedRegion?.id;
  const canSubmit = Boolean(destination && ownerId && isAllowedQuantity(value, max)) && !pending;

  const close = () => {
    setOwnerType("order");
    setOrderLineId("");
    setRegionId("");
    setDestinationKey("");
    setQuantity(null);
    onClose();
  };

  const submit = async () => {
    if (!target || !destination || !ownerId || !canSubmit) {
      return;
    }
    const qty = Number(value);
    setPending(true);
    const ok = await runLogisticsAction(
      async () => {
        if (destination.kind === "new") {
          await createProductionOutput({
            orderId: target.productionOrderId,
            expectedEndOn: productionOrder?.expectedEndOn ?? null,
            complete: false,
            lines: [
              { productId: target.productId, quantity: qty, allocation: { ownerType, ownerId, quantity: qty } },
            ],
          });
          return;
        }
        await reserveInProductionOutput({
          outputId: destination.outputId,
          ownerType,
          ownerId,
          lines: [{ productId: target.productId, quantity: qty }],
        });
      },
      destination.kind === "new" ? "Выпуск запланирован, резерв в выпуске" : "Зарезервировано в выпуске",
      reload,
    );
    setPending(false);
    if (ok) {
      close();
    }
  };

  const fixedOutput = target?.outputId ? snapshot.outputs.find((item) => item.id === target.outputId) : undefined;

  return (
    <LogisticsDialog
      open={target !== null}
      onOpenChange={(next) => {
        if (!next && !pending) {
          close();
        }
      }}
      title="Зарезервировать в выпуске"
      description={
        target
          ? [productIdentityLabel(product, target.productId), fixedOutput?.number ?? productionOrder?.number]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      loading={formStore.isLoading}
      error={formStore.error}
    >
      <div className="flex flex-col gap-3">
        {target?.outputId ? null : (
          <FieldSelect
            label="Куда"
            value={destination?.key ?? ""}
            items={destinations.map((item) => ({
              value: item.key,
              label:
                item.kind === "new"
                  ? `Новый выпуск · можно ${formatQuantity(item.available, product?.unit)}`
                  : `${item.outputNumber} · свободно ${formatQuantity(item.available, product?.unit)}`,
            }))}
            disabled={pending}
            placeholder="Выберите выпуск"
            emptyLabel="Нет места в плане и нет свободного запланированного выпуска"
            onChange={(next) => {
              setDestinationKey(next);
              setQuantity(null);
            }}
          />
        )}
        {target?.outputId && destinations.length === 0 ? (
          <p className="text-sm text-muted-foreground">В выпуске нет свободного количества этого товара.</p>
        ) : null}
        <FieldSelect
          label="Под что"
          value={ownerType}
          items={[
            { value: "order", label: OWNER_TYPE_LABELS.order },
            { value: "region", label: OWNER_TYPE_LABELS.region },
          ]}
          disabled={pending}
          onChange={(next) => {
            setOwnerType(next === "region" ? "region" : "order");
            setQuantity(null);
          }}
        />
        {ownerType === "order" ? (
          <FieldSelect
            label={OWNER_TYPE_LABELS.order}
            value={selectedOrder?.line.id ?? ""}
            items={orderLines.map((item) => ({
              value: item.line.id,
              label: `${customerOrderById(snapshot, item.line.orderId)?.number ?? item.line.orderId} · можно ${formatQuantity(item.cap, product?.unit)}`,
            }))}
            disabled={pending}
            placeholder="Выберите заказ клиента"
            emptyLabel="Нет открытых заказов клиента с незарезервированным количеством"
            onChange={(next) => {
              setOrderLineId(next);
              setQuantity(null);
            }}
          />
        ) : (
          <FieldSelect
            label={OWNER_TYPE_LABELS.region}
            value={selectedRegion?.id ?? ""}
            items={regions.map((region) => ({ value: region.id, label: ownerLabel(snapshot, "region", region.id) }))}
            disabled={pending}
            placeholder="Выберите регион"
            emptyLabel="Нет регионов"
            onChange={(next) => {
              setRegionId(next);
              setQuantity(null);
            }}
          />
        )}
        <QuantityField value={value} onChange={setQuantity} max={max} disabled={pending || !destination} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={close}>
            Отмена
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => void submit()}>
            Зарезервировать
          </Button>
        </div>
      </div>
    </LogisticsDialog>
  );
};
