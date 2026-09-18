"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import {
  createAndPostReservation,
  createAndPostReturn,
  createAndPostShipment,
  createReservationDraft,
} from "@/features/logistics/logistics-api";
import {
  freePlacesForProduct,
  remainingToReserveForLine,
  remainingToReturnForLine,
  remainingToShipForLine,
  reservationCap,
  reservedLinesAtWarehouse,
  reservedPlacesForOrder,
  warehousesWithReservedForOrder,
} from "@/features/logistics/logistics-availability";
import { formatQuantity, RESERVATION_OPERATION_LABELS } from "@/features/logistics/logistics-labels";
import { locationLabel, productById, productIdentityLabel, warehouseCode } from "@/features/logistics/logistics-lookups";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import {
  assertCustomerCapacity,
  assertEnoughStock,
  assertShipmentCapacity,
} from "@/features/logistics/logistics-rules";
import type {
  LogisticsSnapshot,
  ReservationLocationType,
  ReservationOperation,
  StockBalance,
} from "@/features/logistics/logistics-types";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";

type FormMode = "hub" | "list";

type SharedFormProps = {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reload: () => Promise<void>;
  mode?: FormMode;
};

const placeKey = (type: string, id: string, lineId?: string) =>
  lineId ? `${type}:${id}:${lineId}` : `${type}:${id}`;

const parsePlaceKey = (value: string): { locationType: ReservationLocationType; locationId: string; lineId?: string } => {
  const [locationType, locationId, lineId] = value.split(":");
  return { locationType: locationType as ReservationLocationType, locationId, lineId };
};

const FormActions = ({
  mode,
  onDraft,
  onPost,
  canSubmit,
  draftLabel = "Save draft",
  postLabel = "Post",
}: {
  mode: FormMode;
  onDraft?: () => void;
  onPost: () => void;
  canSubmit: boolean;
  draftLabel?: string;
  postLabel?: string;
}) => (
  <div className="flex flex-wrap gap-2">
    {mode === "list" && onDraft ? (
      <Button type="button" variant="outline" disabled={!canSubmit} onClick={onDraft}>
        {draftLabel}
      </Button>
    ) : null}
    <Button type="button" disabled={!canSubmit} onClick={onPost}>
      {postLabel}
    </Button>
  </div>
);

type ReservationDraftLine = {
  customerOrderLineId: string;
  quantity: string;
};

export const emptyReservationLine = (preset?: { customerOrderLineId?: string }): ReservationDraftLine => ({
  customerOrderLineId: preset?.customerOrderLineId ?? "",
  quantity: "1",
});

const reservedQtyForLineAtPlace = (
  balances: StockBalance[],
  customerOrderLineId: string,
  locationType: ReservationLocationType,
  locationId: string,
): number =>
  balances
    .filter(
      (entry) =>
        entry.stockState === "reserved" &&
        entry.customerOrderLineId === customerOrderLineId &&
        entry.locationType === locationType &&
        entry.locationId === locationId,
    )
    .reduce((sum, entry) => sum + entry.quantity, 0);

