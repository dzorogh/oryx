// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  completeOutput,
  createProductionOutput,
  updateExpectedEnd,
} from "@/features/logistics/logistics-api";
import {
  projectDocumentCancelGuidance,
  type CancelGuidance,
  type CancelGuidanceAction,
} from "@/features/logistics/logistics-cancel-guidance";
import { DocumentCancelControl } from "@/features/logistics/ui/document-cancel-guidance";
import {
  hrefForCustomerOrder,
  hrefForDocument,
  hrefForOwner,
  hrefForWarehouse,
  producedForProductionProduct,
  remainingToOutputForLine,
  remainingToReserveForLine,
  remainingToReturnForOrderProduct,
  remainingToShipForLine,
} from "@/features/logistics/logistics-availability";
import { AdjustmentForm, ReservationForm, ShipmentForm } from "@/features/logistics/logistics-forms";
import {
  ADJUSTMENT_OPERATION_LABELS,
  FREE_OWNER_LABEL,
  OWNER_TYPE_LABELS,
  formatExpectedEnd,
  formatQuantity,
  formatSignedQuantity,
  formatMetaTimestamp,
  OUTPUT_STATUS_LABELS,
  signedQuantityClassName,
} from "@/features/logistics/logistics-labels";
import { adjustmentSignedQuantity } from "@/features/logistics/logistics-adjustments";
import {
  documentLabel,
  ownerLabel,
  productById,
  productionOrderById,
  warehouseById,
  warehouseCode,
} from "@/features/logistics/logistics-lookups";
import { DocumentProductLines } from "@/features/logistics/ui/document-product-lines";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import { relatedOrderItem } from "@/features/logistics/logistics-related";
import {
  assertEnoughStock,
  assertProductionOutputLines,
} from "@/features/logistics/logistics-rules";
import {
  buildProductionOutputDrafts,
  ProductionOutputLinesFields,
  type ProductionOutputDraftLine,
} from "@/features/logistics/ui/production-output-lines-fields";
import {
  OUTPUT_STATUSES,
  shipmentDirection,
  shipmentWarehouseId,
  type DocumentStatus,
  type DocumentType,
  type OutputStatus,
  matchDocumentParam,
  type ShipmentDirection,
  isFreeOwner,
} from "@/features/logistics/logistics-types";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { isAllowedQuantity } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { buildDocumentTimeline, documentCompletedAt } from "@/features/logistics/document-timeline";
import { DocumentHeader } from "@/features/logistics/ui/document/document-header";
import { DocumentHistory } from "@/features/logistics/ui/document/document-history";
import { DocumentMetaDateInput, DocumentMetaEmpty, overdueDays } from "@/features/logistics/ui/document/document-meta-field";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { DocumentTabs } from "@/features/logistics/ui/document/document-tabs";
import { StatusPill } from "@/features/logistics/ui/status-badge";
import type { LucideIcon } from "lucide-react";
import { PackageCheck, SlidersHorizontal, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { DocumentStatusBadge, OutputStatusBadge, ShipmentDirectionBadge } from "@/features/logistics/ui/status-badge";
import {
  loadAdjustmentList,
  loadOutputList,
  loadShipmentList,
} from "@/features/logistics/logistics-api";
import { useLogisticsList, useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { CustomerOrderStatusBadge } from "@/features/logistics/ui/status-badge";
import { ProductionStatusBadge } from "@/features/logistics/ui/status-badge";

const STATUS_FILTERS: Array<{ id: "all" | DocumentStatus; label: string }> = [
  { id: "all", label: "Все" },
  { id: "draft", label: "Черновик" },
  { id: "posted", label: "Проведён" },
  { id: "cancelled", label: "Отменён" },
];

const StatusTabs = ({
  value,
  onChange,
  label,
}: {
  value: (typeof STATUS_FILTERS)[number]["id"];
  onChange: (value: (typeof STATUS_FILTERS)[number]["id"]) => void;
  label: string;
}) => (
  <div className="flex flex-wrap gap-2" role="tablist" aria-label={label}>
    {STATUS_FILTERS.map((item) => (
      <HomeFilterChip
        key={item.id}
        active={value === item.id}
        role="tab"
        aria-selected={value === item.id}
        onClick={() => onChange(item.id)}
      >
        {item.label}
      </HomeFilterChip>
    ))}
  </div>
);

const DIRECTION_FILTERS: Array<{ id: "all" | ShipmentDirection; label: string }> = [
  { id: "all", label: "Все" },
  { id: "shipment", label: "Отгрузки" },
  { id: "return", label: "Возвраты" },
];

export const ShipmentsPage = () => {
  const { rows: listRows, isLoading, error, reload } = useLogisticsList(loadShipmentList);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const directionParam = searchParams.get("direction");
  const parsedDirection: "all" | ShipmentDirection =
    directionParam === "shipment" || directionParam === "return" ? directionParam : "all";
  const [direction, setDirection] = useState<"all" | ShipmentDirection>(parsedDirection);
  const [open, setOpen] = useState(false);
  const formStore = useLogisticsStore({ kind: "form", form: "shipment", enabled: open });

  useEffect(() => {
    setDirection(parsedDirection);
  }, [parsedDirection]);

  const setDirectionFilter = (next: "all" | ShipmentDirection) => {
    setDirection(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.delete("direction");
    } else {
      params.set("direction", next);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const rows = useMemo(
    () =>
      listRows.filter((item) => {
        if (direction === "all") {
          return true;
        }
        return item.direction === direction;
      }),
    [direction, listRows],
  );

  return (
    <LogisticsPageShell crumbs={[{ label: "Отгрузки и возвраты" }]}>
      <LogisticsToolbar title="Отгрузки и возвраты" actionLabel="Новый документ" onAction={() => setOpen(true)}>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Тип документа">
          {DIRECTION_FILTERS.map((item) => (
            <HomeFilterChip
              key={item.id}
              active={direction === item.id}
              role="tab"
              aria-selected={direction === item.id}
              onClick={() => setDirectionFilter(item.id)}
            >
              {item.label}
            </HomeFilterChip>
          ))}
        </div>
      </LogisticsToolbar>
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Номер", "Тип", "Заказ / склад", "Товары"]} isEmpty={rows.length === 0}>
          {rows.map((item) => {
            const warehouseId =
              item.fromLocationType === "warehouse"
                ? item.fromLocationId
                : item.toLocationType === "warehouse"
                  ? item.toLocationId
                  : "";
            return (
              <TableRow key={item.id}>
                <TableCell className="px-3 py-2 align-top">
                  <LogisticsCodeBadge code={item.number} href={`/store/logistics/shipments/${item.sequenceNumber}`} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <ShipmentDirectionBadge direction={item.direction} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {item.customerOrderId ? (
                      <LogisticsCodeBadge
                        code={item.customerOrderNumber || item.customerOrderId}
                        href={hrefForCustomerOrder(item.customerOrderId)}
                      />
                    ) : null}
                    {warehouseId ? <WarehouseLink warehouseId={warehouseId} /> : null}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <DocumentProductLines lines={item.products} />
                </TableCell>
              </TableRow>
            );
          })}
        </LogisticsTableCard>
      ) : null}
      <ShipmentForm
        snapshot={formStore.snapshot}
        balances={formStore.balances}
        loading={formStore.isLoading}
        loadError={formStore.error}
        open={open}
        onOpenChange={setOpen}
        reload={reload}
        mode="list"
      />
    </LogisticsPageShell>
  );
};

export const ShipmentDetailPage = () => {
  const params = useParams<{ id: string }>();
  const store = useLogisticsStore({
    kind: "document",
    documentKind: "shipment",
    ref: String(params.id ?? ""),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [formIntention, setFormIntention] = useState<ShipmentDirection>("return");
  const doc = matchDocumentParam(store.snapshot.shipments, params.id);
  const lines = doc
    ? store.snapshot.shipmentLines.filter((line) => line.shipmentId === doc.id)
    : [];
  const order = doc ? store.snapshot.customerOrders.find((item) => item.id === doc.customerOrderId) : null;
  const orderRelated = doc ? relatedOrderItem(store.snapshot, doc.customerOrderId) : null;
  const direction = doc ? shipmentDirection(doc.fromLocationType, doc.toLocationType) : null;
  const warehouseId = doc ? shipmentWarehouseId(doc) : "";
  const cancelGuidance = doc && direction
    ? projectDocumentCancelGuidance({ type: direction, id: doc.id }, store.snapshot, store.balances)
    : null;
  const historyEntries = doc
    ? buildDocumentTimeline(store.snapshot, {
        documentId: doc.id,
        mode: "posted",
        createdAt: doc.createdAt,
        createdBy: doc.createdBy,
        postedAt: doc.createdAt,
      })
    : [];
  const movementCount = doc
    ? store.snapshot.transactions.filter(
        (entry) =>
          (entry.documentType === "shipment" || entry.documentType === "return") &&
          entry.documentId === doc.id,
      ).length
    : 0;

  if (store.isLoading || store.error || !doc || !direction) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Отгрузки и возвраты", href: "/store/logistics/shipments" }, { label: "Документ" }]}>
        {store.isLoading ? <LogisticsLoading /> : <LogisticsError message={store.error ?? "Документ не найден."} />}
      </LogisticsPageShell>
    );
  }

  const kindLabel = direction === "shipment" ? "Отгрузка" : "Возврат";

  return (
    <>
      <LogisticsPageShell
        crumbs={[
          { label: "Отгрузки и возвраты", href: "/store/logistics/shipments" },
          { label: doc.number },
        ]}
      >
        <DocumentHeader
          kind={kindLabel}
          icon={Truck}
          number={doc.number}
          status={<DocumentStatusBadge status="posted" />}
          actions={
            <>
              {order && order.status === "open" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormIntention(direction === "shipment" ? "return" : "shipment");
                    setFormOpen(true);
                  }}
                >
                  {direction === "shipment" ? "Принять возврат" : "Отгрузить"}
                </Button>
              ) : null}
              {cancelGuidance ? (
                <DocumentCancelControl
                  guidance={cancelGuidance}
                  reload={store.reload}
                  onFollowUp={(action) => {
                    if (action.id === "open-return") {
                      setFormIntention("return");
                      setFormOpen(true);
                    }
                    if (action.id === "open-shipment") {
                      setFormIntention("shipment");
                      setFormOpen(true);
                    }
                  }}
                />
              ) : null}
            </>
          }
          meta={[
            {
              label: "Тип",
              value: <ShipmentDirectionBadge direction={direction} />,
            },
            {
              label: direction === "shipment" ? "Со склада" : "На склад",
              value: (
                <LogisticsCodeBadge
                  code={warehouseCode(store.snapshot, warehouseId)}
                  href={hrefForWarehouse(warehouseId)}
                />
              ),
            },
            {
              label: "Заказ клиента",
              value: orderRelated ? (
                <span className="inline-flex items-center gap-1.5">
                  <LogisticsCodeBadge
                    code={orderRelated.label}
                    href={orderRelated.href}
                  />
                  {order ? <CustomerOrderStatusBadge status={order.status} /> : null}
                </span>
              ) : (
                <DocumentMetaEmpty />
              ),
            },
            {
              label: "Проведён",
              value: formatMetaTimestamp(doc.createdAt),
            },
            {
              label: "Автор",
              value:
                store.snapshot.users.find((user) => user.id === doc.createdBy)?.name ?? "—",
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
                <DocumentSection title="Товары">
                  <LogisticsTableCard
                    embedded
                    headers={[
                      "Товар",
                      "Количество",
                      "Заказ клиента",
                      direction === "shipment" ? "Со склада" : "На склад",
                      direction === "shipment" ? "Ещё можно отгрузить" : "Ещё можно вернуть",
                    ]}
                    numericColumns={[1, 4]}
                    isEmpty={lines.length === 0}
                  >
                    {lines.map((line) => {
                      const product = productById(store.snapshot, line.productId);
                      const orderLine = store.snapshot.customerOrderLines.find(
                        (item) => item.orderId === doc.customerOrderId && item.productId === line.productId,
                      );
                      const remainingShip = orderLine
                        ? remainingToShipForLine(orderLine, store.balances, warehouseId)
                        : 0;
                      const remainingReturn = remainingToReturnForOrderProduct(
                        store.balances,
                        doc.customerOrderId,
                        line.productId,
                      );
                      const remaining = direction === "shipment" ? remainingShip : remainingReturn;
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="px-3 py-2">
                            <ProductIdentity snapshot={store.snapshot} productId={line.productId} />
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right text-sm font-medium tabular-nums">
                            {formatQuantity(line.quantity, line.productUnit || product?.unit)}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            {orderRelated ? (
                              <LogisticsCodeBadge
                                code={orderRelated.label}
                                href={orderRelated.href}
                              />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2">
                            <LogisticsCodeBadge
                              code={warehouseCode(store.snapshot, warehouseId)}
                              href={hrefForWarehouse(warehouseId)}
                            />
                          </TableCell>
                          <TableCell
                            className={`px-3 py-2 text-right text-sm tabular-nums ${remaining === 0 ? "text-muted-foreground/50" : ""}`}
                          >
                            {remaining === 0
                              ? formatQuantity(0, line.productUnit || product?.unit)
                              : formatQuantity(remaining, line.productUnit || product?.unit)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </LogisticsTableCard>
                </DocumentSection>
              ),
            },
            {
              id: "movements",
              label: "Движения",
              count: movementCount,
              panel: (
                <DocumentSection title="Движения">
                  <DocumentLedger
                    bare
                    snapshot={store.snapshot}
                    hide="document"
                    filter={(entry) =>
                      (entry.documentType === "shipment" || entry.documentType === "return") &&
                      entry.documentId === doc.id
                    }
                  />
                </DocumentSection>
              ),
            },
            {
              id: "history",
              label: "История",
              count: historyEntries.length,
              panel: <DocumentHistory entries={historyEntries} />,
            },
          ]}
        />
      </LogisticsPageShell>
      <ShipmentForm
        key={`${formIntention}:${doc.customerOrderId}:${warehouseId}:${formOpen ? "open" : "closed"}`}
        snapshot={store.snapshot}
        balances={store.balances}
        open={formOpen}
        onOpenChange={setFormOpen}
        reload={store.reload}
        mode="hub"
        preset={{ intention: formIntention, customerOrderId: doc.customerOrderId, warehouseId }}
      />
    </>
  );
};

export const AdjustmentsPage = () => {
  const { rows: listRows, isLoading, error, reload } = useLogisticsList(loadAdjustmentList);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const formStore = useLogisticsStore({ kind: "form", form: "adjustment", enabled: open });
  const rows = status === "all" || status === "posted" ? listRows : [];

  return (
    <DocumentList
      title="Корректировки"
      crumbs="Корректировки"
      actionLabel="Новая корректировка"
      path="/store/logistics/adjustments"
      rows={rows.map((item) => ({
        id: item.id,
        sequenceNumber: item.sequenceNumber,
        number: item.number,
        extra: (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{ADJUSTMENT_OPERATION_LABELS[item.operation]}</span>
            <WarehouseLink warehouseId={item.warehouseId} />
          </span>
        ),
        products: item.products,
        status: "posted",
      }))}
      extraHeader="Операция / склад"
      isLoading={isLoading}
      error={error}
      status={status}
      onStatus={setStatus}
      onCreate={() => setOpen(true)}
    >
      <AdjustmentForm
        snapshot={formStore.snapshot}
        balances={formStore.balances}
        loading={formStore.isLoading}
        loadError={formStore.error}
        open={open}
        onOpenChange={setOpen}
        reload={reload}
        mode="hub"
      />
    </DocumentList>
  );
};

export const AdjustmentDetailPage = () => {
  const params = useParams<{ id: string }>();
  const store = useLogisticsStore({
    kind: "document",
    documentKind: "adjustment",
    ref: String(params.id ?? ""),
  });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPreset, setAdjustPreset] = useState<CancelGuidance["adjustmentPreset"]>();
  const doc = matchDocumentParam(store.snapshot.adjustments, params.id);
  const lines = doc
    ? store.snapshot.adjustmentLines.filter((line) => line.adjustmentId === doc.id)
    : [];
  const warehouse = doc ? warehouseById(store.snapshot, doc.warehouseId) : undefined;
  const sourceHref =
    doc?.sourceDocumentType && doc.sourceDocumentId
      ? hrefForDocument(doc.sourceDocumentType, doc.sourceDocumentId)
      : null;
  const sourceLabel =
    doc?.sourceDocumentType && doc.sourceDocumentId
      ? documentLabel(store.snapshot, doc.sourceDocumentType, doc.sourceDocumentId)
      : null;

  return (
    <>
    <DocumentDetail
      store={store}
      title={doc?.number ?? "Корректировка"}
      crumbs={[{ label: "Корректировки", href: "/store/logistics/adjustments" }, { label: doc?.number ?? "Корректировка" }]}
      status={doc?.status}
      documentType="adjustment"
      sourceId={doc?.id}
      description={doc?.explanation}
      kindLabel="Корректировка"
      kindIcon={SlidersHorizontal}
      historyMode="posted"
      createdAt={doc?.createdAt}
      createdBy={doc?.createdBy}
      postedAt={doc?.createdAt}
      lineVariant="adjustment"
      meta={[
        {
          label: "Склад",
          value: warehouse ? (
            <LogisticsCodeBadge code={warehouse.code} href={hrefForWarehouse(warehouse.id)} />
          ) : (
            <DocumentMetaEmpty />
          ),
        },
        {
          label: "Операция",
          value: doc ? (
            <StatusPill status="neutral" label={ADJUSTMENT_OPERATION_LABELS[doc.operation]} />
          ) : (
            <DocumentMetaEmpty />
          ),
        },
        {
          label: "Основание",
          value:
            doc && sourceHref && sourceLabel ? (
              <LogisticsCodeBadge code={sourceLabel} href={sourceHref} />
            ) : (
              <DocumentMetaEmpty />
            ),
        },
        {
          label: "Проведён",
          value: doc ? formatMetaTimestamp(doc.createdAt) : <DocumentMetaEmpty />,
        },
        {
          label: "Автор",
          value:
            doc && store.snapshot.users.find((user) => user.id === doc.createdBy)?.name
              ? store.snapshot.users.find((user) => user.id === doc.createdBy)!.name
              : "—",
        },
      ]}
      cancelSubject={doc ? { type: "adjustment", id: doc.id } : undefined}
      onCancelFollowUp={(action, guidance) => {
        if (action.id === "open-adjustment") {
          setAdjustPreset(guidance.adjustmentPreset);
          setAdjustOpen(true);
        }
      }}
      lines={lines.map((line) => {
        const signed = doc
          ? adjustmentSignedQuantity(doc.operation === "mixed" ? "decrease" : doc.operation, line.quantity)
          : line.quantity;
        return {
          id: line.id,
          productId: line.productId,
          quantity: signed,
          quantityLabel: formatSignedQuantity(
            signed,
            productById(store.snapshot, line.productId)?.unit,
          ),
          place: warehouse ? (
            <LogisticsCodeBadge code={warehouse.code} href={hrefForWarehouse(warehouse.id)} />
          ) : (
            "Склад"
          ),
        };
      })}
    />
    {adjustOpen ? (
      <AdjustmentForm
        snapshot={store.snapshot}
        balances={store.balances}
        open
        onOpenChange={setAdjustOpen}
        reload={store.reload}
        mode="hub"
        preset={adjustPreset}
      />
    ) : null}
    </>
  );
};

const OUTPUT_FILTERS: Array<{ id: "all" | OutputStatus; label: string }> = [
  { id: "all", label: "Все" },
  ...OUTPUT_STATUSES.map((status) => ({ id: status, label: OUTPUT_STATUS_LABELS[status] ?? String(status) })),
];

export const OutputsPage = () => {
  const { rows: listRows, isLoading, error, reload } = useLogisticsList(loadOutputList);
  const [status, setStatus] = useState<(typeof OUTPUT_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [drafts, setDrafts] = useState<ProductionOutputDraftLine[]>([]);
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const creatingRef = useRef(false);
  const formStore = useLogisticsStore({ kind: "form", form: "output", enabled: open });
  const snapshot = formStore.snapshot;
  const balances = formStore.balances;
  const rows = listRows.filter((item) => status === "all" || item.status === status);
  const prodLines = snapshot.productionOrderLines.filter((line) => line.orderId === orderId);
  const eligibleLines = prodLines.filter(
    (line) => remainingToOutputForLine(snapshot, line.id, line.quantity) > 0,
  );
  const remainingFor = (lineId: string) => {
    const line = prodLines.find((item) => item.id === lineId);
    return line ? remainingToOutputForLine(snapshot, line.id, line.quantity) : 0;
  };
  const selectedDrafts = drafts.filter((draft) => Number(draft.quantity) > 0);
  const canSubmit =
    Boolean(orderId) &&
    selectedDrafts.length > 0 &&
    selectedDrafts.every((draft) => isAllowedQuantity(draft.quantity, remainingFor(draft.productionLineId)));

  const resetDraftsForOrder = (nextOrderId: string) => {
    const lines = snapshot.productionOrderLines.filter((line) => line.orderId === nextOrderId);
    const eligible = lines.filter(
      (line) => remainingToOutputForLine(snapshot, line.id, line.quantity) > 0,
    );
    setDrafts(
      buildProductionOutputDrafts(eligible, (lineId) => {
        const line = lines.find((item) => item.id === lineId);
        return line ? remainingToOutputForLine(snapshot, line.id, line.quantity) : 0;
      }),
    );
  };

  const create = async (complete: boolean) => {
    if (creatingRef.current || pending) {
      return;
    }
    if (!orderId || !canSubmit) {
      toast.error("Выберите заказ на производство и количество в пределах плана");
      return;
    }
    try {
      assertProductionOutputLines(
        selectedDrafts.map((draft) => {
          const line = prodLines.find((item) => item.id === draft.productionLineId)!;
          return {
            productId: draft.productId,
            quantity: Number(draft.quantity),
            planQuantity: line.quantity,
            alreadyOutput: producedForProductionProduct(snapshot, orderId, line.productId),
            allocationQuantity: draft.allocOrderLineId !== "none" ? Number(draft.allocQty) || 0 : 0,
          };
        }),
      );
      for (const draft of selectedDrafts) {
        if (draft.allocOrderLineId === "none" || !(Number(draft.allocQty) > 0)) {
          continue;
        }
        const allocLine = snapshot.customerOrderLines.find((line) => line.id === draft.allocOrderLineId);
        if (!allocLine) {
          continue;
        }
        const allocMax = Math.min(
          Number(draft.quantity),
          remainingToReserveForLine(allocLine, balances),
        );
        assertEnoughStock(allocMax, Number(draft.allocQty), "open order");
      }
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Проверьте количество");
      return;
    }
    creatingRef.current = true;
    setPending(true);
    const ok = await runLogisticsAction(
      () =>
        createProductionOutput({
          orderId,
          expectedEndOn: expectedEndOn || null,
          complete,
          lines: selectedDrafts.map((draft) => {
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
        }),
      complete ? "Выпуск завершён" : "Выпуск запланирован",
      reload,
    );
    creatingRef.current = false;
    setPending(false);
    if (ok) {
      setOpen(false);
      setOrderId("");
      setDrafts([]);
      setExpectedEndOn("");
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Выпуски" }]}>
      <LogisticsToolbar
        title="Выпуски"
        actionLabel="Новый выпуск"
        onAction={() => {
          setOrderId("");
          setDrafts([]);
          setExpectedEndOn("");
          setOpen(true);
        }}
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Статус выпуска">
          {OUTPUT_FILTERS.map((item) => (
            <HomeFilterChip
              key={item.id}
              active={status === item.id}
              role="tab"
              aria-selected={status === item.id}
              onClick={() => setStatus(item.id)}
            >
              {item.label}
            </HomeFilterChip>
          ))}
        </div>
      </LogisticsToolbar>
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Номер", "Заказ на производство", "Товары", "Статус", "Ожидаемое окончание"]} isEmpty={rows.length === 0}>
          {rows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="px-3 py-2 align-top">
                <LogisticsCodeBadge code={item.number} href={`/store/logistics/outputs/${item.sequenceNumber}`} />
              </TableCell>
              <TableCell className="px-3 py-2 align-top">
                <LogisticsCodeBadge
                  code={item.productionOrderNumber || item.productionOrderId}
                  href={`/store/logistics/production-orders/${item.productionOrderSequenceNumber || item.productionOrderId}`}
                />
              </TableCell>
              <TableCell className="px-3 py-2 align-top">
                <DocumentProductLines lines={item.products} />
              </TableCell>
              <TableCell className="px-3 py-2 align-top">
                <OutputStatusBadge status={item.status} />
              </TableCell>
              <TableCell className="px-3 py-2 align-top text-sm tabular-nums">
                {formatExpectedEnd(item.expectedEndOn)}
              </TableCell>
            </TableRow>
          ))}
        </LogisticsTableCard>
      ) : null}
      <LogisticsDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) {
            return;
          }
          setOpen(next);
          if (!next) {
          }
        }}
        title="Новый выпуск"
      >
        {formStore.isLoading ? <LogisticsLoading /> : null}
        {formStore.error ? <LogisticsError message={formStore.error} /> : null}
        {!formStore.isLoading && !formStore.error ? (
        <div className="flex flex-col gap-3" aria-busy={pending || undefined}>
          <FieldSelect
            label="Заказ на производство"
            value={orderId}
            disabled={pending}
            items={snapshot.productionOrders
              .filter((item) => item.status !== "closed" && item.status !== "cancelled")
              .map((item) => ({ value: item.id, label: item.number }))}
            onChange={(value) => {
              setOrderId(value);
              resetDraftsForOrder(value);
            }}
          />
          {orderId ? (
            <ProductionOutputLinesFields
              snapshot={snapshot}
              balances={balances}
              drafts={drafts}
              remainingByLineId={remainingFor}
              disabled={pending || eligibleLines.length === 0}
              onChange={setDrafts}
            />
          ) : null}
          <ExpectedEndField
            value={expectedEndOn}
            disabled={pending || !orderId}
            onChange={(value) => {
              setExpectedEndOn(value);
            }}
          />
          {pending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Создаём выпуск…
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !canSubmit}
              onClick={() => void create(false)}
            >
              Сохранить план
            </Button>
            <Button
              type="button"
              disabled={pending || !canSubmit}
              onClick={() => void create(true)}
            >
              Завершить выпуск
            </Button>
          </div>
        </div>
        ) : null}
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const OutputDetailPage = () => {
  const params = useParams<{ id: string }>();
  const store = useLogisticsStore({
    kind: "document",
    documentKind: "production_output",
    ref: String(params.id ?? ""),
  });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPreset, setAdjustPreset] = useState<CancelGuidance["adjustmentPreset"]>();
  const doc = matchDocumentParam(store.snapshot.outputs, params.id);
  const lines = doc ? store.snapshot.outputLines.filter((line) => line.outputId === doc.id) : [];
  const production = doc ? productionOrderById(store.snapshot, doc.productionOrderId) : undefined;
  const cancelGuidance = doc
    ? projectDocumentCancelGuidance({ type: "output", id: doc.id }, store.snapshot, store.balances)
    : null;
  const completedAt = doc ? documentCompletedAt(store.snapshot, doc.id) : null;
  const historyEntries = doc
    ? buildDocumentTimeline(store.snapshot, {
        documentId: doc.id,
        mode: "lifecycle",
        createdAt: doc.createdAt,
        createdBy: doc.createdBy,
        postedAt: completedAt,
      })
    : [];
  const movementCount = doc
    ? store.snapshot.transactions.filter(
        (entry) => entry.documentType === "output" && entry.documentId === doc.id,
      ).length
    : 0;

  const assignedMeta = (() => {
    const seen = new Map<string, { type: NonNullable<(typeof lines)[number]["toOwnerType"]>; id: string }>();
    for (const line of lines) {
      if (isFreeOwner(line.toOwnerType, line.toOwnerId) || !line.toOwnerType || !line.toOwnerId) {
        continue;
      }
      const key = `${line.toOwnerType}:${line.toOwnerId}`;
      if (!seen.has(key)) {
        seen.set(key, { type: line.toOwnerType, id: line.toOwnerId });
      }
    }
    const owners = [...seen.values()];
    if (owners.length === 0) {
      return <span>{FREE_OWNER_LABEL}</span>;
    }
    const allSameKind = owners.every((owner) => owner.type === owners[0].type);
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {allSameKind ? (
          <span className="font-medium text-foreground">{OWNER_TYPE_LABELS[owners[0].type]}</span>
        ) : null}
        {owners.map((owner) => (
          <span key={`${owner.type}:${owner.id}`} className="inline-flex items-center gap-1.5">
            {!allSameKind ? (
              <span className="font-medium text-foreground">{OWNER_TYPE_LABELS[owner.type]}</span>
            ) : null}
            <LogisticsCodeBadge
              code={ownerLabel(store.snapshot, owner.type, owner.id)}
              href={hrefForOwner(owner.type, owner.id, store.snapshot) ?? undefined}
            />
          </span>
        ))}
      </span>
    );
  })();

  if (store.isLoading || store.error || !doc) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Выпуски", href: "/store/logistics/outputs" }, { label: "Выпуск" }]}>
        {store.isLoading ? <LogisticsLoading /> : <LogisticsError message={store.error ?? "Выпуск не найден."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={[{ label: "Выпуски", href: "/store/logistics/outputs" }, { label: doc.number }]}>
      <DocumentHeader
        kind="Выпуск"
        icon={PackageCheck}
        number={doc.number}
        status={<OutputStatusBadge status={doc.status} />}
        actions={
          <>
            {doc.status === "planned" ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void runLogisticsAction(() => completeOutput(doc.id), "Выпуск завершён", store.reload);
                }}
              >
                Завершить
              </Button>
            ) : null}
            {cancelGuidance ? (
              <DocumentCancelControl
                guidance={cancelGuidance}
                reload={store.reload}
                onFollowUp={(action, guidance) => {
                  if (action.id === "open-adjustment") {
                    setAdjustPreset(guidance.adjustmentPreset);
                    setAdjustOpen(true);
                  }
                }}
              />
            ) : null}
          </>
        }
        meta={[
          {
            label: "Заказ на производство",
            value: production ? (
              <span className="inline-flex items-center gap-1.5">
                <LogisticsCodeBadge
                  code={production.number}
                  href={`/store/logistics/production-orders/${production.sequenceNumber}`}
                />
                <ProductionStatusBadge status={production.status} />
              </span>
            ) : (
              <DocumentMetaEmpty />
            ),
          },
          { label: "Закреплено за", value: assignedMeta },
          {
            label: "Ожидаемое окончание",
            value: (
              <DocumentMetaDateInput
                value={doc.expectedEndOn ?? ""}
                aria-label="Ожидаемое окончание"
                overdueDays={doc.status !== "done" ? overdueDays(doc.expectedEndOn) : 0}
                onChange={(value) => {
                  void runLogisticsAction(
                    () => updateExpectedEnd(doc.id, value || null),
                    "Срок выпуска обновлён",
                    store.reload,
                  );
                }}
              />
            ),
          },
          { label: "Создан", value: formatMetaTimestamp(doc.createdAt) },
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
              <DocumentSection title="Товары">
                <LogisticsTableCard
                  embedded
                  headers={["Товар", "Количество", "Место", "Осталось по плану"]}
                  numericColumns={[1, 3]}
                  isEmpty={lines.length === 0}
                >
                  {lines.map((line) => {
                    const product = productById(store.snapshot, line.productId);
                    const unit = line.productUnit || product?.unit;
                    const planned = store.snapshot.productionOrderLines.find(
                      (item) => item.id === line.productionOrderLineId,
                    );
                    const remaining = Math.max(
                      0,
                      remainingToOutputForLine(
                        store.snapshot,
                        line.productionOrderLineId,
                        planned?.quantity ?? line.quantity,
                      ),
                    );
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="px-3 py-2">
                          <ProductIdentity snapshot={store.snapshot} productId={line.productId} />
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right text-sm font-medium tabular-nums">
                          {formatQuantity(line.quantity, unit)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm">
                          {production ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-foreground font-medium">Заказ на производство</span>
                              <LogisticsCodeBadge
                                code={production.number}
                                href={`/store/logistics/production-orders/${production.sequenceNumber}`}
                              />
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell
                          className={`px-3 py-2 text-right text-sm tabular-nums ${remaining === 0 ? "text-muted-foreground/50" : ""}`}
                        >
                          {remaining === 0 ? formatQuantity(0, unit) : formatQuantity(remaining, unit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </LogisticsTableCard>
              </DocumentSection>
            ),
          },
          {
            id: "movements",
            label: "Движения",
            count: movementCount,
            panel: (
              <DocumentSection title="Движения">
                <DocumentLedger
                  bare
                  snapshot={store.snapshot}
                  hide="document"
                  filter={(entry) => entry.documentType === "output" && entry.documentId === doc.id}
                />
              </DocumentSection>
            ),
          },
          {
            id: "history",
            label: "История",
            count: historyEntries.length,
            panel: <DocumentHistory entries={historyEntries} />,
          },
        ]}
      />
      {adjustOpen ? (
        <AdjustmentForm
          snapshot={store.snapshot}
          balances={store.balances}
          open
          onOpenChange={setAdjustOpen}
          reload={store.reload}
          mode="hub"
          preset={adjustPreset}
        />
      ) : null}
    </LogisticsPageShell>
  );
};

type ListRow = {
  id: string;
  sequenceNumber: string;
  number: string;
  extra: React.ReactNode;
  extraHref?: string;
  products: Array<{
    productId: string;
    quantity: number;
    productName?: string | null;
    productUnit?: string | null;
  }>;
  status: DocumentStatus;
};

const DocumentList = ({
  title,
  crumbs,
  path,
  rows,
  extraHeader,
  actionLabel,
  isLoading,
  error,
  status,
  onStatus,
  onCreate,
  children,
}: {
  title: string;
  crumbs: string;
  path: string;
  rows: ListRow[];
  extraHeader: string;
  actionLabel: string;
  isLoading: boolean;
  error: string | null;
  status: (typeof STATUS_FILTERS)[number]["id"];
  onStatus: (value: (typeof STATUS_FILTERS)[number]["id"]) => void;
  onCreate: () => void;
  children: React.ReactNode;
}) => (
  <LogisticsPageShell crumbs={[{ label: crumbs }]}>
    <LogisticsToolbar title={title} actionLabel={actionLabel} onAction={onCreate}>
      <StatusTabs value={status} onChange={onStatus} label={`Статус: ${title}`} />
    </LogisticsToolbar>
    {isLoading ? <LogisticsLoading /> : null}
    {error ? <LogisticsError message={error} /> : null}
    {!isLoading && !error ? (
      <LogisticsTableCard headers={["Номер", extraHeader, "Товары", "Статус"]} isEmpty={rows.length === 0}>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="px-3 py-2 align-top">
              <LogisticsCodeBadge code={row.number} href={`${path}/${row.sequenceNumber}`} />
            </TableCell>
            <TableCell className="px-3 py-2 align-top text-sm">
              {typeof row.extra === "string" && row.extraHref ? (
                <LogisticsCodeBadge code={row.extra} href={row.extraHref} />
              ) : (
                row.extra
              )}
            </TableCell>
            <TableCell className="px-3 py-2 align-top">
              <DocumentProductLines lines={row.products} />
            </TableCell>
            <TableCell className="px-3 py-2 align-top">
              <DocumentStatusBadge status={row.status} />
            </TableCell>
          </TableRow>
        ))}
      </LogisticsTableCard>
    ) : null}
    {children}
  </LogisticsPageShell>
);

