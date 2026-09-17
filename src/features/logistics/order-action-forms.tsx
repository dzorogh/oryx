// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createAndPostReservation,
  createAndSendReservedTransfer,
  createProductionForOrder,
  createProductionOutput,
} from "@/features/logistics/logistics-api";
import {
  freeProductionLinesForProduct,
  freeTransfersForProduct,
  remainingToOutputForLine,
  remainingToReserveForLine,
  reservedPlacesForLine,
  reservedLinesAtWarehouse,
  warehousesWithReservedForOrder,
} from "@/features/logistics/logistics-availability";
import { sumReservedForLine } from "@/features/logistics/logistics-balances";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import {
  locationLabel,
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
import type { CustomerOrderLine, LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";

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

  const openLines = lines.filter((line) => remainingToReserveForLine(line, balances) > 0);
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

  const reset = () => {
    setManufacturerId("");
    setExpectedEndOn("");
    setQuantities({});
  };

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
      customerOrderLineId: line.id,
      productId: line.productId,
      quantity: Number(quantities[line.id] ?? remainingToReserveForLine(line, balances)),
    }))
    .filter((line) => line.quantity > 0);

  const submit = async () => {
    if (!manufacturerId || payload.length === 0) {
      toast.error("Select a manufacturer and a quantity");
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
      "Production order created and reserved",
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
      title="New production order"
      description="Choose a plant, then enter quantities."
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldSelect
            label="Manufacturer"
            value={manufacturerId}
            items={plantItems}
            onChange={selectManufacturer}
            placeholder="Select a plant"
            emptyLabel={openLines.length === 0 ? "Nothing left to produce" : "No plant can produce these products"}
          />
          <ExpectedEndField label="Expected end" value={expectedEndOn} onChange={setExpectedEndOn} />
        </div>
        {plantItems.length === 0 ? null : !manufacturerId ? (
          <p className="text-sm text-muted-foreground">Select a manufacturer to enter quantities.</p>
        ) : plantLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">This plant has no open products on this order.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">In production</TableHead>
                  <TableHead className="w-[7.5rem] text-right">Produce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantLines.map((line) => {
                  const product = productById(snapshot, line.productId);
                  const max = remainingToReserveForLine(line, balances);
                  const reserved = sumReservedForLine(balances, line.id);
                  const inProduction = reservedPlacesForLine(balances, line.id)
                    .filter((place) => place.locationType === "production_order_line")
                    .reduce((sum, place) => sum + place.quantity, 0);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="whitespace-normal">
                        <ProductIdentity snapshot={snapshot} productId={line.productId} nameAs="text" />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{qtyCell(line.quantity, product?.unit)}</TableCell>
                      <TableCell className="text-right tabular-nums">{qtyCell(reserved, product?.unit)}</TableCell>
                      <TableCell className="text-right tabular-nums">{qtyCell(inProduction, product?.unit)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={max}
                          value={quantities[line.id] ?? String(max)}
                          className="ml-auto h-8 w-[6.5rem] text-right"
                          aria-label={`Produce ${productIdentityLabel(product, line.productId)}`}
                          onChange={(event) => setLineQuantity(line.id, event.target.value, max)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <Button
          type="button"
          disabled={!manufacturerId || payload.length === 0 || plantItems.length === 0}
          onClick={() => void submit()}
        >
          Create and reserve
        </Button>
      </div>
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
      toast.error("Select a product, production order, and quantity");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createAndPostReservation({
          customerOrderId,
          locationType: "production_order_line",
          locationId: selected.locationId,
          operation: "reserve",
          lines: [
            {
              customerOrderLineId: orderLine.id,
              quantity: Number(quantity),
            },
          ],
        }),
      "Reserved on production order",
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
      title="Reserve on production order"
      description="Занять свободное на строке существующего заказа на производство. Выпуск потом увезёт уже занятое."
    >
      <div className="flex flex-col gap-3">
        <FieldSelect
          label="Order product"
          value={orderLineId}
          items={reservableLines.map((line) => ({
            value: line.id,
            label: productIdentityLabel(
              productById(snapshot, line.productId),
              line.productId,
              `can ${formatQuantity(remainingToReserveForLine(line, balances))}`,
            ),
          }))}
          onChange={(value) => {
            setOrderLineId(value);
            setLocationId("");
          }}
          placeholder="Select a product"
          emptyLabel="No quantity left to reserve"
        />
        <FieldSelect
          label="Production order"
          value={locationId}
          items={places.map((place) => ({
            value: place.locationId,
            label: `${locationLabel(snapshot, place.locationType, place.locationId)} · free ${formatQuantity(place.quantity)}`,
          }))}
          onChange={(value) => {
            setLocationId(value);
            const place = places.find((item) => item.locationId === value);
            const cap = orderLine && place
              ? Math.min(place.quantity, remainingToReserveForLine(orderLine, balances))
              : 0;
            setQuantity(String(cap > 0 ? cap : 1));
          }}
          placeholder="Select a line"
          emptyLabel={orderLine ? "No free stock on a production order" : "Select a product first"}
        />
        <QuantityField value={quantity} onChange={setQuantity} max={selected ? max : undefined} />
        <Button type="button" disabled={!selected || !isAllowedQuantity(quantity, max)} onClick={() => void submit()}>
          Забронировать
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
              entry.locationType === "production_order_line" &&
              entry.locationId === line.id &&
              entry.stockState === "reserved" &&
              entry.customerOrderLineId === orderLine.id,
          )
          .reduce((sum, entry) => sum + entry.quantity, 0);
        const freeHere = balances
          .filter(
            (entry) =>
              entry.locationType === "production_order_line" &&
              entry.locationId === line.id &&
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
  };

  const submit = async () => {
    if (!orderLine || !selected || !isAllowedQuantity(quantity, max)) {
      toast.error("Select a product, production order, and quantity");
      return;
    }
    const qty = Number(quantity);
    const needReserve = Math.max(0, qty - selected.reservedHere);
    const production = productionOrderById(snapshot, selected.line.orderId);
    if (!production) {
      toast.error("Production order not found");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createProductionOutput({
          orderId: production.id,
          lineId: selected.line.id,
          productId: selected.line.productId,
          quantity: qty,
          expectedEndOn: expectedEndOn || null,
          allocation:
            needReserve > 0
              ? {
                customerOrderId,
                customerOrderLineId: orderLine.id,
                quantity: needReserve,
              }
              : undefined,
        }),
      "Выпуск проведён",
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
      title="Выпустить под заказ"
      description="Если на строке ещё свободно, сначала проводится бронь, потом выпуск увозит уже занятое."
    >
      <div className="flex flex-col gap-3">
        <FieldSelect
          label="Товар заказа"
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
          label="Production order"
          value={productionLineId}
          items={candidates.map((item) => ({
            value: item.line.id,
            label: `${locationLabel(snapshot, "production_order_line", item.line.id)} · занято ${formatQuantity(item.reservedHere)} · свободно ${formatQuantity(item.freeHere)}`,
          }))}
          onChange={(value) => {
            setProductionLineId(value);
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
          placeholder="Select a line"
          emptyLabel="No available production order"
        />
        <QuantityField value={quantity} onChange={setQuantity} max={selected ? max : undefined} />
        <ExpectedEndField value={expectedEndOn} onChange={setExpectedEndOn} />
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
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const warehouses = warehousesWithReservedForOrder(balances, lines);
  const reservedLines = fromId ? reservedLinesAtWarehouse(balances, fromId, lines) : [];

  const reset = () => {
    setFromId("");
    setToId("");
    setExpectedEndOn("");
  };

  const submit = async () => {
    if (!fromId || !toId || fromId === toId || reservedLines.length === 0) {
      toast.error("Выберите склады и занятый остаток");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createAndSendReservedTransfer({
          fromWarehouseId: fromId,
          toWarehouseId: toId,
          expectedEndOn: expectedEndOn || null,
          lines: reservedLines.map((item) => ({
            productId: item.line.productId,
            quantity: item.reserved,
            customerOrderId,
            customerOrderLineId: item.line.id,
            allocated: item.reserved,
          })),
        }),
      "Занятое отправлено в перемещение",
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
      title="Переместить занятое"
      description="Уедет только уже занятый этим заказом остаток. Свободное на складе не трогаем."
    >
      <div className="flex flex-col gap-3">
        <FieldSelect
          label="From"
          value={fromId}
          items={warehouses.map((item) => ({
            value: item.warehouseId,
            label: `${warehouseCode(snapshot, item.warehouseId)} · reserved ${formatQuantity(item.quantity)}`,
          }))}
          onChange={setFromId}
          placeholder="Source warehouse"
          emptyLabel="No reservation in warehouses"
        />
        <FieldSelect
          label="Куда"
          value={toId}
          items={snapshot.warehouses
            .filter((item) => item.id !== fromId)
            .map((item) => ({ value: item.id, label: item.name }))}
          onChange={setToId}
        />
        {reservedLines.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {reservedLines
              .map(
                (item) =>
                  `${productIdentityLabel(productById(snapshot, item.line.productId), item.line.productId)} · ${formatQuantity(item.reserved)}`,
              )
              .join(", ")}
          </p>
        ) : null}
        <ExpectedEndField value={expectedEndOn} onChange={setExpectedEndOn} />
        <Button type="button" disabled={!fromId || !toId || fromId === toId} onClick={() => void submit()}>
          Отправить
        </Button>
      </div>
    </LogisticsDialog>
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
          customerOrderId,
          locationType: "transfer",
          locationId: selected.locationId,
          operation: "reserve",
          lines: [
            {
              customerOrderLineId: orderLine.id,
              quantity: Number(quantity),
            },
          ],
        }),
      "Бронирование в пути проведено",
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
      title="Забронировать в перемещении"
      description="Свободное, которое уже едет, можно занять обычной бронью. После доставки оно приедет занятым."
    >
      <div className="flex flex-col gap-3">
        <FieldSelect
          label="Товар заказа"
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
          placeholder="Select a transfer"
          emptyLabel="No free stock in transit"
        />
        <QuantityField value={quantity} onChange={setQuantity} max={selected ? max : undefined} />
        <Button type="button" disabled={!selected || !isAllowedQuantity(quantity, max)} onClick={() => void submit()}>
          Забронировать
        </Button>
      </div>
    </LogisticsDialog>
  );
};
