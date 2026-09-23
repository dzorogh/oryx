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
  DOCUMENT_TYPE_LABELS,
  SHIPMENT_DIRECTION_LABELS,
  expectedEndMeta,
  formatExpectedEnd,
  formatQuantity,
  formatSignedQuantity,
  OUTPUT_STATUS_LABELS,
} from "@/features/logistics/logistics-labels";
import { adjustmentSignedQuantity } from "@/features/logistics/logistics-adjustments";
import {
  customerOrderById,
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
import { relatedOrderItem, relatedOrdersForOutput } from "@/features/logistics/logistics-related";
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
  type LogisticsSnapshot,
  type OutputStatus,
  matchDocumentParam,
  type ShipmentDirection,
} from "@/features/logistics/logistics-types";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { isAllowedQuantity } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsMetaField, LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { RelatedDocuments } from "@/features/logistics/ui/related-documents";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { DocumentStatusBadge, OutputStatusBadge, ShipmentDirectionBadge } from "@/features/logistics/ui/status-badge";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

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
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const directionParam = searchParams.get("direction");
  const parsedDirection: "all" | ShipmentDirection =
    directionParam === "shipment" || directionParam === "return" ? directionParam : "all";
  const [direction, setDirection] = useState<"all" | ShipmentDirection>(parsedDirection);
  const [open, setOpen] = useState(false);

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
      snapshot.shipments.filter((item) => {
        if (direction === "all") {
          return true;
        }
        return shipmentDirection(item.fromLocationType, item.toLocationType) === direction;
      }),
    [direction, snapshot.shipments],
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
            const itemDirection = shipmentDirection(item.fromLocationType, item.toLocationType);
            const warehouseId = shipmentWarehouseId(item);
            return (
              <TableRow key={item.id}>
                <TableCell className="px-3 py-2 align-top">
                  <LogisticsCodeBadge code={item.number} href={`/store/logistics/shipments/${item.sequenceNumber}`} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <ShipmentDirectionBadge direction={itemDirection} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <LogisticsCodeBadge
                      code={customerOrderById(snapshot, item.customerOrderId)?.number ?? item.customerOrderId}
                      href={hrefForCustomerOrder(item.customerOrderId)}
                    />
                    <LogisticsCodeBadge code={warehouseCode(snapshot, warehouseId)} href={hrefForWarehouse(warehouseId)} />
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <DocumentProductLines
                    snapshot={snapshot}
                    lines={snapshot.shipmentLines.filter((line) => line.shipmentId === item.id)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </LogisticsTableCard>
      ) : null}
      <ShipmentForm
        snapshot={snapshot}
        balances={balances}
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
  const store = useLogisticsStore();
  const [formOpen, setFormOpen] = useState(false);
  const [formIntention, setFormIntention] = useState<ShipmentDirection>("return");
  const doc = matchDocumentParam(store.snapshot.shipments, params.id);
  const lines = doc
    ? store.snapshot.shipmentLines.filter((line) => line.shipmentId === doc.id)
    : [];
  const order = doc ? relatedOrderItem(store.snapshot, doc.customerOrderId) : null;
  const direction = doc ? shipmentDirection(doc.fromLocationType, doc.toLocationType) : null;
  const warehouseId = doc ? shipmentWarehouseId(doc) : "";
  const cancelGuidance = doc && direction
    ? projectDocumentCancelGuidance({ type: direction, id: doc.id }, store.snapshot, store.balances)
    : null;

  if (store.isLoading || store.error || !doc || !direction) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Отгрузки и возвраты", href: "/store/logistics/shipments" }, { label: "Документ" }]}>
        {store.isLoading ? <LogisticsLoading /> : <LogisticsError message={store.error ?? "Документ не найден."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <>
      <LogisticsPageShell
        crumbs={[
          { label: "Отгрузки и возвраты", href: "/store/logistics/shipments" },
          { label: doc.number },
        ]}
      >
        <LogisticsToolbar
          title={doc.number}
          actions={
            <>
              {order && store.snapshot.customerOrders.find((item) => item.id === doc.customerOrderId)?.status === "open" ? (
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
        >
          <LogisticsMetaField label="Тип">
            <ShipmentDirectionBadge direction={direction} />
          </LogisticsMetaField>
          <LogisticsMetaField label="Маршрут">
            <span className="text-sm">
              {direction === "shipment" ? "Склад → заказ клиента" : "Заказ клиента → склад"}
            </span>
          </LogisticsMetaField>
        </LogisticsToolbar>
        {order ? <RelatedDocuments title="Заказ клиента" items={[order]} /> : null}
        <RelatedDocuments
          title="Склад"
          items={[
            {
              id: warehouseId,
              href: hrefForWarehouse(warehouseId),
              label: warehouseCode(store.snapshot, warehouseId),
              meta: SHIPMENT_DIRECTION_LABELS[direction],
            },
          ]}
        />
        <LogisticsTableCard headers={["Товар", "Количество", "Назначение", "Место"]} isEmpty={lines.length === 0}>
          {lines.map((line) => {
            const orderLine = store.snapshot.customerOrderLines.find(
              (item) => item.orderId === doc.customerOrderId && item.productId === line.productId,
            );
            const remainingShip = orderLine ? remainingToShipForLine(orderLine, store.balances, warehouseId) : 0;
            const remainingReturn = remainingToReturnForOrderProduct(
              store.balances,
              doc.customerOrderId,
              line.productId,
            );
            return (
              <TableRow key={line.id}>
                <TableCell className="px-3 py-2">
                  <ProductIdentity snapshot={store.snapshot} productId={line.productId} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(line.quantity)}</TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  {line.toOwnerType
                    ? ownerLabel(store.snapshot, line.toOwnerType, line.toOwnerId)
                    : "Свободно"}
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <LogisticsCodeBadge
                    code={warehouseCode(store.snapshot, warehouseId)}
                    href={hrefForWarehouse(warehouseId)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {direction === "shipment"
                      ? `Ещё можно отгрузить ${formatQuantity(remainingShip)}`
                      : `Ещё можно вернуть ${formatQuantity(remainingReturn)}`}
                  </p>
                </TableCell>
              </TableRow>
            );
          })}
        </LogisticsTableCard>
        {lines[0]?.productId ? (
          <AvailabilityPanel snapshot={store.snapshot} balances={store.balances} productId={lines[0].productId} />
        ) : null}
        <DocumentLedger
          snapshot={store.snapshot}
          hide="document"
          filter={(entry) =>
            (entry.documentType === "shipment" || entry.documentType === "return") && entry.documentId === doc.id
          }
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
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const rows = snapshot.adjustments.filter((item) => status === "all" || item.status === status);

  return (
    <DocumentList
      title="Корректировки"
      crumbs="Корректировки"
      actionLabel="Новая корректировка"
      snapshot={snapshot}
      path="/store/logistics/adjustments"
      rows={rows.map((item) => ({
        id: item.id,
        sequenceNumber: item.sequenceNumber,
        number: item.number,
        extra: (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{ADJUSTMENT_OPERATION_LABELS[item.operation]}</span>
            <LogisticsCodeBadge
              code={warehouseCode(snapshot, item.warehouseId)}
              href={hrefForWarehouse(item.warehouseId)}
            />
          </span>
        ),
        products: snapshot.adjustmentLines
          .filter((line) => line.adjustmentId === item.id)
          .map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            productName: line.productName,
            productSku: line.productSku,
            productUnit: line.productUnit,
          })),
        status: item.status,
      }))}
      extraHeader="Операция / склад"
      isLoading={isLoading}
      error={error}
      status={status}
      onStatus={setStatus}
      onCreate={() => setOpen(true)}
    >
      <AdjustmentForm
        snapshot={snapshot}
        balances={balances}
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
  const store = useLogisticsStore();
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
      cancelSubject={doc ? { type: "adjustment", id: doc.id } : undefined}
      onCancelFollowUp={(action, guidance) => {
        if (action.id === "open-adjustment") {
          setAdjustPreset(guidance.adjustmentPreset);
          setAdjustOpen(true);
        }
      }}
      related={
        <>
          {warehouse ? (
            <RelatedDocuments
              title="Склад"
              items={[
                {
                  id: warehouse.id,
                  href: hrefForWarehouse(warehouse.id),
                  label: warehouse.code,
                  meta: doc ? ADJUSTMENT_OPERATION_LABELS[doc.operation] : "",
                },
              ]}
            />
          ) : null}
          {doc && sourceHref && sourceLabel && doc.sourceDocumentId ? (
            <RelatedDocuments
              title="Исходный документ"
              items={[
                {
                  id: doc.sourceDocumentId,
                  href: sourceHref,
                  label: sourceLabel,
                  meta: doc.sourceDocumentType ? DOCUMENT_TYPE_LABELS[doc.sourceDocumentType] : "",
                },
              ]}
            />
          ) : null}
        </>
      }
      lines={lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        quantity: line.quantity,
        quantityLabel: formatSignedQuantity(
          doc ? adjustmentSignedQuantity(doc.operation === "mixed" ? "decrease" : doc.operation, line.quantity) : line.quantity,
          productById(store.snapshot, line.productId)?.unit,
        ),
        place: warehouse ? (
          <LogisticsCodeBadge code={warehouse.code} href={hrefForWarehouse(warehouse.id)} />
        ) : (
          "Склад"
        ),
        hint: doc?.explanation,
      }))}
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
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<(typeof OUTPUT_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [drafts, setDrafts] = useState<ProductionOutputDraftLine[]>([]);
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const creatingRef = useRef(false);
  const rows = snapshot.outputs.filter((item) => status === "all" || item.status === status);
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
                  code={productionOrderById(snapshot, item.productionOrderId)?.number ?? item.productionOrderId}
                  href={`/store/logistics/production-orders/${productionOrderById(snapshot, item.productionOrderId)?.sequenceNumber ?? item.productionOrderId}`}
                />
              </TableCell>
              <TableCell className="px-3 py-2 align-top">
                <DocumentProductLines
                  snapshot={snapshot}
                  lines={snapshot.outputLines.filter((line) => line.outputId === item.id)}
                />
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
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const OutputDetailPage = () => {
  const params = useParams<{ id: string }>();
  const store = useLogisticsStore();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPreset, setAdjustPreset] = useState<CancelGuidance["adjustmentPreset"]>();
  const doc = matchDocumentParam(store.snapshot.outputs, params.id);
  const lines = doc ? store.snapshot.outputLines.filter((line) => line.outputId === doc.id) : [];
  const production = doc ? productionOrderById(store.snapshot, doc.productionOrderId) : undefined;
  const allocations = doc ? relatedOrdersForOutput(store.snapshot, doc.id) : [];
  const cancelGuidance = doc
    ? projectDocumentCancelGuidance({ type: "output", id: doc.id }, store.snapshot, store.balances)
    : null;

  if (store.isLoading || store.error || !doc) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Выпуски", href: "/store/logistics/outputs" }, { label: "Выпуск" }]}>
        {store.isLoading ? <LogisticsLoading /> : <LogisticsError message={store.error ?? "Выпуск не найден."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={[{ label: "Выпуски", href: "/store/logistics/outputs" }, { label: doc.number }]}>
      <LogisticsToolbar
        title={doc.number}
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
      >
        <LogisticsMetaField label="Статус">
          <OutputStatusBadge status={doc.status} />
        </LogisticsMetaField>
        <ExpectedEndField
          layout="inline"
          value={doc.expectedEndOn ?? ""}
          onChange={(value) => {
            void runLogisticsAction(
              () => updateExpectedEnd(doc.id, value || null),
              "Срок выпуска обновлён",
              store.reload,
            );
          }}
        />
      </LogisticsToolbar>
      {production ? (
        <RelatedDocuments
          title="Заказ на производство"
          items={[
            {
              id: production.id,
              href: `/store/logistics/production-orders/${production.sequenceNumber}`,
              label: production.number,
              meta: expectedEndMeta(production.status, production.expectedEndOn),
            },
          ]}
        />
      ) : null}
      <RelatedDocuments title="Под заказы клиента" items={allocations} />
      <LogisticsTableCard headers={["Товар", "Количество", "Место", "Лимит"]} isEmpty={lines.length === 0}>
        {lines.map((line) => {
          const planned = store.snapshot.productionOrderLines.find((item) => item.id === line.productionOrderLineId);
          return {
            line,
            hint: `Осталось выпустить по плану ${formatQuantity(
              Math.max(
                0,
                remainingToOutputForLine(store.snapshot, line.productionOrderLineId, planned?.quantity ?? line.quantity),
              ),
            )}`,
          };
        }).map(({ line, hint }) => (
          <TableRow key={line.id}>
            <TableCell className="px-3 py-2">
              <ProductIdentity snapshot={store.snapshot} productId={line.productId} />
            </TableCell>
            <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(line.quantity)}</TableCell>
            <TableCell className="px-3 py-2 text-sm">{production?.number ?? "Заказ на производство"}</TableCell>
            <TableCell className="px-3 py-2 text-xs text-muted-foreground">{hint}</TableCell>
          </TableRow>
        ))}
      </LogisticsTableCard>
      {[...new Set(lines.map((line) => line.productId))].map((productId) => (
        <AvailabilityPanel
          key={productId}
          snapshot={store.snapshot}
          balances={store.balances}
          productId={productId}
        />
      ))}
      <DocumentLedger
        snapshot={store.snapshot}
        hide="document"
        filter={(entry) => entry.documentType === "output" && entry.documentId === doc.id}
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
    productSku?: string | null;
    productUnit?: string | null;
  }>;
  status: DocumentStatus;
};

