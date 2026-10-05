// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { logisticsPath } from "@/features/logistics/logistics-paths";
import type { OwnerType } from "@/features/logistics/logistics-types";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { firstErrorKey, parseDecimalQuantity } from "@/features/logistics/ui/catalog-quantity-model";
import { focusQuantityInput } from "@/features/logistics/ui/catalog-quantity-table";
import { ContextRowsTable, type ContextQuantityRow } from "@/features/logistics/ui/context-rows-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { markHighlightedRows } from "@/features/logistics/ui/highlight-rows";
import { openCreatedDocuments, reportPartialCreate } from "@/features/logistics/ui/open-created-documents";
import { pluralTovar } from "@/features/logistics/category-tree";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

/** Without `outputId` the user picks a new draft output or an existing draft of the production order. */
export type OutputReserveTarget = {
  productionOrderId: string;
  productId: string;
  outputId?: string;
  /** Строка текущего документа, которую подсветить после успеха. */
  lineId?: string;
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
  const router = useRouter();
  const formStore = useLogisticsStore({ kind: "form", form: "output", enabled: target !== null });
  const { snapshot, balances } = formStore;
  const [ownerType, setOwnerType] = useState<OwnerType>("order");
  const [destinationKey, setDestinationKey] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const productionOrder = target ? productionOrderById(snapshot, target.productionOrderId) : undefined;
  const product = target ? productById(snapshot, target.productId) : undefined;

  const destinations = useMemo<Destination[]>(() => {
    if (!target) return [];
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
    if (target.outputId) return drafts;
    const plan = snapshot.productionOrderLines
      .filter((line) => line.orderId === target.productionOrderId && line.productId === target.productId)
      .reduce((sum, line) => sum + line.quantity, 0);
    const planRoom = remainingPlanForProductionProduct(snapshot, target.productionOrderId, target.productId, plan);
    return planRoom > 0 ? [{ kind: "new" as const, key: "new", available: planRoom }, ...drafts] : drafts;
  }, [snapshot, target]);

  const destination = destinations.find((item) => item.key === destinationKey) ?? destinations[0];
  const orderLines = useMemo(
    () =>
      target
        ? openOrderLinesForProduct(snapshot, balances, target.productId)
            .map((line) => ({ line, cap: remainingToReserveInProductionOutputsForLine(line, balances, snapshot) }))
            .filter((item) => item.cap > 0)
        : [],
    [balances, snapshot, target],
  );

  const base = useMemo(() => {
    if (!destination || !product || !target) return [];
    if (ownerType === "order") {
      return orderLines.map((item) => ({
        key: item.line.id,
        ownerType: "order" as const,
        ownerId: item.line.orderId,
        title: customerOrderById(snapshot, item.line.orderId)?.number ?? item.line.orderId,
        subtitle: product.name,
        cap: item.cap,
        unit: product.unit,
      }));
    }
    return snapshot.regions.map((region) => ({
      key: region.id,
      ownerType: "region" as const,
      ownerId: region.id,
      title: ownerLabel(snapshot, "region", region.id),
      subtitle: product.name,
      cap: Number.POSITIVE_INFINITY,
      unit: product.unit,
    }));
  }, [destination, orderLines, ownerType, product, snapshot, target]);

  const usedExcept = (key: string) =>
    base
      .filter((row) => row.key !== key)
      .reduce((sum, row) => sum + (parseDecimalQuantity(quantities[row.key] ?? "") ?? 0), 0);

  const rows: ContextQuantityRow[] = base.map((row) => {
    const pool = destination ? Math.max(0, destination.available - usedExcept(row.key)) : 0;
    const limit = Math.min(row.cap, pool);
    return {
      key: row.key,
      title: row.title,
      subtitle: row.subtitle,
      limitLabel: Number.isFinite(limit) ? formatQuantity(limit, row.unit) : formatQuantity(pool, row.unit),
      limit: Number.isFinite(limit) ? limit : pool,
      unit: row.unit,
    };
  });

  const picked = rows.flatMap((row) => {
    const quantity = parseDecimalQuantity(quantities[row.key] ?? "");
    if (quantity == null || quantity <= 0) return [];
    const source = base.find((item) => item.key === row.key);
    if (!source) return [];
    return [{ ...source, quantity }];
  });

  const close = () => {
    setOwnerType("order");
    setDestinationKey("");
    setQuantities({});
    setServerError(null);
    onClose();
  };

  const submit = async () => {
    if (!target || !destination || pending || picked.length === 0) return;
    const errorKey = firstErrorKey(
      rows.map((row) => ({ key: row.key, raw: quantities[row.key] ?? "", limit: row.limit, mode: "hard" as const })),
    );
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    setPending(true);
    setServerError(null);
    const created: Array<{ href: string; label: string }> = [];
    try {
      if (destination.kind === "new") {
        const [first, ...rest] = picked;
        if (!first) return;
        const total = picked.reduce((sum, row) => sum + row.quantity, 0);
        const outputId = await createProductionOutput({
          orderId: target.productionOrderId,
          expectedEndOn: productionOrder?.expectedEndOn ?? null,
          complete: false,
          lines: [
            {
              productId: target.productId,
              quantity: total,
              allocation: { ownerType: first.ownerType, ownerId: first.ownerId, quantity: first.quantity },
            },
          ],
        });
        created.push({ href: logisticsPath("outputs", outputId), label: "Выпуск" });
        for (const row of rest) {
          await reserveInProductionOutput({
            outputId,
            ownerType: row.ownerType,
            ownerId: row.ownerId,
            lines: [{ productId: target.productId, quantity: row.quantity }],
          });
        }
        await reload();
        close();
        openCreatedDocuments(
          (href) => router.push(href),
          created[0],
          productionOrder ? [{ href: logisticsPath("production-orders", productionOrder.sequenceNumber ?? productionOrder.id), label: productionOrder.number }] : [],
        );
        return;
      }
      for (const row of picked) {
        await reserveInProductionOutput({
          outputId: destination.outputId,
          ownerType: row.ownerType,
          ownerId: row.ownerId,
          lines: [{ productId: target.productId, quantity: row.quantity }],
        });
        if (created.length === 0) {
          created.push({ href: logisticsPath("outputs", destination.outputId), label: "Резерв в выпуске" });
        }
      }
      if (target.lineId) markHighlightedRows(destination.outputId, [target.lineId]);
      await reload();
      close();
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      if (created.length > 0) {
        if (target.lineId && destination.kind !== "new") markHighlightedRows(destination.outputId, [target.lineId]);
        close();
        await reportPartialCreate((href) => router.push(href), created.slice(0, 1), translateLogisticsError(raw), reload);
        return;
      }
      setServerError(translateLogisticsError(raw));
    } finally {
      setPending(false);
    }
  };

  const fixedOutput = target?.outputId ? snapshot.outputs.find((item) => item.id === target.outputId) : undefined;

  return (
    <DialogShell
      open={target !== null}
      onOpenChange={(next) => {
        if (!next && !pending) close();
      }}
      size="lg"
      kicker={fixedOutput?.number ?? productionOrder?.number}
      title="Зарезервировать в выпуске"
      header={
        <div className="grid gap-3 sm:grid-cols-2">
          {target?.outputId ? (
            <p className="text-sm text-muted-foreground">{productIdentityLabel(product, target.productId)}</p>
          ) : (
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
              placeholder="Выберите выпуск"
              emptyLabel="Нет места в плане и нет свободного запланированного выпуска"
              onChange={(next) => {
                setDestinationKey(next);
                setQuantities({});
              }}
            />
          )}
          <FieldSelect
            label="Под что"
            value={ownerType}
            items={[
              { value: "order", label: OWNER_TYPE_LABELS.order },
              { value: "region", label: OWNER_TYPE_LABELS.region },
            ]}
            onChange={(next) => {
              setOwnerType(next === "region" ? "region" : "order");
              setQuantities({});
            }}
          />
        </div>
      }
      footerSummary={picked.length ? pluralTovar(picked.length) : "Нет строк"}
      submitLabel="Зарезервировать"
      onSubmit={() => void submit()}
      submitDisabled={!destination || picked.length === 0}
      disabledReason="Введите количество"
      submitting={pending}
      serverError={serverError}
      dirty={picked.length > 0}
      loading={formStore.isLoading}
      error={formStore.error}
    >
      {target?.outputId && destinations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          В выпуске нет свободного количества этого товара.
        </div>
      ) : (
        <ContextRowsTable
          rows={rows}
          quantities={quantities}
          onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
          limitHeader="Доступно к резерву"
          empty={ownerType === "order" ? "Нет открытых заказов клиента с незарезервированным количеством" : "Нет регионов"}
        />
      )}
    </DialogShell>
  );
};
