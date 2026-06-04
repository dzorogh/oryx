"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import { getVisibleColumnDefinitions } from "./pricelists-columns";
import { exportPricelistToXlsx } from "./pricelists-export";
import { PricelistsColumnsSheet } from "./pricelists-columns-sheet";
import { PricelistsFiltersSheet } from "./pricelists-filters-sheet";
import { PricelistsTable, type PricelistsTableHandle } from "./pricelists-table";
import { PricelistsToolbar } from "./pricelists-toolbar";
import {
  parsePricelistScope,
  parseRegionId,
  scopeHasRegion,
  type PricelistScope,
} from "./pricelists-demo-data";
import { REGION_QUERY_PARAM, SCOPE_QUERY_PARAM } from "./pricelists-helpers";
import { usePricelistColumns } from "./use-pricelist-columns";
import { usePricelistParameters } from "./use-pricelist-parameters";
import { usePricelistsController } from "./use-pricelists-controller";

const PricelistsPageFallback = () => (
  <div className="min-h-screen bg-muted/30" aria-busy="true" aria-label="Loading pricelists" />
);

const PricelistsPageContent = () => {
  const searchParams = useSearchParams();

  // With `output: "export"` the Next router does not update useSearchParams on
  // client-side router.replace (a no-op after a hard reload), so we own the
  // scope/region state and sync the URL through the History API instead.
  const [scope, setScope] = useState<PricelistScope>(() =>
    parsePricelistScope(searchParams.get(SCOPE_QUERY_PARAM)),
  );
  const [regionId, setRegionId] = useState<string>(() =>
    parseRegionId(searchParams.get(REGION_QUERY_PARAM)),
  );

  const controller = usePricelistsController(scope, regionId);
  const columns = usePricelistColumns(scope);
  const collab = useYjsPricelists();
  const tableRef = useRef<PricelistsTableHandle>(null);
  const parameters = usePricelistParameters(scope, regionId, collab);
  const [isColumnSheetOpen, setColumnSheetOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const visibleColumns = getVisibleColumnDefinitions(scope, columns.visibleIds);

  const syncUrl = useCallback((nextScope: PricelistScope, nextRegionId: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (nextScope === "global") {
      params.delete(SCOPE_QUERY_PARAM);
    } else {
      params.set(SCOPE_QUERY_PARAM, nextScope);
    }
    if (scopeHasRegion(nextScope)) {
      params.set(REGION_QUERY_PARAM, nextRegionId);
    } else {
      params.delete(REGION_QUERY_PARAM);
    }
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(window.history.state, "", url);
  }, []);

  // Keep state in sync with browser back/forward navigation.
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setScope(parsePricelistScope(params.get(SCOPE_QUERY_PARAM)));
      setRegionId(parseRegionId(params.get(REGION_QUERY_PARAM)));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleScopeChange = useCallback(
    (nextScope: PricelistScope) => {
      controller.onPageChange(1);
      setScope(nextScope);
      syncUrl(nextScope, regionId);
    },
    [controller, regionId, syncUrl],
  );

  const handleRegionChange = useCallback(
    (nextRegionId: string) => {
      controller.onPageChange(1);
      setRegionId(nextRegionId);
      syncUrl(scope, nextRegionId);
    },
    [controller, scope, syncUrl],
  );

  // Exports the current pricelist: the selected scope/region, every row that
  // matches the active filters (not just the visible page), and only the
  // columns currently shown in the table.
  const handleExport = useCallback(async () => {
    if (isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      await exportPricelistToXlsx({
        scope,
        regionId,
        rows: controller.filteredItems,
        columns: visibleColumns,
        parameterColumns: parameters.enabled ? parameters.visibleColumns : [],
        collab,
        parameters,
      });
      toast.success(`Exported ${controller.filteredItems.length} products`);
    } catch {
      toast.error("Could not export the pricelist. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [collab, controller.filteredItems, isExporting, parameters, regionId, scope, visibleColumns]);

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
            columns={columns}
            onlineUsers={collab.onlineUsers}
            connected={collab.connected}
            onOpenFilters={() => controller.setFilterSheetOpen(true)}
            onOpenColumns={() => setColumnSheetOpen(true)}
            onExport={handleExport}
            isExporting={isExporting}
          />

          <PricelistsTable
            ref={tableRef}
            rows={controller.paginatedItems}
            columns={visibleColumns}
            isLoading={controller.isLoading}
            scope={scope}
            regionId={regionId}
            collab={collab}
            parameters={parameters}
            footer={footer}
          />
        </div>
      </section>

      <PricelistsFiltersSheet
        open={controller.isFilterSheetOpen}
        onOpenChange={controller.setFilterSheetOpen}
        filters={controller.filters}
      />

      <PricelistsColumnsSheet
        open={isColumnSheetOpen}
        onOpenChange={setColumnSheetOpen}
        scope={scope}
        columns={columns}
        parameters={parameters}
        onParameterAction={(action) => {
          if (action.kind !== "create" && action.kind !== "edit") {
            return;
          }
          setColumnSheetOpen(false);
          requestAnimationFrame(() => {
            if (action.kind === "create") {
              tableRef.current?.openCreateParameterDialog(action.atIndex);
            } else {
              tableRef.current?.openEditParameterDialog(action.def);
            }
          });
        }}
      />
    </main>
  );
};

export const PricelistsPage = () => (
  <Suspense fallback={<PricelistsPageFallback />}>
    <PricelistsPageContent />
  </Suspense>
);
