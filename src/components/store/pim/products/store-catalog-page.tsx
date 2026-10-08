// english-ui:ignore-file
"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CatalogColumnsSheet } from "./catalog/catalog-columns-sheet";
import { CatalogFiltersSheet } from "./catalog/catalog-filters-sheet";
import { CatalogTable } from "./catalog/catalog-table";
import { CatalogToolbar } from "./catalog/catalog-toolbar";
import { ALL_VALUE, CATALOG_LISTING_MODE_STORAGE_KEY, CATALOG_LISTING_QUERY_PARAM, STORE_CATALOG_PAGE, getCatalogAddButtonAriaLabel, getCatalogColumnsStorageKey, parseCatalogListingMode, type CatalogListingMode } from "./catalog/catalog-helpers";
import { CATALOG_PAGE_SIZE, type StoreCatalogItem } from "@/features/store/domain/catalog-item";
import { mergeCatalogPageItems } from "./catalog/catalog-site-groups";
import { resolveCatalogItemForRegion } from "./catalog/catalog-region";
import { useCatalogController } from "./catalog/use-catalog-controller";
import { useSelectedRegion } from "@/features/store/region-context";
import {
  loadCatalogFilterOptions,
  loadDbCatalogItems,
  type CatalogQueryFilters,
} from "@/features/store/store-catalog-from-logistics";
import { loadVariantStockFacts, type VariantStockFact } from "@/features/store/variant-stock";

const SEARCH_DEBOUNCE_MS = 300;

const StoreCatalogPageFallback = () => (
  <div className="min-h-screen bg-muted/30" aria-busy="true" aria-label="Загрузка каталога" />
);

