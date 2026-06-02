"use client";

import Link from "next/link";
import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CatalogFooter } from "../products/catalog/catalog-footer";
import { useYjsPricelists } from "./collab/use-yjs-pricelists";
import { PricelistsFiltersSheet } from "./pricelists-filters-sheet";
import { PricelistsTable } from "./pricelists-table";
import { PricelistsToolbar } from "./pricelists-toolbar";
import {
  parsePricelistScope,
  parseRegionId,
  scopeHasRegion,
  type PricelistScope,
} from "./pricelists-demo-data";
import { REGION_QUERY_PARAM, SCOPE_QUERY_PARAM } from "./pricelists-helpers";
import { usePricelistsController } from "./use-pricelists-controller";

const PricelistsPageFallback = () => (
  <div className="min-h-screen bg-muted/30" aria-busy="true" aria-label="Loading pricelists" />
);

const PricelistsPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const scope = parsePricelistScope(searchParams.get(SCOPE_QUERY_PARAM));
  const regionId = parseRegionId(searchParams.get(REGION_QUERY_PARAM));

  const controller = usePricelistsController(scope, regionId);
  const collab = useYjsPricelists();

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleScopeChange = useCallback(
    (nextScope: PricelistScope) => {
      controller.onPageChange(1);
      updateParams((params) => {
        if (nextScope === "global") {
          params.delete(SCOPE_QUERY_PARAM);
        } else {
          params.set(SCOPE_QUERY_PARAM, nextScope);
        }
        if (!scopeHasRegion(nextScope)) {
          params.delete(REGION_QUERY_PARAM);
        }
      });
    },
    [controller, updateParams],
  );

  const handleRegionChange = useCallback(
    (nextRegionId: string) => {
      controller.onPageChange(1);
      updateParams((params) => params.set(REGION_QUERY_PARAM, nextRegionId));
    },
    [controller, updateParams],
  );

  const footer = (
    <CatalogFooter
      shownCount={controller.paginatedItems.length}
      totalCount={controller.filteredItems.length}
      visiblePage={controller.visiblePage}
      totalPages={controller.totalPages}
      paginationItems={controller.paginationItems}
      onPageChange={controller.onPageChange}
    />
  );

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-4 py-4">
        <div className="flex w-full flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/store/pim/products" aria-label="Open Store section" />}>
                  Store
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Pricelists</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <PricelistsToolbar
            scope={scope}
            onScopeChange={handleScopeChange}
            regionId={regionId}
            onRegionChange={handleRegionChange}
            filters={controller.filters}
            onlineUsers={collab.onlineUsers}
            connected={collab.connected}
            onOpenFilters={() => controller.setFilterSheetOpen(true)}
          />

          <PricelistsTable
            rows={controller.paginatedItems}
            isLoading={controller.isLoading}
            scope={scope}
            regionId={regionId}
            collab={collab}
            footer={footer}
          />
        </div>
      </section>

      <PricelistsFiltersSheet
        open={controller.isFilterSheetOpen}
        onOpenChange={controller.setFilterSheetOpen}
        filters={controller.filters}
      />
    </main>
  );
};

export const PricelistsPage = () => (
  <Suspense fallback={<PricelistsPageFallback />}>
    <PricelistsPageContent />
  </Suspense>
);