const DocumentDetail = ({
  store,
  title,
  crumbs,
  status,
  documentType,
  sourceId,
  description,
  onPost,
  cancelSubject,
  onCancelFollowUp,
  extraActions,
  related,
  lines,
  kindLabel,
  kindIcon,
  meta,
  historyMode = "posted",
  createdAt,
  createdBy,
  postedAt,
  lineVariant = "output",
}: {
  store: ReturnType<typeof useLogisticsStore>;
  title: string;
  crumbs: Array<{ label: string; href?: string }>;
  status?: DocumentStatus;
  documentType?: DocumentType;
  sourceId?: string;
  description?: string;
  onPost?: () => Promise<unknown>;
  cancelSubject?: { type: "shipment" | "return" | "adjustment"; id: string };
  onCancelFollowUp?: (action: CancelGuidanceAction, guidance: CancelGuidance) => void;
  extraActions?: ReactNode;
  related?: ReactNode;
  lines: Array<{
    id: string;
    productId: string;
    quantity: number;
    quantityLabel?: string;
    productUnit?: string | null;
    place: ReactNode;
    hint?: string;
  }>;
  kindLabel: string;
  kindIcon?: LucideIcon;
  meta: Array<{ label: string; value: ReactNode }>;
  historyMode?: "posted" | "lifecycle" | "reservation";
  createdAt?: string;
  createdBy?: string | null;
  postedAt?: string | null;
  lineVariant?: "output" | "adjustment";
}) => {
  const postAction =
    status === "draft" && onPost
      ? () => runLogisticsAction(onPost, "Документ проведён", store.reload)
      : undefined;
  const cancelGuidance = cancelSubject
    ? projectDocumentCancelGuidance(cancelSubject, store.snapshot, store.balances)
    : null;

  if (store.isLoading || store.error || !status) {
    return (
      <LogisticsPageShell crumbs={crumbs}>
        {store.isLoading ? <LogisticsLoading /> : <LogisticsError message={store.error ?? "Документ не найден."} />}
      </LogisticsPageShell>
    );
  }

  const historyEntries = sourceId
    ? buildDocumentTimeline(store.snapshot, {
        documentId: sourceId,
        mode: historyMode,
        createdAt: createdAt ?? new Date().toISOString(),
        createdBy,
        postedAt,
      })
    : [];
  const movementCount =
    sourceId && documentType
      ? store.snapshot.transactions.filter(
          (entry) => entry.documentType === documentType && entry.documentId === sourceId,
        ).length
      : 0;

  const isAdjustment = lineVariant === "adjustment";
  const lineHeaders = isAdjustment
    ? ["Товар", "Изменение", "Место"]
    : ["Товар", "Количество", "Место", "Осталось по плану"];

  return (
    <LogisticsPageShell crumbs={crumbs}>
      <DocumentHeader
        kind={kindLabel}
        icon={kindIcon}
        number={title}
        status={<DocumentStatusBadge status={status} />}
        description={description}
        actions={
          <>
            {extraActions}
            {postAction ? (
              <Button type="button" size="sm" onClick={() => void postAction()}>
                Провести
              </Button>
            ) : null}
            {cancelGuidance ? (
              <DocumentCancelControl
                guidance={cancelGuidance}
                reload={store.reload}
                onFollowUp={onCancelFollowUp ?? (() => undefined)}
              />
            ) : null}
          </>
        }
        meta={meta}
      />
      {related}
      <DocumentTabs
        tabs={[
          {
            id: "products",
            label: "Товары",
            count: lines.length,
            panel: (
              <DocumentSection title="Товары">
                <LogisticsTableCard
                  embedded
                  headers={lineHeaders}
                  numericColumns={[1]}
                  isEmpty={lines.length === 0}
                >
                  {lines.map((line) => {
                    const unit =
                      line.productUnit || productById(store.snapshot, line.productId)?.unit;
                    const qtyText =
                      line.quantityLabel ??
                      (isAdjustment
                        ? formatSignedQuantity(line.quantity, unit)
                        : formatQuantity(line.quantity, unit));
                    return (
                    <TableRow key={line.id}>
                      <TableCell className="px-3 py-2">
                        <ProductIdentity snapshot={store.snapshot} productId={line.productId} />
                      </TableCell>
                      <TableCell
                        className={`px-3 py-2 text-right text-sm tabular-nums ${
                          isAdjustment ? signedQuantityClassName(line.quantity) : "font-medium"
                        }`}
                      >
                        {qtyText}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm">{line.place}</TableCell>
                      {isAdjustment ? null : (
                        <TableCell className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums">
                          {line.hint ?? <span className="text-muted-foreground/50">—</span>}
                        </TableCell>
                      )}
                    </TableRow>
                    );
                  })}
                </LogisticsTableCard>
              </DocumentSection>
            ),
          },
          {
            id: "movements",
            label: "Движения",
            count: movementCount,
            panel: (
              <DocumentSection title="Движения">
                {sourceId && documentType ? (
                  <DocumentLedger
                    bare
                    snapshot={store.snapshot}
                    hide="document"
                    filter={(entry) => entry.documentType === documentType && entry.documentId === sourceId}
                  />
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Движений пока нет.</p>
                )}
              </DocumentSection>
            ),
          },
          {
            id: "history",
            label: "История",
            count: historyEntries.length,
            panel: <DocumentHistory entries={historyEntries} />,
          },
        ]}
      />
    </LogisticsPageShell>
  );
};
