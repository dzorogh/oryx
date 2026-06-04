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

/**
 * Region availability gate. In Supplier/Dealer scopes only products that are
 * `Available` in the selected region appear; flipping a product's dealer status
 * adds or removes it. `enabled` is false for Global (the baseline shows all).
 */
export type AvailabilityFilter = {
  enabled: boolean;
  isAvailable: (row: PricelistRow) => boolean;
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
  availability: AvailabilityFilter,
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

  const baseFilteredItems = useMemo(
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

  // The dealer-status availability gate is applied on every render because the
  // status lives in the live collab doc (no stable dependency to memoize on).
  // The signature is a compact view of the current membership; when a status
  // flips — locally or from a collaborator — it changes, which both re-filters
  // the rows and (via `requestKey`) triggers a short "recalculating" skeleton,
  // as if the server returned a freshly filtered list.
  let availabilitySignature = "";
  let filteredItems = baseFilteredItems;
  if (availability.enabled) {
    const available: PricelistRow[] = [];
    let signature = "";
    for (const item of baseFilteredItems) {
      const isAvailable = availability.isAvailable(item);
      signature += isAvailable ? "1" : "0";
      if (isAvailable) {
        available.push(item);
      }
    }
    availabilitySignature = signature;
    filteredItems = available;
  }

  const hasActiveFilters =
    searchQuery.length > 0 ||
    categoryFilter !== ALL_VALUE ||
    brandFilter !== ALL_VALUE ||
    familyFilter !== ALL_VALUE;

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);
  const paginationItems = useMemo(() => buildPaginationItems(visiblePage, totalPages), [totalPages, visiblePage]);

  const requestKey = [
    scope,
    regionId,
    normalizedQuery,
    categoryFilter,
    brandFilter,
    familyFilter,
    visiblePage,
    availabilitySignature,
  ].join("|");

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
