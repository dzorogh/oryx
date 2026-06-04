import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ALL_VALUE, type QuickFilterOption } from "./catalog-helpers";

type CatalogQuickSearchControlProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export const CatalogQuickSearchControl = ({ value, onChange, className }: CatalogQuickSearchControlProps) => (
  <label className={cn("min-w-[240px] flex-1", className)}>
    <span className="sr-only">Search by product name</span>
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name or SKU"
        className="pl-8"
        aria-label="Quick search by name or SKU"
      />
    </div>
  </label>
);

type CatalogQuickSelectControlProps = {
  value: string;
  onValueChange: (value: string | null) => void;
  ariaLabel: string;
  placeholder: string;
  allLabel: string;
  options: QuickFilterOption[];
  widthClassName: string;
};

export const CatalogQuickSelectControl = ({
  value,
  onValueChange,
  ariaLabel,
  placeholder,
  allLabel,
  options,
  widthClassName,
}: CatalogQuickSelectControlProps) => {
  const selectItems = [
    { value: ALL_VALUE, label: allLabel },
    ...options.map((option) => ({ value: option.value, label: option.label })),
  ];

  return (
    <Select items={selectItems} value={value} onValueChange={onValueChange}>
      <SelectTrigger size="default" className={cn("bg-background", widthClassName)} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

type CatalogFiltersButtonProps = {
  hasActiveFilters: boolean;
  onClick: () => void;
};

export const CatalogFiltersButton = ({ hasActiveFilters, onClick }: CatalogFiltersButtonProps) => (
  <Button
    type="button"
    variant={hasActiveFilters ? "default" : "outline"}
    size="default"
    onClick={onClick}
    aria-label="Open catalog filters panel"
  >
    <SlidersHorizontal aria-hidden className="size-3.5" />
    Filters
  </Button>
);
