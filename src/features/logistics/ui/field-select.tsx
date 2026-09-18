// english-ui:ignore-file
"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}: {
  label: string;
  value: string;
  items: FieldSelectItem[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}) => {
  if (items.length === 0) {
    return (
      <label className="space-y-1 text-sm">
        <span className="font-medium">{label}</span>
        <div
          className="flex h-8 w-full items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm text-muted-foreground"
          aria-disabled="true"
          aria-label={label}
        >
          {emptyLabel ?? placeholder}
        </div>
      </label>
    );
  }

  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Select
        items={items}
        value={value || null}
        onValueChange={(next) => onChange(next ?? "")}
        disabled={disabled}
      >
        <SelectTrigger className="w-full bg-background" aria-label={label}>
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
    </label>
  );
};
