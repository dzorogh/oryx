// english-ui:ignore-file
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  completeOutput,
  createProductionOutput,
  postReturn,
  postShipment,
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
  remainingToOutputForLine,
  remainingToReserveForLine,
  remainingToReturnForLine,
  remainingToShipForLine,
} from "@/features/logistics/logistics-availability";
import { AdjustmentForm, ReservationForm, ReturnForm, ShipmentForm } from "@/features/logistics/logistics-forms";
import {
  ADJUSTMENT_OPERATION_LABELS,
  DOCUMENT_TYPE_LABELS,
  expectedEndMeta,
  formatExpectedEnd,
  formatQuantity,
  formatSignedQuantity,
  OUTPUT_STATUS_LABELS,
} from "@/features/logistics/logistics-labels";
import { adjustmentSignedQuantity } from "@/features/logistics/logistics-adjustments";
import {
  customerOrderById,
  productById,
  productIdentityLabel,
  productionOrderById,
  warehouseById,
  warehouseCode,
  documentLabel,
} from "@/features/logistics/logistics-lookups";
import { DocumentProductLines } from "@/features/logistics/ui/document-product-lines";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { relatedOrderItem, relatedOrdersForOutput, relatedReturnsForShipment } from "@/features/logistics/logistics-related";
import {
  assertEnoughStock,
  assertProductionOutputCapacity,
} from "@/features/logistics/logistics-rules";
import {
  OUTPUT_STATUSES,
  type DocumentStatus,
  type DocumentType,
  type LogisticsSnapshot,
  type OutputStatus,
} from "@/features/logistics/logistics-types";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsMetaField, LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { RelatedDocuments } from "@/features/logistics/ui/related-documents";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { DocumentStatusBadge, OutputStatusBadge } from "@/features/logistics/ui/status-badge";
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

export const ShipmentsPage = () => {
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const rows = snapshot.shipments.filter((item) => status === "all" || item.status === status);

  return (
    <DocumentList
      title="Отгрузки"
      crumbs="Отгрузки"
      actionLabel="Новая отгрузка"
      snapshot={snapshot}
      path="/store/logistics/shipments"
      rows={rows.map((item) => ({
        id: item.id,
        number: item.number,
        extra: (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <LogisticsCodeBadge
              code={customerOrderById(snapshot, item.customerOrderId)?.number ?? item.customerOrderId}
              href={hrefForCustomerOrder(item.customerOrderId)}
            />
            <LogisticsCodeBadge
              code={warehouseCode(snapshot, item.warehouseId)}
              href={hrefForWarehouse(item.warehouseId)}
            />
          </span>
        ),
        products: snapshot.shipmentLines.filter((line) => line.shipmentId === item.id),
        status: item.status,
      }))}
      extraHeader="Заказ клиента / склад"
      isLoading={isLoading}
      error={error}
      status={status}
      onStatus={setStatus}
      onCreate={() => setOpen(true)}
    >
      <ShipmentForm
        snapshot={snapshot}
        balances={balances}
        open={open}
        onOpenChange={setOpen}
        reload={reload}
        mode="list"
      />
    </DocumentList>
  );
};

