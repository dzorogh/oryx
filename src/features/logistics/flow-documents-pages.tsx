// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ALL_VALUE } from "@/components/store/pim/products/catalog/catalog-helpers";
import { CatalogQuickSelectControl } from "@/components/store/pim/products/catalog/catalog-filters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateOutputDialog } from "@/features/logistics/ui/create-output-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  completeOutput,
  updateExpectedEnd,
} from "@/features/logistics/logistics-api";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
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
  remainingToOutputForLine,
  remainingToReturnForOrderProduct,
  remainingToShipForLine,
} from "@/features/logistics/logistics-availability";
import { AdjustmentCatalogDialog } from "@/features/logistics/ui/adjustment-catalog-dialog";
import { ShipmentCatalogDialog } from "@/features/logistics/ui/shipment-catalog-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  plantCode,
  warehouseById,
  warehouseCode,
} from "@/features/logistics/logistics-lookups";
import { DocumentProductLines } from "@/features/logistics/ui/document-product-lines";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import { relatedOrderItem } from "@/features/logistics/logistics-related";
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
import {
  adjustmentColumns,
  adjustmentGroupDefs,
  adjustmentSortDefs,
  outputColumns,
  outputGroupDefs,
  outputSortDefs,
  shipmentColumns,
  shipmentGroupDefs,
  shipmentSortDefs,
} from "@/features/logistics/ui/list/document-list-configs";
import { LogisticsListPageContent } from "@/features/logistics/ui/list/logistics-list-page-content";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { AddDraftOutputDialog } from "@/features/logistics/ui/add-draft-output-dialog";
import { HIGHLIGHT_ROW_CLASS, takeHighlightedRows } from "@/features/logistics/ui/highlight-rows";
import { OutputReleaseDialog, type OutputReleaseTarget } from "@/features/logistics/ui/output-release-dialog";
import { OutputReserveDialog, type OutputReserveTarget } from "@/features/logistics/ui/output-reserve-dialog";
import { matchesProductSearch } from "@/features/logistics/ui/list/list-helpers";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { DocumentStatusBadge, OutputStatusBadge, ShipmentDirectionBadge } from "@/features/logistics/ui/status-badge";
import {
  loadAdjustmentList,
  loadOutputList,
  loadShipmentList,
} from "@/features/logistics/logistics-api";
import { useLogisticsList, useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { CustomerOrderStatusBadge } from "@/features/logistics/ui/status-badge";
import { ProductionStatusBadge } from "@/features/logistics/ui/status-badge";

const SHIPMENT_TOGGLE = [
  { value: "all", label: "Все" },
  { value: "shipment", label: "Отгрузки" },
  { value: "return", label: "Возвраты" },
];

const OUTPUT_TOGGLE = [
  { value: "all", label: "Все" },
  ...OUTPUT_STATUSES.map((status) => ({ value: status, label: OUTPUT_STATUS_LABELS[status] ?? status })),
];

const ADJUSTMENT_TOGGLE = [
  { value: "all", label: "Все" },
  { value: "increase", label: ADJUSTMENT_OPERATION_LABELS.increase },
  { value: "write_off", label: ADJUSTMENT_OPERATION_LABELS.write_off },
  { value: "mixed", label: ADJUSTMENT_OPERATION_LABELS.mixed },
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
  const [shipIntention, setShipIntention] = useState<ShipmentDirection>("shipment");
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
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState(ALL_VALUE);
  const [orderFilter, setOrderFilter] = useState(ALL_VALUE);
  const [productFilter, setProductFilter] = useState(ALL_VALUE);

  const warehouseOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const row of listRows) {
      if (row.fromLocationType === "warehouse") ids.add(row.fromLocationId);
      if (row.toLocationType === "warehouse") ids.add(row.toLocationId);
    }
    return [...ids]
      .sort((left, right) => Number(left) - Number(right))
      .map((id) => ({ value: id, label: formatLogisticsCode("warehouse", id) }));
  }, [listRows]);

  const orderOptions = useMemo(() => {
    const ids = [...new Set(listRows.map((row) => row.customerOrderId).filter(Boolean))];
    return ids.map((id) => {
      const row = listRows.find((item) => item.customerOrderId === id);
      return { value: id, label: row?.customerOrderNumber ?? id };
    });
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
    warehouseFilter !== ALL_VALUE ||
    orderFilter !== ALL_VALUE ||
    productFilter !== ALL_VALUE;

  const rows = useMemo(
    () =>
      listRows.filter((item) => {
        if (direction !== "all" && item.direction !== direction) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (!item.number.toLowerCase().includes(q) && !matchesProductSearch(item.products, q)) return false;
        }
        if (warehouseFilter !== ALL_VALUE) {
          const wh =
            item.fromLocationType === "warehouse"
              ? item.fromLocationId
              : item.toLocationType === "warehouse"
                ? item.toLocationId
                : "";
          if (wh !== warehouseFilter) return false;
        }
        if (orderFilter !== ALL_VALUE && item.customerOrderId !== orderFilter) return false;
        if (productFilter !== ALL_VALUE && !item.products.some((line) => line.productId === productFilter)) return false;
        return true;
      }),
    [direction, listRows, orderFilter, productFilter, search, warehouseFilter],
  );

  return (
    <LogisticsPageShell crumbs={[{ label: "Отгрузки и возвраты" }]}>
      <LogisticsListPageContent
        listId="shipments"
        title="Отгрузки и возвраты"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm">Новый документ</Button>} />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setShipIntention("shipment"); setOpen(true); }}>
                Отгрузить
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setShipIntention("return"); setOpen(true); }}>
                Оформить возврат
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        columns={shipmentColumns}
        sortDefs={shipmentSortDefs}
        groupDefs={shipmentGroupDefs}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        toggleOptions={SHIPMENT_TOGGLE}
        toggleValue={direction}
        onToggleChange={(value) => setDirectionFilter(value as "all" | ShipmentDirection)}
        toggleAriaLabel="Тип документа"
        search={{ value: search, onChange: setSearch }}
        quickControls={
          <CatalogQuickSelectControl
            value={warehouseFilter}
            onValueChange={(value) => setWarehouseFilter(value ?? ALL_VALUE)}
            ariaLabel="Быстрый фильтр по складу"
            placeholder="Склад"
            allLabel="Все склады"
            options={warehouseOptions}
            widthClassName="w-[120px] shrink-0 lg:w-[140px]"
          />
        }
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearch("");
          setWarehouseFilter(ALL_VALUE);
          setOrderFilter(ALL_VALUE);
          setProductFilter(ALL_VALUE);
        }}
        filterSheet={
          <>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Заказ клиента</span>
              <CatalogQuickSelectControl
                value={orderFilter}
                onValueChange={(value) => setOrderFilter(value ?? ALL_VALUE)}
                ariaLabel="Фильтр по заказу"
                placeholder="Все заказы"
                allLabel="Все заказы"
                options={orderOptions}
                widthClassName="w-full"
              />
            </label>
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
          </>
        }
      />
      <ShipmentCatalogDialog
        snapshot={formStore.snapshot}
        balances={formStore.balances}
        loading={formStore.isLoading}
        loadError={formStore.error}
        open={open}
        onOpenChange={setOpen}
        preset={{ intention: shipIntention }}
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
                  kicker={doc.number}
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
      <ShipmentCatalogDialog
        snapshot={store.snapshot}
        balances={store.balances}
        open={formOpen}
        onOpenChange={setFormOpen}
        preset={{ intention: formIntention, customerOrderId: doc.customerOrderId, warehouseId }}
      />
    </>
  );
};

