"use client";

import { useState, type ChangeEvent } from "react";
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
  focusNextPricelistCellOnEnter,
  formatMoney,
  formatUsdValue,
  fromUsd,
  PRICE_AMOUNT_TYPOGRAPHY,
  toUsd,
  type CurrencyCode,
  type PricelistCellValue,
} from "./pricelists-helpers";

const CURRENCY_SELECT_ITEMS = CURRENCY_CODES.map((currency) => ({ value: currency, label: currency }));

type PricelistPriceDualCellProps = {
  /** The stored price in its source currency — the single source of truth. */
  value: PricelistCellValue;
  /** Writes back the source-currency price (currency + converted amount). */
  onChange: (value: PricelistCellValue) => void;
  onEditingChange: (editing: boolean) => void;
  editors: CollabUser[];
  /** Base label, e.g. "Plant Price for Widget"; each half appends its unit. */
  ariaLabel: string;
  /** Groups inputs in the same column so Enter can move focus to the cell below. */
  columnKey?: string;
  isReadOnly?: boolean;
};

/**
 * The USD half shows a rounded amount; the stored value stays in the source
 * currency, so USD is purely a front-end conversion (no second stored field).
 */
const toUsdInputText = (value: PricelistCellValue): string => {
  const usd = toUsd(value.amount, value.currency);
  return usd === null ? "" : String(Math.round(usd));
};

const INPUT_CLASS =
  "h-7 w-full min-w-0 flex-1 bg-transparent px-2 py-1 text-left outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/**
 * A single combined price input: source amount + currency selector on the left,
 * a divider, then a fixed `USD` unit + the USD amount on the right
 * (`1000 CNY ⌄ | USD 500`). Editing either side writes only the source-currency
 * price; the USD half converts the entered amount back on the fly. Read-only
 * lists (dealer scope) render the same shape as static text.
 */
export const PricelistPriceDualCell = ({
  value,
  onChange,
  onEditingChange,
  editors,
  ariaLabel,
  columnKey,
  isReadOnly = false,
}: PricelistPriceDualCellProps) => {
  const activeEditor = editors[0] ?? null;
  const [usdFocused, setUsdFocused] = useState(false);
  const [usdDraft, setUsdDraft] = useState<string>(() => toUsdInputText(value));
  const [syncedUsd, setSyncedUsd] = useState<string>(() => toUsdInputText(value));

  // Keep the USD half in sync with external/source-currency edits while it is
  // not being typed into (adjust during render, mirroring the parameter cell).
  const nextUsd = toUsdInputText(value);
  if (!usdFocused && nextUsd !== syncedUsd) {
    setSyncedUsd(nextUsd);
    setUsdDraft(nextUsd);
  }

  if (isReadOnly) {
    return (
      <div className="flex h-7 items-center rounded-lg border border-input bg-muted/30">
        <span className={cn("min-w-0 flex-1 truncate px-2", PRICE_AMOUNT_TYPOGRAPHY)}>
          {formatMoney(value.amount, value.currency)}
        </span>
        <span className="h-7 w-px shrink-0 bg-input" aria-hidden />
        <span className="min-w-0 flex-1 truncate px-2 text-sm tabular-nums text-muted-foreground">
          {formatUsdValue(toUsd(value.amount, value.currency))}
        </span>
      </div>
    );
  }

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

  const commitUsd = (text: string) => {
    if (text.trim() === "") {
      onChange({ amount: null, currency: value.currency });
      return;
    }
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const original = fromUsd(Math.max(0, parsed), value.currency);
    onChange({
      amount: original === null ? null : Math.round(original),
      currency: value.currency,
    });
  };

  const handleUsdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value: text } = event.target;
    setUsdDraft(text);
    commitUsd(text);
  };

  return (
    <div
      className={cn(
        "relative flex h-7 items-center rounded-lg border bg-background transition-colors focus-within:border-ring",
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
        onKeyDown={focusNextPricelistCellOnEnter}
        onFocus={() => onEditingChange(true)}
        onBlur={() => onEditingChange(false)}
        aria-label={ariaLabel}
        data-pricelist-col={columnKey}
        className={cn("rounded-l-lg", INPUT_CLASS, PRICE_AMOUNT_TYPOGRAPHY)}
      />

      <Select
        items={CURRENCY_SELECT_ITEMS}
        value={value.currency}
        onValueChange={handleCurrencyChange}
        onOpenChange={(open) => onEditingChange(open)}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "h-7 shrink-0 gap-1 rounded-none border-0 bg-muted/40 pr-1.5 pl-2 [&_[data-slot=select-value]]:overflow-visible",
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

      <span className="h-7 w-px shrink-0 bg-input" aria-hidden />

      <span
        className={cn(
          "flex h-7 shrink-0 items-center bg-muted/40 px-2 text-muted-foreground select-none",
          PRICE_AMOUNT_TYPOGRAPHY,
        )}
        aria-hidden
      >
        USD
      </span>

      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={1}
        value={usdDraft}
        onChange={handleUsdChange}
        onKeyDown={focusNextPricelistCellOnEnter}
        onFocus={() => {
          setUsdFocused(true);
          onEditingChange(true);
        }}
        onBlur={() => {
          setUsdFocused(false);
          onEditingChange(false);
        }}
        aria-label={`${ariaLabel} in USD`}
        data-pricelist-col={columnKey ? `${columnKey}-usd` : undefined}
        className={cn("rounded-r-lg", INPUT_CLASS, PRICE_AMOUNT_TYPOGRAPHY)}
      />
    </div>
  );
};
