"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CatalogCardGrid } from "./catalog/catalog-card";
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
  getCatalogStorageKeys,
  parseCatalogListingMode,
  type CatalogListingMode,
} from "./catalog/catalog-helpers";
import { useCatalogController } from "./catalog/use-catalog-controller";

const StoreCatalogPageFallback = () => (
  <div className="min-h-screen bg-muted/30" aria-busy="true" aria-label="Loading catalog" />
);

const StoreCatalogPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listingMode = parseCatalogListingMode(searchParams.get(CATALOG_LISTING_QUERY_PARAM));

  const { viewModeStorageKey, columnsStorageKey } = getCatalogStorageKeys(listingMode);
  const catalog = useCatalogController(listingMode, viewModeStorageKey, columnsStorageKey);

  useEffect(() => {
    if (searchParams.get(CATALOG_LISTING_QUERY_PARAM)) {
      return;
    }

    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }

    const stored = storage.getItem(CATALOG_LISTING_MODE_STORAGE_KEY);
    if (stored !== "variants") {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set(CATALOG_LISTING_QUERY_PARAM, "variants");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleListingModeChange = useCallback(
    (mode: CatalogListingMode) => {
      catalog.onPageChange(1);
      catalog.setColumnSheetOpen(false);

      const storage = window.localStorage;
      if (storage?.setItem) {
        storage.setItem(CATALOG_LISTING_MODE_STORAGE_KEY, mode);
      }

      const params = new URLSearchParams(searchParams.toString());
      if (mode === "variants") {
        params.set(CATALOG_LISTING_QUERY_PARAM, "variants");
      } else {
        params.delete(CATALOG_LISTING_QUERY_PARAM);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [catalog.onPageChange, catalog.setColumnSheetOpen, pathname, router, searchParams],
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
            viewMode={catalog.viewMode}
            onViewModeChange={catalog.onViewModeChange}
            onOpenFilters={() => catalog.setFilterSheetOpen(true)}
            onOpenColumns={() => catalog.setColumnSheetOpen(true)}
          />

          {catalog.viewMode === "table" ? (
            <CatalogTable
              items={catalog.paginatedItems}
              isLoading={catalog.isLoading}
              listingMode={listingMode}
              visibleColumnIds={catalog.columns.visibleIds}
              footer={catalogFooter}
            />
          ) : (
            <CatalogCardGrid
              items={catalog.paginatedItems}
              isLoading={catalog.isLoading}
              listingMode={listingMode}
              footer={catalogFooter}
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