const DocumentList = ({
  title,
  crumbs,
  path,
  snapshot,
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
  snapshot: LogisticsSnapshot;
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
              <DocumentProductLines snapshot={snapshot} lines={row.products} />
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
  extraActions?: React.ReactNode;
  related?: React.ReactNode;
  lines: Array<{
    id: string;
    productId: string;
    quantity: number;
    quantityLabel?: string;
    place: React.ReactNode;
    hint?: string;
  }>;
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

  return (
    <LogisticsPageShell crumbs={crumbs}>
      <LogisticsToolbar
        title={title}
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
      >
        <DocumentStatusBadge status={status} />
      </LogisticsToolbar>
      {related}
      <LogisticsTableCard headers={["Товар", "Количество", "Место", "Лимит"]} isEmpty={lines.length === 0}>
        {lines.map((line) => (
          <TableRow key={line.id}>
            <TableCell className="px-3 py-2">
              <ProductIdentity snapshot={store.snapshot} productId={line.productId} />
            </TableCell>
            <TableCell className="px-3 py-2 text-sm tabular-nums">
              {line.quantityLabel ?? formatQuantity(line.quantity)}
            </TableCell>
            <TableCell className="px-3 py-2 text-sm">{line.place}</TableCell>
            <TableCell className="px-3 py-2 text-xs text-muted-foreground">{line.hint ?? "—"}</TableCell>
          </TableRow>
        ))}
      </LogisticsTableCard>
      {lines[0]?.productId ? (
        <AvailabilityPanel snapshot={store.snapshot} balances={store.balances} productId={lines[0].productId} />
      ) : null}
      {sourceId && documentType ? (
        <DocumentLedger
          snapshot={store.snapshot}
          hide="document"
          filter={(entry) => entry.documentType === documentType && entry.documentId === sourceId}
        />
      ) : null}
    </LogisticsPageShell>
  );
};
