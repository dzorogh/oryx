// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import { sumReservedForLine, sumShippedForLine } from "@/features/logistics/logistics-balances";
import { closeCustomerOrder, insertRows, insertReturningId, updateExpectedEnd } from "@/features/logistics/logistics-api";
import {
  remainingToReserveForLine,
  sumFreeForProduct,
} from "@/features/logistics/logistics-availability";
import { ReservationForm, ShipmentForm } from "@/features/logistics/logistics-forms";
import {
  OutputFromOrderForm,
  ProductionFromOrderForm,
  ReserveOnProductionForm,
  ReserveOnTransferForm,
  TransferReservedForm,
} from "@/features/logistics/order-action-forms";
import { formatExpectedEnd, formatQuantity } from "@/features/logistics/logistics-labels";
import { productById, productIdentityLabel } from "@/features/logistics/logistics-lookups";
import {
  relatedOutputsForOrder,
  relatedProductionsForOrder,
  relatedReservations,
  relatedReturnsForOrder,
  relatedShipments,
  relatedTransfersForOrder,
} from "@/features/logistics/logistics-related";
import type { CustomerOrderLine, CustomerOrderStatus, LocationType } from "@/features/logistics/logistics-types";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { CustomerOrderLinesTable } from "@/features/logistics/ui/customer-order-lines-table";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsMetaField, LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { RelatedDocuments, RelatedDocumentsBoard } from "@/features/logistics/ui/related-documents";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { CustomerOrderStatusBadge } from "@/features/logistics/ui/status-badge";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const STATUS_FILTERS: Array<{ id: "all" | CustomerOrderStatus; label: string }> = [
  { id: "all", label: "Все" },
  { id: "open", label: "Открыт" },
  { id: "closed", label: "Закрыт" },
];