export const ReservationLineFields = ({
  snapshot,
  balances,
  orderId,
  operation,
  locationType,
  locationId,
  lines,
  index,
  excludeLineIds = [],
  onChange,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  orderId: string;
  operation: ReservationOperation;
  locationType: ReservationLocationType | "";
  locationId: string;
  lines: ReservationDraftLine[];
  index: number;
  excludeLineIds?: string[];
  onChange: (next: ReservationDraftLine) => void;
}) => {
  const line = lines[index];
  if (!line) {
    return null;
  }
  const usedLineIds = [...excludeLineIds, ...lines.map((item) => item.customerOrderLineId).filter(Boolean)];
  const orderLine = snapshot.customerOrderLines.find((item) => item.id === line.customerOrderLineId);
  const max =
    orderLine && locationType && locationId
      ? operation === "reserve"
        ? reservationCap(orderLine, balances, locationType, locationId)
        : reservedQtyForLineAtPlace(balances, orderLine.id, locationType, locationId)
      : 0;
  const lineItems =
    operation === "reserve"
      ? snapshot.customerOrderLines
          .filter((item) => item.orderId === orderId && (!usedLineIds.includes(item.id) || item.id === line.customerOrderLineId))
          .map((item) => ({
            value: item.id,
            label: productIdentityLabel(
              productById(snapshot, item.productId),
              item.productId,
              `open ${formatQuantity(remainingToReserveForLine(item, balances))}`,
            ),
          }))
      : snapshot.customerOrderLines
          .filter((item) => {
            if (item.orderId !== orderId) {
              return false;
            }
            if (usedLineIds.includes(item.id) && item.id !== line.customerOrderLineId) {
              return false;
            }
            if (!locationType || !locationId) {
              return true;
            }
            return reservedQtyForLineAtPlace(balances, item.id, locationType, locationId) > 0;
          })
          .map((item) => ({
            value: item.id,
            label: productIdentityLabel(
              productById(snapshot, item.productId),
              item.productId,
              locationType && locationId
                ? `reserved ${formatQuantity(reservedQtyForLineAtPlace(balances, item.id, locationType, locationId))}`
                : undefined,
            ),
          }));

  return (
    <div className="space-y-2 rounded-md border p-3">
      <FieldSelect
        label={`Product ${index + 1}`}
        value={line.customerOrderLineId}
        items={lineItems}
        onChange={(value) => {
          const nextLine = snapshot.customerOrderLines.find((item) => item.id === value);
          const nextMax =
            nextLine && locationType && locationId
              ? operation === "reserve"
                ? reservationCap(nextLine, balances, locationType, locationId)
                : reservedQtyForLineAtPlace(balances, nextLine.id, locationType, locationId)
              : 0;
          onChange({ customerOrderLineId: value, quantity: String(nextMax > 0 ? nextMax : 1) });
        }}
        placeholder={orderId ? "Select a product" : "Select an order first"}
        disabled={!orderId || !locationType || !locationId}
      />
      {orderLine ? <AvailabilityPanel snapshot={snapshot} balances={balances} productId={orderLine.productId} /> : null}
      <QuantityField
        value={line.quantity}
        onChange={(value) => onChange({ ...line, quantity: value })}
        max={locationType && locationId ? max : undefined}
        unit={orderLine ? productById(snapshot, orderLine.productId)?.unit : undefined}
      />
    </div>
  );
};

