// english-ui:ignore-file
"use client";

import { useState } from "react";
import { releaseInProductionOutput } from "@/features/logistics/logistics-api";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById, productIdentityLabel } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot, OwnerType } from "@/features/logistics/logistics-types";
import { ContextRowsTable } from "@/features/logistics/ui/context-rows-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { markHighlightedRows } from "@/features/logistics/ui/highlight-rows";
import { firstErrorKey, parseDecimalQuantity } from "@/features/logistics/ui/catalog-quantity-model";
import { focusQuantityInput } from "@/features/logistics/ui/catalog-quantity-table";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";

export type OutputReleaseTarget = {
  outputId: string;
  outputNumber: string;
  ownerType: OwnerType;
  ownerId: string;
  productId: string;
  quantity: number;
  highlightDocumentId?: string;
  highlightLineId?: string;
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
    const errorKey = firstErrorKey([{ key: "qty", raw: value, limit: max, mode: "hard" }]);
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    const qty = parseDecimalQuantity(value);
    if (!target || qty == null || qty <= 0 || pending) {
      return;
    }
    setPending(true);
    const ok = await runLogisticsAction(
      async () => {
        await releaseInProductionOutput({
          outputId: target.outputId,
          ownerType: target.ownerType,
          ownerId: target.ownerId,
          lines: [{ productId: target.productId, quantity: parseDecimalQuantity(value) ?? 0 }],
        });
        if (target.highlightDocumentId && target.highlightLineId) {
          markHighlightedRows(target.highlightDocumentId, [target.highlightLineId]);
        }
      },
      "Резерв в выпуске снят",
      reload,
    );
    setPending(false);
    if (ok) close();
  };

  const product = target ? productById(snapshot, target.productId) : undefined;

  const rowKey = "qty";
  return (
    <DialogShell
      open={target !== null}
      onOpenChange={(next) => {
        if (!next && !pending) close();
      }}
      size="lg"
      kicker={target?.outputNumber}
      title="Снять резерв"
      footerSummary={target ? ownerLabel(snapshot, target.ownerType, target.ownerId) : ""}
      submitLabel="Снять резерв"
      onSubmit={() => void submit()}
      submitDisabled={!target || (parseDecimalQuantity(value) ?? 0) <= 0}
      disabledReason="Введите количество"
      submitting={pending}
      dirty={quantity != null && quantity !== String(max)}
    >
      {target ? (
        <ContextRowsTable
          rows={[
            {
              key: rowKey,
              title: productIdentityLabel(product, target.productId),
              limitLabel: formatQuantity(max, product?.unit),
              limit: max,
              unit: product?.unit ?? "шт",
            },
          ]}
          quantities={{ [rowKey]: value }}
          onQuantityChange={(_key, raw) => setQuantity(raw)}
          limitHeader="В резерве"
        />
      ) : null}
    </DialogShell>
  );
};
