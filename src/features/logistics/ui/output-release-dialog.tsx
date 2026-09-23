// english-ui:ignore-file
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { releaseInProductionOutput } from "@/features/logistics/logistics-api";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById, productIdentityLabel } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot, OwnerType } from "@/features/logistics/logistics-types";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";

export type OutputReleaseTarget = {
  outputId: string;
  outputNumber: string;
  ownerType: OwnerType;
  ownerId: string;
  productId: string;
  quantity: number;
};

export const OutputReleaseDialog = ({
  snapshot,
  target,
  onClose,
  reload,
}: {
  snapshot: LogisticsSnapshot;
  target: OutputReleaseTarget | null;
  onClose: () => void;
  reload: () => Promise<void>;
}) => {
  const [quantity, setQuantity] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const max = target?.quantity ?? 0;
  const value = quantity ?? String(max);

  const close = () => {
    setQuantity(null);
    onClose();
  };

  const submit = async () => {
    if (!target || !isAllowedQuantity(value, max) || pending) {
      return;
    }
    setPending(true);
    const ok = await runLogisticsAction(
      () =>
        releaseInProductionOutput({
          outputId: target.outputId,
          ownerType: target.ownerType,
          ownerId: target.ownerId,
          lines: [{ productId: target.productId, quantity: Number(value) }],
        }),
      "Резерв в выпуске снят",
      reload,
    );
    setPending(false);
    if (ok) {
      close();
    }
  };

  const product = target ? productById(snapshot, target.productId) : undefined;

  return (
    <LogisticsDialog
      open={target !== null}
      onOpenChange={(next) => {
        if (!next && !pending) {
          close();
        }
      }}
      title="Снять резерв в выпуске"
      description={
        target
          ? `${productIdentityLabel(product, target.productId)} · ${target.outputNumber} · ${ownerLabel(snapshot, target.ownerType, target.ownerId)}. В резерве ${formatQuantity(target.quantity, product?.unit)}.`
          : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Количество останется в черновике выпуска свободным — его можно зарезервировать под другой заказ.
        </p>
        <QuantityField value={value} onChange={setQuantity} max={max} disabled={pending} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={close}>
            Отмена
          </Button>
          <Button type="button" disabled={pending || !isAllowedQuantity(value, max)} onClick={() => void submit()}>
            Снять резерв
          </Button>
        </div>
      </div>
    </LogisticsDialog>
  );
};
