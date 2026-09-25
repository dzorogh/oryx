// english-ui:ignore-file
"use client";

import { useId } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FieldSelectItem = {
  value: string;
  label: string;
};

export const FieldSelect = ({
  label,
  value,
  items,
  onChange,
  placeholder = "Выберите",
  emptyLabel,
  disabled,
  autoFocus,
  labelClassName,
  className,
  invalid,
  error,
}: {
  label: string;
  value: string;
  items: FieldSelectItem[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  labelClassName?: string;
  className?: string;
  invalid?: boolean;
  error?: string | null;
}) => {
  const labelId = useId();

  return (
    <div className={cn("space-y-1 text-sm", className)}>
      <span id={labelId} className={cn("block", labelClassName ?? "font-medium")}>
        {label}
      </span>
      {items.length === 0 ? (
        <div
          className="flex h-8 w-full items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm text-muted-foreground"
          aria-disabled="true"
          aria-labelledby={labelId}
        >
          {emptyLabel ?? placeholder}
        </div>
      ) : (
        <Select
          items={items}
          value={value || null}
          onValueChange={(next) => onChange(next ?? "")}
          disabled={disabled}
        >
          <SelectTrigger
            className="w-full bg-background"
            aria-labelledby={labelId}
            aria-invalid={invalid || undefined}
            autoFocus={autoFocus}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
};
