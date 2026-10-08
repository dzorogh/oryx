"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  EMPTY_RANGE,
  LIST_DATE_PRESETS,
  describeListFilter,
  flagValue,
  multiValue,
  rangeValue,
  type ListDateRangeFilterDef,
  type ListFilterDef,
  type ListFilterOptionWithCount,
  type ListFlagFilterDef,
  type ListMultiFilterDef,
  type ListNumberRangeFilterDef,
  type ListRangeValue,
} from "./list-filters";
import type { ListFiltersController } from "./use-list-filters";

const SEARCH_THRESHOLD = 8;

const multiTriggerLabel = (
  def: ListMultiFilterDef<never>,
  selected: string[],
  options: ListFilterOptionWithCount[],
) => {
  if (selected.length === 0) return def.placeholder ?? def.label;
  if (selected.length === 1) {
    return options.find((option) => option.value === selected[0])?.label ?? selected[0];
  }
  return `${def.label}: ${selected.length}`;
};

export const ListMultiFilterControl = <TRow,>({
  def,
  options,
  selected,
  onChange,
  compact = false,
}: {
  def: ListMultiFilterDef<TRow>;
  options: ListFilterOptionWithCount[];
  selected: string[];
  onChange: (next: string[]) => void;
  compact?: boolean;
}) => {
  const [query, setQuery] = useState("");
  const searchable = def.searchable ?? options.length > SEARCH_THRESHOLD;
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(
      (option) => option.label.toLowerCase().includes(normalized) || option.value.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);

  return (
    <Popover onOpenChange={(open) => (open ? undefined : setQuery(""))}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "justify-between gap-2 bg-background font-normal",
              selected.length > 0 ? "border-primary/60 text-foreground" : "text-muted-foreground",
              compact ? "w-[140px] shrink-0 lg:w-[168px]" : "w-full",
            )}
            aria-label={`Фильтр: ${def.label}`}
          />
        }
      >
        <span className="truncate">{multiTriggerLabel(def as ListMultiFilterDef<never>, selected, options)}</span>
        <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2 p-2">
        {searchable ? (
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск…"
              className="h-8 pl-7"
              aria-label={`Поиск: ${def.label}`}
            />
          </div>
        ) : null}
        <div
          role="group"
          aria-label={def.label}
          className="max-h-72 overflow-y-auto rounded-md border border-[var(--corportal-border-grey)]"
        >
          {visible.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              {options.length === 0 ? "Нет значений в списке" : "Ничего не найдено"}
            </p>
          ) : (
            visible.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/60",
                    checked && "bg-muted/40",
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(option.value)} />
                  <span className={cn("min-w-0 flex-1 truncate", option.count === 0 && "text-muted-foreground")}>
                    {option.label}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{option.count}</span>
                </label>
              );
            })
          )}
        </div>
        {selected.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={() => onChange([])}>
            <X aria-hidden className="size-3.5" />
            Снять выбор ({selected.length})
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

const RangeInputs = ({
  value,
  onChange,
  type,
  label,
  signed,
}: {
  value: ListRangeValue;
  onChange: (next: ListRangeValue) => void;
  type: "date" | "number";
  label: string;
  signed?: boolean;
}) => (
  <div className="grid grid-cols-2 gap-2">
    <Input
      type={type === "date" ? "date" : "text"}
      inputMode={type === "number" ? (signed ? "text" : "decimal") : undefined}
      value={value.from}
      max={type === "date" && value.to ? value.to : undefined}
      onChange={(event) => onChange({ ...value, from: event.target.value })}
      placeholder="от"
      className="bg-background"
      aria-label={`${label}: от`}
    />
    <Input
      type={type === "date" ? "date" : "text"}
      inputMode={type === "number" ? (signed ? "text" : "decimal") : undefined}
      value={value.to}
      min={type === "date" && value.from ? value.from : undefined}
      onChange={(event) => onChange({ ...value, to: event.target.value })}
      placeholder="до"
      className="bg-background"
      aria-label={`${label}: до`}
    />
  </div>
);

const ListDateRangeControl = <TRow,>({
  def,
  value,
  onChange,
}: {
  def: ListDateRangeFilterDef<TRow>;
  value: ListRangeValue;
  onChange: (next: ListRangeValue) => void;
}) => {
  const presets = def.presets === "none" ? [] : LIST_DATE_PRESETS[def.presets ?? "past"];
  return (
    <div className="flex flex-col gap-1.5">
      <RangeInputs value={value} onChange={onChange} type="date" label={def.label} />
      {presets.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {presets.map((preset) => {
            const range = preset.range();
            const active = range.from === value.from && range.to === value.to;
            return (
              <Button
                key={preset.id}
                type="button"
                size="xs"
                variant={active ? "default" : "outline"}
                onClick={() => onChange(active ? EMPTY_RANGE : range)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const ListNumberRangeControl = <TRow,>({
  def,
  value,
  onChange,
}: {
  def: ListNumberRangeFilterDef<TRow>;
  value: ListRangeValue;
  onChange: (next: ListRangeValue) => void;
}) => <RangeInputs value={value} onChange={onChange} type="number" label={def.label} signed={def.signed} />;

const ListFlagControl = <TRow,>({
  def,
  checked,
  onChange,
}: {
  def: ListFlagFilterDef<TRow>;
  checked: boolean;
  onChange: (next: boolean) => void;
}) => (
  <label className="flex items-center gap-3 rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2.5">
    <Checkbox checked={checked} onCheckedChange={(next) => onChange(next === true)} aria-label={def.label} />
    <span className="flex flex-col">
      <span className="text-sm font-medium">{def.label}</span>
      {def.description ? <span className="text-xs text-muted-foreground">{def.description}</span> : null}
    </span>
  </label>
);

const FieldLabel = ({ children, hint }: { children: string; hint?: string }) => (
  <span className="flex items-baseline justify-between gap-2 text-xs font-medium text-muted-foreground">
    {children}
    {hint ? <span className="font-normal">{hint}</span> : null}
  </span>
);

const ListFilterField = <TRow,>({
  def,
  filters,
}: {
  def: ListFilterDef<TRow>;
  filters: ListFiltersController<TRow>;
}) => {
  const value = filters.state[def.id];
  if (def.kind === "flag") {
    return <ListFlagControl def={def} checked={flagValue(value)} onChange={(next) => filters.setValue(def.id, next)} />;
  }
  if (def.kind === "multi") {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel>{def.label}</FieldLabel>
        <ListMultiFilterControl
          def={def}
          options={filters.options(def.id)}
          selected={multiValue(value)}
          onChange={(next) => filters.setValue(def.id, next)}
        />
      </div>
    );
  }
  if (def.kind === "dateRange") {
    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel>{def.label}</FieldLabel>
        <ListDateRangeControl def={def} value={rangeValue(value)} onChange={(next) => filters.setValue(def.id, next)} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel hint={def.unit}>{def.label}</FieldLabel>
      <ListNumberRangeControl def={def} value={rangeValue(value)} onChange={(next) => filters.setValue(def.id, next)} />
    </div>
  );
};

export const ListFilterFields = <TRow,>({ filters }: { filters: ListFiltersController<TRow> }) => {
  const flags = filters.defs.filter((def) => def.kind === "flag");
  const fields = filters.defs.filter((def) => def.kind !== "flag");
  return (
    <>
      {fields.map((def) => (
        <ListFilterField key={def.id} def={def} filters={filters} />
      ))}
      {flags.length > 0 ? (
        <div className="flex flex-col gap-2">
          {flags.map((def) => (
            <ListFilterField key={def.id} def={def} filters={filters} />
          ))}
        </div>
      ) : null}
    </>
  );
};

export const ListQuickFilters = <TRow,>({ filters }: { filters: ListFiltersController<TRow> }) => (
  <>
    {filters.defs.flatMap((def) =>
      def.quick && def.kind === "multi"
        ? [
            <ListMultiFilterControl
              key={def.id}
              compact
              def={def}
              options={filters.options(def.id)}
              selected={multiValue(filters.state[def.id])}
              onChange={(next) => filters.setValue(def.id, next)}
            />,
          ]
        : [],
    )}
  </>
);

export const ListActiveFilterChips = <TRow,>({
  filters,
  onResetAll,
}: {
  filters: ListFiltersController<TRow>;
  onResetAll: () => void;
}) => {
  if (filters.activeDefs.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Активные фильтры">
      {filters.activeDefs.map((def) => {
        const text = describeListFilter(def, filters.state[def.id], filters.options(def.id));
        return (
          <span
            key={def.id}
            className="inline-flex h-6 max-w-[320px] items-center gap-1 rounded-full border border-[var(--corportal-border-grey)] bg-muted/40 pr-0.5 pl-2.5 text-xs"
          >
            <span className="truncate" title={text}>
              {text}
            </span>
            <button
              type="button"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Убрать фильтр «${def.label}»`}
              onClick={() => filters.clear(def.id)}
            >
              <X aria-hidden className="size-3" />
            </button>
          </span>
        );
      })}
      {filters.activeDefs.length > 1 ? (
        <Button type="button" variant="ghost" size="xs" onClick={onResetAll}>
          Сбросить все
        </Button>
      ) : null}
    </div>
  );
};
