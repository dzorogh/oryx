"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
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
import { CatalogFooter } from "./catalog/catalog-footer";
import { CatalogTable } from "./catalog/catalog-table";
import { CatalogToolbar } from "./catalog/catalog-toolbar";
import {
  CATALOG_LISTING_MODE_STORAGE_KEY,
  CATALOG_LISTING_QUERY_PARAM,
  STORE_CATALOG_PAGE,
  getCatalogAddButtonAriaLabel,
  getCatalogColumnsStorageKey,
  parseCatalogListingMode,
  type CatalogListingMode,
} from "./catalog/catalog-helpers";
import { useCatalogController } from "./catalog/use-catalog-controller";

const StoreCatalogPageFallback = () => (
  <div className="min-h-screen bg-muted/30" aria-busy="true" aria-label="Loading catalog" />
);

const StoreCatalogPageContent = () => {
  const searchParams = useSearchParams();

  // With `output: "export"` the Next router does not update useSearchParams on
  // client-side router.replace (a no-op after a hard reload), so we own the
  // listing-mode state and sync the URL through the History API instead.
  const [listingMode, setListingMode] = useState<CatalogListingMode>(() =>
    parseCatalogListingMode(searchParams.get(CATALOG_LISTING_QUERY_PARAM)),
  );

  const columnsStorageKey = getCatalogColumnsStorageKey(listingMode);
  const catalog = useCatalogController(listingMode, columnsStorageKey);

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
      catalog.onPageChange(1);
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

  const catalogFooter = (
    <CatalogFooter
      shownCount={catalog.paginatedItems.length}
      totalCount={catalog.filteredItems.length}
      visiblePage={catalog.visiblePage}
      totalPages={catalog.totalPages}
      paginationItems={catalog.paginationItems}
      onPageChange={catalog.onPageChange}
    />
  );

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-4 py-4">
        <div className="flex w-full flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link href={STORE_CATALOG_PAGE.storeLinkHref} aria-label="Open Store section" />}
                >
                  Store
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
          />

          <CatalogTable
            items={catalog.paginatedItems}
            isLoading={catalog.isLoading}
            listingMode={listingMode}
            visibleColumnIds={catalog.columns.visibleIds}
            footer={catalogFooter}
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
