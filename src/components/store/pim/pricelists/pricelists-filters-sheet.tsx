// english-ui:ignore-file
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CatalogQuickSelectControl } from "../products/catalog/catalog-filters";
import { CatalogCategoryTreeFilter } from "../products/catalog/catalog-category-tree-filter";
import type { PricelistFilters } from "./use-pricelists-controller";

type PricelistsFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PricelistFilters;
};

export const PricelistsFiltersSheet = ({ open, onOpenChange, filters }: PricelistsFiltersSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Фильтры</SheetTitle>
        <SheetDescription>Отберите товары перед правкой цен.</SheetDescription>
      </SheetHeader>

      <div className="grid gap-4 pb-4">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Поиск по названию</span>
          <Input
            value={filters.search.value}
            onChange={(event) => filters.search.onChange(event.target.value)}
            placeholder="Название или код"
            aria-label="Поиск по названию или коду в панели фильтров"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Категория</span>
          <CatalogCategoryTreeFilter
            value={filters.category.value}
            onValueChange={filters.category.onChange}
            ariaLabel="Фильтр по категории"
            placeholder="Все категории"
            allLabel="Все категории"
            widthClassName="w-full"
          />
        </div>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Бренд</span>
          <CatalogQuickSelectControl
            value={filters.brand.value}
            onValueChange={filters.brand.onChange}
            ariaLabel="Фильтр по бренду"
            placeholder="Все бренды"
            allLabel="Все бренды"
            options={filters.brand.options}
            widthClassName="w-full"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Семейство</span>
          <CatalogQuickSelectControl
            value={filters.family.value}
            onValueChange={filters.family.onChange}
            ariaLabel="Фильтр по семейству товара"
            placeholder="Все семейства"
            allLabel="Все семейства"
            options={filters.family.options}
            widthClassName="w-full"
          />
        </label>
      </div>

      <SheetFooter className="border-t bg-muted/30">
        {filters.hasActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={filters.onReset}
            aria-label="Сбросить все фильтры прайс-листа"
          >
            <X aria-hidden className="size-3.5" />
            Сбросить фильтры
          </Button>
        ) : null}
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
