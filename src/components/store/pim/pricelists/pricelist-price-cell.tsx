"use client";

import type { ChangeEvent } from "react";
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
import {
  CURRENCY_CODES,
  PRICE_AMOUNT_TYPOGRAPHY,
  type CurrencyCode,
  type PricelistCellValue,
} from "./pricelists-helpers";

const CURRENCY_SELECT_ITEMS = CURRENCY_CODES.map((currency) => ({ value: currency, label: currency }));

type PricelistPriceCellProps = {
  value: PricelistCellValue;
  onChange: (value: PricelistCellValue) => void;
  onEditingChange: (editing: boolean) => void;
  editors: CollabUser[];
  ariaLabel: string;
};

export const PricelistPriceCell = ({
  value,
  onChange,
  onEditingChange,
  editors,
  ariaLabel,
}: PricelistPriceCellProps) => {
  const activeEditor = editors[0] ?? null;

  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = event.target.valueAsNumber;
    onChange({
      amount: Number.isNaN(parsed) ? null : Math.max(0, parsed),
      currency: value.currency,
    });
  };

  const handleCurrencyChange = (nextCurrency: string | null) => {
    if (!nextCurrency) {
      return;
    }
    onChange({ amount: value.amount, currency: nextCurrency as CurrencyCode });
  };

  return (
    <div
      className={cn(
        "relative flex h-8 items-center rounded-lg border bg-background transition-colors focus-within:border-ring",
        activeEditor ? "border-transparent" : "border-input",
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

      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={1}
        value={value.amount ?? ""}
        onChange={handleAmountChange}
        onFocus={() => onEditingChange(true)}
        onBlur={() => onEditingChange(false)}
        aria-label={ariaLabel}
        className={cn(
          "h-8 w-full min-w-0 flex-1 rounded-l-lg bg-transparent px-2 py-1 text-right outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          PRICE_AMOUNT_TYPOGRAPHY,
        )}
      />

      <Select items={CURRENCY_SELECT_ITEMS} value={value.currency} onValueChange={handleCurrencyChange}>
        <SelectTrigger
          className={cn(
            "h-8 min-w-[4.25rem] shrink-0 gap-1 rounded-l-none rounded-r-lg border-0 border-l border-input bg-muted/40 pr-1.5 pl-2 [&_[data-slot=select-value]]:overflow-visible",
            PRICE_AMOUNT_TYPOGRAPHY,
          )}
          aria-label={`${ariaLabel} currency`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {CURRENCY_CODES.map((currency) => (
              <SelectItem key={currency} value={currency}>
                {currency}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
