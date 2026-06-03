import { useEffect, useMemo, useState } from "react";
import { itemMatchesCategoryFilter } from "@/features/store/category-tree";
import type { StoreCatalogItem } from "../store-catalog-demo-data";
import {
  DEFAULT_VISIBLE_COLUMNS,
  type CatalogColumnId,
  getCatalogColumnDefinition,
  getOrderedVisibleColumns,
  isDefaultColumnSet,
  parseStoredColumns,
  serializeVisibleColumns,
} from "./catalog-columns";
import {
  ALL_VALUE,
  PAGE_SIZE,
  buildPaginationItems,
  extractSortedOptions,
  getSelectValue,
  getCatalogSourceItems,
  matchesSearchQuery,
  type CatalogListingMode,
  type QuickFilterOption,
} from "./catalog-helpers";

type FilterControl = {
  value: string;
  onChange: (value: string | null) => void;
  options: QuickFilterOption[];
};

type CategoryFilterControl = {
  value: string;
  onChange: (value: string | null) => void;
};

export type CatalogFilters = {
  search: { value: string; onChange: (value: string) => void };
  category: CategoryFilterControl;
  dealerStatus: FilterControl;
  retailStatus: FilterControl;
  site: FilterControl;
  family: FilterControl;
  hasActive: boolean;
  onReset: () => void;
};

export type CatalogColumns = {
  visibleIds: CatalogColumnId[];
  isVisible: (columnId: CatalogColumnId) => boolean;
  toggle: (columnId: CatalogColumnId) => void;
  hasCustom: boolean;
  onReset: () => void;
};

export type CatalogController = {
  isFilterSheetOpen: boolean;
  setFilterSheetOpen: (open: boolean) => void;
  isColumnSheetOpen: boolean;
  setColumnSheetOpen: (open: boolean) => void;
  filters: CatalogFilters;
  columns: CatalogColumns;
  filteredItems: StoreCatalogItem[];
  paginatedItems: StoreCatalogItem[];
  isLoading: boolean;
  visiblePage: number;
  totalPages: number;
  paginationItems: Array<number | "ellipsis">;
  onPageChange: (page: number) => void;
};

// Имитация задержки ответа сервера при загрузке данных каталога.
const SERVER_RESPONSE_DELAY_MS = 200;

const toFilterOptions = (values: string[]): QuickFilterOption[] =>
  values.map((value) => ({ value, label: value }));

