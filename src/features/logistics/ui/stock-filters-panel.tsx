// english-ui:ignore-file
"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ASSIGNED_TO_LABEL } from "@/features/logistics/logistics-labels";
import { regionSelectItems, warehouseSelectItems } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import type { StockGroup, StockLocationFilter, StockOwnerFilter, StockViewFilter } from "@/features/logistics/stock-filters";

const OWNER_OPTIONS: Array<{ value: StockOwnerFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "free", label: "Свободно" },
  { value: "region", label: "Резерв региона" },
  { value: "order", label: "Резерв заказа" },
];

const LOCATION_OPTIONS: Array<{ value: StockLocationFilter; label: string }> = [
  { value: "all", label: "Все места" },
  { value: "warehouse", label: "Склады" },
  { value: "production", label: "Производство" },
  { value: "transfer", label: "Перемещения" },
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

const filterDescription = (group: StockGroup) => {
  if (group === "products") {
    return "Закреплено за, место и регион для матрицы товаров.";
  }
  if (group === "warehouses") {
    return "Склад, закрепление и регион для секций склада.";
  }
  return "Регион, место и склад для резерва региона.";
};

type StockFiltersFieldsProps = {
  snapshot: LogisticsSnapshot;
  group: StockGroup;
  filters: StockViewFilter;
  onChange: (patch: Partial<StockViewFilter>) => void;
};

export const StockFiltersPanel = ({ snapshot, group, filters, onChange }: StockFiltersFieldsProps) => {
  const warehouseOptions = [
    { value: "all", label: "Все склады" },
    ...warehouseSelectItems(snapshot),
  ];
  const regionOptions = [
    { value: "all", label: "Все регионы" },
    ...regionSelectItems(snapshot),
  ];

  const ownerSelect = (
    <FilterSelect
      label={ASSIGNED_TO_LABEL}
      value={filters.owner}
      options={OWNER_OPTIONS}
      onChange={(value) => onChange({ owner: value as StockOwnerFilter })}
    />
  );
  const locationSelect = (
    <FilterSelect
      label="Место"
      value={filters.location}
      options={LOCATION_OPTIONS}
      onChange={(value) => onChange({ location: value as StockLocationFilter })}
    />
  );
  const warehouseSelect = (
    <FilterSelect
      label="Склад"
      value={filters.warehouseId ?? "all"}
      options={warehouseOptions}
      onChange={(value) => onChange({ warehouseId: !value || value === "all" ? null : value })}
    />
  );
  const regionSelect = (
    <FilterSelect
      label="Регион"
      value={filters.regionId ?? "all"}
      options={regionOptions}
      onChange={(value) => onChange({ regionId: !value || value === "all" ? null : value })}
    />
  );

  if (group === "products") {
    return (
      <div className="grid gap-4 pb-4">
        {ownerSelect}
        {locationSelect}
        {regionSelect}
      </div>
    );
  }

  if (group === "warehouses") {
    return (
      <div className="grid gap-4 pb-4">
        {warehouseSelect}
        {ownerSelect}
        {regionSelect}
      </div>
    );
  }

  return (
    <div className="grid gap-4 pb-4">
      {regionSelect}
      {locationSelect}
      {warehouseSelect}
    </div>
  );
};

export const StockFiltersSheet = ({
  open,
  onOpenChange,
  snapshot,
  group,
  filters,
  hasActiveFilters,
  onChange,
  onReset,
  id,
}: StockFiltersFieldsProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
  id?: string;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-md" id={id}>
      <SheetHeader>
        <SheetTitle>Фильтры</SheetTitle>
        <SheetDescription>{filterDescription(group)}</SheetDescription>
      </SheetHeader>
      <StockFiltersPanel snapshot={snapshot} group={group} filters={filters} onChange={onChange} />
      <SheetFooter className="border-t bg-muted/30">
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="justify-start gap-1 text-muted-foreground"
            aria-label="Сбросить фильтры остатков"
          >
            <X aria-hidden className="size-3.5" />
            Сбросить фильтры
          </Button>
        ) : null}
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
