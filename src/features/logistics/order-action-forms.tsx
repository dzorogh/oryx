// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createAndPostReservation,
  createAndSendTransfer,
  createProductionForOrder,
  createProductionOutput,
  ProductionForOrderOutputError,
  reserveInProductionOutput,
} from "@/features/logistics/logistics-api";
import {
  openSentTransfer,
  orderOwnedTransferPayload,
} from "@/features/logistics/transfer-direct-send";
import {
  freeInDraftOutput,
  freeTransfersForProduct,
  remainingPlanForProductionProduct,
  remainingToOutputForLine,
  remainingToReserveForLine,
  remainingToReserveInProductionOutputsForLine,
  reservedInActiveOutputsForOrderProduct,
} from "@/features/logistics/logistics-availability";
import { lineLocationAllocations } from "@/features/logistics/allocation-atlas";
import { TransferCreateDialog } from "@/features/logistics/ui/transfer-create-dialog";
import { sumReservedForLine } from "@/features/logistics/logistics-balances";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import {
  locationLabel,
  customerOrderById,
  plantIdsForProducts,
  plantSelectItems,
  productById,
  productIdentityLabel,
  productsForPlant,
  productionOrderById,
  warehouseCode,
} from "@/features/logistics/logistics-lookups";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { runLogisticsAction, translateLogisticsError } from "@/features/logistics/ui/run-action";
import { LOGISTICS_PATHS, logisticsPath } from "@/features/logistics/logistics-paths";
import {
  documentNumber,
  ownersEqual,
  type CustomerOrderLine,
  type LogisticsSnapshot,
  type StockBalance,
} from "@/features/logistics/logistics-types";

type ActionFormProps = {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reload: () => Promise<void>;
  customerOrderId: string;
  lines: CustomerOrderLine[];
};

const qtyCell = (quantity: number, unit?: string) =>
  quantity > 1e-9 ? formatQuantity(quantity, unit) : "—";

const plannerQuantity = (quantity: number, unit?: string) => formatQuantity(quantity, unit);

export const relativeDayLabel = (isoDate: string, now = new Date()): string | null => {
  if (!isoDate) {
    return null;
  }
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) {
    return "сегодня";
  }
  if (days === 1) {
    return "через 1 день";
  }
  if (days > 1) {
    return `через ${days} дн.`;
  }
  if (days === -1) {
    return "вчера";
  }
  return `${Math.abs(days)} дн. назад`;
};

export const productionDraftActionLabel = (
  payload: Array<{ productId: string; quantity: number }>,
  snapshot: LogisticsSnapshot,
) => {
  if (payload.length === 0) {
    return "Создать заказ";
  }
  const units = payload.map((line) => productById(snapshot, line.productId)?.unit ?? "");
  const firstUnit = units[0];
  const sameUnit = Boolean(firstUnit) && units.every((unit) => unit === firstUnit);
  if (sameUnit) {
    const total = payload.reduce((sum, line) => sum + line.quantity, 0);
    return `Создать заказ · ${plannerQuantity(total, firstUnit)}`;
  }
  return `Создать заказ · ${payload.length} ${payload.length === 1 ? "товар" : "товара"}`;
};

const plantsForOpenLines = (snapshot: LogisticsSnapshot, productIds: string[]) => {
  if (productIds.length === 0) {
    return [] as Array<{ value: string; label: string }>;
  }
  const perProduct = productIds.map((productId) => plantIdsForProducts(snapshot, [productId]));
  if (perProduct.some((ids) => ids === null)) {
    return plantSelectItems(snapshot);
  }
  const union = new Set(perProduct.flatMap((ids) => ids ?? []));
  return snapshot.plants
    .filter((item) => union.has(item.id))
    .map((item) => ({ value: item.id, label: item.code }));
};

