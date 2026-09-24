// english-ui:ignore-file
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createProductionOrderWithDraftOutput,
  createProductionOutput,
  loadOutputCalendarPage,
  ProductionForOrderOutputError,
} from "@/features/logistics/logistics-api";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import {
  applyLocalOutput,
  defaultOwnerFilter,
  plantFilterOptions,
  type OutputCalendarOutputLine,
  type OutputCalendarOwnerFilter,
  type OutputCalendarPage as OutputCalendarPageData,
} from "@/features/logistics/output-calendar";
import { OutputCalendarCreateDialog } from "@/features/logistics/ui/output-calendar-create-dialog";
import {
  OutputCalendarMatrix,
  type CreateDialogTarget,
} from "@/features/logistics/ui/output-calendar-matrix";
import {
  OutputCalendarOwnersPanel,
  OutputCalendarToolbar,
} from "@/features/logistics/ui/output-calendar-toolbar";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

export const OutputCalendarPage = () => {
  const [page, setPage] = useState<OutputCalendarPageData | null>(null);
  const [filter, setFilter] = useState<OutputCalendarOwnerFilter | null>(null);
  const [plantId, setPlantId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateDialogTarget | null>(null);

  const applyPage = useCallback((next: OutputCalendarPageData, preserveFilter: boolean) => {
    setPage(next);
    setPlantId((prev) =>
      prev != null && !plantFilterOptions(next.outputLines).includes(prev) ? null : prev,
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
    () => (page ? plantFilterOptions(page.outputLines) : []),
    [page],
  );

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const insertLocalLine = (line: OutputCalendarOutputLine) => {
    setPage((prev) => (prev ? applyLocalOutput(prev, line) : prev));
  };

  const handleCreate = async (args: {
    target: CreateDialogTarget;
    quantity: number;
    expectedEndOn: string;
    plantId: string;
  }) => {
    if (!page) return;
    const { target, quantity, expectedEndOn } = args;
    try {
      if (target.kind === "existing") {
        const outputId = await createProductionOutput({
          orderId: target.order.productionOrderId,
          expectedEndOn,
          complete: false,
          lines: [{ productId: target.product.id, quantity }],
        });
        insertLocalLine({
          outputId,
          outputNumber: "Новый выпуск",
          status: "draft",
          expectedEndOn,
          productionOrderId: target.order.productionOrderId,
          productionOrderNumber: target.order.number,
          plantId: target.order.plantId,
          productId: target.product.id,
          ownerId: page.freeOwnerId,
          quantity,
          isNew: true,
        });
        toast.success("Выпуск создан");
      } else {
        const created = await createProductionOrderWithDraftOutput({
          plantId: args.plantId,
          productId: target.product.id,
          quantity,
          expectedEndOn,
        });
        insertLocalLine({
          outputId: created.outputId,
          outputNumber: "Новый выпуск",
          status: "draft",
          expectedEndOn,
          productionOrderId: created.productionOrderId,
          productionOrderNumber: created.sequenceNumber
            ? formatLogisticsCode("productionOrder", created.sequenceNumber)
            : "Новый заказ",
          plantId: args.plantId,
          productId: target.product.id,
          ownerId: page.freeOwnerId,
          quantity,
          isNew: true,
        });
        toast.success("Заказ и черновик выпуска созданы");
      }
    } catch (caught) {
      if (caught instanceof ProductionForOrderOutputError) {
        const poLabel = caught.sequenceNumber
          ? formatLogisticsCode("productionOrder", caught.sequenceNumber)
          : formatLogisticsCode("productionOrder", caught.productionOrderId);
        toast.error("Выпуск не создан", {
          description: `Создан ${poLabel}. ${translateLogisticsError(caught.message)}`,
        });
        return;
      }
      const raw = caught instanceof Error ? caught.message : "Не удалось создать";
      toast.error("Не удалось создать", { description: translateLogisticsError(raw) });
      throw caught;
    }
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

  return (
    <LogisticsPageShell crumbs={[{ label: "Календарь выпусков" }]}>
      <div className="flex w-full items-stretch gap-0">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <OutputCalendarToolbar
            page={page}
            filter={filter}
            plantId={plantId}
            plantOptions={plantOptions}
            panelOpen={panelOpen}
            onTogglePanel={() => setPanelOpen((v) => !v)}
            onPlantChange={setPlantId}
            onRefresh={() => void load({ soft: true })}
            refreshing={refreshing}
          />
          <OutputCalendarMatrix
            page={page}
            filter={filter}
            plantId={plantId}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            onCreate={setCreateTarget}
          />
        </div>
        <OutputCalendarOwnersPanel
          open={panelOpen}
          page={page}
          filter={filter}
          orderSearch={orderSearch}
          onOrderSearchChange={setOrderSearch}
          onChange={setFilter}
          onClose={() => setPanelOpen(false)}
          onSelectAll={() => setFilter(defaultOwnerFilter(page))}
          onReset={() =>
            setFilter({
              free: false,
              regionIds: [],
              withRegionOrders: true,
              orderIds: [],
            })
          }
        />
      </div>
      <OutputCalendarCreateDialog
        target={createTarget}
        plantIds={page.plants.map((p) => p.id)}
        onClose={() => setCreateTarget(null)}
        onSubmit={handleCreate}
      />
    </LogisticsPageShell>
  );
};
