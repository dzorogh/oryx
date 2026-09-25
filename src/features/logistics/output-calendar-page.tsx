// english-ui:ignore-file
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { loadOutputCalendarPage } from "@/features/logistics/logistics-api";
import { allCategoryGroupIds } from "@/features/logistics/category-tree";
import {
  defaultIncomingFilter,
  defaultOwnerFilter,
  defaultPlantPaymentsFilter,
  plantFilterOptions,
  type IncomingFilter,
  type OutputCalendarOwnerFilter,
  type OutputCalendarPage as OutputCalendarPageData,
  type PlantPaymentsFilter,
} from "@/features/logistics/output-calendar";
import { OutputCalendarCreateDialog } from "@/features/logistics/ui/output-calendar-create-dialog";
import {
  MONEY_PLANTS_GROUP_ID,
  MONEY_REGIONS_GROUP_ID,
  OutputCalendarMatrix,
  type CreateDialogTarget,
} from "@/features/logistics/ui/output-calendar-matrix";
import {
  OutputCalendarIncomingPanel,
  OutputCalendarOutputsPanel,
  OutputCalendarPlantPaymentsPanel,
  OutputCalendarToolbar,
  type CalendarPanel,
} from "@/features/logistics/ui/output-calendar-toolbar";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

export const OutputCalendarPage = () => {
  const [page, setPage] = useState<OutputCalendarPageData | null>(null);
  const [filter, setFilter] = useState<OutputCalendarOwnerFilter | null>(null);
  const [plantId, setPlantId] = useState<string | null>(null);
  const [plantPaymentsFilter, setPlantPaymentsFilter] = useState<PlantPaymentsFilter>(defaultPlantPaymentsFilter);
  const [incomingFilter, setIncomingFilter] = useState<IncomingFilter>(defaultIncomingFilter);
  const [panel, setPanel] = useState<CalendarPanel | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [incomingSearch, setIncomingSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateDialogTarget | null>(null);

  const applyPage = useCallback((next: OutputCalendarPageData, preserveFilter: boolean) => {
    setPage(next);
    setPlantId((prev) =>
      prev != null && !plantFilterOptions(next.outputLines, next.openOrders).includes(prev) ? null : prev,
    );
    setFilter((prev) => {
      if (preserveFilter && prev) {
        const regionIds = prev.regionIds.filter((id) => next.regions.some((r) => r.id === id));
        const orderIds = prev.orderIds.filter((id) => next.customerOrders.some((o) => o.id === id));
        return { ...prev, regionIds, orderIds };
      }
      return defaultOwnerFilter(next);
    });
  }, []);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const next = await loadOutputCalendarPage();
      // Soft refresh clears isNew flags by replacing from server
      applyPage(next, Boolean(opts?.soft));
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "Не удалось загрузить календарь";
      const description = translateLogisticsError(raw);
      if (opts?.soft) {
        toast.error("Не удалось обновить", { description });
      } else {
        setError(description);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyPage]);

  useEffect(() => {
    void load();
  }, [load]);

  const plantOptions = useMemo(
    () => (page ? plantFilterOptions(page.outputLines, page.openOrders) : []),
    [page],
  );

  const setCollapsedMany = (ids: string[], nextCollapsed: boolean) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (nextCollapsed) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMonth = (key: number) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading && !page) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Календарь выпусков" }]}>
        <LogisticsLoading />
      </LogisticsPageShell>
    );
  }

  if (error && !page) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Календарь выпусков" }]}>
        <LogisticsError message={error} />
      </LogisticsPageShell>
    );
  }

  if (!page || !filter) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Календарь выпусков" }]}>
        <LogisticsError message="Нет данных" />
      </LogisticsPageShell>
    );
  }

  const closePanel = () => setPanel(null);

  return (
    <LogisticsPageShell crumbs={[{ label: "Календарь выпусков" }]}>
      <div className="flex w-full items-stretch gap-0">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <OutputCalendarToolbar
            page={page}
            filter={filter}
            plantId={plantId}
            plantPaymentsFilter={plantPaymentsFilter}
            incomingFilter={incomingFilter}
            panel={panel}
            onTogglePanel={(next) => setPanel((current) => (current === next ? null : next))}
            onRefresh={() => void load({ soft: true })}
            onCollapseAll={() =>
              setCollapsed(
                new Set([...allCategoryGroupIds(page.categories), MONEY_PLANTS_GROUP_ID, MONEY_REGIONS_GROUP_ID]),
              )
            }
            onExpandAll={() => setCollapsed(new Set())}
            refreshing={refreshing}
          />
          <OutputCalendarMatrix
            page={page}
            filter={filter}
            plantId={plantId}
            plantPaymentsFilter={plantPaymentsFilter}
            incomingFilter={incomingFilter}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            onSetCollapsed={setCollapsedMany}
            expandedMonths={expandedMonths}
            onToggleMonth={toggleMonth}
            onCreate={setCreateTarget}
          />
        </div>
        {panel === "outputs" ? (
          <OutputCalendarOutputsPanel
            page={page}
            filter={filter}
            plantId={plantId}
            plantOptions={plantOptions}
            orderSearch={orderSearch}
            onOrderSearchChange={setOrderSearch}
            onChange={setFilter}
            onPlantChange={setPlantId}
            onClose={closePanel}
            onSelectAll={() => {
              setFilter(defaultOwnerFilter(page));
              setPlantId(null);
            }}
            onReset={() =>
              setFilter({
                free: false,
                regionIds: [],
                withRegionOrders: true,
                orderIds: [],
              })
            }
          />
        ) : null}
        {panel === "plants" ? (
          <OutputCalendarPlantPaymentsPanel
            page={page}
            filter={plantPaymentsFilter}
            onChange={setPlantPaymentsFilter}
            onClose={closePanel}
          />
        ) : null}
        {panel === "incoming" ? (
          <OutputCalendarIncomingPanel
            page={page}
            filter={incomingFilter}
            orderSearch={incomingSearch}
            onOrderSearchChange={setIncomingSearch}
            onChange={setIncomingFilter}
            onClose={closePanel}
          />
        ) : null}
      </div>
      <OutputCalendarCreateDialog
        target={createTarget}
        openOrders={page.openOrders}
        products={page.products}
        plantIds={page.plants.map((p) => p.id)}
        onClose={() => setCreateTarget(null)}
      />
    </LogisticsPageShell>
  );
};