export const ProductionFromOrderForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  const router = useRouter();
  const [plantId, setPlantId] = useState("");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const didOpen = useRef(false);

  const openLines = useMemo(
    () => lines.filter((line) => remainingToReserveInProductionOutputsForLine(line, balances, snapshot) > 0),
    [balances, lines, snapshot],
  );
  const plantItems = useMemo(
    () => plantsForOpenLines(snapshot, openLines.map((line) => line.productId)),
    [openLines, snapshot],
  );
  const plantLines = useMemo(() => {
    if (!plantId) {
      return [] as CustomerOrderLine[];
    }
    const allowed = new Set(productsForPlant(snapshot, plantId).map((product) => product.id));
    return openLines.filter((line) => allowed.has(line.productId));
  }, [plantId, openLines, snapshot]);

  const seedQuantities = (nextLines: CustomerOrderLine[]) =>
    Object.fromEntries(
      nextLines.map((line) => [
        line.id,
        String(remainingToReserveInProductionOutputsForLine(line, balances, snapshot)),
      ]),
    );

  useEffect(() => {
    if (!open) {
      didOpen.current = false;
      return;
    }
    if (didOpen.current) {
      return;
    }
    didOpen.current = true;
    const defaultPlant = plantItems.length === 1 ? plantItems[0].value : "";
    setPlantId(defaultPlant);
    setExpectedEndOn("");
    if (!defaultPlant) {
      setQuantities({});
      return;
    }
    const allowed = new Set(productsForPlant(snapshot, defaultPlant).map((product) => product.id));
    setQuantities(seedQuantities(openLines.filter((line) => allowed.has(line.productId))));
  }, [open, openLines, plantItems, snapshot, balances]);

  const selectPlant = (nextId: string) => {
    setPlantId(nextId);
    if (!nextId) {
      setQuantities({});
      return;
    }
    const allowed = new Set(productsForPlant(snapshot, nextId).map((product) => product.id));
    setQuantities(seedQuantities(openLines.filter((line) => allowed.has(line.productId))));
  };

  const setLineQuantity = (lineId: string, raw: string, max: number) => {
    if (raw === "") {
      setQuantities((current) => ({ ...current, [lineId]: raw }));
      return;
    }
    const next = Number(raw);
    if (!Number.isFinite(next)) {
      return;
    }
    const clamped = Math.min(Math.max(next, 0), max);
    setQuantities((current) => ({ ...current, [lineId]: String(clamped) }));
  };

  const payload = plantLines
    .map((line) => ({
      productId: line.productId,
      quantity: Number(
        quantities[line.id] ?? remainingToReserveInProductionOutputsForLine(line, balances, snapshot),
      ),
    }))
    .filter((line) => line.quantity > 0);
  const customerOrderNumber = customerOrderById(snapshot, customerOrderId)?.number ?? customerOrderId;
  const plantLabel = plantItems.find((item) => item.value === plantId)?.label;
  const selectedLineCount = payload.length;
  const selectedTotal = payload.reduce((sum, line) => sum + line.quantity, 0);
  const selectedUnits = payload.map((line) => productById(snapshot, line.productId)?.unit ?? "");
  const sharedUnit = selectedUnits[0] && selectedUnits.every((unit) => unit === selectedUnits[0])
    ? selectedUnits[0]
    : undefined;
  const expectedRelative = relativeDayLabel(expectedEndOn);
  const summaryTitle = plantItems.length === 0
    ? openLines.length === 0
      ? "Этот заказ уже полностью закрыт."
      : "Нет доступного производителя."
    : !plantId || selectedLineCount === 0
      ? "Выберите производителя и количество"
      : [
        `${selectedLineCount} ${selectedLineCount === 1 ? "товар" : "товара"}`,
        sharedUnit ? plannerQuantity(selectedTotal, sharedUnit) : null,
        plantLabel,
      ]
        .filter(Boolean)
        .join(" · ");

  const submit = async () => {
    if (!plantId || payload.length === 0) {
      toast.error("Выберите производителя и количество");
      return;
    }
    try {
      await createProductionForOrder({
        plantId,
        customerOrderId,
        expectedEndOn: expectedEndOn || null,
        lines: payload,
      });
      toast.success("Заказ на производство и запланированный выпуск созданы — резерв в выпуске");
      await reload();
      onOpenChange(false);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      if (caught instanceof ProductionForOrderOutputError) {
        const seq = caught.sequenceNumber;
        toast.error("Заказ на производство создан, но запланированный выпуск не создан", {
          description: `${translateLogisticsError(raw)} Откройте заказ на производство и зарезервируйте в выпуске повторно.`,
          action: {
            label: seq ? documentNumber("PO", seq) : "Заказы на производство",
            onClick: () =>
              router.push(seq ? logisticsPath("production-orders", seq) : LOGISTICS_PATHS.productionOrders),
          },
        });
        await reload();
        onOpenChange(false);
        return;
      }
      toast.error("Не удалось выполнить действие", { description: translateLogisticsError(raw) });
    }
  };

  return (
    <LogisticsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Запустить производство"
      description={`Заказ клиента ${customerOrderNumber}`}
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldSelect
            label="Завод"
            value={plantId}
            items={plantItems}
            onChange={selectPlant}
            placeholder="Выберите завод"
            emptyLabel={openLines.length === 0 ? "Нечего производить" : "Ни один завод не выпускает эти товары"}
          />
          <ExpectedEndField
            label="Ожидаемое окончание"
            optional
            hint={expectedRelative ?? undefined}
            value={expectedEndOn}
            onChange={setExpectedEndOn}
            id="production-order-expected-end"
          />
        </div>
        {plantItems.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {openLines.length === 0 ? "Этот заказ уже полностью закрыт." : "Нет доступного производителя."}
          </div>
        ) : !plantId ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Выберите производителя, чтобы задать количества.
          </div>
        ) : plantLines.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            У этого завода нет открытых позиций в заказе.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Товар</TableHead>
                  <TableHead className="text-right">Нужно</TableHead>
                  <TableHead className="w-[8.5rem] text-right">Произвести</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantLines.map((line) => {
                  const product = productById(snapshot, line.productId);
                  const max = remainingToReserveInProductionOutputsForLine(line, balances, snapshot);
                  const reserved = sumReservedForLine(balances, line);
                  const inProduction = lineLocationAllocations(balances, line, snapshot).inProduction;
                  const rawQuantity = quantities[line.id] ?? String(max);
                  const numericQuantity = Number(rawQuantity);
                  const excluded = !Number.isFinite(numericQuantity) || numericQuantity <= 0;
                  return (
                    <TableRow key={line.id} className={excluded ? "opacity-60" : undefined}>
                      <TableCell className="whitespace-normal">
                        <ProductIdentity snapshot={snapshot} productId={line.productId} nameAs="text" />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Заказано {plannerQuantity(line.quantity, product?.unit)}
                          {" · "}зарезервировано {plannerQuantity(reserved, product?.unit)}
                          {" · "}в производстве {plannerQuantity(inProduction, product?.unit)}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="font-medium tabular-nums">{plannerQuantity(max, product?.unit)}</div>
                        <div className="text-xs text-muted-foreground">осталось</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="relative ml-auto w-[7.5rem]">
                          <Input
                            type="number"
                            min={0}
                            max={max}
                            value={rawQuantity}
                            className="h-8 pr-9 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            aria-label={`Произвести ${productIdentityLabel(product, line.productId)}`}
                            onChange={(event) => setLineQuantity(line.id, event.target.value, max)}
                          />
                          {product?.unit ? (
                            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                              {product.unit}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {plantId && selectedLineCount > 0 ? (
          <div
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          >
            Вместе с заказом на производство создадим запланированный выпуск на весь объём — резерв будет в
            выпуске.
          </div>
        ) : null}
      </div>
      <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-left sm:max-w-[55%]">
          <p className="font-medium">{summaryTitle}</p>
        </div>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!plantId || payload.length === 0 || plantItems.length === 0}
            onClick={() => void submit()}
          >
            {productionDraftActionLabel(payload, snapshot)}
          </Button>
        </div>
      </DialogFooter>
    </LogisticsDialog>
  );
};

export const ReserveOnProductionForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  type Target =
    | { kind: "new"; productionOrderId: string; available: number }
    | { kind: "draft"; outputId: string; productionOrderId: string; available: number };

  const [orderLineId, setOrderLineId] = useState("");
  const [targetKey, setTargetKey] = useState("");
  /** null = auto → use current max */
  const [quantity, setQuantity] = useState<string | null>(null);
  const reservableLines = lines.filter(
    (line) => remainingToReserveInProductionOutputsForLine(line, balances, snapshot) > 0,
  );
  const effectiveOrderLineId =
    orderLineId && reservableLines.some((line) => line.id === orderLineId)
      ? orderLineId
      : (reservableLines[0]?.id ?? "");
  const orderLine = lines.find((line) => line.id === effectiveOrderLineId);

  const targets: Target[] = useMemo(() => {
    if (!orderLine) {
      return [];
    }
    const result: Target[] = [];
    const openProductions = snapshot.productionOrders.filter(
      (po) => po.status !== "closed" && po.status !== "cancelled" && po.status !== "done",
    );
    for (const po of openProductions) {
      const planLine = snapshot.productionOrderLines.find(
        (line) => line.orderId === po.id && line.productId === orderLine.productId,
      );
      if (!planLine) {
        continue;
      }
      const planRoom = remainingPlanForProductionProduct(
        snapshot,
        po.id,
        orderLine.productId,
        planLine.quantity,
      );
      if (planRoom > 0) {
        result.push({ kind: "new", productionOrderId: po.id, available: planRoom });
      }
      for (const output of snapshot.outputs) {
        if (output.productionOrderId !== po.id) {
          continue;
        }
        if (output.status !== "draft") {
          continue;
        }
        const free = freeInDraftOutput(snapshot, output.id, orderLine.productId);
        if (free > 0) {
          result.push({
            kind: "draft",
            outputId: output.id,
            productionOrderId: po.id,
            available: free,
          });
        }
      }
    }
    return result;
  }, [orderLine, snapshot]);

  const targetItems = targets.map((target) => {
    const po = productionOrderById(snapshot, target.productionOrderId);
    const poNumber = po?.number ?? target.productionOrderId;
    if (target.kind === "new") {
      return {
        value: `new:${target.productionOrderId}`,
        label: `Новый выпуск в ${poNumber} · можно ${formatQuantity(target.available)}`,
      };
    }
    const output = snapshot.outputs.find((item) => item.id === target.outputId);
    return {
      value: `draft:${target.outputId}`,
      label: `${output?.number ?? target.outputId} · ${poNumber} · свободно ${formatQuantity(target.available)}`,
    };
  });

  const selectedTarget =
    targets.find((target) => {
      if (target.kind === "new") {
        return targetKey === `new:${target.productionOrderId}`;
      }
      return targetKey === `draft:${target.outputId}`;
    }) ?? targets[0];
  const effectiveTargetKey = selectedTarget
    ? selectedTarget.kind === "new"
      ? `new:${selectedTarget.productionOrderId}`
      : `draft:${selectedTarget.outputId}`
    : "";
  const formCap = orderLine
    ? remainingToReserveInProductionOutputsForLine(orderLine, balances, snapshot)
    : 0;
  const max = selectedTarget ? Math.min(selectedTarget.available, formCap) : 0;
  const quantityValue = quantity ?? (max > 0 ? String(max) : "");

  const resetClosed = () => {
    setOrderLineId("");
    setTargetKey("");
    setQuantity(null);
  };

  const submit = async () => {
    if (!orderLine || !selectedTarget || !isAllowedQuantity(quantityValue, max)) {
      toast.error("Выберите товар, цель резерва и количество");
      return;
    }
    const qty = Number(quantityValue);
    const ok = await runLogisticsAction(
      async () => {
        if (selectedTarget.kind === "new") {
          const po = productionOrderById(snapshot, selectedTarget.productionOrderId);
          await createProductionOutput({
            orderId: selectedTarget.productionOrderId,
            expectedEndOn: po?.expectedEndOn ?? null,
            complete: false,
            lines: [
              {
                productId: orderLine.productId,
                quantity: qty,
                allocation: {
                  ownerType: "order",
                  ownerId: customerOrderId,
                  quantity: qty,
                },
              },
            ],
          });
          return;
        }
        await reserveInProductionOutput({
          outputId: selectedTarget.outputId,
          ownerType: "order",
          ownerId: customerOrderId,
          lines: [{ productId: orderLine.productId, quantity: qty }],
        });
      },
      "Зарезервировано в выпуске",
      reload,
    );
    if (ok) {
      resetClosed();
      onOpenChange(false);
    }
  };

  return (
    <LogisticsDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resetClosed();
        }
        onOpenChange(next);
      }}
      title="Зарезервировать в выпуске"
    >
      <div className="flex flex-col gap-3">
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          Резерв под производство держится в запланированном выпуске, а не на месте заказа на производство.
        </div>
        <FieldSelect
          label="Товар заказа клиента"
          value={effectiveOrderLineId}
          items={reservableLines.map((line) => ({
            value: line.id,
            label: productIdentityLabel(
              productById(snapshot, line.productId),
              line.productId,
              `можно ${formatQuantity(remainingToReserveInProductionOutputsForLine(line, balances, snapshot))}`,
            ),
          }))}
          onChange={(value) => {
            setOrderLineId(value);
            setTargetKey("");
            setQuantity(null);
          }}
          placeholder="Выберите товар"
          emptyLabel="Нечего резервировать"
        />
        <FieldSelect
          label="Куда зарезервировать"
          value={effectiveTargetKey}
          items={targetItems}
          onChange={(value) => {
            setTargetKey(value);
            setQuantity(null);
          }}
          placeholder="Выберите цель"
          emptyLabel={
            orderLine
              ? "Нет доступного заказа на производство или свободного запланированного выпуска"
              : "Сначала выберите товар"
          }
        />
        <QuantityField
          value={quantityValue}
          onChange={setQuantity}
          max={selectedTarget ? max : undefined}
        />
        <Button
          type="button"
          disabled={!selectedTarget || !isAllowedQuantity(quantityValue, max)}
          onClick={() => void submit()}
        >
          Зарезервировать
        </Button>
      </div>
    </LogisticsDialog>
  );
};

