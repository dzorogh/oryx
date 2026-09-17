// english-ui:ignore-file
"use client";

import { Input } from "@/components/ui/input";
import { LogisticsMetaField } from "@/features/logistics/ui/logistics-toolbar";

type ExpectedEndFieldProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  layout?: "stack" | "inline";
};

export const ExpectedEndField = ({
  value,
  onChange,
  id = "expected-end",
  label = "Ожидаемое окончание",
  layout = "stack",
}: ExpectedEndFieldProps) => {
  const input = (
    <Input
      id={id}
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={layout === "inline" ? "w-[11.5rem]" : undefined}
    />
  );

  if (layout === "inline") {
    return (
      <LogisticsMetaField label={label} htmlFor={id}>
        {input}
      </LogisticsMetaField>
    );
  }

  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {input}
    </label>
  );
};
