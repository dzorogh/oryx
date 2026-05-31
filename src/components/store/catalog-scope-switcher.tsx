"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATALOG_SCOPE_OPTIONS,
  type CatalogScope,
  useCatalogScope,
} from "@/features/store/catalog-scope-context";

export const CatalogScopeSwitcher = () => {
  const { scope, setScope } = useCatalogScope();

  const handleValueChange = (value: string | null) => {
    if (!value) {
      return;
    }
    setScope(value as CatalogScope);
  };

  return (
    <Select items={CATALOG_SCOPE_OPTIONS} value={scope} onValueChange={handleValueChange}>
      <SelectTrigger size="default" className="w-full bg-background" aria-label="Select catalog">
        <SelectValue placeholder="Select catalog" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {CATALOG_SCOPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