export const ShipmentDetailPage = () => {
  const params = useParams<{ id: string }>();
  const store = useLogisticsStore();
  const [returnOpen, setReturnOpen] = useState(false);
  const doc = store.snapshot.shipments.find((item) => item.id === params.id);
  const lines = store.snapshot.shipmentLines.filter((line) => line.shipmentId === params.id);
  const order = doc ? relatedOrderItem(store.snapshot, doc.customerOrderId) : null;
  const returns = doc ? relatedReturnsForShipment(store.snapshot, doc.id) : [];

  return (
    <>
      <DocumentDetail
        store={store}
        title={doc?.number ?? "Отгрузка"}
        crumbs={[{ label: "Отгрузки", href: "/store/logistics/shipments" }, { label: doc?.number ?? "Отгрузка" }]}
        status={doc?.status}
        documentType="shipment"
        sourceId={doc?.id}
        onPost={doc ? () => postShipment(doc.id) : undefined}
        cancelSubject={doc ? { type: "shipment", id: doc.id } : undefined}
        onCancelFollowUp={(action) => {
          if (action.id === "open-return") {
            setReturnOpen(true);
          }
        }}
        extraActions={
          doc?.status === "posted" ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setReturnOpen(true)}>
              Вернуть
            </Button>
          ) : null
        }
        related={
          <>
          {order ? <RelatedDocuments title="Заказ клиента" items={[order]} /> : null}
            <RelatedDocuments
              title="Возвраты"
              href="/store/logistics/returns"
              items={returns}
              onCreate={doc?.status === "posted" ? () => setReturnOpen(true) : undefined}
              createLabel="Вернуть"
            />
          </>
        }
        lines={lines.map((line) => {
          const orderLine = store.snapshot.customerOrderLines.find(
            (item) => item.orderId === doc?.customerOrderId && item.productId === line.productId,
          );
          const remaining = orderLine
            ? remainingToShipForLine(orderLine, store.balances, doc?.warehouseId)
            : 0;
          const returned = remainingToReturnForLine(store.snapshot, line.id, line.quantity);
          return {
            id: line.id,
            productId: line.productId,
            quantity: line.quantity,
            place: doc?.warehouseId ? (
              <LogisticsCodeBadge
                code={warehouseCode(store.snapshot, doc.warehouseId)}
                href={hrefForWarehouse(doc.warehouseId)}
              />
            ) : (
              "Склад"
            ),
            hint: `Ещё можно отгрузить ${formatQuantity(remaining)} · можно вернуть ${formatQuantity(returned)}`,
          };
        })}
      />
      {doc ? (
        <ReturnForm
          snapshot={store.snapshot}
          balances={store.balances}
          open={returnOpen}
          onOpenChange={setReturnOpen}
          reload={store.reload}
          mode="hub"
          preset={{ shipmentId: doc.id }}
        />
      ) : null}
    </>
  );
};

export const ReturnsPage = () => {
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const rows = snapshot.returns.filter((item) => status === "all" || item.status === status);

  return (
    <DocumentList
      title="Возвраты"
      crumbs="Возвраты"
      actionLabel="Новый возврат"
      snapshot={snapshot}
      path="/store/logistics/returns"
      rows={rows.map((item) => {
        const shipment = snapshot.shipments.find((entry) => entry.id === item.shipmentId);
        return {
          id: item.id,
          number: item.number,
          extra: shipment?.number ?? item.shipmentId,
          extraHref: shipment ? `/store/logistics/shipments/${shipment.id}` : undefined,
          products: snapshot.returnLines
            .filter((line) => line.returnId === item.id)
            .map((line) => {
              const shipmentLine = snapshot.shipmentLines.find((entry) => entry.id === line.shipmentLineId);
              return { productId: shipmentLine?.productId ?? "", quantity: line.quantity };
            }),
          status: item.status,
        };
      })}
      extraHeader="Отгрузка"
      isLoading={isLoading}
      error={error}
      status={status}
      onStatus={setStatus}
      onCreate={() => setOpen(true)}
    >
      <ReturnForm
        snapshot={snapshot}
        balances={balances}
        open={open}
        onOpenChange={setOpen}
        reload={reload}
        mode="list"
      />
    </DocumentList>
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
  const doc = store.snapshot.adjustments.find((item) => item.id === params.id);
  const lines = store.snapshot.adjustmentLines.filter((line) => line.adjustmentId === params.id);
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
          doc ? adjustmentSignedQuantity(doc.operation, line.quantity) : line.quantity,
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
    <AdjustmentForm
      snapshot={store.snapshot}
      balances={store.balances}
      open={adjustOpen}
      onOpenChange={setAdjustOpen}
      reload={store.reload}
      mode="hub"
      preset={adjustPreset}
    />
    </>
  );
};

