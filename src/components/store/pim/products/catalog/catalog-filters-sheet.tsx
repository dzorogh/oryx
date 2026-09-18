// english-ui:ignore-file
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CatalogQuickSelectControl } from "./catalog-filters";
import { CatalogCategoryTreeFilter } from "./catalog-category-tree-filter";
import type { CatalogFilters } from "./use-catalog-controller";

type CatalogFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CatalogFilters;
};

export const CatalogFiltersSheet = ({ open, onOpenChange, filters }: CatalogFiltersSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Фильтры</SheetTitle>
        <SheetDescription>Расширенный отбор позиций каталога.</SheetDescription>
      </SheetHeader>

      <div className="grid gap-4 pb-4">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Поиск по названию</span>
          <Input
            value={filters.search.value}
            onChange={(event) => filters.search.onChange(event.target.value)}
            placeholder="Название или артикул"
            aria-label="Поиск по названию или артикулу в панели фильтров"
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
          <span className="text-xs font-medium text-muted-foreground">Статус дилера</span>
          <CatalogQuickSelectControl
            value={filters.dealerStatus.value}
            onValueChange={filters.dealerStatus.onChange}
            ariaLabel="Фильтр по статусу дилера"
            placeholder="Любой статус"
            allLabel="Любой статус"
            options={filters.dealerStatus.options}
            widthClassName="w-full"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Розничный статус</span>
          <CatalogQuickSelectControl
            value={filters.retailStatus.value}
            onValueChange={filters.retailStatus.onChange}
            ariaLabel="Фильтр по розничному статусу"
            placeholder="Любой статус"
            allLabel="Любой статус"
            options={filters.retailStatus.options}
            widthClassName="w-full"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Площадка</span>
          <CatalogQuickSelectControl
            value={filters.site.value}
            onValueChange={filters.site.onChange}
            ariaLabel="Фильтр по производственной площадке"
            placeholder="Все площадки"
            allLabel="Все площадки"
            options={filters.site.options}
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
            aria-label="Сбросить все фильтры каталога"
          >
            <X aria-hidden className="size-3.5" />
            Сбросить фильтры
          </Button>
        ) : null}
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
