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
import { BackendUnsetNotice, LogisticsError } from "@/features/logistics/ui/logistics-state";
import { CATALOG_PAGE_SIZE, type StoreCatalogItem } from "@/features/store/domain/catalog-item";
import { buildCatalogQueryFilters, resolveCatalogFirstPage, resolveCatalogLoadMore } from "@/features/store/load-state";
import { StoreInlineRetry } from "@/features/store/store-load-notice";
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
import { CATALOG_VIEW_KEYS, resolveVisibility } from "@/features/logistics/order-view-role";
import { useViewRole } from "@/features/logistics/use-view-role";

const SEARCH_DEBOUNCE_MS = 300;

type CatalogPageResult = {
  key: string;
  status: "ready" | "error" | "unconfigured";
  items: StoreCatalogItem[];
  groupTotals: Record<string, number>;
  hasMore: boolean;
};

const EMPTY_CATALOG_ITEMS: StoreCatalogItem[] = [];
const EMPTY_GROUP_TOTALS: Record<string, number> = {};

const StoreCatalogPageFallback = () => (
  <div className="min-h-screen bg-muted/30" aria-busy="true" aria-label="Загрузка каталога" />
);

const StoreCatalogPageContent = () => {
  const searchParams = useSearchParams();
  const { selectedRegionCode } = useSelectedRegion();
  const viewRole = useViewRole("catalog");
  const visibility = resolveVisibility(CATALOG_VIEW_KEYS, viewRole.rules, viewRole.role);

  // With `output: "export"` the Next router does not update useSearchParams on
  // client-side router.replace (a no-op after a hard reload), so we own the
  // listing-mode state and sync the URL through the History API instead.
  const [listingMode, setListingMode] = useState<CatalogListingMode>(() =>
    parseCatalogListingMode(searchParams.get(CATALOG_LISTING_QUERY_PARAM)),
  );

  const columnsStorageKey = getCatalogColumnsStorageKey(listingMode);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [catalogResult, setCatalogResult] = useState<CatalogPageResult | null>(null);
  const [loadMoreUi, setLoadMoreUi] = useState({ key: "", loading: false, error: false });
  const [stockFacts, setStockFacts] = useState<VariantStockFact[]>([]);
  const [stockStatus, setStockStatus] = useState<"loading" | "ready" | "error" | "unconfigured">("loading");
  const [stockAttempt, setStockAttempt] = useState(0);
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [familyOptions, setFamilyOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const loadGenerationRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const loadedItems = catalogResult?.status === "ready" ? catalogResult.items : EMPTY_CATALOG_ITEMS;
  const regionResolvedItems = useMemo(
    () => loadedItems.map((item) => resolveCatalogItemForRegion(item, selectedRegionCode)),
    [loadedItems, selectedRegionCode],
  );

  const catalog = useCatalogController(listingMode, columnsStorageKey, {
    items: regionResolvedItems,
    groupTotals: catalogResult?.status === "ready" ? catalogResult.groupTotals : EMPTY_GROUP_TOTALS,
    isInitialLoading: false,
    siteOptions,
    familyOptions,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(catalog.filters.search.value.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [catalog.filters.search.value]);

  const queryFilters = useMemo(
    (): CatalogQueryFilters =>
      buildCatalogQueryFilters({
        search: debouncedSearch,
        category: catalog.filters.category.value,
        family: catalog.filters.family.value,
        site: catalog.filters.site.value,
        dealerStatus: catalog.filters.dealerStatus.value,
        retailStatus: catalog.filters.retailStatus.value,
        regionCode: selectedRegionCode,
        allValue: ALL_VALUE,
      }),
    [
      catalog.filters.category.value,
      catalog.filters.dealerStatus.value,
      catalog.filters.family.value,
      catalog.filters.retailStatus.value,
      catalog.filters.site.value,
      debouncedSearch,
      selectedRegionCode,
    ],
  );
  const catalogRequestKey = `${catalogAttempt}:${JSON.stringify(queryFilters)}`;
  const catalogPage = catalogResult?.key === catalogRequestKey ? catalogResult : null;
  const catalogStatus = catalogPage?.status ?? "loading";
  const pageItems = catalogPage?.status === "ready" ? catalogPage.items : null;
  const hasMore = catalogPage?.status === "ready" ? catalogPage.hasMore : false;
  const isLoadingMore = loadMoreUi.key === catalogRequestKey && loadMoreUi.loading;
  const loadMoreError = loadMoreUi.key === catalogRequestKey && loadMoreUi.error;

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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadVariantStockFacts()
      .then((facts) => {
        if (cancelled) {
          return;
        }
        if (!facts) {
          setStockFacts([]);
          setStockStatus("unconfigured");
          return;
        }
        setStockFacts(facts);
        setStockStatus("ready");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setStockFacts([]);
        setStockStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [stockAttempt]);

  useEffect(() => {
    const generation = ++loadGenerationRef.current;
    const filters = queryFilters;
    const key = catalogRequestKey;
    isLoadingMoreRef.current = false;

    void loadDbCatalogItems({ offset: 0, limit: CATALOG_PAGE_SIZE, filters })
      .then((page) => {
        if (loadGenerationRef.current !== generation) {
          return;
        }
        const outcome = resolveCatalogFirstPage(page);
        if (outcome.status === "unconfigured") {
          setCatalogResult({ key, status: "unconfigured", items: [], groupTotals: {}, hasMore: false });
          return;
        }
        setCatalogResult({
          key,
          status: "ready",
          items: outcome.page.items,
          groupTotals: outcome.page.groupTotals,
          hasMore: outcome.page.hasMore,
        });
      })
      .catch(() => {
        if (loadGenerationRef.current !== generation) {
          return;
        }
        setCatalogResult({ key, status: "error", items: [], groupTotals: {}, hasMore: false });
      });
  }, [catalogRequestKey, queryFilters]);

  const retryStock = useCallback(() => {
    setStockStatus("loading");
    setStockFacts([]);
    setStockAttempt((attempt) => attempt + 1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current || !hasMore || pageItems === null) {
      return;
    }
    const generation = loadGenerationRef.current;
    const offset = pageItems.length;
    const filters = queryFilters;
    const key = catalogRequestKey;
    isLoadingMoreRef.current = true;
    setLoadMoreUi({ key, loading: true, error: false });

    void loadDbCatalogItems({ offset, limit: CATALOG_PAGE_SIZE, filters })
      .then((page) => {
        if (loadGenerationRef.current !== generation) {
          return;
        }
        const outcome = resolveCatalogLoadMore(page);
        if (!outcome.ok) {
          setLoadMoreUi({ key, loading: false, error: true });
          return;
        }
        if (outcome.page.items.length === 0) {
          setCatalogResult((current) =>
            current && current.key === key && current.status === "ready"
              ? { ...current, hasMore: false }
              : current,
          );
          setLoadMoreUi({ key, loading: false, error: false });
          return;
        }
        setCatalogResult((current) => {
          if (!current || current.key !== key || current.status !== "ready") {
            return current;
          }
          return {
            ...current,
            items: mergeCatalogPageItems(current.items, { ok: true, items: outcome.page.items }),
            groupTotals: outcome.page.groupTotals,
            hasMore: outcome.hasMore,
          };
        });
        setLoadMoreUi({ key, loading: false, error: false });
      })
      .catch(() => {
        if (loadGenerationRef.current !== generation) {
          return;
        }
        setLoadMoreUi({ key, loading: false, error: true });
      })
      .finally(() => {
        if (loadGenerationRef.current === generation) {
          isLoadingMoreRef.current = false;
        }
      });
  }, [catalogRequestKey, hasMore, pageItems, queryFilters]);

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
            canAdd={visibility["catalog.add"]}
            filters={catalog.filters}
            columns={catalog.columns}
            onOpenFilters={() => catalog.setFilterSheetOpen(true)}
            onOpenColumns={() => catalog.setColumnSheetOpen(true)}
            onCollapseAllSites={catalog.collapseAllSites}
            onExpandAllSites={catalog.expandAllSites}
          />

          {stockStatus === "error" ? (
            <StoreInlineRetry message="Не удалось загрузить остатки." onRetry={retryStock} />
          ) : null}

          {catalogStatus === "error" ? (
            <LogisticsError
              title="Не удалось загрузить каталог"
              message="Попробуйте ещё раз."
              onRetry={() => setCatalogAttempt((attempt) => attempt + 1)}
            />
          ) : catalogStatus === "unconfigured" ? (
            <BackendUnsetNotice />
          ) : (
            <CatalogTable
              siteGroups={catalog.siteGroups}
              isLoading={catalogStatus === "loading"}
              isLoadingMore={isLoadingMore}
              loadMoreError={loadMoreError}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              listingMode={listingMode}
              visibleColumnIds={catalog.columns.visibleIds}
              stockFacts={stockStatus === "ready" ? stockFacts : []}
              stockUnknown={stockStatus !== "ready"}
              collapsedSiteKeys={catalog.collapsedSiteKeys}
              onToggleSiteCollapsed={catalog.toggleSiteCollapsed}
            />
          )}
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