const StoreCatalogPageContent = () => {
  const searchParams = useSearchParams();
  const { selectedRegionCode } = useSelectedRegion();

  // With `output: "export"` the Next router does not update useSearchParams on
  // client-side router.replace (a no-op after a hard reload), so we own the
  // listing-mode state and sync the URL through the History API instead.
  const [listingMode, setListingMode] = useState<CatalogListingMode>(() =>
    parseCatalogListingMode(searchParams.get(CATALOG_LISTING_QUERY_PARAM)),
  );

  const columnsStorageKey = getCatalogColumnsStorageKey(listingMode);
  const [dbItems, setDbItems] = useState<StoreCatalogItem[] | null>(null);
  const [groupTotals, setGroupTotals] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [stockFacts, setStockFacts] = useState<VariantStockFact[]>([]);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [familyOptions, setFamilyOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterSnapshot, setFilterSnapshot] = useState({
    category: ALL_VALUE,
    dealerStatus: ALL_VALUE,
    retailStatus: ALL_VALUE,
    site: ALL_VALUE,
    family: ALL_VALUE,
    search: "",
  });

  const loadGenerationRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const regionResolvedItems = useMemo(
    () => (dbItems ?? []).map((item) => resolveCatalogItemForRegion(item, selectedRegionCode)),
    [dbItems, selectedRegionCode],
  );

  const catalog = useCatalogController(listingMode, columnsStorageKey, {
    items: regionResolvedItems,
    groupTotals,
    isInitialLoading: dbItems === null,
    siteOptions,
    familyOptions,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(catalog.filters.search.value.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [catalog.filters.search.value]);

  useEffect(() => {
    setFilterSnapshot({
      category: catalog.filters.category.value,
      dealerStatus: catalog.filters.dealerStatus.value,
      retailStatus: catalog.filters.retailStatus.value,
      site: catalog.filters.site.value,
      family: catalog.filters.family.value,
      search: debouncedSearch,
    });
  }, [
    catalog.filters.category.value,
    catalog.filters.dealerStatus.value,
    catalog.filters.family.value,
    catalog.filters.retailStatus.value,
    catalog.filters.site.value,
    debouncedSearch,
  ]);

  const queryFilters = useMemo((): CatalogQueryFilters => {
    return {
      search: filterSnapshot.search,
      category: filterSnapshot.category === ALL_VALUE ? undefined : filterSnapshot.category,
      familyId: filterSnapshot.family === ALL_VALUE ? undefined : filterSnapshot.family,
      site: filterSnapshot.site === ALL_VALUE ? undefined : filterSnapshot.site,
      dealerStatus: filterSnapshot.dealerStatus === ALL_VALUE ? undefined : filterSnapshot.dealerStatus,
      retailStatus: filterSnapshot.retailStatus === ALL_VALUE ? undefined : filterSnapshot.retailStatus,
      regionCode: selectedRegionCode,
    };
  }, [filterSnapshot, selectedRegionCode]);

  const queryKey = useMemo(() => JSON.stringify(queryFilters), [queryFilters]);
  const queryFiltersRef = useRef(queryFilters);
  queryFiltersRef.current = queryFilters;

  useEffect(() => {
    let cancelled = false;
    void loadCatalogFilterOptions()
      .then((options) => {
        if (cancelled || !options) {
          return;
        }
        setSiteOptions(options.sites);
        setFamilyOptions(options.families);
      })
      .catch(() => {
        /* options stay empty — dropdowns still usable with ALL */
      });
    void loadVariantStockFacts()
      .then((facts) => {
        if (!cancelled) {
          setStockFacts(facts ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStockFacts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const generation = ++loadGenerationRef.current;
    const filters = queryFiltersRef.current;
    setDbItems(null);
    setHasMore(false);
    setIsLoadingMore(false);
    setLoadMoreError(false);
    isLoadingMoreRef.current = false;

    void loadDbCatalogItems({ offset: 0, limit: CATALOG_PAGE_SIZE, filters })
      .then((page) => {
        if (loadGenerationRef.current !== generation) {
          return;
        }
        if (!page) {
          setDbItems([]);
          setGroupTotals({});
          setHasMore(false);
          return;
        }
        setDbItems(page.items);
        setGroupTotals(page.groupTotals);
        setHasMore(page.hasMore);
      })
      .catch(() => {
        if (loadGenerationRef.current !== generation) {
          return;
        }
        setDbItems([]);
        setGroupTotals({});
        setHasMore(false);
      });
  }, [queryKey]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current || !hasMore || dbItems === null) {
      return;
    }
    const generation = loadGenerationRef.current;
    const offset = dbItems.length;
    const filters = queryFiltersRef.current;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    void loadDbCatalogItems({ offset, limit: CATALOG_PAGE_SIZE, filters })
      .then((page) => {
        if (loadGenerationRef.current !== generation) {
          return;
        }
        if (!page || page.items.length === 0) {
          setHasMore(false);
          setLoadMoreError(!page);
          return;
        }
        setDbItems((current) => mergeCatalogPageItems(current ?? [], { ok: true, items: page.items }));
        setGroupTotals(page.groupTotals);
        setHasMore(page.hasMore);
        setLoadMoreError(false);
      })
      .catch(() => {
        if (loadGenerationRef.current !== generation) {
          return;
        }
        setDbItems((current) => mergeCatalogPageItems(current ?? [], { ok: false }));
        setLoadMoreError(true);
      })
      .finally(() => {
        if (loadGenerationRef.current === generation) {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        }
      });
  }, [dbItems, hasMore]);

  const syncUrl = useCallback((mode: CatalogListingMode) => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (mode === "variants") {
      params.set(CATALOG_LISTING_QUERY_PARAM, "variants");
    } else {
      params.delete(CATALOG_LISTING_QUERY_PARAM);
    }
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(window.history.state, "", url);
  }, []);

  // Restore the saved listing mode when the URL has no explicit value.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get(CATALOG_LISTING_QUERY_PARAM)) {
      return;
    }
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }
    if (storage.getItem(CATALOG_LISTING_MODE_STORAGE_KEY) !== "variants") {
      return;
    }
    // Reading localStorage in the state initializer would cause a hydration
    // mismatch, so the saved mode is restored after mount instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration sync with localStorage
    setListingMode("variants");
    syncUrl("variants");
  }, [syncUrl]);

  // Keep state in sync with browser back/forward navigation.
  useEffect(() => {
    const handlePopState = () => {
      setListingMode(
        parseCatalogListingMode(
          new URLSearchParams(window.location.search).get(CATALOG_LISTING_QUERY_PARAM),
        ),
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleListingModeChange = useCallback(
    (mode: CatalogListingMode) => {
      catalog.setColumnSheetOpen(false);

      const storage = window.localStorage;
      if (storage?.setItem) {
        storage.setItem(CATALOG_LISTING_MODE_STORAGE_KEY, mode);
      }

      setListingMode(mode);
      syncUrl(mode);
    },
    [catalog, syncUrl],
  );

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-4 py-4">
        <div className="flex w-full flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link href={STORE_CATALOG_PAGE.storeLinkHref} aria-label="Открыть магазин" />}
                >
                  Магазин
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{STORE_CATALOG_PAGE.breadcrumbLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <CatalogToolbar
            listingMode={listingMode}
            onListingModeChange={handleListingModeChange}
            addButtonAriaLabel={getCatalogAddButtonAriaLabel(listingMode)}
            filters={catalog.filters}
            columns={catalog.columns}
            onOpenFilters={() => catalog.setFilterSheetOpen(true)}
            onOpenColumns={() => catalog.setColumnSheetOpen(true)}
            onCollapseAllSites={catalog.collapseAllSites}
            onExpandAllSites={catalog.expandAllSites}
          />

          <CatalogTable
            siteGroups={catalog.siteGroups}
            isLoading={catalog.isLoading}
            isLoadingMore={isLoadingMore}
            loadMoreError={loadMoreError}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            listingMode={listingMode}
            visibleColumnIds={catalog.columns.visibleIds}
            stockFacts={stockFacts}
            collapsedSiteKeys={catalog.collapsedSiteKeys}
            onToggleSiteCollapsed={catalog.toggleSiteCollapsed}
          />
        </div>
      </section>

      <CatalogFiltersSheet
        open={catalog.isFilterSheetOpen}
        onOpenChange={catalog.setFilterSheetOpen}
        filters={catalog.filters}
      />

      <CatalogColumnsSheet
        open={catalog.isColumnSheetOpen}
        onOpenChange={catalog.setColumnSheetOpen}
        columns={catalog.columns}
      />
    </main>
  );
};

export const StoreCatalogPage = () => (
  <Suspense fallback={<StoreCatalogPageFallback />}>
    <StoreCatalogPageContent />
  </Suspense>
);