export const OutputFromOrderForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  const [orderLineId, setOrderLineId] = useState("");
  const [productionLineId, setProductionLineId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const creatingRef = useRef(false);
  const orderLine = lines.find((line) => line.id === orderLineId);
  const candidates = useMemo(() => {
    if (!orderLine) {
      return [];
    }
    return snapshot.productionOrderLines
      .filter((line) => {
        if (line.productId !== orderLine.productId) {
          return false;
        }
        const production = productionOrderById(snapshot, line.orderId);
        return production?.status !== "closed" && production?.status !== "cancelled" && production?.status !== "done";
      })
      .map((line) => {
        const remaining = remainingToOutputForLine(snapshot, line.id, line.quantity);
        const planRoom = remainingPlanForProductionProduct(
          snapshot,
          line.orderId,
          line.productId,
          line.quantity,
        );
        const reservedHere = snapshot.outputLines
          .filter((outputLine) => {
            if (outputLine.productId !== orderLine.productId) {
              return false;
            }
            if (!ownersEqual(outputLine.toOwnerType, outputLine.toOwnerId, "order", orderLine.orderId)) {
              return false;
            }
            const output = snapshot.outputs.find((item) => item.id === outputLine.outputId);
            return (
              output?.productionOrderId === line.orderId && output.status === "draft"
            );
          })
          .reduce((sum, outputLine) => sum + outputLine.quantity, 0);
        // Cap by plan room for new completed output from this PO line.
        return { line, remaining: Math.min(remaining, planRoom), reservedHere, planRoom };
      })
      .filter((item) => item.remaining > 0);
  }, [orderLine, snapshot]);
  const selected = candidates.find((item) => item.line.id === productionLineId);
  const max = selected && orderLine
    ? Math.min(
        selected.remaining,
        remainingToReserveInProductionOutputsForLine(orderLine, balances, snapshot),
      )
    : 0;

  const reset = () => {
    setOrderLineId("");
    setProductionLineId("");
    setQuantity("1");
    setExpectedEndOn("");
  };

  const submit = async () => {
    if (creatingRef.current) {
      return;
    }
    if (!orderLine || !selected || !isAllowedQuantity(quantity, max)) {
      toast.error("Выберите товар, заказ на производство и количество");
      return;
    }
    const qty = Number(quantity);
    const production = productionOrderById(snapshot, selected.line.orderId);
    if (!production) {
      toast.error("Заказ на производство не найден");
      return;
    }
    creatingRef.current = true;
    const ok = await runLogisticsAction(
      () =>
        createProductionOutput({
          orderId: production.id,
          expectedEndOn: expectedEndOn || null,
          lines: [
            {
              productId: selected.line.productId,
              quantity: qty,
              allocation: {
                ownerType: "order",
                ownerId: customerOrderId,
                quantity: qty,
              },
            },
          ],
        }),
      "Выпуск проведён",
      reload,
    );
    creatingRef.current = false;
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <LogisticsDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          reset();
        } else {
        }
      }}
      title="Выпустить под заказ клиента"
    >
      <div className="flex flex-col gap-3">
        <FieldSelect
          label="Товар заказа клиента"
          value={orderLineId}
          items={lines.map((line) => ({
            value: line.id,
            label: productIdentityLabel(productById(snapshot, line.productId), line.productId),
          }))}
          onChange={(value) => {
            setOrderLineId(value);
            setProductionLineId("");
          }}
        />
        <FieldSelect
          label="Заказ на производство"
          value={productionLineId}
          items={candidates.map((item) => ({
            value: item.line.id,
            label: `${locationLabel(snapshot, "production_order", item.line.orderId)} · остаток плана ${formatQuantity(item.planRoom)} · уже в запланированных выпусках ${formatQuantity(item.reservedHere)}`,
          }))}
          onChange={(value) => {
            setProductionLineId(value);
            const next = candidates.find((item) => item.line.id === value);
            const cap = next && orderLine
              ? Math.min(
                  next.remaining,
                  remainingToReserveInProductionOutputsForLine(orderLine, balances, snapshot),
                )
              : 0;
            setQuantity(String(cap > 0 ? cap : 1));
          }}
          placeholder="Выберите строку"
          emptyLabel={
            orderLine &&
            reservedInActiveOutputsForOrderProduct(snapshot, orderLine.orderId, orderLine.productId) > 0
              ? "Весь план уже в запланированных выпусках — завершите выпуск на его странице"
              : "Нет доступного заказа на производство"
          }
        />
        <QuantityField
          value={quantity}
          onChange={(value) => {
            setQuantity(value);
          }}
          max={selected ? max : undefined}
        />
        <ExpectedEndField
          value={expectedEndOn}
          onChange={(value) => {
            setExpectedEndOn(value);
          }}
        />
        <Button type="button" disabled={!selected || !isAllowedQuantity(quantity, max)} onClick={() => void submit()}>
          Завершить выпуск
        </Button>
      </div>
    </LogisticsDialog>
  );
};