export const AdjustmentsPage = () => {
  const { rows: listRows, isLoading, error, reload } = useLogisticsList(loadAdjustmentList);
  const [operation, setOperation] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState(ALL_VALUE);
  const [productFilter, setProductFilter] = useState(ALL_VALUE);
  const [open, setOpen] = useState(false);
  const [adjustIntent, setAdjustIntent] = useState<"inventory" | "signed">("signed");
  const formStore = useLogisticsStore({ kind: "form", form: "adjustment", enabled: open });

  const warehouseOptions = useMemo(() => {
    const ids = [...new Set(listRows.map((row) => row.warehouseId).filter(Boolean))];
    return ids
      .sort((left, right) => Number(left) - Number(right))
      .map((id) => ({ value: id, label: formatLogisticsCode("warehouse", id) }));
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
    search.trim().length > 0 || warehouseFilter !== ALL_VALUE || productFilter !== ALL_VALUE;

  const rows = useMemo(
    () =>
      listRows.filter((item) => {
        if (operation !== "all" && item.operation !== operation) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (
            !item.number.toLowerCase().includes(q) &&
            !item.description.toLowerCase().includes(q) &&
            !matchesProductSearch(item.products, q)
          ) {
            return false;
          }
        }
        if (warehouseFilter !== ALL_VALUE && item.warehouseId !== warehouseFilter) return false;
        if (productFilter !== ALL_VALUE && !item.products.some((line) => line.productId === productFilter)) return false;
        return true;
      }),
    [listRows, operation, productFilter, search, warehouseFilter],
  );

  return (
    <LogisticsPageShell crumbs={[{ label: "Корректировки" }]}>
      <LogisticsListPageContent
        listId="adjustments"
        title="Корректировки"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm">Новая корректировка</Button>} />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setAdjustIntent("inventory"); setOpen(true); }}>
                Инвентаризация
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setAdjustIntent("signed"); setOpen(true); }}>
                Списание / оприходование
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        columns={adjustmentColumns}
        sortDefs={adjustmentSortDefs}
        groupDefs={adjustmentGroupDefs()}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        toggleOptions={ADJUSTMENT_TOGGLE}
        toggleValue={operation}
        onToggleChange={setOperation}
        toggleAriaLabel="Операция корректировки"
        search={{ value: search, onChange: setSearch }}
        quickControls={
          <CatalogQuickSelectControl
            value={warehouseFilter}
            onValueChange={(value) => setWarehouseFilter(value ?? ALL_VALUE)}
            ariaLabel="Быстрый фильтр по складу"
            placeholder="Склад"
            allLabel="Все склады"
            options={warehouseOptions}
            widthClassName="w-[120px] shrink-0 lg:w-[140px]"
          />
        }
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearch("");
          setWarehouseFilter(ALL_VALUE);
          setProductFilter(ALL_VALUE);
        }}
        filterSheet={
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
        }
      />
      <AdjustmentCatalogDialog
        snapshot={formStore.snapshot}
        balances={formStore.balances}
        loading={formStore.isLoading}
        loadError={formStore.error}
        open={open}
        onOpenChange={setOpen}
        intent={adjustIntent}
      />
    </LogisticsPageShell>
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
      <AdjustmentCatalogDialog
        snapshot={store.snapshot}
        balances={store.balances}
        open
        onOpenChange={setAdjustOpen}
        preset={adjustPreset}
      />
    ) : null}
    </>
  );
};

