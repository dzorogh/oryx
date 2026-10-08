"use client";

import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export type AsyncComboboxOption = { value: string; label: string; hint?: string };

/** `ids` asks for exactly those options (labels of selected chips); otherwise search by `query`. */
export type AsyncComboboxLoader = (args: { query: string } | { ids: string[] }) => Promise<AsyncComboboxOption[]>;

type AsyncMultiComboboxProps = {
  value: string[];
  onValueChange: (value: string[]) => void;
  /** Must be referentially stable: a new function restarts the search. */
  loadOptions: AsyncComboboxLoader;
  placeholder: string;
  ariaLabel: string;
  className?: string;
};

const SEARCH_DELAY_MS = 250;

type SearchState = { key: string; options: AsyncComboboxOption[]; failed: boolean };

type KnownOptions = ReadonlyMap<string, AsyncComboboxOption>;

const withOptions = (prev: KnownOptions, options: AsyncComboboxOption[]): KnownOptions => {
  if (options.every((option) => prev.get(option.value)?.label === option.label)) return prev;
  const next = new Map(prev);
  for (const option of options) next.set(option.value, option);
  return next;
};

export const AsyncMultiCombobox = ({
  value,
  onValueChange,
  loadOptions,
  placeholder,
  ariaLabel,
  className,
}: AsyncMultiComboboxProps) => {
  const anchor = useComboboxAnchor();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState | null>(null);
  const [known, setKnown] = useState<KnownOptions>(() => new Map());
  const remember = (options: AsyncComboboxOption[]) => setKnown((prev) => withOptions(prev, options));

  const searchKey = query.trim();
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(
      () => {
        loadOptions({ query: searchKey }).then(
          (options) => {
            if (cancelled) return;
            setSearch({ key: searchKey, options, failed: false });
            setKnown((prev) => withOptions(prev, options));
          },
          () => {
            if (!cancelled) setSearch({ key: searchKey, options: [], failed: true });
          },
        );
      },
      searchKey ? SEARCH_DELAY_MS : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, searchKey, loadOptions]);

  const missingKey = value.filter((id) => !known.has(id)).join(",");
  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    loadOptions({ ids: missingKey.split(",") }).then(
      (options) => {
        if (!cancelled) setKnown((prev) => withOptions(prev, options));
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [missingKey, loadOptions]);

  const selected = value.map((id) => known.get(id) ?? { value: id, label: "…" });
  const loading = open && search?.key !== searchKey;
  const items = loading ? [] : (search?.options ?? []);
  const emptyText = loading ? "Поиск…" : search?.failed ? "Не удалось загрузить" : "Ничего не найдено";

  return (
    <Combobox
      multiple
      items={items}
      filter={null}
      value={selected}
      onValueChange={(next: AsyncComboboxOption[]) => {
        remember(next);
        onValueChange(next.map((option) => option.value));
      }}
      onInputValueChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      itemToStringLabel={(option: AsyncComboboxOption) => option.label}
      itemToStringValue={(option: AsyncComboboxOption) => option.value}
      isItemEqualToValue={(a: AsyncComboboxOption, b: AsyncComboboxOption) => a.value === b.value}
    >
      <ComboboxChips ref={anchor} className={cn("bg-background text-xs", className)}>
        <ComboboxValue>
          {(chips: AsyncComboboxOption[]) => (
            <>
              {chips.map((option) => (
                <ComboboxChip key={option.value}>{option.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-label={ariaLabel}
                placeholder={chips.length === 0 ? placeholder : ""}
                className="h-6 text-xs"
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(option: AsyncComboboxOption) => (
            <ComboboxItem key={option.value} value={option} className="text-xs">
              <span className="truncate">{option.label}</span>
              {option.hint ? <span className="ml-auto truncate text-muted-foreground">{option.hint}</span> : null}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
