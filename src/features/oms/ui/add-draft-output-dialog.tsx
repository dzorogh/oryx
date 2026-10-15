"use client";

import { useEffect, useMemo, useState } from "react";
import { pluralTovar } from "@/features/oms/category-tree";
import { useRouter } from "next/navigation";
import { addDraftOutputLines } from "@/features/oms/oms-api";
import { formatQuantity } from "@/features/oms/oms-labels";
import { productById } from "@/features/oms/oms-lookups";
import type { OmsSnapshot, ProductionOutput } from "@/features/oms/oms-types";
import { firstErrorKey, parseDecimalQuantity } from "@/features/oms/ui/catalog-quantity-model";
import { focusQuantityInput } from "@/features/oms/ui/catalog-quantity-table";
import { ContextRowsTable } from "@/features/oms/ui/context-rows-table";
import { DialogShell } from "@/features/oms/ui/dialog-shell";
import { markHighlightedRows } from "@/features/oms/ui/highlight-rows";
import { translateOmsError } from "@/features/oms/ui/run-action";

export const AddDraftOutputDialog = ({
  open,
  onOpenChange,
  snapshot,
  output,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: OmsSnapshot;
  output: ProductionOutput;
  onAdded: () => Promise<void>;
}) => {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setQuantities({});
    setServerError(null);
    setSubmitting(false);
  }, [open]);

  const rows = useMemo(() => {
    const plan = snapshot.productionOrderLines.filter((line) => line.orderId === output.productionOrderId);
    const committed = new Map<string, number>();
    for (const other of snapshot.outputs) {
      if (other.productionOrderId !== output.productionOrderId || other.status === "cancelled") continue;
      for (const line of snapshot.outputLines) {
        if (line.outputId !== other.id) continue;
        committed.set(line.productId, (committed.get(line.productId) ?? 0) + line.quantity);
      }
    }
    return plan.flatMap((line) => {
      const left = line.quantity - (committed.get(line.productId) ?? 0);
      if (left <= 1e-9) return [];
      const product = productById(snapshot, line.productId);
      return [
        {
          key: line.id,
          productId: line.productId,
          title: product?.name ?? line.productName,
          subtitle: product?.code,
          limitLabel: formatQuantity(left, product?.unit),
          limit: left,
          unit: product?.unit ?? line.productUnit,
        },
      ];
    });
  }, [output.productionOrderId, snapshot]);

  const lines = rows.flatMap((row) => {
    const quantity = parseDecimalQuantity(quantities[row.key] ?? "");
    if (quantity == null || quantity <= 0) return [];
    return [{ productId: row.productId, quantity, key: row.key }];
  });

  const submit = async () => {
    if (submitting || lines.length === 0) return;
    const errorKey = firstErrorKey(
      rows.map((row) => ({ key: row.key, raw: quantities[row.key] ?? "", limit: row.limit, mode: "hard" as const })),
    );
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await addDraftOutputLines({ outputId: output.id, lines });
      const lineIds = Array.isArray(created.lines) ? created.lines.map((id) => String(id)) : lines.map((line) => line.key);
      markHighlightedRows(output.id, lineIds);
      await onAdded();
      onOpenChange(false);
      router.refresh();
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateOmsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      kicker={output.number}
      title="Добавить товары"
      footerSummary={lines.length ? pluralTovar(lines.length) : "Нет строк"}
      submitLabel="Добавить"
      onSubmit={() => void submit()}
      submitDisabled={lines.length === 0}
      disabledReason="Введите количество"
      submitting={submitting}
      serverError={serverError}
      dirty={lines.length > 0}
    >
      <ContextRowsTable
        rows={rows}
        quantities={quantities}
        onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
        limitHeader="Осталось по плану"
        empty="Незанятого плана нет"
      />
    </DialogShell>
  );
};