export const ReservationForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  mode = "list",
  preset,
}: SharedFormProps & {
  preset?: {
    customerOrderId?: string;
    customerOrderLineId?: string;
    locationType?: ReservationLocationType;
    locationId?: string;
    operation?: ReservationOperation;
  };
}) => {
  const [orderId, setOrderId] = useState(preset?.customerOrderId ?? "");
  const [operation, setOperation] = useState<ReservationOperation>(preset?.operation ?? "reserve");
  const [location, setLocation] = useState(
    preset?.locationType && preset.locationId ? placeKey(preset.locationType, preset.locationId) : "",
  );
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ReservationDraftLine[]>([emptyReservationLine(preset)]);

  const selectedOrderId = preset?.customerOrderId ?? orderId;
  const selectedPlace = location ? parsePlaceKey(location) : null;
  const locationType = selectedPlace?.locationType ?? "";
  const locationId = selectedPlace?.locationId ?? "";

  const placeItems = useMemo(() => {
    if (!selectedOrderId) {
      return [];
    }
    if (operation === "reserve") {
      const productIds = new Set(
        snapshot.customerOrderLines.filter((line) => line.orderId === selectedOrderId).map((line) => line.productId),
      );
      const seen = new Set<string>();
      const items: Array<{ value: string; label: string }> = [];
      for (const productId of productIds) {
        for (const place of freePlacesForProduct(balances, productId)) {
          if (place.locationType === "customer_order") {
            continue;
          }
          const key = placeKey(place.locationType, place.locationId);
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          items.push({
            value: key,
            label: `${locationLabel(snapshot, place.locationType, place.locationId)} · free ${formatQuantity(place.quantity)}`,
          });
        }
      }
      return items;
    }
    const places = reservedPlacesForOrder(balances, selectedOrderId);
    const seen = new Set<string>();
    return places
      .filter((place) => place.locationType !== "customer_order")
      .flatMap((place) => {
        const key = placeKey(place.locationType, place.locationId);
        if (seen.has(key)) {
          return [];
        }
        seen.add(key);
        return [
          {
            value: key,
            label: `${locationLabel(snapshot, place.locationType, place.locationId)} · reserved ${formatQuantity(
              places
                .filter((item) => item.locationType === place.locationType && item.locationId === place.locationId)
                .reduce((sum, item) => sum + item.quantity, 0),
            )}`,
          },
        ];
      });
  }, [balances, operation, selectedOrderId, snapshot]);

  const usedLineIds = lines.map((line) => line.customerOrderLineId).filter(Boolean);
  const orderLines = snapshot.customerOrderLines.filter((line) => line.orderId === selectedOrderId);
  const unusedProductCount = orderLines.filter((line) => {
    if (usedLineIds.includes(line.id)) {
      return false;
    }
    if (!locationType || !locationId) {
      return true;
    }
    return operation === "reserve"
      ? reservationCap(line, balances, locationType, locationId) > 0
      : reservedQtyForLineAtPlace(balances, line.id, locationType, locationId) > 0;
  }).length;
  const emptySlots = lines.filter((line) => !line.customerOrderLineId).length;
  const canAddLine = unusedProductCount > emptySlots;

  const validLines = lines.filter((line) => {
    const orderLine = snapshot.customerOrderLines.find((item) => item.id === line.customerOrderLineId);
    if (!orderLine || !locationType || !locationId) {
      return false;
    }
    const max =
      operation === "reserve"
        ? reservationCap(orderLine, balances, locationType, locationId)
        : reservedQtyForLineAtPlace(balances, orderLine.id, locationType, locationId);
    return isAllowedQuantity(line.quantity, max);
  });
  const linesReady =
    validLines.length > 0 &&
    validLines.length === lines.filter((line) => line.customerOrderLineId).length &&
    new Set(validLines.map((line) => line.customerOrderLineId)).size === validLines.length;

  const reset = () => {
    setOrderId(preset?.customerOrderId ?? "");
    setOperation(preset?.operation ?? "reserve");
    setLocation(preset?.locationType && preset.locationId ? placeKey(preset.locationType, preset.locationId) : "");
    setNote("");
    setLines([emptyReservationLine(preset)]);
  };

  const submit = async (post: boolean) => {
    if (!selectedOrderId || !locationType || !locationId || validLines.length === 0) {
      toast.error("Select an order, place, and at least one product line");
      return;
    }
    const payloadLines = [];
    for (const line of lines) {
      if (!line.customerOrderLineId) {
        continue;
      }
      const orderLine = snapshot.customerOrderLines.find((item) => item.id === line.customerOrderLineId);
      const max =
        orderLine && locationType && locationId
          ? operation === "reserve"
            ? reservationCap(orderLine, balances, locationType, locationId)
            : reservedQtyForLineAtPlace(balances, orderLine.id, locationType, locationId)
          : 0;
      if (!orderLine || !isAllowedQuantity(line.quantity, max)) {
        toast.error("Each line needs a product and an allowed quantity");
        return;
      }
      const qty = Number(line.quantity);
      try {
        assertEnoughStock(max, qty, operation === "reserve" ? "free" : "reserved");
        if (operation === "reserve") {
          assertCustomerCapacity(orderLine, balances, qty);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Not enough stock");
        return;
      }
      payloadLines.push({
        customerOrderLineId: orderLine.id,
        quantity: qty,
      });
    }
    const payload = {
      customerOrderId: selectedOrderId,
      locationType,
      locationId,
      operation,
      note,
      lines: payloadLines,
    };
    const ok = await runLogisticsAction(
      () => (post ? createAndPostReservation(payload) : createReservationDraft(payload)),
      post
        ? operation === "reserve"
          ? "Reservation posted"
          : "Release posted"
        : "Reservation draft created",
      reload,
    );
    if (ok) {
      onOpenChange(false);
      reset();
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
      title="Reservation"
      description="One order, one place, one operation. Quantities stay positive; the ledger carries the signed move."
      className="sm:max-w-lg"
    >
      <div className="flex flex-col gap-3">
        {preset?.operation ? null : (
          <FieldSelect
            label="Operation"
            value={operation}
            items={[
              { value: "reserve", label: RESERVATION_OPERATION_LABELS.reserve },
              { value: "release", label: RESERVATION_OPERATION_LABELS.release },
            ]}
            onChange={(value) => {
              setOperation(value as ReservationOperation);
              setLocation("");
              setLines([emptyReservationLine()]);
            }}
          />
        )}
        {preset?.customerOrderId ? null : (
          <FieldSelect
            label="Order"
            value={selectedOrderId}
            items={snapshot.customerOrders
              .filter((item) => (operation === "reserve" ? item.status === "open" : true))
              .map((item) => ({ value: item.id, label: item.number }))}
            onChange={(value) => {
              setOrderId(value);
              setLocation("");
              setLines([emptyReservationLine()]);
            }}
          />
        )}
        <FieldSelect
          label="Place"
          value={location}
          items={placeItems}
          onChange={(value) => {
            setLocation(value);
            setLines([emptyReservationLine(preset)]);
          }}
          placeholder="Select a place"
          emptyLabel={operation === "reserve" ? "No free stock" : "No reserved stock"}
          disabled={!selectedOrderId}
        />
        {lines.map((_, index) => (
          <ReservationLineFields
            key={`rsv-line-${index}`}
            snapshot={snapshot}
            balances={balances}
            orderId={selectedOrderId}
            operation={operation}
            locationType={locationType}
            locationId={locationId}
            lines={lines}
            index={index}
            onChange={(next) => {
              setLines((current) => current.map((item, itemIndex) => (itemIndex === index ? next : item)));
            }}
          />
        ))}
        {canAddLine ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, emptyReservationLine()])}>
            Add product
          </Button>
        ) : null}
        <label className="space-y-1 text-sm">
          <span className="font-medium">Note</span>
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
        </label>
        <FormActions
          mode={mode}
          canSubmit={Boolean(selectedOrderId && location && linesReady)}
          onDraft={() => void submit(false)}
          onPost={() => void submit(true)}
          postLabel={operation === "reserve" ? "Reserve" : "Release"}
        />
      </div>
    </LogisticsDialog>
  );
};

