"use client";

import { useMemo, useState } from "react";
import { pluralTovar } from "@/features/logistics/category-tree";
import { useRouter } from "next/navigation";
import { createProductionOutput } from "@/features/logistics/logistics-api";
import { remainingPlanForProductionProduct } from "@/features/logistics/logistics-availability";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { productById } from "@/features/logistics/logistics-lookups";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { firstErrorKey, parseDecimalQuantity } from "@/features/logistics/ui/catalog-quantity-model";
import { focusQuantityInput } from "@/features/logistics/ui/catalog-quantity-table";
import { ContextRowsTable } from "@/features/logistics/ui/context-rows-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

const openOrders = (snapshot: LogisticsSnapshot) =>
  snapshot.productionOrders.filter(
    (item) => item.status !== "closed" && item.status !== "done" && item.status !== "cancelled",
  );

export const CreateOutputDialog = ({
  open,
  onOpenChange,
  snapshot,
  productionOrderId,
  loading = false,
  error = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: LogisticsSnapshot;
  /** Карточка заказа на производство: заказ уже выбран. */
  productionOrderId?: string;
  loading?: boolean;
  error?: string | null;
}) => {
  const router = useRouter();
  const [orderId, setOrderId] = useState(productionOrderId ?? "");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const selectedOrderId = productionOrderId || orderId;
  const order = snapshot.productionOrders.find((item) => item.id === selectedOrderId);

  const rows = useMemo(() => {
    if (!selectedOrderId) return [];
    return snapshot.productionOrderLines.flatMap((line) => {
      if (line.orderId !== selectedOrderId) return [];
      const left = remainingPlanForProductionProduct(snapshot, selectedOrderId, line.productId, line.quantity);
      if (left <= 1e-9) return [];
      const product = productById(snapshot, line.productId);
      return [
        {
          key: line.productId,
          title: product?.name ?? line.productName,
          subtitle: product?.code,
          limitLabel: formatQuantity(left, product?.unit ?? line.productUnit),
          limit: left,
          unit: product?.unit ?? line.productUnit,
        },
      ];
    });
  }, [selectedOrderId, snapshot]);

  const picked = rows.flatMap((row) => {
    const quantity = parseDecimalQuantity(quantities[row.key] ?? "");
    if (quantity == null || quantity <= 0) return [];
    return [{ productId: row.key, quantity, limit: row.limit }];
  });

  const submit = async () => {
    if (submitting || !selectedOrderId) return;
    const errorKey = firstErrorKey(rows.map((row) => ({ key: row.key, raw: quantities[row.key] ?? "", limit: row.limit, mode: "hard" as const })));
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    if (picked.length === 0) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const outputId = await createProductionOutput({
        orderId: selectedOrderId,
        expectedEndOn: expectedEndOn || null,
        complete: false,
        lines: picked.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      });
      onOpenChange(false);
      router.push(logisticsPath("outputs", outputId));
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (!productionOrderId) setOrderId("");
          setQuantities({});
          setExpectedEndOn("");
          setServerError(null);
        }
        onOpenChange(next);
      }}
      size="lg"
      kicker={order?.number ?? "Выпуски"}
      title="Новый выпуск"
      header={
        <div className="grid gap-3 sm:grid-cols-2">
          {productionOrderId ? null : (
            <FieldSelect
              label="Заказ на производство"
              value={orderId}
              items={openOrders(snapshot).map((item) => ({ value: item.id, label: item.number }))}
              onChange={(value) => {
                setOrderId(value);
                setQuantities({});
              }}
              placeholder="Выберите заказ"
              emptyLabel="Нет открытых заказов на производство"
            />
          )}
          <ExpectedEndField
            label="Ожидаемое окончание"
            optional
            value={expectedEndOn}
            onChange={setExpectedEndOn}
            disabled={!selectedOrderId}
          />
        </div>
      }
      footerSummary={picked.length ? pluralTovar(picked.length) : "Нет строк"}
      submitLabel="Создать выпуск"
      onSubmit={() => void submit()}
      submitDisabled={!selectedOrderId || picked.length === 0}
      disabledReason={selectedOrderId ? "Введите количество" : "Выберите заказ на производство"}
      submitting={submitting}
      serverError={serverError}
      dirty={picked.length > 0 || Boolean(expectedEndOn)}
      loading={loading}
      error={error}
    >
      {selectedOrderId ? (
        <ContextRowsTable
          rows={rows}
          quantities={quantities}
          onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
          limitHeader="Осталось по плану"
          empty="Незанятого плана нет"
        />
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Выберите заказ на производство, чтобы увидеть незанятый план
        </div>
      )}
    </DialogShell>
  );
};
