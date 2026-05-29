"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CatalogCardGrid } from "./catalog/catalog-card";
import { CatalogFiltersSheet } from "./catalog/catalog-filters-sheet";
import { CatalogFooter } from "./catalog/catalog-footer";
import { CatalogTable } from "./catalog/catalog-table";
import { CatalogToolbar } from "./catalog/catalog-toolbar";
import {
  STORE_PRODUCTS_CATALOG_CONFIG,
  type StoreCatalogPageConfig,
} from "./catalog/catalog-helpers";
import { useCatalogController } from "./catalog/use-catalog-controller";

type StoreCatalogPageProps = {
  config?: StoreCatalogPageConfig;
};

export const StoreCatalogPage = ({ config = STORE_PRODUCTS_CATALOG_CONFIG }: StoreCatalogPageProps) => {
  const catalog = useCatalogController(config.viewModeStorageKey);

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
                <BreadcrumbLink render={<Link href={config.storeLinkHref} aria-label="Open Store section" />}>
                  Store
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{config.breadcrumbLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <CatalogToolbar
            config={config}
            filters={catalog.filters}
            viewMode={catalog.viewMode}
            onViewModeChange={catalog.onViewModeChange}
            onOpenFilters={() => catalog.setFilterSheetOpen(true)}
          />

          {catalog.viewMode === "table" ? (
            <CatalogTable
              items={catalog.paginatedItems}
              isLoading={catalog.isLoading}
              listingMode={config.listingMode}
              footer={catalogFooter}
            />
          ) : (
            <CatalogCardGrid
              items={catalog.paginatedItems}
              isLoading={catalog.isLoading}
              listingMode={config.listingMode}
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
    </main>
  );
};