export const ReturnDetailPage = () => {
  const params = useParams<{ id: string }>();
  const store = useLogisticsStore();
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reservePreset, setReservePreset] = useState<CancelGuidance["reservationPreset"]>();
  const doc = store.snapshot.returns.find((item) => item.id === params.id);
  const lines = store.snapshot.returnLines.filter((line) => line.returnId === params.id);
  const shipment = doc ? store.snapshot.shipments.find((item) => item.id === doc.shipmentId) : undefined;
  const order = shipment ? relatedOrderItem(store.snapshot, shipment.customerOrderId) : null;
  const warehouse = shipment ? warehouseById(store.snapshot, shipment.warehouseId) : undefined;

  return (
    <>
    <DocumentDetail
      store={store}
      title={doc?.number ?? "Возврат"}
      crumbs={[{ label: "Возвраты", href: "/store/logistics/returns" }, { label: doc?.number ?? "Возврат" }]}
      status={doc?.status}
      documentType="return"
      sourceId={doc?.id}
      onPost={doc ? () => postReturn(doc.id) : undefined}
      cancelSubject={doc ? { type: "return", id: doc.id } : undefined}
      onCancelFollowUp={(action, guidance) => {
        if (action.id === "open-reservation") {
          setReservePreset(guidance.reservationPreset);
          setReserveOpen(true);
        }
      }}
      related={
        <>
          {shipment ? (
            <RelatedDocuments
              title="Отгрузка"
              items={[
                {
                  id: shipment.id,
                  href: `/store/logistics/shipments/${shipment.id}`,
                  label: shipment.number,
                  meta: shipment.status,
                },
              ]}
            />
          ) : null}
          {order ? <RelatedDocuments title="Заказ клиента" items={[order]} /> : null}
        </>
      }
      lines={lines.map((line) => {
        const shipmentLine = store.snapshot.shipmentLines.find((item) => item.id === line.shipmentLineId);
        const remaining = shipmentLine
          ? remainingToReturnForLine(store.snapshot, shipmentLine.id, shipmentLine.quantity)
          : 0;
        return {
          id: line.id,
          productId: shipmentLine?.productId ?? "",
          quantity: line.quantity,
          place: warehouse ? (
            <LogisticsCodeBadge code={warehouse.code} href={hrefForWarehouse(warehouse.id)} />
          ) : (
            "Склад отгрузки"
          ),
          hint: `Ещё можно вернуть ${formatQuantity(remaining)}`,
        };
      })}
    />
    <ReservationForm
      snapshot={store.snapshot}
      balances={store.balances}
      open={reserveOpen}
      onOpenChange={setReserveOpen}
      reload={store.reload}
      mode="hub"
      preset={reservePreset}
    />
    </>
  );
};

const OUTPUT_FILTERS: Array<{ id: "all" | OutputStatus; label: string }> = [
  { id: "all", label: "Все" },
  ...OUTPUT_STATUSES.map((status) => ({ id: status, label: OUTPUT_STATUS_LABELS[status] })),
];

