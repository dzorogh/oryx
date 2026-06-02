import { useEffect, useMemo, useState } from "react";
import { itemMatchesCategoryFilter } from "@/features/store/category-tree";
import {
  ALL_VALUE,
  PAGE_SIZE,
  buildPaginationItems,
  extractSortedOptions,
  getSelectValue,
  matchesSearchQuery,
  type QuickFilterOption,
} from "../products/catalog/catalog-helpers";
import { getPricelistRows, type PricelistRow, type PricelistScope } from "./pricelists-demo-data";

type FilterControl = {
  value: string;
  onChange: (value: string | null) => void;
  options: QuickFilterOption[];
};

export type PricelistFilters = {
  search: { value: string; onChange: (value: string) => void };
  category: { value: string; onChange: (value: string | null) => void };
  brand: FilterControl;
  family: FilterControl;
  hasActive: boolean;
  onReset: () => void;
};

export type PricelistsController = {
  isFilterSheetOpen: boolean;
  setFilterSheetOpen: (open: boolean) => void;
  filters: PricelistFilters;
  filteredItems: PricelistRow[];
  paginatedItems: PricelistRow[];
  isLoading: boolean;
  visiblePage: number;
  totalPages: number;
  paginationItems: Array<number | "ellipsis">;
  onPageChange: (page: number) => void;
};

// Simulated server response delay when reloading pricelist data.
const SERVER_RESPONSE_DELAY_MS = 200;

const toFilterOptions = (values: string[]): QuickFilterOption[] =>
  values.map((value) => ({ value, label: value }));

export const usePricelistsController = (
  scope: PricelistScope,
  regionId: string,
): PricelistsController => {
  const sourceItems = useMemo(() => getPricelistRows(), []);
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState(ALL_VALUE);
  const [brandFilter, setBrandFilter] = useState(ALL_VALUE);
  const [familyFilter, setFamilyFilter] = useState(ALL_VALUE);

  const brandOptions = useMemo(() => toFilterOptions(extractSortedOptions(sourceItems, "brand")), [sourceItems]);
  const familyOptions = useMemo(() => toFilterOptions(extractSortedOptions(sourceItems, "family")), [sourceItems]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      sourceItems.filter((item) => {
        if (!matchesSearchQuery(item, normalizedQuery)) {
          return false;
        }
        if (!itemMatchesCategoryFilter(item.categoryId, categoryFilter)) {
          return false;
        }
        if (brandFilter !== ALL_VALUE && item.brand !== brandFilter) {
          return false;
        }
        if (familyFilter !== ALL_VALUE && item.family !== familyFilter) {
          return false;
        }
        return true;
      }),
    [brandFilter, categoryFilter, familyFilter, normalizedQuery, sourceItems],
  );

  const hasActiveFilters =
    searchQuery.length > 0 ||
    categoryFilter !== ALL_VALUE ||
    brandFilter !== ALL_VALUE ||
    familyFilter !== ALL_VALUE;

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);
  const paginationItems = useMemo(() => buildPaginationItems(visiblePage, totalPages), [totalPages, visiblePage]);

  const requestKey = [scope, regionId, normalizedQuery, categoryFilter, brandFilter, familyFilter, visiblePage].join(
    "|",
  );

  const isLoading = loadedRequestKey !== requestKey;

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadedRequestKey(requestKey), SERVER_RESPONSE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [requestKey]);

  const resetToFirstPage = () => setCurrentPage(1);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    resetToFirstPage();
  };

  const makeFilterHandler = (setter: (value: string) => void) => (value: string | null) => {
    setter(getSelectValue(value));
    resetToFirstPage();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter(ALL_VALUE);
    setBrandFilter(ALL_VALUE);
    setFamilyFilter(ALL_VALUE);
    resetToFirstPage();
  };

  const filters: PricelistFilters = {
    search: { value: searchQuery, onChange: handleSearchChange },
    category: { value: categoryFilter, onChange: makeFilterHandler(setCategoryFilter) },
    brand: { value: brandFilter, onChange: makeFilterHandler(setBrandFilter), options: brandOptions },
    family: { value: familyFilter, onChange: makeFilterHandler(setFamilyFilter), options: familyOptions },
    hasActive: hasActiveFilters,
    onReset: handleResetFilters,
  };

  return {
    isFilterSheetOpen,
    setFilterSheetOpen,
    filters,
    filteredItems,
    paginatedItems,
    isLoading,
    visiblePage,
    totalPages,
    paginationItems,
    onPageChange: setCurrentPage,
  };
};
