"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { regionSelectItems, warehouseSelectItems } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import type { StockGroup, StockLocationFilter, StockOwnerFilter, StockViewFilter } from "@/features/logistics/stock-filters";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";

const OWNER_OPTIONS: Array<{ value: StockOwnerFilter; label: string }> = [
  { value: "all", label: "All owners" },
  { value: "free", label: "Free" },
  { value: "region", label: "Region reserve" },
  { value: "order", label: "Order reserve" },
];

const LOCATION_OPTIONS: Array<{ value: StockLocationFilter; label: string }> = [
  { value: "all", label: "All locations" },
  { value: "warehouse", label: "Warehouses" },
  { value: "production", label: "Production" },
  { value: "transfer", label: "Transfers" },
];

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-1.5">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <Select items={options} value={value} onValueChange={(next) => onChange(next ?? options[0]?.value ?? "all")}>
      <SelectTrigger size="sm" className="w-full bg-background" aria-label={label}>
        <SelectValue placeholder={options[0]?.label} />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  </label>
);

export const StockFiltersPanel = ({
  snapshot,
  group,
  filters,
  hasActiveFilters,
  onChange,
  onReset,
  onClose,
  variant,
  id,
}: {
  snapshot: LogisticsSnapshot;
  group: StockGroup;
  filters: StockViewFilter;
  hasActiveFilters: boolean;
  onChange: (patch: Partial<StockViewFilter>) => void;
  onReset: () => void;
  onClose?: () => void;
  variant: "aside" | "sheet";
  id?: string;
}) => {
  const warehouseOptions = [
    { value: "all", label: "All warehouses" },
    ...warehouseSelectItems(snapshot),
  ];
  const regionOptions = [
    { value: "all", label: "All regions" },
    ...regionSelectItems(snapshot),
  ];

  const ownerSelect = (
    <FilterSelect
      label="Owner"
      value={filters.owner}
      options={OWNER_OPTIONS}
      onChange={(value) => onChange({ owner: value as StockOwnerFilter })}
    />
  );
  const locationSelect = (
    <FilterSelect
      label="Location"
      value={filters.location}
      options={LOCATION_OPTIONS}
      onChange={(value) => onChange({ location: value as StockLocationFilter })}
    />
  );
  const warehouseSelect = (
    <FilterSelect
      label="Warehouse"
      value={filters.warehouseId ?? "all"}
      options={warehouseOptions}
      onChange={(value) => onChange({ warehouseId: !value || value === "all" ? null : value })}
    />
  );
  const regionSelect = (
    <FilterSelect
      label="Region"
      value={filters.regionId ?? "all"}
      options={regionOptions}
      onChange={(value) => onChange({ regionId: !value || value === "all" ? null : value })}
    />
  );

  const controls =
    group === "products" ? (
      <>
        {ownerSelect}
        {locationSelect}
        {regionSelect}
      </>
    ) : group === "warehouses" ? (
      <>
        {warehouseSelect}
        {ownerSelect}
        {regionSelect}
      </>
    ) : (
      <>
        {regionSelect}
        {locationSelect}
        {warehouseSelect}
      </>
    );

  const body = (
    <div className="grid gap-3">
      {controls}
      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="justify-start gap-1 text-muted-foreground"
          aria-label="Reset stock filters"
        >
          <X aria-hidden className="size-3.5" />
          Reset
        </Button>
      ) : null}
    </div>
  );

  if (variant === "sheet") {
    return body;
  }

  return (
    <aside id={id} className="w-full shrink-0 lg:w-[min(40vw,30rem)] lg:min-w-[20rem]" aria-label="Stock filters">
      <Card size="sm" className={logisticsCardClass}>
        <div className="flex items-start justify-between gap-2 px-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-sm font-semibold">Filters</h2>
            <p className="text-xs text-muted-foreground">
              {group === "products"
                ? "Owner, location, and region for the product matrix."
                : group === "warehouses"
                  ? "Warehouse, owner, and region for warehouse sections."
                  : "Region, location, and warehouse for region reserve."}
            </p>
          </div>
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="shrink-0 gap-1 text-muted-foreground"
              aria-label="Close stock filters"
            >
              <X aria-hidden className="size-3.5" />
              Close
            </Button>
          ) : null}
        </div>
        <CardContent className="pt-0">{body}</CardContent>
      </Card>
    </aside>
  );
};