export const TransferReservedForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  const router = useRouter();

  return (
    <TransferCreateDialog
      open={open}
      onOpenChange={onOpenChange}
      snapshot={snapshot}
      balances={balances}
      context={{ kind: "order", customerOrderId, orderLines: lines }}
      onSubmit={async (value) => {
        const ok = await runLogisticsAction(
          async () => {
            const created = await createAndSendTransfer(
              orderOwnedTransferPayload({
                fromWarehouseId: value.fromWarehouseId,
                toWarehouseId: value.toWarehouseId,
                expectedEndOn: value.expectedEndOn,
                customerOrderId,
                lines: value.lines,
              }),
            );
            openSentTransfer(created, (href) => router.push(href));
          },
          "Перемещение отправлено",
          reload,
        );
        return ok;
      }}
    />
  );
};

export const ReserveOnTransferForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  const [orderLineId, setOrderLineId] = useState("");
  const [transferId, setTransferId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const orderLine = lines.find((line) => line.id === orderLineId);
  const places = orderLine
    ? freeTransfersForProduct(balances, orderLine.productId).filter((place) => {
      const transfer = snapshot.transfers.find((item) => item.id === place.locationId);
      return transfer?.status === "sent";
    })
    : [];
  const selected = places.find((place) => place.locationId === transferId);
  const max = orderLine && selected
    ? Math.min(selected.quantity, remainingToReserveForLine(orderLine, balances))
    : 0;

  const reset = () => {
    setOrderLineId("");
    setTransferId("");
    setQuantity("1");
  };

  const submit = async () => {
    if (!orderLine || !selected || !isAllowedQuantity(quantity, max)) {
      toast.error("Выберите товар, перемещение в пути и количество");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createAndPostReservation({
          locationType: "transfer",
          locationId: selected.locationId,
          toOwnerType: "order",
          toOwnerId: customerOrderId,
          lines: [
            {
              productId: orderLine.productId,
              quantity: Number(quantity),
              fromOwnerType: null,
              fromOwnerId: null,
            },
          ],
        }),
      "Резерв в пути проведён",
      reload,
    );
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <LogisticsDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          reset();
        }
      }}
      title="Зарезервировать в перемещении"
    >
      <div className="flex flex-col gap-3">
        <FieldSelect
          label="Товар заказа клиента"
          value={orderLineId}
          items={lines
            .filter((line) => remainingToReserveForLine(line, balances) > 0)
            .map((line) => ({
              value: line.id,
              label: productIdentityLabel(
                productById(snapshot, line.productId),
                line.productId,
                `можно ${formatQuantity(remainingToReserveForLine(line, balances))}`,
              ),
            }))}
          onChange={(value) => {
            setOrderLineId(value);
            setTransferId("");
          }}
        />
        <FieldSelect
          label="В пути"
          value={transferId}
          items={places.map((place) => ({
            value: place.locationId,
            label: `${locationLabel(snapshot, place.locationType, place.locationId)} · свободно ${formatQuantity(place.quantity)}`,
          }))}
          onChange={(value) => {
            setTransferId(value);
            const place = places.find((item) => item.locationId === value);
            const cap = orderLine && place
              ? Math.min(place.quantity, remainingToReserveForLine(orderLine, balances))
              : 0;
            setQuantity(String(cap > 0 ? cap : 1));
          }}
          placeholder="Выберите перемещение"
          emptyLabel="Нет свободного остатка в пути"
        />
        <QuantityField value={quantity} onChange={setQuantity} max={selected ? max : undefined} />
        <Button type="button" disabled={!selected || !isAllowedQuantity(quantity, max)} onClick={() => void submit()}>
          Зарезервировать
        </Button>
      </div>
    </LogisticsDialog>
  );
};
