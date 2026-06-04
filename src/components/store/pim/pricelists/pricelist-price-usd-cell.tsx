"use client";

import { useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import type { CollabUser } from "./collab/collab-config";
import {
  focusNextPricelistCellOnEnter,
  fromUsd,
  PRICE_AMOUNT_TYPOGRAPHY,
  toUsd,
  type PricelistCellValue,
} from "./pricelists-helpers";

type PricelistPriceUsdCellProps = {
  /** The stored price in its source currency — the single source of truth. */
  value: PricelistCellValue;
  /** Writes back the source-currency price (same currency, converted amount). */
  onChange: (value: PricelistCellValue) => void;
  onEditingChange: (editing: boolean) => void;
  editors: CollabUser[];
  ariaLabel: string;
  /** Groups inputs in the same column so Enter can move focus to the cell below. */
  columnKey?: string;
};

/**
 * The USD amount is rounded for a clean display. The stored amount stays in the
 * source currency, so the USD value is purely a front-end conversion that never
 * needs its own stored field.
 */
const toUsdInputText = (value: PricelistCellValue): string => {
  const usd = toUsd(value.amount, value.currency);
  return usd === null ? "" : String(Math.round(usd));
};

/**
 * Editable USD view of a source-currency price. Typing here converts the amount
 * back into the original currency on the fly and stores only that — editing the
 * price in USD or in its source currency stays in sync without a second value.
 */
export const PricelistPriceUsdCell = ({
  value,
  onChange,
  onEditingChange,
  editors,
  ariaLabel,
  columnKey,
}: PricelistPriceUsdCellProps) => {
  const activeEditor = editors[0] ?? null;
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>(() => toUsdInputText(value));
  const [syncedUsd, setSyncedUsd] = useState<string>(() => toUsdInputText(value));

  // Reflect external updates (a remote edit, or a local edit in the source
  // currency) while not editing by adjusting state during render, mirroring the
  // parameter cell pattern.
  const nextUsd = toUsdInputText(value);
  if (!focused && nextUsd !== syncedUsd) {
    setSyncedUsd(nextUsd);
    setDraft(nextUsd);
  }

  const commit = (text: string) => {
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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value: text } = event.target;
    setDraft(text);
    commit(text);
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
        value={draft}
        onChange={handleChange}
        onKeyDown={focusNextPricelistCellOnEnter}
        onFocus={() => {
          setFocused(true);
          onEditingChange(true);
        }}
        onBlur={() => {
          setFocused(false);
          onEditingChange(false);
        }}
        aria-label={ariaLabel}
        data-pricelist-col={columnKey}
        className={cn(
          "h-7 w-full min-w-0 flex-1 rounded-l-lg bg-transparent px-2 py-1 text-left outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          PRICE_AMOUNT_TYPOGRAPHY,
        )}
      />

      <span
        className={cn(
          "flex h-7 min-w-[4.25rem] shrink-0 items-center rounded-r-lg border-0 border-l border-input bg-muted/40 px-2 text-muted-foreground select-none",
          PRICE_AMOUNT_TYPOGRAPHY,
        )}
        aria-hidden
      >
        USD
      </span>
    </div>
  );
};
