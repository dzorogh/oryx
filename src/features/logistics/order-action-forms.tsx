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
  newProductionOutputRequestKey,
} from "@/features/logistics/logistics-api";
import {
  newTransferRequestKey,
  openSentTransfer,
  orderOwnedTransferPayload,
} from "@/features/logistics/transfer-direct-send";
import {
  freeProductionLinesForProduct,
  freeTransfersForProduct,
  remainingToOutputForLine,
  remainingToReserveForLine,
  reservedPlacesForLine,
} from "@/features/logistics/logistics-availability";
import { TransferCreateDialog } from "@/features/logistics/ui/transfer-create-dialog";
import { sumReservedForLine } from "@/features/logistics/logistics-balances";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import {
  locationLabel,
  customerOrderById,
  manufacturerIdsForProducts,
  manufacturerSelectItems,
  productById,
  productIdentityLabel,
  productsForManufacturer,
  productionOrderById,
  warehouseCode,
} from "@/features/logistics/logistics-lookups";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import {
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
  const perProduct = productIds.map((productId) => manufacturerIdsForProducts(snapshot, [productId]));
  if (perProduct.some((ids) => ids === null)) {
    return manufacturerSelectItems(snapshot);
  }
  const union = new Set(perProduct.flatMap((ids) => ids ?? []));
  return snapshot.manufacturers
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
  const [manufacturerId, setManufacturerId] = useState("");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const didOpen = useRef(false);

  const openLines = useMemo(
    () => lines.filter((line) => remainingToReserveForLine(line, balances) > 0),
    [balances, lines],
  );
  const plantItems = useMemo(
    () => plantsForOpenLines(snapshot, openLines.map((line) => line.productId)),
    [openLines, snapshot],
  );
  const plantLines = useMemo(() => {
    if (!manufacturerId) {
      return [] as CustomerOrderLine[];
    }
    const allowed = new Set(productsForManufacturer(snapshot, manufacturerId).map((product) => product.id));
    return openLines.filter((line) => allowed.has(line.productId));
  }, [manufacturerId, openLines, snapshot]);

  const seedQuantities = (nextLines: CustomerOrderLine[]) =>
    Object.fromEntries(nextLines.map((line) => [line.id, String(remainingToReserveForLine(line, balances))]));

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
    setManufacturerId(defaultPlant);
    setExpectedEndOn("");
    if (!defaultPlant) {
      setQuantities({});
      return;
    }
    const allowed = new Set(productsForManufacturer(snapshot, defaultPlant).map((product) => product.id));
    setQuantities(seedQuantities(openLines.filter((line) => allowed.has(line.productId))));
  }, [open, openLines, plantItems, snapshot, balances]);

  const selectManufacturer = (nextId: string) => {
    setManufacturerId(nextId);
    if (!nextId) {
      setQuantities({});
      return;
    }
    const allowed = new Set(productsForManufacturer(snapshot, nextId).map((product) => product.id));
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
      quantity: Number(quantities[line.id] ?? remainingToReserveForLine(line, balances)),
    }))
    .filter((line) => line.quantity > 0);
  const customerOrderNumber = customerOrderById(snapshot, customerOrderId)?.number ?? customerOrderId;
  const manufacturerLabel = plantItems.find((item) => item.value === manufacturerId)?.label;
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
    : !manufacturerId || selectedLineCount === 0
      ? "Выберите производителя и количество"
      : [
        `${selectedLineCount} ${selectedLineCount === 1 ? "товар" : "товара"}`,
        sharedUnit ? plannerQuantity(selectedTotal, sharedUnit) : null,
        manufacturerLabel,
      ]
        .filter(Boolean)
        .join(" · ");

  const submit = async () => {
    if (!manufacturerId || payload.length === 0) {
      toast.error("Выберите производителя и количество");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createProductionForOrder({
          manufacturerId,
          customerOrderId,
          expectedEndOn: expectedEndOn || null,
          lines: payload,
        }),
      "Заказ на производство создан и зарезервирован",
      reload,
    );
    if (ok) {
      onOpenChange(false);
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
            label="Производитель"
            value={manufacturerId}
            items={plantItems}
            onChange={selectManufacturer}
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
        ) : !manufacturerId ? (
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
                  const max = remainingToReserveForLine(line, balances);
                  const reserved = sumReservedForLine(balances, line);
                  const inProduction = reservedPlacesForLine(balances, line)
                    .filter((place) => place.locationType === "production_order")
                    .reduce((sum, place) => sum + place.quantity, 0);
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
      </div>
      <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-left sm:max-w-[55%]">
          <p className="font-medium">{summaryTitle}</p>
          <p className="text-xs text-muted-foreground">Количество зарезервируется автоматически</p>
        </div>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!manufacturerId || payload.length === 0 || plantItems.length === 0}
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
  const [orderLineId, setOrderLineId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const reservableLines = lines.filter((line) => remainingToReserveForLine(line, balances) > 0);
  const orderLine = lines.find((line) => line.id === orderLineId);
  const productionLineIds = orderLine
    ? snapshot.productionOrderLines
      .filter((line) => {
        if (line.productId !== orderLine.productId) {
          return false;
        }
        const production = productionOrderById(snapshot, line.orderId);
        return production?.status !== "closed" && production?.status !== "cancelled";
      })
      .map((line) => line.id)
    : [];
  const places = orderLine
    ? freeProductionLinesForProduct(balances, orderLine.productId, productionLineIds)
    : [];
  const selected = places.find((place) => place.locationId === locationId);
  const max = orderLine && selected
    ? Math.min(selected.quantity, remainingToReserveForLine(orderLine, balances))
    : 0;

  const firstReservableId = reservableLines[0]?.id ?? "";
  const firstPlaceId = places[0]?.locationId ?? "";

  useEffect(() => {
    if (!open) {
      return;
    }
    setOrderLineId(firstReservableId);
    setLocationId("");
    setQuantity("1");
  }, [firstReservableId, open]);

  useEffect(() => {
    if (!open || !orderLine || !firstPlaceId || locationId) {
      return;
    }
    const first = places[0];
    if (!first) {
      return;
    }
    setLocationId(first.locationId);
    const cap = Math.min(first.quantity, remainingToReserveForLine(orderLine, balances));
    setQuantity(String(cap > 0 ? cap : 1));
  }, [balances, firstPlaceId, locationId, open, orderLine, places]);

  const submit = async () => {
    if (!orderLine || !selected || !isAllowedQuantity(quantity, max)) {
      toast.error("Выберите товар, заказ на производство и количество");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createAndPostReservation({
          locationType: "production_order",
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
      "Зарезервировано в заказе на производство",
      reload,
    );
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <LogisticsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Зарезервировать в заказе на производство"
    >
      <div className="flex flex-col gap-3">
        <FieldSelect
          label="Товар заказа клиента"
          value={orderLineId}
          items={reservableLines.map((line) => ({
            value: line.id,
            label: productIdentityLabel(
              productById(snapshot, line.productId),
              line.productId,
              `можно ${formatQuantity(remainingToReserveForLine(line, balances))}`,
            ),
          }))}
          onChange={(value) => {
            setOrderLineId(value);
            setLocationId("");
          }}
          placeholder="Выберите товар"
          emptyLabel="Нечего резервировать"
        />
        <FieldSelect
          label="Заказ на производство"
          value={locationId}
          items={places.map((place) => ({
            value: place.locationId,
            label: `${locationLabel(snapshot, place.locationType, place.locationId)} · свободно ${formatQuantity(place.quantity)}`,
          }))}
          onChange={(value) => {
            setLocationId(value);
            const place = places.find((item) => item.locationId === value);
            const cap = orderLine && place
              ? Math.min(place.quantity, remainingToReserveForLine(orderLine, balances))
              : 0;
            setQuantity(String(cap > 0 ? cap : 1));
          }}
          placeholder="Выберите строку"
          emptyLabel={orderLine ? "Нет свободного остатка в заказе на производство" : "Сначала выберите товар"}
        />
        <QuantityField value={quantity} onChange={setQuantity} max={selected ? max : undefined} />
        <Button type="button" disabled={!selected || !isAllowedQuantity(quantity, max)} onClick={() => void submit()}>
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
  const requestKeyRef = useRef(newProductionOutputRequestKey());
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
        return production?.status !== "closed" && production?.status !== "cancelled";
      })
      .map((line) => {
        const remaining = remainingToOutputForLine(snapshot, line.id, line.quantity);
        const reservedHere = balances
          .filter(
            (entry) =>
              entry.locationType === "production_order" &&
              entry.locationId === line.orderId &&
              entry.stockState === "reserved" &&
              ownersEqual(entry.ownerType, entry.ownerId, "order", orderLine.orderId) &&
              entry.productId === orderLine.productId,
          )
          .reduce((sum, entry) => sum + entry.quantity, 0);
        const freeHere = balances
          .filter(
            (entry) =>
              entry.locationType === "production_order" &&
              entry.locationId === line.orderId &&
              entry.stockState === "free" &&
              entry.productId === line.productId,
          )
          .reduce((sum, entry) => sum + entry.quantity, 0);
        return { line, remaining, reservedHere, freeHere };
      })
      .filter((item) => item.remaining > 0 && item.reservedHere + item.freeHere > 0);
  }, [balances, orderLine, snapshot]);
  const selected = candidates.find((item) => item.line.id === productionLineId);
  const max = selected
    ? Math.min(
      selected.remaining,
      selected.reservedHere +
      Math.min(selected.freeHere, orderLine ? remainingToReserveForLine(orderLine, balances) : 0),
    )
    : 0;

  const reset = () => {
    setOrderLineId("");
    setProductionLineId("");
    setQuantity("1");
    setExpectedEndOn("");
    requestKeyRef.current = newProductionOutputRequestKey();
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
    const needReserve = Math.max(0, qty - selected.reservedHere);
    const production = productionOrderById(snapshot, selected.line.orderId);
    if (!production) {
      toast.error("Заказ на производство не найден");
      return;
    }
    creatingRef.current = true;
    const ok = await runLogisticsAction(
      () =>
        createProductionOutput({
          requestKey: requestKeyRef.current,
          orderId: production.id,
          expectedEndOn: expectedEndOn || null,
          lines: [
            {
              productId: selected.line.productId,
              quantity: qty,
              allocation:
                needReserve > 0
                  ? {
                      ownerType: "order",
                      ownerId: customerOrderId,
                      quantity: needReserve,
                    }
                  : undefined,
            },
          ],
        }),
      "Выпуск проведён",
      reload,
    );
    creatingRef.current = false;
    if (ok) {
      requestKeyRef.current = newProductionOutputRequestKey();
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
          requestKeyRef.current = newProductionOutputRequestKey();
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
            requestKeyRef.current = newProductionOutputRequestKey();
          }}
        />
        <FieldSelect
          label="Заказ на производство"
          value={productionLineId}
          items={candidates.map((item) => ({
            value: item.line.id,
            label: `${locationLabel(snapshot, "production_order", item.line.orderId)} · занято ${formatQuantity(item.reservedHere)} · свободно ${formatQuantity(item.freeHere)}`,
          }))}
          onChange={(value) => {
            setProductionLineId(value);
            requestKeyRef.current = newProductionOutputRequestKey();
            const next = candidates.find((item) => item.line.id === value);
            const cap = next
              ? Math.min(
                next.remaining,
                next.reservedHere +
                Math.min(next.freeHere, orderLine ? remainingToReserveForLine(orderLine, balances) : 0),
              )
              : 0;
            setQuantity(String(cap > 0 ? cap : 1));
          }}
          placeholder="Выберите строку"
          emptyLabel="Нет доступного заказа на производство"
        />
        <QuantityField
          value={quantity}
          onChange={(value) => {
            setQuantity(value);
            requestKeyRef.current = newProductionOutputRequestKey();
          }}
          max={selected ? max : undefined}
        />
        <ExpectedEndField
          value={expectedEndOn}
          onChange={(value) => {
            setExpectedEndOn(value);
            requestKeyRef.current = newProductionOutputRequestKey();
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
  const [requestKey, setRequestKey] = useState(newTransferRequestKey);

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
                requestKey,
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
        if (ok) {
          setRequestKey(newTransferRequestKey());
        }
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
