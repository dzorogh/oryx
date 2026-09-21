// english-ui:ignore-file
"use client";

import { Input } from "@/components/ui/input";
import { LogisticsMetaField } from "@/features/logistics/ui/logistics-toolbar";

type ExpectedEndFieldProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  optional?: boolean;
  hint?: string;
  layout?: "stack" | "inline";
  disabled?: boolean;
  invalid?: boolean;
  errorId?: string;
};

export const ExpectedEndField = ({
  value,
  onChange,
  id = "expected-end",
  label = "Ожидаемое окончание",
  optional = false,
  hint,
  layout = "stack",
  disabled = false,
  invalid = false,
  errorId,
}: ExpectedEndFieldProps) => {
  const caption = optional ? (
    <span className="font-medium">
      {label}
      <span className="ml-1 font-normal text-muted-foreground">необязательно</span>
    </span>
  ) : (
    <span className="font-medium">{label}</span>
  );
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const input = (
    <Input
      id={id}
      type="date"
      value={value}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value)}
      className={layout === "inline" ? "w-[11.5rem] max-w-full" : "w-full min-w-0 max-w-full"}
    />
  );
  const hintLine = hint ? (
    <p id={hintId} className="text-xs text-muted-foreground">
      {hint}
    </p>
  ) : null;

  if (layout === "inline") {
    return (
      <LogisticsMetaField label={label} htmlFor={id}>
        {input}
        {hintLine}
      </LogisticsMetaField>
    );
  }

  return (
    <label className="space-y-1 text-sm">
      {caption}
      {input}
      {hintLine}
    </label>
  );
};
