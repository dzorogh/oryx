"use client";

import { useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import type { CollabUser } from "./collab/collab-config";
import { PricelistCurrencyPopover } from "./pricelist-currency-popover";
import {
  convertAmount,
  focusNextPricelistCellOnEnter,
  formatConvertedValue,
  formatMoney,
  PRICE_AMOUNT_TYPOGRAPHY,
  type CurrencyCode,
  type PricelistCellValue,
} from "./pricelists-helpers";

type PricelistPriceDualCellProps = {
  /** The stored price in its source currency — the single source of truth. */
  value: PricelistCellValue;
  /** Writes back the source-currency price (currency + converted amount). */
  onChange: (value: PricelistCellValue) => void;
  onEditingChange: (editing: boolean) => void;
  editors: CollabUser[];
  /** Currency the display half converts into — a global, view-wide preference. */
  displayCurrency: CurrencyCode;
  /** Changes the global display currency for every row at once. */
  onDisplayCurrencyChange: (currency: CurrencyCode) => void;
  /** Base label, e.g. "Plant Price for Widget"; each half appends its unit. */
  ariaLabel: string;
  /** Groups inputs in the same column so Enter can move focus to the cell below. */
  columnKey?: string;
  isReadOnly?: boolean;
};

/**
 * The display half shows a rounded amount in the chosen display currency; the
 * stored value stays in the source currency, so the conversion is purely on the
 * front end (no second stored field).
 */
const toDisplayInputText = (value: PricelistCellValue, displayCurrency: CurrencyCode): string => {
  const converted = convertAmount(value.amount, value.currency, displayCurrency);
  return converted === null ? "" : String(Math.round(converted));
};

const INPUT_CLASS =
  "h-7 w-full min-w-0 flex-1 bg-transparent px-2 py-1 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/**
 * A single combined price input: the source amount on the left, a clickable
 * currency chip in the middle (`CNY │ USD`, no chevron), and the converted
 * display amount on the right. The middle opens a picker for the per-cell price
 * currency and the global display currency. Editing either amount writes only
 * the source-currency price; the display half converts the entry back on the
 * fly. Read-only lists (dealer scope) render the amounts as static text with a
 * plain divider in the middle — the display currency is switched from the toolbar.
 */
export const PricelistPriceDualCell = ({
  value,
  onChange,
  onEditingChange,
  editors,
  displayCurrency,
  onDisplayCurrencyChange,
  ariaLabel,
  columnKey,
  isReadOnly = false,
}: PricelistPriceDualCellProps) => {
  const activeEditor = editors[0] ?? null;
  const [displayFocused, setDisplayFocused] = useState(false);
  const [displayDraft, setDisplayDraft] = useState<string>(() => toDisplayInputText(value, displayCurrency));
  const [syncedDisplay, setSyncedDisplay] = useState<string>(() => toDisplayInputText(value, displayCurrency));

  // Keep the display half in sync with external edits or a display-currency
  // change while it is not being typed into (adjust during render, mirroring the
  // parameter cell).
  const nextDisplay = toDisplayInputText(value, displayCurrency);
  if (!displayFocused && nextDisplay !== syncedDisplay) {
    setSyncedDisplay(nextDisplay);
    setDisplayDraft(nextDisplay);
  }

  const currencyPicker = (
    <PricelistCurrencyPopover
      priceCurrency={value.currency}
      displayCurrency={displayCurrency}
      onPriceCurrencyChange={(currency) => onChange({ amount: value.amount, currency })}
      onDisplayCurrencyChange={onDisplayCurrencyChange}
      allowPriceCurrency={!isReadOnly}
      ariaLabel={ariaLabel}
      onOpenChange={(open) => onEditingChange(open)}
    />
  );

  if (isReadOnly) {
    return (
      <div className="flex h-7 min-w-0 items-center gap-2">
        <span className={cn("truncate", PRICE_AMOUNT_TYPOGRAPHY)}>
          {formatMoney(value.amount, value.currency)}
        </span>
        <span className="h-3.5 w-px shrink-0 bg-input" aria-hidden />
        <span className="truncate text-sm tabular-nums text-muted-foreground">
          {formatConvertedValue(
            convertAmount(value.amount, value.currency, displayCurrency),
            displayCurrency,
          )}
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

  const commitDisplay = (text: string) => {
    if (text.trim() === "") {
      onChange({ amount: null, currency: value.currency });
      return;
    }
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const original = convertAmount(Math.max(0, parsed), displayCurrency, value.currency);
    onChange({
      amount: original === null ? null : Math.round(original),
      currency: value.currency,
    });
  };

  const handleDisplayChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value: text } = event.target;
    setDisplayDraft(text);
    commitDisplay(text);
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
        className={cn("rounded-l-lg text-right", INPUT_CLASS, PRICE_AMOUNT_TYPOGRAPHY)}
      />

      {currencyPicker}

      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={1}
        value={displayDraft}
        onChange={handleDisplayChange}
        onKeyDown={focusNextPricelistCellOnEnter}
        onFocus={() => {
          setDisplayFocused(true);
          onEditingChange(true);
        }}
        onBlur={() => {
          setDisplayFocused(false);
          onEditingChange(false);
        }}
        aria-label={`${ariaLabel} in ${displayCurrency}`}
        data-pricelist-col={columnKey ? `${columnKey}-display` : undefined}
        className={cn("rounded-r-lg text-left", INPUT_CLASS, PRICE_AMOUNT_TYPOGRAPHY)}
      />
    </div>
  );
};
