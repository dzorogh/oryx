import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEALER_STATUSES,
  RETAIL_STATUSES,
  type DealerStatus,
  type RetailStatus,
} from "@/features/store/domain/statuses";
import { CATALOG_NO_SITE_KEY, type StoreCatalogItem } from "@/features/store/domain/catalog-item";
import {
  DEFAULT_VISIBLE_COLUMNS,
  type CatalogColumnId,
  getCatalogColumnDefinition,
  getOrderedVisibleColumns,
  isDefaultColumnSet,
  parseStoredColumns,
  serializeVisibleColumns,
} from "./catalog-columns";
import { ALL_VALUE, getSelectValue, type CatalogListingMode, type QuickFilterOption } from "./catalog-helpers";
import { formatCatalogStatus } from "@/features/store/catalog-presentation";
import { CATALOG_NO_SITE_LABEL, catalogSiteKeysForCollapseAll, compareCatalogSiteKeys, groupCatalogItemsBySite, toggleCatalogSiteCollapsed, type CatalogSiteGroup } from "./catalog-site-groups";

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
  siteGroups: CatalogSiteGroup[];
  collapsedSiteKeys: ReadonlySet<string>;
  toggleSiteCollapsed: (siteKey: string) => void;
  collapseAllSites: () => void;
  expandAllSites: () => void;
  isLoading: boolean;
};

export type CatalogControllerSource = {
  items: StoreCatalogItem[];
  groupTotals: ReadonlyMap<string, number> | Readonly<Record<string, number>>;
  /** Первая порция ещё не пришла (скелетоны). */
  isInitialLoading: boolean;
  siteOptions: string[];
  familyOptions: Array<{ id: string; name: string }>;
};

const toFilterOptions = (values: string[], formatLabel?: (value: string) => string): QuickFilterOption[] =>
  values.map((value) => ({ value, label: formatLabel?.(value) ?? value }));

export const useCatalogController = (
  listingMode: CatalogListingMode,
  columnsStorageKey: string | undefined,
  source: CatalogControllerSource,
): CatalogController => {
  const { items: sourceItems, groupTotals, isInitialLoading, siteOptions, familyOptions } = source;

  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isColumnSheetOpen, setColumnSheetOpen] = useState(false);
  const [visibleColumnIds, setVisibleColumnIds] = useState<CatalogColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnsHydratedKey, setColumnsHydratedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_VALUE);
  const [dealerStatusFilter, setDealerStatusFilter] = useState(ALL_VALUE);
  const [retailStatusFilter, setRetailStatusFilter] = useState(ALL_VALUE);
  const [siteFilter, setSiteFilter] = useState(ALL_VALUE);
  const [familyFilter, setFamilyFilter] = useState(ALL_VALUE);
  const [collapsedSiteKeys, setCollapsedSiteKeys] = useState<Set<string>>(() => new Set());

  const dealerStatusOptions = useMemo(
    () =>
      toFilterOptions(
        DEALER_STATUSES.map((status) => status.value),
        (value) => formatCatalogStatus(value as DealerStatus),
      ),
    [],
  );
  const retailStatusOptions = useMemo(
    () =>
      toFilterOptions(
        RETAIL_STATUSES.map((status) => status.value),
        (value) => formatCatalogStatus(value as RetailStatus),
      ),
    [],
  );
  const siteFilterOptions = useMemo(
    () =>
      toFilterOptions(
        [...siteOptions].sort(compareCatalogSiteKeys),
        (value) => (value === CATALOG_NO_SITE_KEY ? CATALOG_NO_SITE_LABEL : value),
      ),
    [siteOptions],
  );
  const familyFilterOptions = useMemo(
    () => familyOptions.map((family) => ({ value: family.id, label: family.name })),
    [familyOptions],
  );

  // Фильтры уходят в запрос; здесь только группировка уже загруженной порции.
  const filteredItems = sourceItems;
  const siteGroups = useMemo(
    () => groupCatalogItemsBySite(filteredItems, groupTotals),
    [filteredItems, groupTotals],
  );

  const hasActiveFilters =
    searchQuery.length > 0 ||
    categoryFilter !== ALL_VALUE ||
    dealerStatusFilter !== ALL_VALUE ||
    retailStatusFilter !== ALL_VALUE ||
    siteFilter !== ALL_VALUE ||
    familyFilter !== ALL_VALUE;

  const isLoading = isInitialLoading;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const makeFilterHandler = (setter: (value: string) => void) => (value: string | null) => {
    setter(getSelectValue(value));
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter(ALL_VALUE);
    setDealerStatusFilter(ALL_VALUE);
    setRetailStatusFilter(ALL_VALUE);
    setSiteFilter(ALL_VALUE);
    setFamilyFilter(ALL_VALUE);
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

  const toggleSiteCollapsed = useCallback((siteKey: string) => {
    setCollapsedSiteKeys((current) => toggleCatalogSiteCollapsed(current, siteKey));
  }, []);

  const collapseAllSites = useCallback(() => {
    setCollapsedSiteKeys(new Set(catalogSiteKeysForCollapseAll(siteGroups)));
  }, [siteGroups]);

  const expandAllSites = useCallback(() => {
    setCollapsedSiteKeys(new Set());
  }, []);

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

  // listingMode retained in signature for callers / future per-mode filter defaults.
  void listingMode;

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
    site: { value: siteFilter, onChange: makeFilterHandler(setSiteFilter), options: siteFilterOptions },
    family: {
      value: familyFilter,
      onChange: makeFilterHandler(setFamilyFilter),
      options: familyFilterOptions,
    },
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
    siteGroups,
    collapsedSiteKeys,
    toggleSiteCollapsed,
    collapseAllSites,
    expandAllSites,
    isLoading,
  };
};