export const OutputsPage = () => {
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<(typeof OUTPUT_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [lineId, setLineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [allocOrderLineId, setAllocOrderLineId] = useState("none");
  const [allocQty, setAllocQty] = useState("0");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const rows = snapshot.outputs.filter((item) => status === "all" || item.status === status);
  const prodLines = snapshot.productionOrderLines.filter((line) => line.orderId === orderId);
  const selectedLine = prodLines.find((line) => line.id === lineId);
  const remaining = selectedLine
    ? remainingToOutputForLine(snapshot, selectedLine.id, selectedLine.quantity)
    : 0;
  const allocLine = snapshot.customerOrderLines.find((line) => line.id === allocOrderLineId);
  const allocMax = allocLine
    ? Math.min(Number(quantity) || remaining, remainingToReserveForLine(allocLine, balances))
    : 0;

  const create = async (complete: boolean) => {
    if (!orderId || !selectedLine || !isAllowedQuantity(quantity, remaining)) {
      toast.error("Выберите строку заказа на производство и количество в пределах плана");
      return;
    }
    try {
      assertProductionOutputCapacity(
        selectedLine,
        outputtedAlready(snapshot, selectedLine.id),
        Number(quantity),
      );
      if (allocLine && Number(allocQty) > 0) {
        assertEnoughStock(allocMax, Number(allocQty), "open order");
      }
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Проверьте количество");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createProductionOutput({
          orderId,
          lineId: selectedLine.id,
          productId: selectedLine.productId,
          quantity: Number(quantity),
          expectedEndOn: expectedEndOn || null,
          complete,
          allocation:
            allocLine && Number(allocQty) > 0
              ? {
                ownerType: "order" as const,
                ownerId: allocLine.orderId,
                productId: allocLine.productId,
                quantity: Number(allocQty),
              }
              : undefined,
        }),
      complete ? "Выпуск завершён" : "Выпуск запланирован",
      reload,
    );
    if (ok) {
      setOpen(false);
      setExpectedEndOn("");
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Выпуски" }]}>
      <LogisticsToolbar
        title="Выпуски"
        actionLabel="Новый выпуск"
        onAction={() => setOpen(true)}
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
                <LogisticsCodeBadge code={item.number} href={`/store/logistics/outputs/${item.id}`} />
              </TableCell>
              <TableCell className="px-3 py-2 align-top">
                <LogisticsCodeBadge
                  code={productionOrderById(snapshot, item.productionOrderId)?.number ?? item.productionOrderId}
                  href={`/store/logistics/production-orders/${item.productionOrderId}`}
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
        onOpenChange={setOpen}
        title="Новый выпуск"
      >
        <div className="flex flex-col gap-3">
          <FieldSelect
            label="Заказ на производство"
            value={orderId}
            items={snapshot.productionOrders
              .filter((item) => item.status !== "closed" && item.status !== "cancelled")
              .map((item) => ({ value: item.id, label: item.number }))}
            onChange={(value) => {
              setOrderId(value);
              setLineId("");
            }}
          />
          <FieldSelect
            label="Строка заказа на производство"
            value={lineId}
            items={prodLines.map((line) => ({
              value: line.id,
              label: productIdentityLabel(
                productById(snapshot, line.productId),
                line.productId,
                `осталось ${formatQuantity(remainingToOutputForLine(snapshot, line.id, line.quantity))}`,
              ),
            }))}
            onChange={setLineId}
          />
          {selectedLine ? (
            <AvailabilityPanel snapshot={snapshot} balances={balances} productId={selectedLine.productId} />
          ) : null}
          <QuantityField value={quantity} onChange={setQuantity} max={selectedLine ? remaining : undefined} />
          <FieldSelect
            label="Зарезервировать под строку заказа клиента"
            value={allocOrderLineId}
            items={[
              { value: "none", label: "Нет — оставить свободным" },
              ...snapshot.customerOrderLines
                .filter((line) => !selectedLine || line.productId === selectedLine.productId)
                .filter((line) => snapshot.customerOrders.find((item) => item.id === line.orderId)?.status === "open")
                .map((line) => ({
                  value: line.id,
                  label: `${customerOrderById(snapshot, line.orderId)?.number ?? line.orderId} · можно ${formatQuantity(remainingToReserveForLine(line, balances))}`,
                })),
            ]}
            onChange={setAllocOrderLineId}
          />
          {allocLine ? (
            <QuantityField
              label="Занятое количество"
              value={allocQty}
              onChange={setAllocQty}
              max={allocMax}
              min={0}
            />
          ) : null}
          <ExpectedEndField value={expectedEndOn} onChange={setExpectedEndOn} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!selectedLine || !isAllowedQuantity(quantity, remaining)}
              onClick={() => void create(false)}
            >
              Сохранить план
            </Button>
            <Button
              type="button"
              disabled={!selectedLine || !isAllowedQuantity(quantity, remaining)}
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

const outputtedAlready = (
  snapshot: ReturnType<typeof useLogisticsStore>["snapshot"],
  productionOrderLineId: string,
): number =>
  snapshot.outputLines
    .filter((line) => {
      if (line.productionOrderLineId !== productionOrderLineId) {
        return false;
      }
      return snapshot.outputs.find((item) => item.id === line.outputId)?.status === "done";
    })
    .reduce((sum, line) => sum + line.quantity, 0);

export const OutputDetailPage = () => {
  const params = useParams<{ id: string }>();
  const store = useLogisticsStore();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPreset, setAdjustPreset] = useState<CancelGuidance["adjustmentPreset"]>();
  const doc = store.snapshot.outputs.find((item) => item.id === params.id);
  const lines = store.snapshot.outputLines.filter((line) => line.outputId === params.id);
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
              () => updateExpectedEnd("store_output", doc.id, value || null),
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
              href: `/store/logistics/production-orders/${production.id}`,
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
      {lines[0]?.productId ? (
        <AvailabilityPanel snapshot={store.snapshot} balances={store.balances} productId={lines[0].productId} />
      ) : null}
      <DocumentLedger
        snapshot={store.snapshot}
        hide="document"
        filter={(entry) => entry.documentType === "output" && entry.documentId === doc.id}
      />
      <AdjustmentForm
        snapshot={store.snapshot}
        balances={store.balances}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        reload={store.reload}
        mode="hub"
        preset={adjustPreset}
      />
    </LogisticsPageShell>
  );
};

type ListRow = {
  id: string;
  number: string;
  extra: React.ReactNode;
  extraHref?: string;
  products: Array<{ productId: string; quantity: number }>;
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
              <LogisticsCodeBadge code={row.number} href={`${path}/${row.id}`} />
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
