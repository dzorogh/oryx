// english-ui:ignore-file
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import {
  lastDayOfMonthIso,
  productCode,
} from "@/features/logistics/output-calendar";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import type { CreateDialogTarget } from "@/features/logistics/ui/output-calendar-matrix";

type OutputCalendarCreateDialogProps = {
  target: CreateDialogTarget | null;
  plantIds: string[];
  onClose: () => void;
  onSubmit: (args: {
    target: CreateDialogTarget;
    quantity: number;
    expectedEndOn: string;
    plantId: string;
  }) => Promise<void>;
};

const CreateForm = ({
  target,
  plantIds,
  onClose,
  onSubmit,
}: {
  target: CreateDialogTarget;
  plantIds: string[];
  onClose: () => void;
  onSubmit: OutputCalendarCreateDialogProps["onSubmit"];
}) => {
  const product = target.product;
  const max = target.kind === "existing" ? target.order.remaining : undefined;
  const defaultPlant =
    target.kind === "existing" ? target.order.plantId : (product.plantId ?? "");

  const [quantity, setQuantity] = useState(
    target.kind === "existing" ? String(target.order.remaining) : "1",
  );
  const [expectedEndOn, setExpectedEndOn] = useState(lastDayOfMonthIso(target.month));
  const [plantId, setPlantId] = useState(defaultPlant);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    isAllowedQuantity(quantity, max) &&
    expectedEndOn.length > 0 &&
    (target.kind === "existing" || plantId.length > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit({
        target,
        quantity: Number(quantity),
        expectedEndOn,
        plantId: target.kind === "existing" ? target.order.plantId : plantId,
      });
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {product.name} · {productCode(product.id)}
      </p>
      {target.kind === "existing" ? (
        <p className="text-xs text-muted-foreground">
          {target.order.number} · осталось разложить{" "}
          {formatQuantity(target.order.remaining, product.unit)}
        </p>
      ) : null}

      <QuantityField
        value={quantity}
        onChange={setQuantity}
        max={max}
        unit={product.unit}
        availablePrefix={max != null ? "Макс." : undefined}
      />

      <ExpectedEndField label="Срок выпуска" value={expectedEndOn} onChange={setExpectedEndOn} />

      {target.kind === "new" ? (
        <FieldSelect
          label="Завод"
          value={plantId}
          onChange={setPlantId}
          placeholder="Выберите завод"
          emptyLabel={plantIds.length === 0 ? "Нет заводов" : undefined}
          items={plantIds.map((id) => ({
            value: id,
            label: formatLogisticsCode("plant", id),
          }))}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Завод: {formatLogisticsCode("plant", defaultPlant)}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
          Отмена
        </Button>
        <Button type="button" size="sm" onClick={handleSubmit} disabled={!canSubmit || busy}>
          Создать
        </Button>
      </div>
    </div>
  );
};

export const OutputCalendarCreateDialog = ({
  target,
  plantIds,
  onClose,
  onSubmit,
}: OutputCalendarCreateDialogProps) => {
  const formKey =
    target == null
      ? "closed"
      : target.kind === "existing"
        ? `existing-${target.product.id}-${target.order.productionOrderId}-${target.month.year}-${target.month.month}`
        : `new-${target.product.id}-${target.month.year}-${target.month.month}`;

  return (
    <LogisticsDialog
      open={target != null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={
        target?.kind === "existing"
          ? `Выпуск по ${target.order.number}`
          : "Новый заказ на производство"
      }
      description="Создание выпуска из ячейки календаря"
    >
      {target ? (
        <CreateForm
          key={formKey}
          target={target}
          plantIds={plantIds}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </LogisticsDialog>
  );
};
