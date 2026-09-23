// english-ui:ignore-file
"use client";

import { Factory } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ALL_VALUE } from "@/components/store/pim/products/catalog/catalog-helpers";
import { CatalogQuickSelectControl } from "@/components/store/pim/products/catalog/catalog-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { remainingToReserveInProductionOutputsForLine } from "@/features/logistics/logistics-availability";
import { assertEnoughStock, assertProductionOutputLines } from "@/features/logistics/logistics-rules";
import {
  addProductionLine,
  closeProductionOrder,
  createProductionOrder,
  createProductionOutput,
  loadProductionOrderList,
  setProductionStatus,
  updateExpectedEnd,
} from "@/features/logistics/logistics-api";
import {
  formatExpectedEnd,
  formatMetaTimestamp,
  PRODUCTION_STATUS_LABELS,
} from "@/features/logistics/logistics-labels";
import {
  plantIdsForProducts,
  plantSelectItems,
  productIdentityLabel,
  productsForPlant,
} from "@/features/logistics/logistics-lookups";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { PlantLink } from "@/features/logistics/ui/plant-link";
import {
  productionOrderColumns,
  productionOrderGroupDefs,
  productionOrderSortDefs,
} from "@/features/logistics/ui/list/document-list-configs";
import { LogisticsListPageContent } from "@/features/logistics/ui/list/logistics-list-page-content";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { deadlineFilterMatch, matchesProductSearch } from "@/features/logistics/ui/list/list-helpers";
import { matchDocumentParam, PRODUCTION_STATUSES, type ProductionStatus, type StockTransaction } from "@/features/logistics/logistics-types";
import {
  buildProductionOutputDrafts,
  ProductionOutputLinesFields,
  type ProductionOutputDraftLine,
} from "@/features/logistics/ui/production-output-lines-fields";
import { isAllowedQuantity } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { runLogisticsAction, translateLogisticsError } from "@/features/logistics/ui/run-action";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { ProductionStatusBadge, StatusPill } from "@/features/logistics/ui/status-badge";
import { ProductionOrderCloseDialog } from "@/features/logistics/ui/production-order-close-dialog";
import { ProductionOrderMovements } from "@/features/logistics/ui/production-order-movements";
import { ProductionOrderOutputs } from "@/features/logistics/ui/production-order-outputs";
import { ProductionOrderProductManifest } from "@/features/logistics/ui/production-order-product-manifest";
import { OutputReleaseDialog, type OutputReleaseTarget } from "@/features/logistics/ui/output-release-dialog";
import { OutputReserveDialog, type OutputReserveTarget } from "@/features/logistics/ui/output-reserve-dialog";
import { buildDocumentTimeline, documentCompletedAt } from "@/features/logistics/document-timeline";
import { DocumentHeader } from "@/features/logistics/ui/document/document-header";
import { DocumentHistory } from "@/features/logistics/ui/document/document-history";
import { DocumentMetaDateInput, DocumentMetaEmpty, overdueDays } from "@/features/logistics/ui/document/document-meta-field";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { DocumentTabs } from "@/features/logistics/ui/document/document-tabs";
import { DocumentCancelControl } from "@/features/logistics/ui/document-cancel-guidance";
import { projectDocumentCancelGuidance } from "@/features/logistics/logistics-cancel-guidance";
import { useLogisticsList, useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { documentLedgerRows } from "@/features/logistics/ui/document-ledger";

const LIST_STATUSES = PRODUCTION_STATUSES.filter((status) => status !== "cancelled");

const PRODUCTION_TOGGLE = [
  { value: "all", label: "Все" },
  ...LIST_STATUSES.map((status) => ({
    value: status,
    label: PRODUCTION_STATUS_LABELS[status] ?? status,
  })),
];

export const ProductionOrdersPage = () => {
  const { rows: listRows, isLoading, error, reload } = useLogisticsList(loadProductionOrderList);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [plantFilter, setPlantFilter] = useState(ALL_VALUE);
  const [productFilter, setProductFilter] = useState(ALL_VALUE);
  const [deadlineFilter, setDeadlineFilter] = useState<"all" | "overdue" | "week" | "none">("all");
  const [open, setOpen] = useState(false);
  const [plantId, setPlantId] = useState("");
  const [lines, setLines] = useState<Array<{ productId: string; quantity: string }>>([
    { productId: "", quantity: "1" },
  ]);
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const formStore = useLogisticsStore({ kind: "form", form: "production_order", enabled: open });
  const snapshot = formStore.snapshot;

  const plantOptions = useMemo(() => {
    const ids = [...new Set(listRows.map((row) => row.plantId).filter(Boolean))];
    return ids
      .sort((left, right) => Number(left) - Number(right))
      .map((id) => ({ value: id, label: formatLogisticsCode("plant", id) }));
  }, [listRows]);

  const productOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const row of listRows) {
      for (const line of row.products) {
        if (line.productId) ids.add(line.productId);
      }
    }
    return [...ids].map((id) => {
      const line = listRows.flatMap((row) => row.products).find((item) => item.productId === id);
      return { value: id, label: line?.productName ?? id };
    });
  }, [listRows]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    plantFilter !== ALL_VALUE ||
    productFilter !== ALL_VALUE ||
    deadlineFilter !== "all";

  const rows = useMemo(
    () =>
      listRows.filter((item) => {
        if (status !== "all" && item.status !== status) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (!item.number.toLowerCase().includes(q) && !matchesProductSearch(item.products, q)) return false;
        }
        if (plantFilter !== ALL_VALUE && item.plantId !== plantFilter) return false;
        if (productFilter !== ALL_VALUE && !item.products.some((line) => line.productId === productFilter)) return false;
        if (
          !deadlineFilterMatch(
            item.expectedEndOn,
            deadlineFilter,
            item.status !== "done" && item.status !== "closed" && item.status !== "cancelled",
          )
        ) {
          return false;
        }
        return true;
      }),
    [deadlineFilter, listRows, plantFilter, productFilter, search, status],
  );
  const selectedProductIds = lines.map((line) => line.productId);
  const allowedPlantIds = plantIdsForProducts(
    snapshot,
    selectedProductIds.filter(Boolean),
  );
  const resolvedPlantId =
    plantId && allowedPlantIds && !allowedPlantIds.includes(plantId)
      ? ""
      : plantId;
  const plantItems = plantSelectItems(snapshot, selectedProductIds);
  const productSource = resolvedPlantId
    ? productsForPlant(snapshot, resolvedPlantId)
    : snapshot.products;
  const productItems = productSource.map((product) => ({
    value: product.id,
    label: productIdentityLabel(product, product.id),
  }));

  const create = async () => {
    const validLines = lines.filter((line) => line.productId && Number(line.quantity) > 0);
    if (!resolvedPlantId || validLines.length === 0) {
      toast.error("Выберите производителя и хотя бы один товар");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createProductionOrder({
          plantId: resolvedPlantId,
          expectedEndOn: expectedEndOn || null,
          lines: validLines.map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity),
          })),
        }),
      "Заказ на производство создан",
      reload,
    );
    if (ok) {
      setOpen(false);
      setPlantId("");
      setExpectedEndOn("");
      setLines([{ productId: "", quantity: "1" }]);
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Заказы на производство" }]}>
      <LogisticsListPageContent
        listId="production-orders"
        title="Заказы на производство"
        actionLabel="Новый заказ на производство"
        onAction={() => setOpen(true)}
        columns={productionOrderColumns}
        sortDefs={productionOrderSortDefs}
        groupDefs={productionOrderGroupDefs()}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        toggleOptions={PRODUCTION_TOGGLE}
        toggleValue={status}
        onToggleChange={setStatus}
        toggleAriaLabel="Статус заказа на производство"
        search={{ value: search, onChange: setSearch }}
        quickControls={
          <CatalogQuickSelectControl
            value={plantFilter}
            onValueChange={(value) => setPlantFilter(value ?? ALL_VALUE)}
            ariaLabel="Быстрый фильтр по заводу"
            placeholder="Завод"
            allLabel="Все заводы"
            options={plantOptions}
            widthClassName="w-[120px] shrink-0 lg:w-[160px]"
          />
        }
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearch("");
          setPlantFilter(ALL_VALUE);
          setProductFilter(ALL_VALUE);
          setDeadlineFilter("all");
        }}
        filterSheet={
          <>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Товар</span>
              <CatalogQuickSelectControl
                value={productFilter}
                onValueChange={(value) => setProductFilter(value ?? ALL_VALUE)}
                ariaLabel="Фильтр по товару"
                placeholder="Все товары"
                allLabel="Все товары"
                options={productOptions}
                widthClassName="w-full"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Срок</span>
              <CatalogQuickSelectControl
                value={deadlineFilter}
                onValueChange={(value) => setDeadlineFilter((value ?? "all") as typeof deadlineFilter)}
                ariaLabel="Фильтр по сроку"
                placeholder="Любой срок"
                allLabel="Любой срок"
                options={[
                  { value: "overdue", label: "Просрочен" },
                  { value: "week", label: "Ближайшие 7 дней" },
                  { value: "none", label: "Без срока" },
                ]}
                widthClassName="w-full"
              />
            </label>
          </>
        }
      />

      <LogisticsDialog
        open={open}
        onOpenChange={setOpen}
        title="Новый заказ на производство"
      >
        {formStore.isLoading ? <LogisticsLoading /> : null}
        {formStore.error ? <LogisticsError message={formStore.error} /> : null}
        {!formStore.isLoading && !formStore.error ? (
        <div className="flex flex-col gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Завод</span>
            <Select
              items={plantItems}
              value={resolvedPlantId}
              onValueChange={(value) => setPlantId(value ?? "")}
            >
              <SelectTrigger className="w-full bg-background" aria-label="Завод">
                <SelectValue placeholder={plantItems.length === 0 ? "Нет общего завода" : "Выберите производителя"} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {plantItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {selectedProductIds.some(Boolean) && allowedPlantIds ? (
              <p className="text-xs text-muted-foreground">
                Только заводы, где производятся выбранные товары.
              </p>
            ) : null}
            {selectedProductIds.some(Boolean) && plantItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Выбранные товары не производятся на одном заводе.
              </p>
            ) : null}
          </label>
          <ExpectedEndField value={expectedEndOn} onChange={setExpectedEndOn} />
          {lines.map((line, index) => (
            <div key={`line-${index}`} className="grid grid-cols-[1fr_6rem] gap-2">
              <Select
                items={productItems}
                value={line.productId}
                onValueChange={(value) => {
                  setLines((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, productId: value ?? "" } : item,
                    ),
                  );
                }}
              >
                <SelectTrigger className="w-full bg-background" aria-label={`Товар ${index + 1}`}>
                  <SelectValue placeholder="Товар" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {productSource.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {productIdentityLabel(product, product.id)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) => {
                  const value = event.target.value;
                  setLines((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, quantity: value } : item,
                    ),
                  );
                }}
                aria-label={`Количество ${index + 1}`}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((current) => [...current, { productId: "", quantity: "1" }])}
          >
            Добавить товар
          </Button>
          <Button type="button" disabled={!resolvedPlantId || plantItems.length === 0} onClick={() => void create()}>
            Создать
          </Button>
        </div>
        ) : null}
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const ProductionOrderDetailPage = () => {
  const params = useParams<{ orderId: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore({
    kind: "document",
    documentKind: "production_order",
    ref: String(params.orderId ?? ""),
  });
  const statusRef = useRef<HTMLDivElement>(null);
  const closeAnnounceRef = useRef<HTMLParagraphElement>(null);
  const outputLockRef = useRef(false);

  const [productOpen, setProductOpen] = useState(false);
  const [productPending, setProductPending] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [newProductId, setNewProductId] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");

  const [outputReserveTarget, setOutputReserveTarget] = useState<OutputReserveTarget | null>(null);
  const [outputReleaseTarget, setOutputReleaseTarget] = useState<OutputReleaseTarget | null>(null);

  const [outputOpen, setOutputOpen] = useState(false);
  const [outputPending, setOutputPending] = useState(false);
  const [outputError, setOutputError] = useState<string | null>(null);
  const [outputDrafts, setOutputDrafts] = useState<ProductionOutputDraftLine[]>([]);
  const [outputExpectedEndOn, setOutputExpectedEndOn] = useState("");

  const [closeOpen, setCloseOpen] = useState(false);
  const [closePending, setClosePending] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const [statusPending, setStatusPending] = useState(false);
  const [datePending, setDatePending] = useState(false);

  const order = matchDocumentParam(snapshot.productionOrders, params.orderId);
  const lines = useMemo(
    () => (order ? snapshot.productionOrderLines.filter((line) => line.orderId === order.id) : []),
    [order, snapshot.productionOrderLines],
  );
  const outputs = useMemo(
    () => (order ? snapshot.outputs.filter((item) => item.productionOrderId === order.id) : []),
    [order, snapshot.outputs],
  );
  const doneByLine = useMemo(() => {
    const byProduct = new Map<string, number>();
    for (const outputLine of snapshot.outputLines) {
      const output = snapshot.outputs.find((item) => item.id === outputLine.outputId);
      if (!order || output?.status !== "done" || output.productionOrderId !== order.id) {
        continue;
      }
      byProduct.set(outputLine.productId, (byProduct.get(outputLine.productId) ?? 0) + outputLine.quantity);
    }
    const counts = new Map<string, number>();
    for (const line of lines) {
      counts.set(line.id, byProduct.get(line.productId) ?? 0);
    }
    return counts;
  }, [lines, order, snapshot.outputLines, snapshot.outputs]);

  const outputIdsKey = outputs.map((item) => item.id).join("|");
  const movementFilter = useMemo(
    () =>
      (entry: StockTransaction) => {
        const outputIds = new Set(outputIdsKey ? outputIdsKey.split("|") : []);
        return (
          (entry.documentType === "production_order" && entry.documentId === params.orderId) ||
          (entry.documentType === "output" && outputIds.has(entry.documentId)) ||
          (entry.locationType === "production_order" && entry.locationId === params.orderId)
        );
      },
    [outputIdsKey, params.orderId],
  );
  const movementCount = useMemo(
    () => documentLedgerRows(snapshot.transactions, movementFilter).length,
    [movementFilter, snapshot.transactions],
  );

  const outputEligibleLines = lines.filter((line) => line.quantity - (doneByLine.get(line.id) ?? 0) > 0);
  const remainingForOutput = (lineId: string) => {
    const line = lines.find((item) => item.id === lineId);
    return line ? line.quantity - (doneByLine.get(line.id) ?? 0) : 0;
  };
  const selectedOutputDrafts = outputDrafts.filter((draft) => Number(draft.quantity) > 0);
  const canSubmitOutput =
    selectedOutputDrafts.length > 0 &&
    selectedOutputDrafts.every((draft) =>
      isAllowedQuantity(draft.quantity, remainingForOutput(draft.productionLineId)),
    );

  const plantProducts = order
    ? productsForPlant(snapshot, order.plantId ?? "")
    : [];
  const canMutate = Boolean(order && order.status !== "closed" && order.status !== "cancelled");
  const cancelGuidance = order
    ? projectDocumentCancelGuidance({ type: "production_order", id: order.id }, snapshot, balances)
    : null;
  const historyEntries = order
    ? buildDocumentTimeline(snapshot, {
        documentId: order.id,
        createdAt: order.createdAt,
        createdBy: order.createdBy,
        statusLabels: PRODUCTION_STATUS_LABELS,
      })
    : [];
  const completedAt = order ? documentCompletedAt(snapshot, order.id) : null;
  const workflowStatuses = (["draft", "planned", "in_progress", "done"] as const) satisfies readonly ProductionStatus[];

  const createOutputFromProduction = async (complete: boolean) => {
    if (!order || !canSubmitOutput) {
      setOutputError("Выберите товар и количество");
      return;
    }
    try {
      assertProductionOutputLines(
        selectedOutputDrafts.map((draft) => {
          const line = lines.find((item) => item.id === draft.productionLineId)!;
          return {
            productId: draft.productId,
            quantity: Number(draft.quantity),
            planQuantity: line.quantity,
            alreadyOutput: doneByLine.get(line.id) ?? 0,
            allocationQuantity: draft.allocOrderLineId !== "none" ? Number(draft.allocQty) || 0 : 0,
          };
        }),
      );
      for (const draft of selectedOutputDrafts) {
        if (draft.allocOrderLineId === "none" || !(Number(draft.allocQty) > 0)) {
          continue;
        }
        const allocLine = snapshot.customerOrderLines.find((line) => line.id === draft.allocOrderLineId);
        if (!allocLine) {
          continue;
        }
        const allocMax = Math.min(
          Number(draft.quantity),
          remainingToReserveInProductionOutputsForLine(allocLine, balances, snapshot),
        );
        assertEnoughStock(allocMax, Number(draft.allocQty), "open order");
      }
    } catch (caught) {
      setOutputError(caught instanceof Error ? caught.message : "Проверьте количество");
      return;
    }
    if (outputLockRef.current) {
      return;
    }
    outputLockRef.current = true;
    setOutputPending(true);
    setOutputError(null);
    try {
      await createProductionOutput({
        orderId: order.id,
        expectedEndOn: outputExpectedEndOn || null,
        complete,
        lines: selectedOutputDrafts.map((draft) => {
          const allocLine = snapshot.customerOrderLines.find((line) => line.id === draft.allocOrderLineId);
          return {
            productId: draft.productId,
            quantity: Number(draft.quantity),
            allocation:
              allocLine && Number(draft.allocQty) > 0
                ? {
                    ownerType: "order" as const,
                    ownerId: allocLine.orderId,
                    quantity: Number(draft.allocQty),
                  }
                : undefined,
          };
        }),
      });
      setOutputOpen(false);
      setOutputDrafts([]);
      setOutputExpectedEndOn("");
      toast.success(complete ? "Выпуск завершён" : "Выпуск запланирован");
      try {
        await reload();
      } catch (reloadError) {
        toast.error(
          translateLogisticsError(
            reloadError instanceof Error ? reloadError.message : "Выпуск создан, но список не обновился",
          ),
        );
      }
    } catch (caught) {
      const detail =
        caught instanceof Error ? translateLogisticsError(caught.message) : null;
      setOutputError(
        detail && detail !== "Выпуск не создан. Ничего не сохранено. Можно повторить."
          ? `Выпуск не создан. Ничего не сохранено. Можно повторить. ${detail}`
          : "Выпуск не создан. Ничего не сохранено. Можно повторить.",
      );
    } finally {
      outputLockRef.current = false;
      setOutputPending(false);
    }
  };

  if (isLoading || error || !order) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Заказы на производство", href: "/store/logistics/production-orders" }, { label: "Заказ на производство" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Заказ на производство не найден."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={[{ label: "Заказы на производство", href: "/store/logistics/production-orders" }, { label: order.number }]}>
      <p ref={closeAnnounceRef} role="status" aria-live="polite" className="sr-only" />
      <div className="flex flex-col gap-4">
        <DocumentHeader
          kind="Заказ на производство"
          icon={Factory}
          number={order.number}
          status={<ProductionStatusBadge status={order.status} />}
          actions={
            <>
              {cancelGuidance ? (
                <DocumentCancelControl
                  guidance={cancelGuidance}
                  reload={reload}
                  onFollowUp={(action) => {
                    if (action.id === "close-production-order") {
                      setCloseOpen(true);
                    }
                  }}
                />
              ) : null}
              {canMutate ? (
                <Button
                  type="button"
                  disabled={statusPending || datePending}
                  onClick={() => {
                    setCloseError(null);
                    setCloseOpen(true);
                  }}
                >
                  Закрыть заказ
                </Button>
              ) : null}
            </>
          }
          meta={[
            {
              label: "Завод",
              value: (
                <PlantLink
                  snapshot={snapshot}
                  plantId={order.plantId ?? ""}
                />
              ),
            },
            {
              label: "Статус",
              value: (
                <div ref={statusRef} tabIndex={canMutate ? undefined : -1} aria-busy={statusPending || undefined}>
                  {canMutate ? (
                    <Select
                      items={workflowStatuses.map((status) => ({
                        value: status,
                        label: PRODUCTION_STATUS_LABELS[status] ?? status,
                      }))}
                      value={order.status}
                      disabled={statusPending}
                      onValueChange={(value) => {
                        if (!value || statusPending) {
                          return;
                        }
                        setStatusPending(true);
                        void runLogisticsAction(
                          () => setProductionStatus(order.id, value as ProductionStatus),
                          "Статус сохранён",
                          reload,
                        ).finally(() => setStatusPending(false));
                      }}
                    >
                      <SelectTrigger
                        className="-ml-2 h-8 w-auto gap-1.5 border-transparent bg-transparent px-2 shadow-none hover:border-border hover:bg-muted/50 data-[size=default]:h-8"
                        aria-label="Статус"
                      >
                        <ProductionStatusBadge status={order.status} />
                        <SelectValue className="sr-only" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {workflowStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {PRODUCTION_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    <ProductionStatusBadge status={order.status} />
                  )}
                </div>
              ),
            },
            {
              label: "Ожидаемое окончание",
              value: (
                <DocumentMetaDateInput
                  value={order.expectedEndOn ?? ""}
                  aria-label="Ожидаемое окончание"
                  disabled={datePending}
                  overdueDays={canMutate ? overdueDays(order.expectedEndOn) : 0}
                  onChange={(value) => {
                    setDatePending(true);
                    void runLogisticsAction(
                      () => updateExpectedEnd(order.id, value || null),
                      "Ожидаемое окончание сохранено",
                      reload,
                    ).finally(() => setDatePending(false));
                  }}
                />
              ),
            },
            { label: "Создан", value: formatMetaTimestamp(order.createdAt) },
            {
              label: "Завершён",
              value: completedAt ? formatMetaTimestamp(completedAt) : <DocumentMetaEmpty />,
            },
          ]}
        />

        <DocumentTabs
          tabs={[
            {
              id: "products",
              label: "Товары",
              count: lines.length,
              panel: (
                <DocumentSection
                  title="Товары"
                  tools={
                    canMutate ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setProductError(null);
                          setProductOpen(true);
                        }}
                      >
                        Добавить товар
                      </Button>
                    ) : null
                  }
                >
                  <ProductionOrderProductManifest
                    snapshot={snapshot}
                    lines={lines}
                    canMutate={canMutate}
                    onReleaseReservation={setOutputReleaseTarget}
                    bare
                    onReserve={(lineId) => {
                      const line = lines.find((item) => item.id === lineId);
                      if (line) {
                        setOutputReserveTarget({ productionOrderId: order.id, productId: line.productId });
                      }
                    }}
                    onReserveInOutput={(outputId, productId) =>
                      setOutputReserveTarget({ productionOrderId: order.id, productId, outputId })
                    }
                  />
                </DocumentSection>
              ),
            },
            {
              id: "outputs",
              label: "Выпуски",
              count: outputs.length,
              panel: (
                <DocumentSection
                  title="Выпуски"
                  tools={
                    canMutate ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setOutputError(null);
                          setOutputDrafts(
                            buildProductionOutputDrafts(outputEligibleLines, (lineId) => remainingForOutput(lineId)),
                          );
                          setOutputExpectedEndOn("");
                          setOutputOpen(true);
                        }}
                      >
                        Новый выпуск
                      </Button>
                    ) : null
                  }
                >
                  <ProductionOrderOutputs snapshot={snapshot} outputs={outputs} canMutate={false} bare />
                </DocumentSection>
              ),
            },
            {
              id: "movements",
              label: "Движения",
              count: movementCount,
              panel: (
                <DocumentSection title="Движения">
                  <ProductionOrderMovements snapshot={snapshot} filter={movementFilter} bare />
                </DocumentSection>
              ),
            },
            {
              id: "history",
              label: "История",
              count: historyEntries.length,
              panel: (
                <DocumentHistory
                  entries={historyEntries}
                  renderStatus={(statusKey) => (
                    <StatusPill
                      status={statusKey}
                      label={PRODUCTION_STATUS_LABELS[statusKey as ProductionStatus]}
                    />
                  )}
                />
              ),
            },
          ]}
        />
      </div>

      <LogisticsDialog
        open={productOpen}
        onOpenChange={(next) => {
          if (productPending) {
            return;
          }
          setProductOpen(next);
          if (!next) {
            setProductError(null);
          }
        }}
        title="Добавить товар"
      >
        <div className="flex flex-col gap-3">
          {plantProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Для этого производителя нет доступных товаров.</p>
          ) : (
            <label className="space-y-1 text-sm">
              <span className="font-medium">Товар</span>
              <Select
                items={plantProducts.map((item) => ({
                  value: item.id,
                  label: productIdentityLabel(item, item.id),
                }))}
                value={newProductId}
                disabled={productPending}
                onValueChange={(value) => setNewProductId(value ?? "")}
              >
                <SelectTrigger className="w-full bg-background" aria-label="Новый товар">
                  <SelectValue placeholder="Выберите товар" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {plantProducts.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {productIdentityLabel(item, item.id)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
          )}
          <label className="space-y-1 text-sm">
            <span className="font-medium">Количество</span>
            <Input
              type="number"
              min={1}
              value={newQuantity}
              disabled={productPending || plantProducts.length === 0}
              aria-invalid={productError ? true : undefined}
              onChange={(event) => setNewQuantity(event.target.value)}
              aria-label="Количество нового товара"
            />
          </label>
          {productError ? (
            <p role="alert" className="text-sm text-destructive">
              {productError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={productPending}
              onClick={() => setProductOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={productPending || plantProducts.length === 0}
              onClick={() => {
                if (!newProductId || !(Number(newQuantity) > 0)) {
                  setProductError("Выберите товар и количество");
                  return;
                }
                setProductPending(true);
                setProductError(null);
                void (async () => {
                  try {
                    await addProductionLine({
                      orderId: order.id,
                      productId: newProductId,
                      quantity: Number(newQuantity),
                    });
                    await reload();
                    setProductOpen(false);
                    setNewProductId("");
                    setNewQuantity("1");
                    toast.success("Товар добавлен в заказ на производство");
                  } catch (caught) {
                    setProductError(
                      translateLogisticsError(caught instanceof Error ? caught.message : "Не удалось добавить товар"),
                    );
                  } finally {
                    setProductPending(false);
                  }
                })();
              }}
            >
              Добавить
            </Button>
          </div>
        </div>
      </LogisticsDialog>

      <OutputReleaseDialog
        snapshot={snapshot}
        target={outputReleaseTarget}
        onClose={() => setOutputReleaseTarget(null)}
        reload={reload}
      />

      <OutputReserveDialog
        target={outputReserveTarget}
        onClose={() => setOutputReserveTarget(null)}
        reload={reload}
      />

      <LogisticsDialog
        open={outputOpen}
        onOpenChange={(next) => {
          if (outputPending) {
            return;
          }
          setOutputOpen(next);
          if (!next) {
            setOutputError(null);
          }
        }}
        title="Новый выпуск"
      >
        <div className="flex flex-col gap-3" aria-busy={outputPending || undefined}>
          <ProductionOutputLinesFields
            snapshot={snapshot}
            balances={balances}
            drafts={outputDrafts}
            remainingByLineId={remainingForOutput}
            disabled={outputPending || outputEligibleLines.length === 0}
            onChange={setOutputDrafts}
          />
          <ExpectedEndField
            value={outputExpectedEndOn}
            disabled={outputPending || outputEligibleLines.length === 0}
            onChange={(value) => {
              setOutputExpectedEndOn(value);
            }}
          />
          {outputPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Создаём выпуск…
            </p>
          ) : null}
          {outputError ? (
            <p role="alert" className="text-sm text-destructive">
              {outputError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={outputPending}
              onClick={() => setOutputOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={outputPending || !canSubmitOutput}
              onClick={() => {
                void createOutputFromProduction(false);
              }}
            >
              Сохранить план
            </Button>
            <Button
              type="button"
              disabled={outputPending || !canSubmitOutput}
              onClick={() => {
                void createOutputFromProduction(true);
              }}
            >
              Завершить выпуск
            </Button>
          </div>
        </div>
      </LogisticsDialog>

      <ProductionOrderCloseDialog
        open={closeOpen}
        pending={closePending}
        error={closeError}
        onOpenChange={(next) => {
          if (closePending) {
            return;
          }
          setCloseOpen(next);
          if (!next) {
            setCloseError(null);
          }
        }}
        onConfirm={() => {
          if (order.status === "closed" || order.status === "cancelled") {
            setCloseError("Документ уже закрыт или отменён.");
            return;
          }
          setClosePending(true);
          setCloseError(null);
          void (async () => {
            try {
              await closeProductionOrder(order.id);
              setCloseOpen(false);
              queueMicrotask(() => {
                statusRef.current?.focus();
                if (closeAnnounceRef.current) {
                  closeAnnounceRef.current.textContent =
                    "Потребность снята. Складской остаток не списан. Завершённые выпуски и связанные документы не отменены.";
                }
              });
              try {
                await reload();
              } catch (reloadError) {
                toast.error("Заказ закрыт, но страница не обновилась", {
                  description: translateLogisticsError(
                    reloadError instanceof Error ? reloadError.message : "Попробуйте обновить страницу",
                  ),
                });
              }
            } catch (caught) {
              setCloseError(
                translateLogisticsError(caught instanceof Error ? caught.message : "Не удалось закрыть заказ"),
              );
            } finally {
              setClosePending(false);
            }
          })();
        }}
      />
    </LogisticsPageShell>
  );
};
