"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useSelectedRegion,
  type StoreRegionOption,
} from "@/features/store/region-context";
import { StoreInlineRetry } from "@/features/store/store-load-notice";
import { cn } from "@/lib/utils";

export const formatRegionSwitcherLabel = (region: StoreRegionOption): string => {
  const currencies = Array.from(new Set([region.dealerCurrency, region.retailCurrency])).join("/");
  const hub = region.hubCode ?? "—";
  return `${region.code.toUpperCase()} · ${currencies} · ${hub}`;
};

type RegionSwitcherProps = {
  className?: string;
  /** When set, overrides context open state (still writes selection to context). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Compact trigger for toolbar rows. */
  size?: "default" | "sm";
  /** Controlled region code; defaults to the shared selection. */
  value?: string | null;
  /** Called instead of writing the shared selection directly. */
  onValueChange?: (code: string) => void;
};

export const RegionSwitcher = ({
  className,
  open: openProp,
  onOpenChange,
  size = "default",
  value,
  onValueChange,
}: RegionSwitcherProps) => {
  const {
    regions,
    regionsLoading,
    regionsError,
    regionsUnconfigured,
    retryRegions,
    selectedRegionCode: sharedRegionCode,
    setSelectedRegionCode,
    switcherOpen,
    setSwitcherOpen,
  } = useSelectedRegion();
  const [query, setQuery] = useState("");
  const selectedRegionCode = value === undefined ? sharedRegionCode : value;
  const selectedRegion = regions.find((region) => region.code === selectedRegionCode) ?? null;

  const open = openProp ?? switcherOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) {
      setSwitcherOpen(next);
    }
    if (!next) {
      setQuery("");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return regions;
    return regions.filter((region) => {
      const haystack = `${region.code} ${region.name} ${region.hubCode ?? ""} ${region.dealerCurrency} ${region.retailCurrency}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, regions]);

  const triggerLabel = selectedRegion
    ? formatRegionSwitcherLabel(selectedRegion)
    : "Выберите регион";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size === "sm" ? "sm" : "default"}
            className={cn(
              "justify-between gap-2 bg-background font-normal",
              size === "sm" ? "min-w-[12rem]" : "min-w-[14rem]",
              className,
            )}
            aria-label="Выбрать регион"
          />
        }
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2 p-2">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск региона…"
            className="h-8 pl-7"
            aria-label="Поиск региона"
          />
        </div>
        {regionsUnconfigured ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Бэкенд демо не настроен</p>
        ) : regionsError ? (
          <StoreInlineRetry message={regionsError} onRetry={retryRegions} />
        ) : (
        <div
          role="listbox"
          aria-label="Регионы"
          className="max-h-64 overflow-y-auto rounded-md border border-[var(--corportal-border-grey)]"
        >
          {regionsLoading && filtered.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Ничего не найдено</p>
          ) : (
            filtered.map((region) => {
              const selected = region.code === selectedRegionCode;
              return (
                <button
                  key={region.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "flex w-full items-start gap-2 px-2 py-1.5 text-left hover:bg-muted/60",
                    selected && "bg-muted/40",
                  )}
                  onClick={() => {
                    if (onValueChange) {
                      onValueChange(region.code);
                    } else {
                      setSelectedRegionCode(region.code);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    aria-hidden
                    className={cn("mt-0.5 size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium tabular-nums">
                      {formatRegionSwitcherLabel(region)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{region.name}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

/** Stub shown in price cells when no region is selected. */
export const SelectRegionStub = ({ className }: { className?: string }) => {
  const { setSwitcherOpen } = useSelectedRegion();
  return (
    <button
      type="button"
      className={cn(
        "text-left text-xs font-medium text-primary underline-offset-2 hover:underline",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setSwitcherOpen(true);
      }}
    >
      Выберите регион
    </button>
  );
};
