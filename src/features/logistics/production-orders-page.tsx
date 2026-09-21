// english-ui:ignore-file
"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
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
import { TableCell, TableRow } from "@/components/ui/table";
import { remainingToReserve, sumLocationState } from "@/features/logistics/logistics-balances";
import {
  hrefForCustomerOrder,
  hrefForOwner,
  openOrderLinesForProduct,
  productionLineReservationBreakdown,
  remainingToReserveForLine,
} from "@/features/logistics/logistics-availability";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { relatedOrdersForOutput } from "@/features/logistics/logistics-related";
import { assertEnoughStock, assertProductionOutputCapacity } from "@/features/logistics/logistics-rules";
import {
  addProductionLine,
  closeProductionOrder,
  createAndPostReservation,
  createProductionOrder,
  createProductionOutput,
  setProductionStatus,
  updateExpectedEnd,
} from "@/features/logistics/logistics-api";
import { formatExpectedEnd, formatQuantity, PRODUCTION_STATUS_LABELS } from "@/features/logistics/logistics-labels";
import {
  customerOrderById,
  ownerLabel,
  manufacturerIdsForProducts,
  manufacturerSelectItems,
  orderNumber,
  productById,
  productIdentityLabel,
  productsForManufacturer,
} from "@/features/logistics/logistics-lookups";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ManufacturerLink } from "@/features/logistics/ui/manufacturer-link";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { PRODUCTION_STATUSES, type ProductionStatus } from "@/features/logistics/logistics-types";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsMetaField, LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { OutputStatusBadge, ProductionStatusBadge } from "@/features/logistics/ui/status-badge";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const LIST_STATUSES = PRODUCTION_STATUSES.filter((status) => status !== "cancelled");
const WORKFLOW_STATUSES = PRODUCTION_STATUSES.filter(
  (status) => status !== "cancelled" && status !== "closed",
);

