"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CURRENCY_CODES, type CurrencyCode } from "./pricelists-helpers";

type CurrencyGridProps = {
  selected: CurrencyCode;
  onSelect: (currency: CurrencyCode) => void;
  ariaLabel: string;
};

// Compact grid of currency chips — selected one is filled, the rest are quiet.
const CurrencyGrid = ({ selected, onSelect, ariaLabel }: CurrencyGridProps) => (
  <div role="group" aria-label={ariaLabel} className="grid grid-cols-4 gap-1">
    {CURRENCY_CODES.map((currency) => {
      const isSelected = currency === selected;
      return (
        <button
          key={currency}
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(currency)}
          className={cn(
            "flex h-7 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-foreground hover:bg-muted",
          )}
        >
          {currency}
        </button>
      );
    })}
  </div>
);

type PricelistCurrencyPopoverProps = {
  priceCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  /** Per-cell: changes the currency the price is stored in. */
  onPriceCurrencyChange: (currency: CurrencyCode) => void;
  /** Global: changes the conversion currency shown across every row. */
  onDisplayCurrencyChange: (currency: CurrencyCode) => void;
  /** Hidden in read-only lists, where the stored price currency can't change. */
  allowPriceCurrency: boolean;
  /** Base label, e.g. "Plant Price for Widget". */
  ariaLabel: string;
  onOpenChange?: (open: boolean) => void;
};

/**
 * The clickable middle of the dual price cell: shows both currency codes
 * (`CNY │ USD`) with no chevron, and opens a compact picker for the per-cell
 * price currency and the global display currency.
 */
export const PricelistCurrencyPopover = ({
  priceCurrency,
  displayCurrency,
  onPriceCurrencyChange,
  onDisplayCurrencyChange,
  allowPriceCurrency,
  ariaLabel,
  onOpenChange,
}: PricelistCurrencyPopoverProps) => {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const tooltipText = allowPriceCurrency
    ? `${priceCurrency} — price currency, ${displayCurrency} — display currency (all rows). Click to change.`
    : `${priceCurrency} — price currency, ${displayCurrency} — display currency (all rows). Click to change the display currency.`;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <button
                  type="button"
                  aria-label={`${ariaLabel}: choose price and display currency`}
                  className={cn(
                    "flex shrink-0 items-center gap-1 self-stretch bg-muted/40 px-1.5 text-sm transition-colors outline-none hover:bg-muted focus-visible:bg-muted data-[popup-open]:bg-muted",
                  )}
                >
                  <span className="w-8 text-center font-medium text-foreground">{priceCurrency}</span>
                  <span className="h-3 w-px bg-input" aria-hidden />
                  <span className="w-8 text-center font-medium text-muted-foreground">{displayCurrency}</span>
                </button>
              }
            />
          }
        />
        <TooltipContent side="top" className="max-w-[220px] text-center">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="center" sideOffset={6} className="w-60 gap-3">
        {allowPriceCurrency ? (
          <section className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-foreground">Price currency</p>
            <CurrencyGrid
              selected={priceCurrency}
              onSelect={onPriceCurrencyChange}
              ariaLabel="Price currency"
            />
          </section>
        ) : null}

        <section className="flex flex-col gap-1.5">
          <p className="flex items-baseline gap-1.5 text-xs font-medium text-foreground">
            Display currency
            <span className="font-normal text-muted-foreground">· all rows</span>
          </p>
          <CurrencyGrid
            selected={displayCurrency}
            onSelect={onDisplayCurrencyChange}
            ariaLabel="Display currency"
          />
        </section>
      </PopoverContent>
    </Popover>
  );
};