export const useCatalogController = (
  listingMode: CatalogListingMode,
  columnsStorageKey?: string,
): CatalogController => {
  const sourceItems = useMemo(() => getCatalogSourceItems(listingMode), [listingMode]);
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isColumnSheetOpen, setColumnSheetOpen] = useState(false);
  const [visibleColumnIds, setVisibleColumnIds] = useState<CatalogColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnsHydratedKey, setColumnsHydratedKey] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState(ALL_VALUE);
  const [dealerStatusFilter, setDealerStatusFilter] = useState(ALL_VALUE);
  const [retailStatusFilter, setRetailStatusFilter] = useState(ALL_VALUE);
  const [siteFilter, setSiteFilter] = useState(ALL_VALUE);
  const [familyFilter, setFamilyFilter] = useState(ALL_VALUE);

  const dealerStatusOptions = useMemo(
    () => toFilterOptions(extractSortedOptions(sourceItems, "dealerStatus")),
    [sourceItems],
  );
  const retailStatusOptions = useMemo(
    () => toFilterOptions(extractSortedOptions(sourceItems, "retailStatus")),
    [sourceItems],
  );
  const siteOptions = useMemo(
    () => toFilterOptions(extractSortedOptions(sourceItems, "productionSite")),
    [sourceItems],
  );
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
        if (dealerStatusFilter !== ALL_VALUE && item.dealerStatus !== dealerStatusFilter) {
          return false;
        }
        if (retailStatusFilter !== ALL_VALUE && item.retailStatus !== retailStatusFilter) {
          return false;
        }
        if (siteFilter !== ALL_VALUE && item.productionSite !== siteFilter) {
          return false;
        }
        if (familyFilter !== ALL_VALUE && item.family !== familyFilter) {
          return false;
        }
        return true;
      }),
    [categoryFilter, dealerStatusFilter, familyFilter, normalizedQuery, retailStatusFilter, siteFilter, sourceItems],
  );

  const hasActiveFilters =
    searchQuery.length > 0 ||
    categoryFilter !== ALL_VALUE ||
    dealerStatusFilter !== ALL_VALUE ||
    retailStatusFilter !== ALL_VALUE ||
    siteFilter !== ALL_VALUE ||
    familyFilter !== ALL_VALUE;

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);
  const paginationItems = useMemo(() => buildPaginationItems(visiblePage, totalPages), [totalPages, visiblePage]);

  // Ключ «запроса»: меняется при смене фильтров, поиска или страницы — как обращение к серверу.
  const requestKey = [
    listingMode,
    normalizedQuery,
    categoryFilter,
    dealerStatusFilter,
    retailStatusFilter,
    siteFilter,
    familyFilter,
    visiblePage,
  ].join("|");

  // Пока загруженный ключ не совпал с текущим запросом — показываем состояние загрузки.
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
    setDealerStatusFilter(ALL_VALUE);
    setRetailStatusFilter(ALL_VALUE);
    setSiteFilter(ALL_VALUE);
    setFamilyFilter(ALL_VALUE);
    resetToFirstPage();
  };

  const handleResetColumns = () => {
    setVisibleColumnIds(DEFAULT_VISIBLE_COLUMNS);
  };

  const handleToggleColumn = (columnId: CatalogColumnId) => {
    const columnDefinition = getCatalogColumnDefinition(columnId);
    if (!columnDefinition || columnDefinition.locked) {
      return;
    }

    setVisibleColumnIds((currentIds) => {
      if (currentIds.includes(columnId)) {
        return getOrderedVisibleColumns(currentIds.filter((id) => id !== columnId));
      }

      return getOrderedVisibleColumns([...currentIds, columnId]);
    });
  };

  useEffect(() => {
    if (!columnsStorageKey) {
      return;
    }

    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }

    const storedColumns = parseStoredColumns(storage.getItem(columnsStorageKey));
    const timer = window.setTimeout(() => {
      setVisibleColumnIds(storedColumns ?? DEFAULT_VISIBLE_COLUMNS);
      setColumnsHydratedKey(columnsStorageKey);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [columnsStorageKey]);

  useEffect(() => {
    if (!columnsStorageKey || columnsHydratedKey !== columnsStorageKey) {
      return;
    }

    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }

    storage.setItem(columnsStorageKey, serializeVisibleColumns(visibleColumnIds));
  }, [columnsHydratedKey, columnsStorageKey, visibleColumnIds]);

  const filters: CatalogFilters = {
    search: { value: searchQuery, onChange: handleSearchChange },
    category: { value: categoryFilter, onChange: makeFilterHandler(setCategoryFilter) },
    dealerStatus: {
      value: dealerStatusFilter,
      onChange: makeFilterHandler(setDealerStatusFilter),
      options: dealerStatusOptions,
    },
    retailStatus: {
      value: retailStatusFilter,
      onChange: makeFilterHandler(setRetailStatusFilter),
      options: retailStatusOptions,
    },
    site: { value: siteFilter, onChange: makeFilterHandler(setSiteFilter), options: siteOptions },
    family: { value: familyFilter, onChange: makeFilterHandler(setFamilyFilter), options: familyOptions },
    hasActive: hasActiveFilters,
    onReset: handleResetFilters,
  };

  const orderedVisibleColumnIds = useMemo(() => getOrderedVisibleColumns(visibleColumnIds), [visibleColumnIds]);

  const columns: CatalogColumns = {
    visibleIds: orderedVisibleColumnIds,
    isVisible: (columnId) => orderedVisibleColumnIds.includes(columnId),
    toggle: handleToggleColumn,
    hasCustom: !isDefaultColumnSet(orderedVisibleColumnIds),
    onReset: handleResetColumns,
  };

  return {
    isFilterSheetOpen,
    setFilterSheetOpen,
    isColumnSheetOpen,
    setColumnSheetOpen,
    filters,
    columns,
    filteredItems,
    paginatedItems,
    isLoading,
    visiblePage,
    totalPages,
    paginationItems,
    onPageChange: setCurrentPage,
  };
};