export const CustomerOrdersPage = () => {
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Array<{ productId: string; quantity: string }>>([
    { productId: "", quantity: "1" },
  ]);
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [description, setDescription] = useState("");

  const rows = snapshot.customerOrders.filter((order) => status === "all" || order.status === status);
  const productItems = snapshot.products.map((product) => ({
    value: product.id,
    label: productIdentityLabel(
      product,
      product.id,
      `свободно ${formatQuantity(sumFreeForProduct(balances, product.id), product.unit)}`,
    ),
  }));

  const createOrder = async () => {
    const validLines = lines.filter((line) => line.productId && Number(line.quantity) > 0);
    if (validLines.length === 0) {
      toast.error("Добавьте хотя бы одну строку с товаром и количеством");
      return;
    }
    const ok = await runLogisticsAction(
      async () => {
        const id = await insertReturningId("logistics_customer_order", {
          status: "open",
          expected_end_on: expectedEndOn || null,
          description: description.trim(),
        });
        await insertRows(
          "logistics_customer_order_line",
          validLines.map((line) => ({
            order_id: id,
            product_id: line.productId,
            quantity: Number(line.quantity),
          })),
        );
      },
      "Заказ создан",
      reload,
    );
    if (ok) {
      setOpen(false);
      setExpectedEndOn("");
      setDescription("");
      setLines([{ productId: "", quantity: "1" }]);
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Заказы" }]}>
      <LogisticsToolbar
        title="Заказы"
        description="Только потребность. Товар становится занятым бронью; заказы на производство, выпуск, перемещение и отгрузка двигают уже занятое."
        actionLabel="Новый заказ"
        onAction={() => setOpen(true)}
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Статус заказа">
          {STATUS_FILTERS.map((item) => (
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
        <LogisticsTableCard
          headers={["Номер", "Статус", "Ожидаемое окончание", "Товары", "Занято", "Отгружено", "Открыто к брони", "Создан"]}
          isEmpty={rows.length === 0}
        >
          {rows.map((order) => {
            const orderLines = snapshot.customerOrderLines.filter((line) => line.orderId === order.id);
            const reserved = orderLines.reduce((sum, line) => sum + sumReservedForLine(balances, line.id), 0);
            const shipped = orderLines.reduce((sum, line) => sum + sumShippedForLine(balances, line.id), 0);
            const openQty = orderLines.reduce((sum, line) => sum + remainingToReserveForLine(line, balances), 0);
            const products = orderLines
              .map((line) => productById(snapshot, line.productId)?.name ?? line.productId)
              .join(", ");
            return (
              <TableRow key={order.id}>
                <TableCell className="px-3 py-2 text-sm font-medium">
                  <LogisticsCodeBadge
                    code={order.number}
                    href={`/store/logistics/customer-orders/${order.id}`}
                  />
                  {order.description ? (
                    <p className="mt-0.5 max-w-md truncate text-xs font-normal text-muted-foreground">
                      {order.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <CustomerOrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">
                  {formatExpectedEnd(order.expectedEndOn)}
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">{products || "—"}</TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(reserved)}</TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(shipped)}</TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(openQty)}</TableCell>
                <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                </TableCell>
              </TableRow>
            );
          })}
        </LogisticsTableCard>
      ) : null}

      <LogisticsDialog
        open={open}
        onOpenChange={setOpen}
        title="Новый заказ"
        description="Создание заказа не двигает остатки. Свободный остаток показан, чтобы сразу видеть, хватит ли товара."
      >
        <div className="flex flex-col gap-3">
          <ExpectedEndField value={expectedEndOn} onChange={setExpectedEndOn} />
          <label className="space-y-1 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="Optional ops note"
            />
          </label>
          {lines.map((line, index) => (
            <div key={`line-${index}`} className="space-y-2">
              <div className="grid grid-cols-[1fr_6rem] gap-2">
                <FieldSelect
                  label={index === 0 ? "Товар" : `Товар ${index + 1}`}
                  value={line.productId}
                  items={productItems}
                  onChange={(value) => {
                    setLines((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, productId: value } : item,
                      ),
                    );
                  }}
                />
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Кол-во</span>
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
                </label>
              </div>
              {line.productId ? (
                <AvailabilityPanel snapshot={snapshot} balances={balances} productId={line.productId} />
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((current) => [...current, { productId: "", quantity: "1" }])}
          >
            Добавить строку
          </Button>
          <Button type="button" onClick={() => void createOrder()}>
            Создать заказ
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const CustomerOrderDetailPage = () => {
  const params = useParams<{ orderId: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const order = snapshot.customerOrders.find((item) => item.id === params.orderId);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [productionOpen, setProductionOpen] = useState(false);
  const [reserveOnProductionOpen, setReserveOnProductionOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [reserveOnTransferOpen, setReserveOnTransferOpen] = useState(false);
  const [reserveLine, setReserveLine] = useState<CustomerOrderLine | null>(null);
  const [releasePlace, setReleasePlace] = useState<{
    line: CustomerOrderLine;
    locationType: LocationType;
    locationId: string;
  } | null>(null);

  const lines = useMemo(
    () => snapshot.customerOrderLines.filter((line) => line.orderId === params.orderId),
    [params.orderId, snapshot.customerOrderLines],
  );

  if (isLoading) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Заказы", href: "/store/logistics/customer-orders" }, { label: "Заказ" }]}>
        <LogisticsLoading />
      </LogisticsPageShell>
    );
  }

  if (error) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Заказы", href: "/store/logistics/customer-orders" }, { label: "Заказ" }]}>
        <LogisticsError message={error} />
      </LogisticsPageShell>
    );
  }

  if (!order) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Заказы", href: "/store/logistics/customer-orders" }, { label: "Нет заказа" }]}>
        <LogisticsError message="Заказ не найден." />
      </LogisticsPageShell>
    );
  }

  const canAct = order.status === "open";

  return (
    <LogisticsPageShell crumbs={[{ label: "Заказы", href: "/store/logistics/customer-orders" }, { label: order.number }]}>
      <LogisticsToolbar
        title={order.number}
        description="Reservations hold stock for this order. Later steps only move what is already reserved."
        actions={
          canAct ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void runLogisticsAction(
                  () => closeCustomerOrder(order.id),
                  "Открытые брони сняты, заказ закрыт",
                  reload,
                );
              }}
            >
              Закрыть заказ
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <LogisticsMetaField label="Статус">
            <CustomerOrderStatusBadge status={order.status} />
          </LogisticsMetaField>
          <ExpectedEndField
            layout="inline"
            value={order.expectedEndOn ?? ""}
            onChange={(value) => {
              void runLogisticsAction(
                () => updateExpectedEnd("logistics_customer_order", order.id, value || null),
                "Срок заказа обновлён",
                reload,
              );
            }}
          />
        </div>
        {order.description ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="max-w-3xl text-sm text-foreground">{order.description}</p>
          </div>
        ) : null}
      </LogisticsToolbar>

      <RelatedDocumentsBoard>
        <RelatedDocuments
          title="Production orders"
          href="/store/logistics/production-orders"
          items={relatedProductionsForOrder(snapshot, order.id, balances)}
          actions={
            canAct
              ? [
                { label: "New production order", onClick: () => setProductionOpen(true) },
                { label: "Reserve on production order", onClick: () => setReserveOnProductionOpen(true) },
              ]
              : undefined
          }
        />
        <RelatedDocuments
          title="Выпуски"
          href="/store/logistics/outputs"
          items={relatedOutputsForOrder(snapshot, order.id)}
          onCreate={canAct ? () => setOutputOpen(true) : undefined}
          createLabel="Выпустить"
        />
        <RelatedDocuments
          title="Перемещения"
          href="/store/logistics/transfers"
          items={relatedTransfersForOrder(snapshot, order.id)}
          actions={
            canAct
              ? [
                { label: "Переместить занятое", onClick: () => setTransferOpen(true) },
                { label: "Забронировать в пути", onClick: () => setReserveOnTransferOpen(true) },
              ]
              : undefined
          }
        />
        <RelatedDocuments
          title="Отгрузки"
          href="/store/logistics/shipments"
          items={relatedShipments(snapshot, order.id)}
          onCreate={canAct ? () => setShipOpen(true) : undefined}
          createLabel="Отгрузить"
        />
        <RelatedDocuments
          title="Reservations"
          href="/store/logistics/reservations"
          items={relatedReservations(snapshot, order.id)}
          onCreate={canAct ? () => { setReserveLine(null); setReserveOpen(true); } : undefined}
          createLabel="Reserve"
        />
        <RelatedDocuments
          title="Returns"
          href="/store/logistics/returns"
          items={relatedReturnsForOrder(snapshot, order.id)}
        />
      </RelatedDocumentsBoard>

      <CustomerOrderLinesTable
        snapshot={snapshot}
        balances={balances}
        lines={lines}
        canAct={canAct}
        onReserve={(line) => {
          setReserveLine(line);
          setReserveOpen(true);
        }}
        onShip={() => setShipOpen(true)}
        onRelease={(place) => {
          setReleasePlace(place);
          setReleaseOpen(true);
        }}
      />

      <DocumentLedger
        snapshot={snapshot}
        filter={(entry) => entry.customerOrderId === order.id}
        title="Движения по заказу"
      />

      <ReservationForm
        snapshot={snapshot}
        balances={balances}
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        reload={reload}
        mode="hub"
        preset={{
          customerOrderId: order.id,
          customerOrderLineId: reserveLine?.id,
          operation: "reserve",
        }}
      />
      <ShipmentForm
        snapshot={snapshot}
        balances={balances}
        open={shipOpen}
        onOpenChange={setShipOpen}
        reload={reload}
        mode="hub"
        preset={{ customerOrderId: order.id }}
      />
      <ReservationForm
        snapshot={snapshot}
        balances={balances}
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        reload={reload}
        mode="hub"
        preset={{
          customerOrderId: order.id,
          customerOrderLineId: releasePlace?.line.id,
          locationType: releasePlace?.locationType === "customer_order" ? undefined : releasePlace?.locationType as "warehouse" | "production_order_line" | "transfer" | undefined,
          locationId: releasePlace?.locationId,
          operation: "release",
        }}
      />
      <ProductionFromOrderForm
        snapshot={snapshot}
        balances={balances}
        open={productionOpen}
        onOpenChange={setProductionOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
      <ReserveOnProductionForm
        snapshot={snapshot}
        balances={balances}
        open={reserveOnProductionOpen}
        onOpenChange={setReserveOnProductionOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
      <OutputFromOrderForm
        snapshot={snapshot}
        balances={balances}
        open={outputOpen}
        onOpenChange={setOutputOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
      <TransferReservedForm
        snapshot={snapshot}
        balances={balances}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
      <ReserveOnTransferForm
        snapshot={snapshot}
        balances={balances}
        open={reserveOnTransferOpen}
        onOpenChange={setReserveOnTransferOpen}
        reload={reload}
        customerOrderId={order.id}
        lines={lines}
      />
    </LogisticsPageShell>
  );
};