export const ProductionOrdersPage = () => {
  const { snapshot, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<"all" | ProductionStatus>("all");
  const [open, setOpen] = useState(false);
  const [manufacturerId, setManufacturerId] = useState("");
  const [lines, setLines] = useState<Array<{ productId: string; quantity: string }>>([
    { productId: "", quantity: "1" },
  ]);
  const [expectedEndOn, setExpectedEndOn] = useState("");

  const rows = snapshot.productionOrders.filter((item) => status === "all" || item.status === status);
  const selectedProductIds = lines.map((line) => line.productId);
  const selectedProductKey = selectedProductIds.join("|");
  const allowedPlantIds = useMemo(
    () => manufacturerIdsForProducts(snapshot, selectedProductKey ? selectedProductKey.split("|") : []),
    [selectedProductKey, snapshot],
  );
  const plantItems = manufacturerSelectItems(snapshot, selectedProductIds);
  const productSource = manufacturerId
    ? productsForManufacturer(snapshot, manufacturerId)
    : snapshot.products;
  const productItems = productSource.map((product) => ({
    value: product.id,
    label: productIdentityLabel(product, product.id),
  }));

  useEffect(() => {
    if (manufacturerId && allowedPlantIds && !allowedPlantIds.includes(manufacturerId)) {
      setManufacturerId("");
    }
  }, [allowedPlantIds, manufacturerId]);

  const create = async () => {
    const validLines = lines.filter((line) => line.productId && Number(line.quantity) > 0);
    if (!manufacturerId || validLines.length === 0) {
      toast.error("Выберите производителя и хотя бы один товар");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createProductionOrder({
          manufacturerId,
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
      setManufacturerId("");
      setExpectedEndOn("");
      setLines([{ productId: "", quantity: "1" }]);
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Заказы на производство" }]}>
      <LogisticsToolbar
        title="Заказы на производство"
        description="Планирует и ограничивает выпуск. После создания количество сразу появляется в остатках заказа на производство."
        actionLabel="Новый заказ на производство"
        onAction={() => setOpen(true)}
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Статус заказа на производство">
          <HomeFilterChip active={status === "all"} role="tab" aria-selected={status === "all"} onClick={() => setStatus("all")}>
            Все
          </HomeFilterChip>
          {LIST_STATUSES.map((item) => (
            <HomeFilterChip
              key={item}
              active={status === item}
              role="tab"
              aria-selected={status === item}
              onClick={() => setStatus(item)}
            >
              {PRODUCTION_STATUS_LABELS[item]}
            </HomeFilterChip>
          ))}
        </div>
      </LogisticsToolbar>
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Номер", "Производитель", "Товары", "Статус", "Ожидаемое окончание"]} isEmpty={rows.length === 0}>
          {rows.map((item) => {
            const orderLines = snapshot.productionOrderLines.filter((line) => line.orderId === item.id);
            const products = orderLines
              .map((line) => productById(snapshot, line.productId)?.name ?? line.productId)
              .join(", ");
            return (
              <TableRow key={item.id}>
                <TableCell className="px-3 py-2">
                  <LogisticsCodeBadge
                    code={item.number}
                    href={`/store/logistics/production-orders/${item.id}`}
                  />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <ManufacturerLink snapshot={snapshot} manufacturerId={item.manufacturerId} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">{products || "—"}</TableCell>
                <TableCell className="px-3 py-2">
                  <ProductionStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">
                  {formatExpectedEnd(item.expectedEndOn)}
                </TableCell>
              </TableRow>
            );
          })}
        </LogisticsTableCard>
      ) : null}

      <LogisticsDialog
        open={open}
        onOpenChange={setOpen}
        title="Новый заказ на производство"
        description="Можно указать несколько товаров. После создания они сразу в остатках заказа на производство."
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Производитель</span>
            <Select
              items={plantItems}
              value={manufacturerId}
              onValueChange={(value) => setManufacturerId(value ?? "")}
            >
              <SelectTrigger className="w-full bg-background" aria-label="Производитель">
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
          <Button type="button" disabled={!manufacturerId || plantItems.length === 0} onClick={() => void create()}>
            Создать
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const ProductionOrderDetailPage = () => {
  const params = useParams<{ orderId: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [productOpen, setProductOpen] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveLineId, setReserveLineId] = useState("");
  const [reserveOrderLineId, setReserveOrderLineId] = useState("");
  const [reserveQuantity, setReserveQuantity] = useState("1");
  const [outputOpen, setOutputOpen] = useState(false);
  const [outputLineId, setOutputLineId] = useState("");
  const [outputQuantity, setOutputQuantity] = useState("1");
  const [outputAllocLineId, setOutputAllocLineId] = useState("none");
  const [outputAllocQty, setOutputAllocQty] = useState("0");
  const [outputExpectedEndOn, setOutputExpectedEndOn] = useState("");
  const [expandedLineIds, setExpandedLineIds] = useState<Set<string>>(() => new Set());
  const [collapsedLineIds, setCollapsedLineIds] = useState<Set<string>>(() => new Set());
  const order = snapshot.productionOrders.find((item) => item.id === params.orderId);
  const lines = useMemo(
    () => snapshot.productionOrderLines.filter((line) => line.orderId === params.orderId),
    [params.orderId, snapshot.productionOrderLines],
  );
  const outputs = snapshot.outputs.filter((item) => item.productionOrderId === params.orderId);
  const doneByLine = useMemo(() => {
    const counts = new Map<string, number>();
    for (const outputLine of snapshot.outputLines) {
      const output = snapshot.outputs.find((item) => item.id === outputLine.outputId);
      if (output?.status !== "done") {
        continue;
      }
      counts.set(outputLine.productionOrderLineId, (counts.get(outputLine.productionOrderLineId) ?? 0) + outputLine.quantity);
    }
    return counts;
  }, [snapshot.outputLines, snapshot.outputs]);
  const reserveLine = lines.find((line) => line.id === reserveLineId);
  const reserveFree = reserveLine
    ? sumLocationState(balances, {
      locationType: "production_order",
      locationId: params.orderId,
      stockState: "free",
      productId: reserveLine.productId,
    })
    : 0;
  const reserveOrderLine = snapshot.customerOrderLines.find((line) => line.id === reserveOrderLineId);
  const reserveOrderItems = reserveLine
    ? openOrderLinesForProduct(snapshot, balances, reserveLine.productId).map((line) => ({
        value: line.id,
        label: `${customerOrderById(snapshot, line.orderId)?.number ?? line.orderId} · осталось ${formatQuantity(remainingToReserveForLine(line, balances))}`,
      }))
    : [];
  const reserveMax = reserveLine && reserveOrderLine
    ? Math.min(reserveFree, remainingToReserveForLine(reserveOrderLine, balances))
    : undefined;
  const outputLine = lines.find((line) => line.id === outputLineId);
  const outputRemaining = outputLine ? outputLine.quantity - (doneByLine.get(outputLine.id) ?? 0) : 0;
  const allocItems = snapshot.customerOrderLines
    .filter((line) => {
      const order = snapshot.customerOrders.find((item) => item.id === line.orderId);
      return order?.status === "open" && (!outputLine || line.productId === outputLine.productId);
    })
    .map((line) => ({
      value: line.id,
      label: `${customerOrderById(snapshot, line.orderId)?.number ?? line.orderId} · можно ${formatQuantity(remainingToReserveForLine(line, balances))}`,
    }));
  const outputAllocLine = snapshot.customerOrderLines.find((line) => line.id === outputAllocLineId);
  const outputAllocMax = outputAllocLine
    ? Math.min(Number(outputQuantity) || outputRemaining, remainingToReserveForLine(outputAllocLine, balances))
    : 0;
  const statusItems = WORKFLOW_STATUSES.map((status) => ({
    value: status,
    label: PRODUCTION_STATUS_LABELS[status],
  }));

  const createOutputFromProduction = async (complete: boolean) => {
    if (!order || !outputLine || !(Number(outputQuantity) > 0)) {
      toast.error("Выберите товар и количество");
      return;
    }
    if (!isAllowedQuantity(outputQuantity, outputRemaining)) {
      toast.error("Нельзя выпустить больше оставшегося плана");
      return;
    }
    try {
      assertProductionOutputCapacity(outputLine, doneByLine.get(outputLine.id) ?? 0, Number(outputQuantity));
      if (Number(outputAllocQty) > 0) {
        assertEnoughStock(outputAllocMax, Number(outputAllocQty), "open order");
      }
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Проверьте количество");
      return;
    }
    const allocLine = snapshot.customerOrderLines.find((line) => line.id === outputAllocLineId);
    const ok = await runLogisticsAction(
      () =>
        createProductionOutput({
          orderId: order.id,
          lineId: outputLine.id,
          productId: outputLine.productId,
          quantity: Number(outputQuantity),
          expectedEndOn: outputExpectedEndOn || null,
          complete,
          allocation:
            allocLine && Number(outputAllocQty) > 0
              ? {
                ownerType: "order" as const,
                ownerId: allocLine.orderId,
                productId: allocLine.productId,
                quantity: Number(outputAllocQty),
              }
              : undefined,
        }),
      complete ? "Выпуск завершён" : "Выпуск запланирован",
      reload,
    );
    if (ok) {
      setOutputOpen(false);
      setOutputQuantity("1");
      setOutputAllocQty("0");
      setOutputExpectedEndOn("");
    }
  };

  if (isLoading || error || !order) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Заказы на производство", href: "/store/logistics/production-orders" }, { label: "Заказ на производство" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Заказ на производство не найден."} />}
      </LogisticsPageShell>
    );
  }

  const canEditStatus = order.status !== "closed" && order.status !== "cancelled";

  return (
    <LogisticsPageShell crumbs={[{ label: "Заказы на производство", href: "/store/logistics/production-orders" }, { label: order.number }]}>
      <LogisticsToolbar
        title={order.number}
        description="Количество сразу в остатках заказа на производство."
        actionLabel={order.status !== "closed" ? "Закрыть заказ на производство" : undefined}
        onAction={
          order.status !== "closed"
            ? () => {
              void runLogisticsAction(
                () => closeProductionOrder(order.id),
                "Резервы сняты, заказ на производство закрыт",
                reload,
              );
            }
            : undefined
        }
      >
        <LogisticsMetaField label="Производитель">
          <ManufacturerLink snapshot={snapshot} manufacturerId={order.manufacturerId} />
        </LogisticsMetaField>
        <LogisticsMetaField label="Статус" htmlFor={canEditStatus ? "production-status" : undefined}>
          {canEditStatus ? (
            <Select
              items={statusItems}
              value={order.status}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }
                void runLogisticsAction(
                  () => setProductionStatus(order.id, value as ProductionStatus),
                  "Статус заказа на производство обновлён",
                  reload,
                );
              }}
            >
              <SelectTrigger id="production-status" className="bg-background" aria-label="Статус заказа на производство">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <ProductionStatusBadge status={order.status} />
          )}
        </LogisticsMetaField>
        <ExpectedEndField
          layout="inline"
          value={order.expectedEndOn ?? ""}
          onChange={(value) => {
            void runLogisticsAction(
              () => updateExpectedEnd("store_production_order", order.id, value || null),
              "Срок заказа на производство обновлён",
              reload,
            );
          }}
        />
      </LogisticsToolbar>

      <LogisticsTableCard
        title="Товары"
        action={
          order.status !== "closed" && order.status !== "cancelled" ? (
            <Button type="button" size="sm" onClick={() => setProductOpen(true)}>
              Добавить товар
            </Button>
          ) : undefined
        }
        headers={["Товар", "План", "Свободно", "Зарезервировано", "Уже выпущено", "Действие"]}
      >
        {lines.map((line) => {
          const product = productById(snapshot, line.productId);
          const outputted = doneByLine.get(line.id) ?? 0;
          const breakdown = productionLineReservationBreakdown(line, balances);
          const reservedTotal = breakdown.reserved.reduce((sum, item) => sum + item.quantity, 0);
          const canReserve = order.status !== "closed" && order.status !== "cancelled" && breakdown.free > 0;
          const expanded = collapsedLineIds.has(line.id)
            ? false
            : expandedLineIds.has(line.id) || breakdown.reserved.length > 0;
          const toggleExpanded = () => {
            if (expanded) {
              setCollapsedLineIds((current) => new Set(current).add(line.id));
              setExpandedLineIds((current) => {
                const next = new Set(current);
                next.delete(line.id);
                return next;
              });
              return;
            }
            setCollapsedLineIds((current) => {
              const next = new Set(current);
              next.delete(line.id);
              return next;
            });
            setExpandedLineIds((current) => new Set(current).add(line.id));
          };
          const nestedRows = expanded
            ? [
                ...breakdown.reserved
                  .slice()
                  .sort((left, right) =>
                    ownerLabel(snapshot, left.ownerType, left.ownerId).localeCompare(
                      ownerLabel(snapshot, right.ownerType, right.ownerId),
                    ),
                  )
                  .map((item) => ({
                    key: `${line.id}:${item.ownerType}:${item.ownerId}`,
                    label: (
                      <LogisticsCodeBadge
                        code={ownerLabel(snapshot, item.ownerType, item.ownerId)}
                        href={hrefForOwner(item.ownerType, item.ownerId) ?? undefined}
                      />
                    ),
                    free: null as number | null,
                    reserved: item.quantity,
                  })),
                {
                  key: `${line.id}:unreserved`,
                  label: <span className="text-muted-foreground">Свободно</span>,
                  free: breakdown.free,
                  reserved: null as number | null,
                },
              ]
            : [];
          return (
            <Fragment key={line.id}>
              <TableRow className={expanded ? "border-b-0" : undefined}>
                <TableCell className="px-3 py-2 text-sm font-medium">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-left"
                    aria-expanded={expanded}
                    aria-label={expanded ? `Свернуть ${product?.name ?? line.productId}` : `Развернуть ${product?.name ?? line.productId}`}
                    onClick={toggleExpanded}
                  >
                    <ChevronRight
                      className={cn("mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")}
                      aria-hidden
                    />
                    <ProductIdentity snapshot={snapshot} productId={line.productId} nameAs="text" />
                  </button>
                </TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">
                  {formatQuantity(line.quantity, product?.unit)}
                </TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(breakdown.free)}</TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(reservedTotal)}</TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(outputted)}</TableCell>
                <TableCell className="px-3 py-2 text-right">
                  {canReserve ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const eligible = openOrderLinesForProduct(snapshot, balances, line.productId);
                        const first = eligible.length === 1 ? eligible[0] : undefined;
                        const cap = first
                          ? Math.min(breakdown.free, remainingToReserveForLine(first, balances))
                          : breakdown.free;
                        setReserveLineId(line.id);
                        setReserveOrderLineId(first?.id ?? "");
                        setReserveQuantity(String(cap > 0 ? cap : 1));
                        setReserveOpen(true);
                      }}
                    >
                      Зарезервировать
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
              {nestedRows.map((row) => (
                <TableRow key={row.key} className="bg-muted/20 hover:bg-muted/30">
                  <TableCell className="px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block size-3.5 shrink-0" aria-hidden />
                      {row.label}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums text-muted-foreground">—</TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums text-muted-foreground">
                    {row.free == null ? "—" : formatQuantity(row.free)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums text-muted-foreground">
                    {row.reserved == null ? "—" : formatQuantity(row.reserved)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums text-muted-foreground">—</TableCell>
                  <TableCell className="px-3 py-2" />
                </TableRow>
              ))}
            </Fragment>
          );
        })}
      </LogisticsTableCard>

      <LogisticsTableCard
        title="Выпуски"
        action={
          order.status !== "closed" && order.status !== "cancelled" ? (
            <Button type="button" size="sm" onClick={() => setOutputOpen(true)}>
              Новый выпуск
            </Button>
          ) : undefined
        }
        headers={["Номер", "Товар", "Количество", "Под заказ клиента", "Статус", "Ожидаемое окончание"]}
        isEmpty={outputs.length === 0}
        empty="Выпусков пока нет."
      >
        {outputs.map((item) => {
          const itemLines = snapshot.outputLines.filter((line) => line.outputId === item.id);
          const products = itemLines
            .map((line) => productById(snapshot, line.productId)?.name ?? line.productId)
            .join(", ");
          const quantity = itemLines.reduce((sum, line) => sum + line.quantity, 0);
          const unit =
            itemLines.length === 1 ? productById(snapshot, itemLines[0]?.productId ?? "")?.unit : undefined;
          const orders = relatedOrdersForOutput(snapshot, item.id);
          return (
            <TableRow key={item.id}>
              <TableCell className="px-3 py-2">
                <LogisticsCodeBadge code={item.number} href={`/store/logistics/outputs/${item.id}`} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">{products || "—"}</TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {itemLines.length === 0 ? "—" : formatQuantity(quantity, unit)}
              </TableCell>
              <TableCell className="px-3 py-2">
                {orders.length === 0 ? (
                  "—"
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {orders.map((order) => (
                      <LogisticsCodeBadge key={order.id} code={order.label} href={order.href} />
                    ))}
                  </span>
                )}
              </TableCell>
              <TableCell className="px-3 py-2">
                <OutputStatusBadge status={item.status} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatExpectedEnd(item.expectedEndOn)}
              </TableCell>
            </TableRow>
          );
        })}
      </LogisticsTableCard>

      <DocumentLedger
        snapshot={snapshot}
        filter={(entry) =>
          (entry.documentType === "production_order" && entry.documentId === order.id) ||
          (entry.documentType === "output" && outputs.some((item) => item.id === entry.documentId)) ||
          (entry.locationType === "production_order" && entry.locationId === order.id)
        }
        title="Movements"
      />

      <LogisticsDialog
        open={productOpen}
        onOpenChange={setProductOpen}
        title="Добавить товар"
        description="Новая строка сразу появляется в остатках заказа на производство."
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Товар</span>
            <Select
              items={productsForManufacturer(snapshot, order.manufacturerId).map((item) => ({
                value: item.id,
                label: productIdentityLabel(item, item.id),
              }))}
              value={newProductId}
              onValueChange={(value) => setNewProductId(value ?? "")}
            >
              <SelectTrigger className="w-full bg-background" aria-label="Новый товар">
                <SelectValue placeholder="Выберите товар" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {productsForManufacturer(snapshot, order.manufacturerId).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {productIdentityLabel(item, item.id)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Только товары этого завода.</p>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Количество</span>
            <Input
              type="number"
              min={1}
              value={newQuantity}
              onChange={(event) => setNewQuantity(event.target.value)}
              aria-label="Количество нового товара"
            />
          </label>
          <Button
            type="button"
            onClick={() => {
              if (!newProductId || !(Number(newQuantity) > 0)) {
                toast.error("Выберите товар и количество");
                return;
              }
              void runLogisticsAction(
                () =>
                  addProductionLine({
                    orderId: order.id,
                    productId: newProductId,
                    quantity: Number(newQuantity),
                  }),
                "Товар добавлен в заказ на производство",
                reload,
              ).then((ok) => {
                if (ok) {
                  setProductOpen(false);
                  setNewProductId("");
                  setNewQuantity("1");
                }
              });
            }}
          >
            Добавить
          </Button>
        </div>
      </LogisticsDialog>

      <LogisticsDialog
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        title="Зарезервировать"
        description={
          reserveLine
            ? `${productIdentityLabel(productById(snapshot, reserveLine.productId), reserveLine.productId)}. Свободно ${formatQuantity(reserveFree)}.`
            : "Выберите товар в таблице."
        }
      >
        <div className="flex flex-col gap-3">
          <FieldSelect
            label="Заказ клиента"
            value={reserveOrderLineId}
            items={reserveOrderItems}
            disabled={reserveOrderItems.length === 0}
            placeholder={
              reserveOrderItems.length === 0
                ? "Нет заказов клиента с открытым количеством"
                : "Выберите заказ клиента"
            }
            onChange={(value) => {
              setReserveOrderLineId(value);
              const line = snapshot.customerOrderLines.find((item) => item.id === value);
              const cap = line
                ? Math.min(reserveFree, remainingToReserveForLine(line, balances))
                : reserveFree;
              setReserveQuantity(String(cap > 0 ? cap : 1));
            }}
          />
          {reserveOrderItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Нет открытых заказов клиента с незарезервированным количеством этого товара.
            </p>
          ) : null}
          <QuantityField
            value={reserveQuantity}
            onChange={setReserveQuantity}
            max={reserveMax}
            disabled={reserveOrderItems.length === 0 || !reserveOrderLine}
          />
          <Button
            type="button"
            disabled={!reserveLine || !reserveOrderLine || !isAllowedQuantity(reserveQuantity, reserveMax)}
            onClick={() => {
              const orderLine = reserveOrderLine;
              if (!reserveLine || !orderLine || !isAllowedQuantity(reserveQuantity, reserveMax)) {
                toast.error("Выберите заказ клиента и количество");
                return;
              }
              if (Number(reserveQuantity) > reserveFree) {
                toast.error("Нельзя зарезервировать больше свободного количества");
                return;
              }
              if (Number(reserveQuantity) > remainingToReserve(orderLine.quantity, balances, orderLine)) {
                toast.error("Нельзя зарезервировать больше открытого количества заказа клиента");
                return;
              }
              void runLogisticsAction(
                () =>
                  createAndPostReservation({
                    locationType: "production_order",
                    locationId: params.orderId,
                    toOwnerType: "order",
                    toOwnerId: orderLine.orderId,
                    lines: [
                      {
                        productId: orderLine.productId,
                        quantity: Number(reserveQuantity),
                        fromOwnerType: null,
                        fromOwnerId: null,
                      },
                    ],
                  }),
                "Резерв проведён",
                reload,
              ).then((ok) => {
                if (ok) {
                  setReserveOpen(false);
                  setReserveOrderLineId("");
                  setReserveQuantity("1");
                }
              });
            }}
          >
            Зарезервировать
          </Button>
        </div>
      </LogisticsDialog>

      <LogisticsDialog
        open={outputOpen}
        onOpenChange={setOutputOpen}
        title="Новый выпуск"
        description="Можно выпускать частями, пока заказ на производство не закрыт."
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Товар</span>
            <Select
              items={lines.map((line) => {
                const remaining = line.quantity - (doneByLine.get(line.id) ?? 0);
                return {
                  value: line.id,
                  label: productIdentityLabel(
                    productById(snapshot, line.productId),
                    line.productId,
                    `осталось ${formatQuantity(remaining)}`,
                  ),
                };
              })}
              value={outputLineId}
              onValueChange={(value) => {
                setOutputLineId(value ?? "");
                setOutputAllocLineId("none");
                setOutputAllocQty("0");
              }}
            >
              <SelectTrigger className="w-full bg-background" aria-label="Строка для выпуска">
                <SelectValue placeholder="Выберите товар" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {lines.map((line) => {
                    const remaining = line.quantity - (doneByLine.get(line.id) ?? 0);
                    return (
                      <SelectItem key={line.id} value={line.id}>
                        {productIdentityLabel(
                          productById(snapshot, line.productId),
                          line.productId,
                          `осталось ${formatQuantity(remaining)}`,
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          {outputLine ? <AvailabilityPanel snapshot={snapshot} balances={balances} productId={outputLine.productId} /> : null}
          <QuantityField value={outputQuantity} onChange={setOutputQuantity} max={outputRemaining} />
          <label className="space-y-1 text-sm">
            <span className="font-medium">Под заказ клиента</span>
            <Select
              items={[{ value: "none", label: "Нет — свободно на складе" }, ...allocItems]}
              value={outputAllocLineId}
              onValueChange={(value) => setOutputAllocLineId(value ?? "none")}
            >
              <SelectTrigger className="w-full bg-background" aria-label="Заказ клиента для выпуска">
                <SelectValue placeholder="Не занимать" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Нет — свободно на складе</SelectItem>
                  {allocItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          {outputAllocLineId !== "none" ? (
            <QuantityField
              label="Занятое количество"
              value={outputAllocQty}
              onChange={setOutputAllocQty}
              min={0}
              max={outputAllocMax}
            />
          ) : null}
          <ExpectedEndField value={outputExpectedEndOn} onChange={setOutputExpectedEndOn} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void createOutputFromProduction(false);
              }}
            >
              Сохранить план
            </Button>
            <Button
              type="button"
              onClick={() => {
                void createOutputFromProduction(true);
              }}
            >
              Завершить выпуск
            </Button>
          </div>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};
