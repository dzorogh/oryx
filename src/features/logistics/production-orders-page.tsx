// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
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
  openOrderLinesForProduct,
  productionLineReservationBreakdown,
  remainingToReserveForLine,
} from "@/features/logistics/logistics-availability";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { assertEnoughStock, assertProductionOutputLines } from "@/features/logistics/logistics-rules";
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
  plantIdsForProducts,
  plantSelectItems,
  productById,
  productIdentityLabel,
  productsForPlant,
} from "@/features/logistics/logistics-lookups";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { DocumentProductLines } from "@/features/logistics/ui/document-product-lines";
import { PlantLink } from "@/features/logistics/ui/plant-link";
import { matchDocumentParam, PRODUCTION_STATUSES, type ProductionStatus, type StockTransaction } from "@/features/logistics/logistics-types";
import {
  buildProductionOutputDrafts,
  ProductionOutputLinesFields,
  type ProductionOutputDraftLine,
} from "@/features/logistics/ui/production-output-lines-fields";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { runLogisticsAction, translateLogisticsError } from "@/features/logistics/ui/run-action";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { ProductionStatusBadge } from "@/features/logistics/ui/status-badge";
import { ProductionOrderCloseDialog } from "@/features/logistics/ui/production-order-close-dialog";
import { ProductionOrderDocumentHeader } from "@/features/logistics/ui/production-order-document-header";
import { ProductionOrderMovements } from "@/features/logistics/ui/production-order-movements";
import { ProductionOrderOutputs } from "@/features/logistics/ui/production-order-outputs";
import { ProductionOrderProductManifest } from "@/features/logistics/ui/production-order-product-manifest";
import { ProductionOrderSectionIndex } from "@/features/logistics/ui/production-order-section-index";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { documentLedgerRows } from "@/features/logistics/ui/document-ledger";

const LIST_STATUSES = PRODUCTION_STATUSES.filter((status) => status !== "cancelled");

