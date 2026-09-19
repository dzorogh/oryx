// english-ui:ignore-file
"use client";

import { Input } from "@/components/ui/input";
import { formatQuantity } from "@/features/logistics/logistics-labels";

type QuantityFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  min?: number;
  unit?: string;
  disabled?: boolean;
  id?: string;
  emptyLabel?: string;
  availablePrefix?: string;
  afterActionPrefix?: string;
};

export const isAllowedQuantity = (value: string, max?: number): boolean => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return false;
  }
  if (max != null && Number.isFinite(max) && numeric - max > 1e-9) {
    return false;
  }
  return true;
};

export const QuantityField = ({
  label = "Количество",
  value,
  onChange,
  max,
  min = 0,
  unit,
  disabled,
  id,
  emptyLabel = "Нет доступного количества",
  availablePrefix = "Доступно",
  afterActionPrefix = "после действия",
}: QuantityFieldProps) => {
  const numeric = Number(value);
  const hasMax = max != null && Number.isFinite(max);
  const remaining = hasMax && Number.isFinite(numeric) ? max - numeric : null;
  const none = hasMax && max <= 0;

  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        id={id}
        type="number"
        min={min}
        max={hasMax ? max : undefined}
        value={value}
        disabled={disabled || none}
        aria-label={label}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "") {
            onChange(raw);
            return;
          }
          const next = Number(raw);
          if (!Number.isFinite(next)) {
            onChange(raw);
            return;
          }
          if (hasMax && next > max) {
            onChange(String(max));
            return;
          }
          if (next < min) {
            onChange(String(min));
            return;
          }
          onChange(raw);
        }}
      />
      {hasMax ? (
        <p className={`text-xs ${none ? "text-destructive" : "text-muted-foreground"}`}>
          {none
            ? emptyLabel
            : `${availablePrefix} ${formatQuantity(max, unit)}${
                remaining != null && remaining >= 0 ? ` · ${afterActionPrefix} ${formatQuantity(remaining, unit)}` : ""
              }`}
        </p>
      ) : null}
    </label>
  );
};
