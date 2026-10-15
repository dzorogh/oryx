// english-ui:ignore-file
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { loadOutputCalendarPage } from "@/features/oms/oms-api";
import { allCategoryGroupIds } from "@/features/oms/category-tree";
import {
  defaultIncomingFilter,
  defaultOwnerFilter,
  defaultPlantPaymentsFilter,
  emptyOwnerFilter,
  plantFilterOptions,
  type IncomingFilter,
  type OutputCalendarOwnerFilter,
  type OutputCalendarPage as OutputCalendarPageData,
  type PlantPaymentsFilter,
} from "@/features/oms/output-calendar";
import { OutputCalendarCreateDialog } from "@/features/oms/ui/output-calendar-create-dialog";
import {
  MONEY_PLANTS_GROUP_ID,
  MONEY_REGIONS_GROUP_ID,
  OutputCalendarMatrix,
  type CreateDialogTarget,
} from "@/features/oms/ui/output-calendar-matrix";
import {
  OutputCalendarIncomingPanel,
  OutputCalendarOutputsPanel,
  OutputCalendarPlantPaymentsPanel,
  OutputCalendarToolbar,
  type CalendarPanel,
} from "@/features/oms/ui/output-calendar-toolbar";
import { OmsPageShell } from "@/features/oms/ui/oms-page-shell";
import { OmsError, OmsLoading } from "@/features/oms/ui/oms-state";
import { translateOmsError } from "@/features/oms/ui/run-action";
import { useOnOmsChanged } from "@/features/oms/use-oms-store";

export const OutputCalendarPage = () => {
  const [page, setPage] = useState<OutputCalendarPageData | null>(null);
  const [filter, setFilter] = useState<OutputCalendarOwnerFilter | null>(null);
  const [plantId, setPlantId] = useState<string | null>(null);
  const [plantPaymentsFilter, setPlantPaymentsFilter] = useState<PlantPaymentsFilter>(defaultPlantPaymentsFilter);
  const [incomingFilter, setIncomingFilter] = useState<IncomingFilter>(defaultIncomingFilter);
  const [panel, setPanel] = useState<CalendarPanel | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set([MONEY_PLANTS_GROUP_ID, MONEY_REGIONS_GROUP_ID]),
  );
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
      return defaultOwnerFilter();
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
      const description = translateOmsError(raw);
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

  const softReload = useCallback(() => load({ soft: true }), [load]);
  useOnOmsChanged(softReload);

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
      <OmsPageShell crumbs={[{ label: "Календарь производства" }]}>
        <OmsLoading />
      </OmsPageShell>
    );
  }

  if (error && !page) {
    return (
      <OmsPageShell crumbs={[{ label: "Календарь производства" }]}>
        <OmsError message={error} />
      </OmsPageShell>
    );
  }

  if (!page || !filter) {
    return (
      <OmsPageShell crumbs={[{ label: "Календарь производства" }]}>
        <OmsError message="Нет данных" />
      </OmsPageShell>
    );
  }

  const closePanel = () => setPanel(null);

  return (
    <OmsPageShell crumbs={[{ label: "Календарь производства" }]}>
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
        <OutputCalendarOutputsPanel
          open={panel === "outputs"}
          filter={filter}
          plantId={plantId}
          plantOptions={plantOptions}
          onChange={setFilter}
          onPlantChange={setPlantId}
          onClose={closePanel}
          onSelectAll={() => {
            setFilter(defaultOwnerFilter());
            setPlantId(null);
          }}
          onReset={() => setFilter(emptyOwnerFilter())}
        />
        <OutputCalendarPlantPaymentsPanel
          open={panel === "plants"}
          page={page}
          filter={plantPaymentsFilter}
          onChange={setPlantPaymentsFilter}
          onClose={closePanel}
        />
        <OutputCalendarIncomingPanel
          open={panel === "incoming"}
          filter={incomingFilter}
          onChange={setIncomingFilter}
          onClose={closePanel}
        />
      </div>
      <OutputCalendarCreateDialog
        target={createTarget}
        openOrders={page.openOrders}
        products={page.products}
        plantIds={page.plants.map((p) => p.id)}
        onClose={() => setCreateTarget(null)}
      />
    </OmsPageShell>
  );
};