export const ProductionOrdersPage = () => {
  const { snapshot, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<"all" | ProductionStatus>("all");
  const [open, setOpen] = useState(false);
  const [plantId, setPlantId] = useState("");
  const [lines, setLines] = useState<Array<{ productId: string; quantity: string }>>([
    { productId: "", quantity: "1" },
  ]);
  const [expectedEndOn, setExpectedEndOn] = useState("");

  const rows = snapshot.productionOrders.filter((item) => status === "all" || item.status === status);
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
      <LogisticsToolbar
        title="Заказы на производство"
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
              {(PRODUCTION_STATUS_LABELS[item] ?? "")}
            </HomeFilterChip>
          ))}
        </div>
      </LogisticsToolbar>
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Номер", "Завод", "Товары", "Статус", "Ожидаемое окончание"]} isEmpty={rows.length === 0}>
          {rows.map((item) => {
            const orderLines = snapshot.productionOrderLines.filter((line) => line.orderId === item.id);
            return (
              <TableRow key={item.id}>
                <TableCell className="px-3 py-2 align-top">
                  <LogisticsCodeBadge
                    code={item.number}
                    href={`/store/logistics/production-orders/${item.sequenceNumber}`}
                  />
                </TableCell>
                <TableCell className="px-3 py-2 align-top text-sm">
                  <PlantLink snapshot={snapshot} plantId={item.plantId ?? ""} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <DocumentProductLines snapshot={snapshot} lines={orderLines} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <ProductionStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top text-sm tabular-nums">
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
      >
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
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const ProductionOrderDetailPage = () => {
  const params = useParams<{ orderId: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const statusRef = useRef<HTMLDivElement>(null);
  const closeAnnounceRef = useRef<HTMLParagraphElement>(null);
  const outputLockRef = useRef(false);

  const [productOpen, setProductOpen] = useState(false);
  const [productPending, setProductPending] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [newProductId, setNewProductId] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");

  const [reserveOpen, setReserveOpen] = useState(false);
  const [reservePending, setReservePending] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [reserveLineId, setReserveLineId] = useState("");
  const [reserveOrderLineId, setReserveOrderLineId] = useState("");
  const [reserveQuantity, setReserveQuantity] = useState("1");

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
  const [statusError, setStatusError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dateMessage, setDateMessage] = useState<string | null>(null);

  const order = matchDocumentParam(snapshot.productionOrders, params.orderId);
  const lines = useMemo(
    () => (order ? snapshot.productionOrderLines.filter((line) => line.orderId === order.id) : []),
    [order, snapshot.productionOrderLines],
  );
  const outputs = order ? snapshot.outputs.filter((item) => item.productionOrderId === order.id) : [];
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

  useEffect(() => {
    if (isLoading || error || !order) {
      return;
    }
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (!hash || !["products", "outputs", "movements"].includes(hash)) {
      return;
    }
    const heading = document.querySelector<HTMLElement>(`#${hash} h2`);
    heading?.focus();
  }, [error, isLoading, order]);

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
          remainingToReserveForLine(allocLine, balances),
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
        <ProductionOrderDocumentHeader
          snapshot={snapshot}
          order={order}
          statusRef={statusRef}
          statusPending={statusPending}
          datePending={datePending}
          statusError={statusError}
          dateError={dateError}
          statusMessage={statusMessage}
          dateMessage={dateMessage}
          onStatusChange={(status) => {
            setStatusPending(true);
            setStatusError(null);
            setStatusMessage(null);
            void (async () => {
              try {
                await setProductionStatus(order.id, status);
                await reload();
                setStatusMessage("Статус сохранён.");
              } catch (caught) {
                setStatusError(translateLogisticsError(caught instanceof Error ? caught.message : "Не удалось сохранить статус"));
              } finally {
                setStatusPending(false);
              }
            })();
          }}
          onExpectedEndChange={(value) => {
            setDatePending(true);
            setDateError(null);
            setDateMessage(null);
            void (async () => {
              try {
                await updateExpectedEnd(order.id, value || null);
                await reload();
                setDateMessage("Ожидаемое окончание сохранено.");
              } catch (caught) {
                setDateError(
                  translateLogisticsError(caught instanceof Error ? caught.message : "Не удалось сохранить дату"),
                );
              } finally {
                setDatePending(false);
              }
            })();
          }}
          closeDisabled={statusPending || datePending}
          onClose={
            canMutate
              ? () => {
                  setCloseError(null);
                  setCloseOpen(true);
                }
              : undefined
          }
        />

        <div className="grid min-w-0 gap-4 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <ProductionOrderSectionIndex
            counts={{
              products: lines.length,
              outputs: outputs.length,
              movements: movementCount,
            }}
          />
          <div className="flex min-w-0 flex-col gap-4">
            <ProductionOrderProductManifest
              snapshot={snapshot}
              balances={balances}
              lines={lines}
              doneByLine={doneByLine}
              canMutate={canMutate}
              onAddProduct={() => {
                setProductError(null);
                setProductOpen(true);
              }}
              onReserve={(lineId) => {
                const line = lines.find((item) => item.id === lineId);
                if (!line) {
                  return;
                }
                const breakdown = productionLineReservationBreakdown(line, snapshot);
                const eligible = openOrderLinesForProduct(snapshot, balances, line.productId);
                const first = eligible.length === 1 ? eligible[0] : undefined;
                const cap = first
                  ? Math.min(breakdown.free, remainingToReserveForLine(first, balances))
                  : breakdown.free;
                setReserveLineId(line.id);
                setReserveOrderLineId(first?.id ?? "");
                setReserveQuantity(String(cap > 0 ? cap : 1));
                setReserveError(null);
                setReserveOpen(true);
              }}
            />
            <ProductionOrderOutputs
              snapshot={snapshot}
              outputs={outputs}
              canMutate={canMutate}
              onCreate={() => {
                setOutputError(null);
                setOutputDrafts(
                  buildProductionOutputDrafts(outputEligibleLines, (lineId) => remainingForOutput(lineId)),
                );
                setOutputExpectedEndOn("");
                setOutputOpen(true);
              }}
            />
            <ProductionOrderMovements snapshot={snapshot} filter={movementFilter} />
          </div>
        </div>
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

      <LogisticsDialog
        open={reserveOpen}
        onOpenChange={(next) => {
          if (reservePending) {
            return;
          }
          setReserveOpen(next);
          if (!next) {
            setReserveError(null);
          }
        }}
        title="Зарезервировать"
        description={
          reserveLine
            ? `${productIdentityLabel(productById(snapshot, reserveLine.productId), reserveLine.productId)}. Свободно ${formatQuantity(reserveFree)}.`
            : "Выберите товар в таблице."
        }
      >
        <div className="flex flex-col gap-3">
          {reserveOrderItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Нет открытых заказов клиента с незарезервированным количеством этого товара.
            </p>
          ) : (
            <FieldSelect
              label="Заказ клиента"
              value={reserveOrderLineId}
              items={reserveOrderItems}
              disabled={reservePending}
              placeholder="Выберите заказ клиента"
              onChange={(value) => {
                setReserveOrderLineId(value);
                const line = snapshot.customerOrderLines.find((item) => item.id === value);
                const cap = line
                  ? Math.min(reserveFree, remainingToReserveForLine(line, balances))
                  : reserveFree;
                setReserveQuantity(String(cap > 0 ? cap : 1));
              }}
            />
          )}
          <QuantityField
            value={reserveQuantity}
            onChange={setReserveQuantity}
            max={reserveMax}
            disabled={reservePending || reserveOrderItems.length === 0 || !reserveOrderLine}
          />
          {reserveError ? (
            <p role="alert" className="text-sm text-destructive">
              {reserveError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={reservePending}
              onClick={() => setReserveOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={
                reservePending ||
                !reserveLine ||
                !reserveOrderLine ||
                !isAllowedQuantity(reserveQuantity, reserveMax) ||
                reserveOrderItems.length === 0
              }
              onClick={() => {
                const orderLine = reserveOrderLine;
                if (!reserveLine || !orderLine || !isAllowedQuantity(reserveQuantity, reserveMax)) {
                  setReserveError("Выберите заказ клиента и количество");
                  return;
                }
                if (Number(reserveQuantity) > reserveFree) {
                  setReserveError("Нельзя зарезервировать больше свободного количества");
                  return;
                }
                if (Number(reserveQuantity) > remainingToReserve(orderLine.quantity, balances, orderLine)) {
                  setReserveError("Нельзя зарезервировать больше открытого количества заказа клиента");
                  return;
                }
                setReservePending(true);
                setReserveError(null);
                void (async () => {
                  try {
                    await createAndPostReservation({
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
                    });
                    await reload();
                    setReserveOpen(false);
                    setReserveOrderLineId("");
                    setReserveQuantity("1");
                    toast.success("Резерв проведён");
                  } catch (caught) {
                    setReserveError(
                      translateLogisticsError(caught instanceof Error ? caught.message : "Не удалось зарезервировать"),
                    );
                  } finally {
                    setReservePending(false);
                  }
                })();
              }}
            >
              Зарезервировать
            </Button>
          </div>
        </div>
      </LogisticsDialog>

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
                setStatusError(
                  translateLogisticsError(
                    reloadError instanceof Error ? reloadError.message : "Заказ закрыт, но страница не обновилась",
                  ),
                );
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
