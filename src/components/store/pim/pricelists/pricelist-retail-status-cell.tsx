"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CollabUser } from "./collab/collab-config";
import { formatRetailStatus, RETAIL_STATUSES, type RetailStatus } from "./pricelists-helpers";

type PricelistRetailStatusCellProps = {
  value: RetailStatus;
  ariaLabel: string;
  /** Dealer scope shows the status as read-only text (no editing). */
  readOnly?: boolean;
  editors?: CollabUser[];
  onChange?: (value: RetailStatus) => void;
  onEditingChange?: (editing: boolean) => void;
};

export const PricelistRetailStatusCell = ({
  value,
  ariaLabel,
  readOnly = false,
  editors = [],
  onChange,
  onEditingChange,
}: PricelistRetailStatusCellProps) => {
  if (readOnly) {
    return (
      <span
        className="block truncate text-sm text-foreground"
        title={formatRetailStatus(value)}
        aria-label={ariaLabel}
      >
        {formatRetailStatus(value)}
      </span>
    );
  }

  const activeEditor = editors[0] ?? null;

  const handleValueChange = (next: string | null) => {
    if (next) {
      onChange?.(next as RetailStatus);
    }
  };

  return (
    <div
      className={cn(
        "relative flex h-7 items-center rounded-lg transition-colors",
        activeEditor ? "border border-transparent" : null,
      )}
      style={activeEditor ? { boxShadow: `0 0 0 2px ${activeEditor.color}` } : undefined}
    >
      {activeEditor ? (
        <span
          className="absolute -top-2 left-2 z-10 rounded-sm px-1 text-[10px] leading-tight font-medium text-white"
          style={{ backgroundColor: activeEditor.color }}
        >
          {activeEditor.name}
        </span>
      ) : null}

      <Select
        items={RETAIL_STATUSES}
        value={value}
        onValueChange={handleValueChange}
        onOpenChange={(open) => onEditingChange?.(open)}
      >
        <SelectTrigger
          size="sm"
          className="h-7 w-full bg-background text-sm font-normal text-foreground"
          aria-label={ariaLabel}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {RETAIL_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
