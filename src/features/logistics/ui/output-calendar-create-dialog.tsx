// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  createProductionOrderWithDraftOutput,
  createProductionOutput,
  ProductionForOrderOutputError,
} from "@/features/logistics/logistics-api";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import {
  lastDayOfMonthIso,
  productCode,
  type OutputCalendarOpenOrder,
  type OutputCalendarProduct,
} from "@/features/logistics/output-calendar";
import { firstErrorKey, formatLimitNumber, parseDecimalQuantity } from "@/features/logistics/ui/catalog-quantity-model";
import { pluralTovar } from "@/features/logistics/category-tree";
import { focusQuantityInput } from "@/features/logistics/ui/catalog-quantity-table";
import { ContextRowsTable } from "@/features/logistics/ui/context-rows-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { openCreatedDocuments } from "@/features/logistics/ui/open-created-documents";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";
import type { CreateDialogTarget } from "@/features/logistics/ui/output-calendar-matrix";

type OutputCalendarCreateDialogProps = {
  target: CreateDialogTarget | null;
  openOrders: OutputCalendarOpenOrder[];
  products: OutputCalendarProduct[];
  plantIds: string[];
  onClose: () => void;
};

const CreateForm = ({
  target,
  openOrders,
  products,
  plantIds,
  onClose,
}: {
  target: CreateDialogTarget;
  openOrders: OutputCalendarOpenOrder[];
  products: OutputCalendarProduct[];
  plantIds: string[];
  onClose: () => void;
}) => {
  const router = useRouter();
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);
  const planRows = useMemo(() => {
    if (target.kind !== "existing") return [];
    return openOrders
      .filter((order) => order.productionOrderId === target.order.productionOrderId && order.remaining > 1e-9)
      .map((order) => {
        const product = productById.get(order.productId) ?? (order.productId === target.product.id ? target.product : undefined);
        return {
          key: order.productId,
          title: product?.name ?? order.productId,
          subtitle: product ? productCode(product.id) : undefined,
          limitLabel: formatQuantity(order.remaining, product?.unit),
          limit: order.remaining,
          unit: product?.unit ?? "шт",
        };
      });
  }, [openOrders, productById, target]);

  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    target.kind === "existing"
      ? { [target.product.id]: formatLimitNumber(target.order.remaining) }
      : { [target.product.id]: "1" },
  );
  const [expectedEndOn, setExpectedEndOn] = useState(target.date ?? lastDayOfMonthIso(target.month));
  const [plantId, setPlantId] = useState(
    target.kind === "existing" ? target.order.plantId : (target.product.plantId ?? ""),
  );
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const rows =
    target.kind === "existing"
      ? planRows
      : [
          {
            key: target.product.id,
            title: target.product.name,
            subtitle: productCode(target.product.id),
            limitLabel: "—",
            limit: null,
            unit: target.product.unit,
          },
        ];

  const picked = rows.flatMap((row) => {
    const quantity = parseDecimalQuantity(quantities[row.key] ?? "");
    if (quantity == null || quantity <= 0) return [];
    return [{ productId: row.key, quantity }];
  });

  const submit = async () => {
    if (busy || picked.length === 0 || !expectedEndOn) return;
    if (target.kind === "new" && !plantId) return;
    const errorKey = firstErrorKey(
      rows.map((row) => ({
        key: row.key,
        raw: quantities[row.key] ?? "",
        limit: row.limit,
        mode: row.limit == null ? ("none" as const) : ("hard" as const),
      })),
    );
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      if (target.kind === "existing") {
        const outputId = await createProductionOutput({
          orderId: target.order.productionOrderId,
          expectedEndOn,
          complete: false,
          lines: picked,
        });
        onClose();
        router.push(logisticsPath("outputs", outputId));
        return;
      }
      const line = picked[0];
      if (!line) return;
      const created = await createProductionOrderWithDraftOutput({
        plantId,
        productId: line.productId,
        quantity: line.quantity,
        expectedEndOn,
      });
      onClose();
      openCreatedDocuments(
        (href) => router.push(href),
        { href: logisticsPath("outputs", created.outputId), label: "Выпуск" },
        [
          {
            href: logisticsPath("production-orders", created.sequenceNumber ?? created.productionOrderId),
            label: created.sequenceNumber
              ? formatLogisticsCode("productionOrder", created.sequenceNumber)
              : "Заказ на производство",
          },
        ],
      );
    } catch (caught) {
      if (caught instanceof ProductionForOrderOutputError) {
        const poLabel = caught.sequenceNumber
          ? formatLogisticsCode("productionOrder", caught.sequenceNumber)
          : "Заказ на производство";
        const href = caught.sequenceNumber
          ? logisticsPath("production-orders", caught.sequenceNumber)
          : logisticsPath("production-orders", caught.productionOrderId);
        toast.error(`${poLabel} создан, выпуск не создан`, {
          description: translateLogisticsError(caught.message),
        });
        onClose();
        router.push(href);
        return;
      }
      const raw = caught instanceof Error ? caught.message : "Не удалось создать";
      setServerError(translateLogisticsError(raw));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell
      open
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
      size="lg"
      kicker={target.kind === "existing" ? target.order.number : "Календарь выпусков"}
      title={target.kind === "existing" ? "Новый выпуск" : "Новый заказ на производство"}
      header={
        <div className="grid gap-3 sm:grid-cols-2">
          <ExpectedEndField label="Срок выпуска" value={expectedEndOn} onChange={setExpectedEndOn} />
          {target.kind === "new" ? (
            <FieldSelect
              label="Завод"
              value={plantId}
              onChange={setPlantId}
              placeholder="Выберите завод"
              emptyLabel={plantIds.length === 0 ? "Нет заводов" : undefined}
              items={plantIds.map((id) => ({ value: id, label: formatLogisticsCode("plant", id) }))}
            />
          ) : (
            <p className="self-end text-sm text-muted-foreground">
              Завод {formatLogisticsCode("plant", target.order.plantId)}
            </p>
          )}
        </div>
      }
      footerSummary={picked.length ? pluralTovar(picked.length) : "Нет строк"}
      submitLabel="Создать выпуск"
      onSubmit={() => void submit()}
      submitDisabled={picked.length === 0 || !expectedEndOn || (target.kind === "new" && !plantId)}
      disabledReason="Введите количество"
      submitting={busy}
      serverError={serverError}
      dirty={picked.length > 0}
    >
      <ContextRowsTable
        rows={rows}
        quantities={quantities}
        onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
        limitHeader="Осталось по плану"
        limitMode={target.kind === "new" ? "none" : "hard"}
        empty="Незанятого плана нет"
      />
    </DialogShell>
  );
};

export const OutputCalendarCreateDialog = ({
  target,
  openOrders,
  products,
  plantIds,
  onClose,
}: OutputCalendarCreateDialogProps) => {
  if (!target) return null;
  const formKey =
    target.kind === "existing"
      ? `existing-${target.product.id}-${target.order.productionOrderId}-${target.date ?? `${target.month.year}-${target.month.month}`}`
      : `new-${target.product.id}-${target.date ?? `${target.month.year}-${target.month.month}`}`;
  return (
    <CreateForm
      key={formKey}
      target={target}
      openOrders={openOrders}
      products={products}
      plantIds={plantIds}
      onClose={onClose}
    />
  );
};