export const ShipmentForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  mode = "list",
  preset,
}: SharedFormProps & {
  preset?: { customerOrderId?: string; warehouseId?: string };
}) => {
  const [orderId, setOrderId] = useState(preset?.customerOrderId ?? "");
  const [warehouseId, setWarehouseId] = useState(preset?.warehouseId ?? "");
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const selectedOrderId = preset?.customerOrderId ?? orderId;
  const orderLines = snapshot.customerOrderLines.filter((line) => line.orderId === selectedOrderId);
  const warehouses = warehousesWithReservedForOrder(balances, orderLines);
  const lines = warehouseId ? reservedLinesAtWarehouse(balances, warehouseId, orderLines) : [];

  const reset = () => {
    setOrderId(preset?.customerOrderId ?? "");
    setWarehouseId(preset?.warehouseId ?? "");
    setQuantities({});
  };

  const submit = async (post: boolean) => {
    const payload = lines
      .map((item) => ({
        customerOrderLineId: item.line.id,
        productId: item.line.productId,
        quantity: Number(quantities[item.line.id] ?? item.reserved),
      }))
      .filter((item) => item.quantity > 0);
    if (!selectedOrderId || !warehouseId || payload.length === 0) {
      toast.error("Select an order, a warehouse with reserved stock, and quantities");
      return;
    }
    for (const item of payload) {
      const line = orderLines.find((entry) => entry.id === item.customerOrderLineId);
      if (!line) {
        continue;
      }
      const max = remainingToShipForLine(line, balances, warehouseId);
      try {
        assertEnoughStock(max, item.quantity, "reserved");
        assertShipmentCapacity(line, balances, item.quantity);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Cannot ship more than available");
        return;
      }
    }
    const ok = await runLogisticsAction(
      () =>
        createAndPostShipment({
          customerOrderId: selectedOrderId,
          warehouseId,
          lines: payload,
          post,
        }),
      post ? "Shipment posted" : "Shipment draft created",
      reload,
    );
    if (ok) {
      onOpenChange(false);
      reset();
    }
  };

  const canSubmit = lines.some((item) =>
    isAllowedQuantity(quantities[item.line.id] ?? String(item.reserved), item.reserved),
  );

  return (
    <LogisticsDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          reset();
        }
      }}
      title="Shipment"
      description="One order and one warehouse. Lines come from reserved stock at that warehouse."
    >
      <div className="flex flex-col gap-3">
        {preset?.customerOrderId ? null : (
          <FieldSelect
            label="Order"
            value={selectedOrderId}
            items={snapshot.customerOrders
              .filter((item) => item.status === "open")
              .map((item) => ({ value: item.id, label: item.number }))}
            onChange={(value) => {
              setOrderId(value);
              setWarehouseId("");
              setQuantities({});
            }}
          />
        )}
        <FieldSelect
          label="Warehouse"
          value={warehouseId}
          items={warehouses.map((item) => ({
            value: item.warehouseId,
            label: `${warehouseCode(snapshot, item.warehouseId)} · reserved ${formatQuantity(item.quantity)}`,
          }))}
          onChange={(value) => {
            setWarehouseId(value);
            const nextLines = reservedLinesAtWarehouse(balances, value, orderLines);
            setQuantities(
              Object.fromEntries(nextLines.map((item) => [item.line.id, String(item.reserved)])),
            );
          }}
          placeholder="Select a warehouse"
          emptyLabel="No reservation in warehouses"
        />
        {lines.map((item) => {
          const product = productById(snapshot, item.line.productId);
          return (
            <div key={item.line.id} className="space-y-2">
              <ProductIdentity snapshot={snapshot} productId={item.line.productId} nameAs="text" />
              <AvailabilityPanel snapshot={snapshot} balances={balances} productId={item.line.productId} />
              <QuantityField
                value={quantities[item.line.id] ?? String(item.reserved)}
                onChange={(value) => setQuantities((current) => ({ ...current, [item.line.id]: value }))}
                max={item.reserved}
                unit={product?.unit}
              />
            </div>
          );
        })}
        <FormActions
          mode={mode}
          canSubmit={canSubmit}
          onDraft={() => void submit(false)}
          onPost={() => void submit(true)}
          postLabel="Ship"
        />
      </div>
    </LogisticsDialog>
  );
};