export const OutputsPage = () => {
  const { rows: listRows, isLoading, error, reload } = useLogisticsList(loadOutputList);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [plantFilter, setPlantFilter] = useState(ALL_VALUE);
  const [productFilter, setProductFilter] = useState(ALL_VALUE);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const formStore = useLogisticsStore({ kind: "form", form: "output", enabled: open });
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
    search.trim().length > 0 || plantFilter !== ALL_VALUE || productFilter !== ALL_VALUE || overdueOnly;

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
        if (overdueOnly && !(item.status !== "done" && overdueDays(item.expectedEndOn) > 0)) return false;
        return true;
      }),
    [listRows, overdueOnly, plantFilter, productFilter, search, status],
  );
  return (
    <LogisticsPageShell crumbs={[{ label: "Выпуски" }]}>
      <LogisticsListPageContent
        listId="outputs"
        title="Выпуски"
        actionLabel="Новый выпуск"
        onAction={() => setOpen(true)}
        columns={outputColumns}
        sortDefs={outputSortDefs}
        groupDefs={outputGroupDefs()}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        toggleOptions={OUTPUT_TOGGLE}
        toggleValue={status}
        onToggleChange={setStatus}
        toggleAriaLabel="Статус выпуска"
        search={{ value: search, onChange: setSearch }}
        quickControls={
          <CatalogQuickSelectControl
            value={plantFilter}
            onValueChange={(value) => setPlantFilter(value ?? ALL_VALUE)}
            ariaLabel="Быстрый фильтр по заводу"
            placeholder="Завод"
            allLabel="Все заводы"
            options={plantOptions}
            widthClassName="w-[120px] shrink-0 lg:w-[140px]"
          />
        }
        hasActiveFilters={hasActiveFilters}
        onResetFilters={() => {
          setSearch("");
          setPlantFilter(ALL_VALUE);
          setProductFilter(ALL_VALUE);
          setOverdueOnly(false);
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
            <label className="flex items-center gap-3 rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2.5">
              <Checkbox
                checked={overdueOnly}
                onCheckedChange={(checked) => setOverdueOnly(checked === true)}
                aria-label="Только просроченные"
              />
              <span className="text-sm font-medium">Просрочен</span>
            </label>
          </>
        }
      />
      <CreateOutputDialog
        open={open}
        onOpenChange={setOpen}
        snapshot={snapshot}
        loading={formStore.isLoading}
        error={formStore.error}
      />
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
  const [reserveTarget, setReserveTarget] = useState<OutputReserveTarget | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<OutputReleaseTarget | null>(null);
  const [addLinesOpen, setAddLinesOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const doc = matchDocumentParam(store.snapshot.outputs, params.id);
  useEffect(() => {
    if (!doc) return;
    const ids = takeHighlightedRows(doc.id);
    if (ids.length === 0) return;
    const frame = requestAnimationFrame(() => setHighlighted(ids));
    const timer = window.setTimeout(() => setHighlighted([]), 4000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [doc, store.snapshot]);
  const canEditReserve = doc?.status === "draft";
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
        statusLabels: OUTPUT_STATUS_LABELS,
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
            {doc.status === "draft" ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={() => setAddLinesOpen(true)}>
                  Добавить товары
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    void runLogisticsAction(() => completeOutput(doc.id), "Выпуск завершён", store.reload);
                  }}
                >
                  Завершить
                </Button>
              </>
            ) : null}
            {cancelGuidance ? (
              <DocumentCancelControl
                guidance={cancelGuidance}
                kicker={doc.number}
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
                  headers={
                    canEditReserve
                      ? ["Товар", "Количество", "Под что", "Осталось по плану", ""]
                      : ["Товар", "Количество", "Под что", "Осталось по плану"]
                  }
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
                      <TableRow
                        key={line.id}
                        className={highlighted.includes(line.id) ? HIGHLIGHT_ROW_CLASS : undefined}
                      >
                        <TableCell className="px-3 py-2">
                          <ProductIdentity snapshot={store.snapshot} productId={line.productId} />
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right text-sm font-medium tabular-nums">
                          {formatQuantity(line.quantity, unit)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm">
                          {line.toOwnerType && line.toOwnerId ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="text-muted-foreground">{OWNER_TYPE_LABELS[line.toOwnerType]}</span>
                              <LogisticsCodeBadge
                                code={ownerLabel(store.snapshot, line.toOwnerType, line.toOwnerId)}
                                href={hrefForOwner(line.toOwnerType, line.toOwnerId, store.snapshot) ?? undefined}
                              />
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{FREE_OWNER_LABEL}</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`px-3 py-2 text-right text-sm tabular-nums ${remaining === 0 ? "text-muted-foreground/50" : ""}`}
                        >
                          {remaining === 0 ? formatQuantity(0, unit) : formatQuantity(remaining, unit)}
                        </TableCell>
                        {canEditReserve ? (
                          <TableCell className="px-3 py-2 text-right">
                            {line.toOwnerType && line.toOwnerId ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs"
                                aria-label={`Снять резерв: ${productById(store.snapshot, line.productId)?.name ?? line.productId}`}
                                onClick={() =>
                                  setReleaseTarget({
                                    outputId: doc.id,
                                    outputNumber: doc.number,
                                    ownerType: line.toOwnerType!,
                                    ownerId: line.toOwnerId!,
                                    productId: line.productId,
                                    quantity: line.quantity,
                                    highlightDocumentId: doc.id,
                                    highlightLineId: line.id,
                                  })
                                }
                              >
                                Снять
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs"
                                aria-label={`Зарезервировать: ${productById(store.snapshot, line.productId)?.name ?? line.productId}`}
                                onClick={() =>
                                  setReserveTarget({
                                    productionOrderId: doc.productionOrderId,
                                    productId: line.productId,
                                    outputId: doc.id,
                                    lineId: line.id,
                                  })
                                }
                              >
                                Зарезервировать
                              </Button>
                            )}
                          </TableCell>
                        ) : null}
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
        <AdjustmentCatalogDialog
          snapshot={store.snapshot}
          balances={store.balances}
          open
          onOpenChange={setAdjustOpen}
          preset={adjustPreset}
        />
      ) : null}
      <OutputReserveDialog target={reserveTarget} onClose={() => setReserveTarget(null)} reload={store.reload} />
      <OutputReleaseDialog
        snapshot={store.snapshot}
        target={releaseTarget}
        onClose={() => setReleaseTarget(null)}
        reload={store.reload}
      />
      {doc?.status === "draft" ? (
        <AddDraftOutputDialog
          open={addLinesOpen}
          onOpenChange={setAddLinesOpen}
          snapshot={store.snapshot}
          output={doc}
          onAdded={store.reload}
        />
      ) : null}
    </LogisticsPageShell>
  );
};

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
  historyMode?: "posted" | "lifecycle";
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
                kicker={title}
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