export const ReturnForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  mode = "list",
  preset,
}: SharedFormProps & {
  preset?: { shipmentId?: string };
}) => {
  const [shipmentId, setShipmentId] = useState(preset?.shipmentId ?? "");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const selectedShipmentId = preset?.shipmentId ?? shipmentId;
  const shipmentLines = snapshot.shipmentLines.filter((line) => line.shipmentId === selectedShipmentId);

  const lines = useMemo(
    () =>
      shipmentLines.map((line) => ({
        line,
        remaining: remainingToReturnForLine(snapshot, line.id, line.quantity),
      })),
    [shipmentLines, snapshot],
  );

  const reset = () => {
    setShipmentId(preset?.shipmentId ?? "");
    setQuantities({});
  };

  const submit = async (post: boolean) => {
    const payload = lines
      .map((item) => ({
        shipmentLineId: item.line.id,
        quantity: Number(quantities[item.line.id] ?? (item.remaining > 0 ? item.remaining : 0)),
      }))
      .filter((item) => item.quantity > 0);
    if (!selectedShipmentId || payload.length === 0) {
      toast.error("Enter a return quantity");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createAndPostReturn({
          shipmentId: selectedShipmentId,
          lines: payload,
          post,
        }),
      post ? "Return posted" : "Return draft created",
      reload,
    );
    if (ok) {
      onOpenChange(false);
      reset();
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
      title="Return"
      description="Return no more than the unreturned shipped quantity. Stock becomes free at the shipment warehouse."
    >
      <div className="flex flex-col gap-3">
        {preset?.shipmentId ? null : (
          <FieldSelect
            label="Shipment"
            value={selectedShipmentId}
            items={snapshot.shipments
              .filter((item) => item.status === "posted")
              .map((item) => ({ value: item.id, label: item.number }))}
            onChange={(value) => {
              setShipmentId(value);
              setQuantities({});
            }}
          />
        )}
        {lines.map((item) => {
          const product = productById(snapshot, item.line.productId);
          return (
            <div key={item.line.id} className="space-y-2">
              <ProductIdentity snapshot={snapshot} productId={item.line.productId} nameAs="text" />
              {product ? <AvailabilityPanel snapshot={snapshot} balances={balances} productId={product.id} /> : null}
              <QuantityField
                value={quantities[item.line.id] ?? (item.remaining > 0 ? String(item.remaining) : "0")}
                onChange={(value) => setQuantities((current) => ({ ...current, [item.line.id]: value }))}
                max={item.remaining}
                min={0}
                unit={product?.unit}
              />
            </div>
          );
        })}
        <FormActions
          mode={mode}
          canSubmit={lines.some((item) =>
            isAllowedQuantity(quantities[item.line.id] ?? String(item.remaining), item.remaining),
          )}
          onDraft={() => void submit(false)}
          onPost={() => void submit(true)}
          postLabel="Return"
        />
      </div>
    </LogisticsDialog>
  );
};
