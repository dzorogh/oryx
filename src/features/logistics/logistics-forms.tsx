// english-ui:ignore-file
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
  remainingToReturnForLine,
  remainingToShipForLine,
  reservationCapForOwner,
  reservedAtPlaceForOwner,
  reservedLinesAtWarehouse,
  warehousesWithReservedForOrder,
} from "@/features/logistics/logistics-availability";
import { FREE_OWNER_LABEL, OWNER_TYPE_LABELS, RESERVATION_DIRECTION_LABELS, formatQuantity } from "@/features/logistics/logistics-labels";
import {
  locationLabel,
  ownerLabel,
  ownerSelectItems,
  productById,
  productIdentityLabel,
  warehouseCode,
} from "@/features/logistics/logistics-lookups";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { assertCustomerCapacity, assertEnoughStock, assertShipmentCapacity } from "@/features/logistics/logistics-rules";
import {
  isFreeOwner,
  orderLineForProduct,
  ownerKey,
  ownersEqual,
  reservationDirection,
  type LogisticsSnapshot,
  type OwnerType,
  type ReservationLocationType,
  type StockBalance,
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

const placeKey = (type: string, id: string) => `${type}:${id}`;

const parsePlaceKey = (value: string): { locationType: ReservationLocationType; locationId: string } => {
  const [locationType, locationId] = value.split(":");
  return { locationType: locationType as ReservationLocationType, locationId };
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

type OwnerKind = "free" | OwnerType;

type ReservationDraftLine = {
  fromOwnerKind: OwnerKind;
  fromOwnerId: string;
  productId: string;
  quantity: string;
};

export const emptyReservationLine = (preset?: {
  fromOwnerType?: OwnerType | null;
  fromOwnerId?: string | null;
  productId?: string;
}): ReservationDraftLine => ({
  fromOwnerKind: isFreeOwner(preset?.fromOwnerType, preset?.fromOwnerId)
    ? "free"
    : (preset?.fromOwnerType ?? "free"),
  fromOwnerId: preset?.fromOwnerId ?? "",
  productId: preset?.productId ?? "",
  quantity: "1",
});

const ownerFromKind = (
  kind: OwnerKind,
  id: string,
): { fromOwnerType: OwnerType | null; fromOwnerId: string | null } =>
  kind === "free" ? { fromOwnerType: null, fromOwnerId: null } : { fromOwnerType: kind, fromOwnerId: id || null };

const destinationFromKind = (
  kind: OwnerKind,
  id: string,
): { toOwnerType: OwnerType | null; toOwnerId: string | null } =>
  kind === "free" ? { toOwnerType: null, toOwnerId: null } : { toOwnerType: kind, toOwnerId: id || null };

const lineIdentity = (line: ReservationDraftLine): string => {
  const source = ownerFromKind(line.fromOwnerKind, line.fromOwnerId);
  return `${ownerKey(source.fromOwnerType, source.fromOwnerId)}:${line.productId}`;
};

const OWNER_KIND_ITEMS: Array<{ value: OwnerKind; label: string }> = [
  { value: "free", label: FREE_OWNER_LABEL },
  { value: "order", label: OWNER_TYPE_LABELS.order },
  { value: "region", label: OWNER_TYPE_LABELS.region },
];

export const ReservationLineFields = ({
  snapshot,
  balances,
  destKind,
  destOwnerId,
  locationType,
  locationId,
  lines,
  index,
  onChange,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  destKind: OwnerKind;
  destOwnerId: string;
  locationType: ReservationLocationType | "";
  locationId: string;
  lines: ReservationDraftLine[];
  index: number;
  onChange: (next: ReservationDraftLine) => void;
}) => {
  const line = lines[index];
  if (!line) {
    return null;
  }
  const source = ownerFromKind(line.fromOwnerKind, line.fromOwnerId);
  const dest = destinationFromKind(destKind, destOwnerId);
  const orderLine =
    destKind === "order" && destOwnerId
      ? orderLineForProduct(snapshot.customerOrderLines, destOwnerId, line.productId)
      : undefined;
  const max =
    line.productId && locationType && locationId
      ? reservationCapForOwner(
          balances,
          line.productId,
          locationType,
          locationId,
          source.fromOwnerType,
          source.fromOwnerId,
          dest.toOwnerType,
          dest.toOwnerId,
          orderLine?.quantity,
        )
      : 0;
  const used = new Set(
    lines.filter((_, itemIndex) => itemIndex !== index).map(lineIdentity).filter((key) => !key.endsWith(":")),
  );
  const productItems = snapshot.products
    .filter((product) => {
      const nextKey = `${ownerKey(source.fromOwnerType, source.fromOwnerId)}:${product.id}`;
      if (used.has(nextKey) && product.id !== line.productId) {
        return false;
      }
      if (!locationType || !locationId) {
        return true;
      }
      if (line.fromOwnerKind === "free") {
        return freePlacesForProduct(balances, product.id).some(
          (place) => place.locationType === locationType && place.locationId === locationId,
        );
      }
      if (!line.fromOwnerId) {
        return true;
      }
      return reservedAtPlaceForOwner(balances, product.id, locationType, locationId, source.fromOwnerType, source.fromOwnerId) > 0;
    })
    .map((product) => ({
      value: product.id,
      label: productIdentityLabel(product, product.id),
    }));

  return (
    <div className="space-y-2 rounded-md border p-3">
      <FieldSelect
        label={`Source ${index + 1}`}
        value={line.fromOwnerKind}
        items={OWNER_KIND_ITEMS}
        onChange={(value) => onChange({ ...line, fromOwnerKind: value as OwnerKind, fromOwnerId: "", productId: line.productId })}
      />
      {line.fromOwnerKind === "free" ? null : (
        <FieldSelect
          label={line.fromOwnerKind === "order" ? "Source order" : "Source region"}
          value={line.fromOwnerId}
          items={(line.fromOwnerKind === "order" ? snapshot.customerOrders : snapshot.regions)
            .map((item) => {
              const qty =
                line.productId && locationType && locationId
                  ? reservedAtPlaceForOwner(
                      balances,
                      line.productId,
                      locationType,
                      locationId,
                      line.fromOwnerKind === "free" ? null : line.fromOwnerKind,
                      item.id,
                    )
                  : 0;
              return {
                value: item.id,
                label:
                  line.productId && locationType && locationId
                    ? `${"number" in item ? item.number : `${item.code} · ${item.name}`} · ${formatQuantity(qty)}`
                    : "number" in item
                      ? item.number
                      : `${item.code} · ${item.name}`,
                quantity: qty,
              };
            })
            .filter((item) => item.quantity > 0 || item.value === line.fromOwnerId)
            .map(({ value, label }) => ({ value, label }))}
          onChange={(value) => onChange({ ...line, fromOwnerId: value })}
          placeholder="Select owner"
          emptyLabel="No reserved quantity for this source"
        />
      )}
      <FieldSelect
        label={`Product ${index + 1}`}
        value={line.productId}
        items={productItems}
        onChange={(value) => {
          const nextMax =
            locationType && locationId
              ? reservationCapForOwner(
                  balances,
                  value,
                  locationType,
                  locationId,
                  source.fromOwnerType,
                  source.fromOwnerId,
                  dest.toOwnerType,
                  dest.toOwnerId,
                  destKind === "order" && destOwnerId
                    ? orderLineForProduct(snapshot.customerOrderLines, destOwnerId, value)?.quantity
                    : undefined,
                )
              : 0;
          onChange({ ...line, productId: value, quantity: String(nextMax > 0 ? nextMax : 1) });
        }}
        placeholder="Select product"
        disabled={!locationType || !locationId}
      />
      {line.productId ? <AvailabilityPanel snapshot={snapshot} balances={balances} productId={line.productId} /> : null}
      <QuantityField
        label="Quantity"
        emptyLabel="No available quantity"
        availablePrefix="Available"
        afterActionPrefix="after this action"
        value={line.quantity}
        onChange={(value) => onChange({ ...line, quantity: value })}
        max={locationType && locationId && line.productId ? max : undefined}
        unit={line.productId ? productById(snapshot, line.productId)?.unit : undefined}
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
    locationType?: ReservationLocationType;
    locationId?: string;
    toOwnerType?: OwnerType | null;
    toOwnerId?: string | null;
    fromOwnerType?: OwnerType | null;
    fromOwnerId?: string | null;
    productId?: string;
  };
}) => {
  const presetDestKind: OwnerKind = isFreeOwner(preset?.toOwnerType, preset?.toOwnerId)
    ? preset && "toOwnerType" in preset
      ? "free"
      : "order"
    : (preset?.toOwnerType ?? "order");
  const presetDestId = presetDestKind === "free" ? "" : (preset?.toOwnerId ?? "");
  const [destKind, setDestKind] = useState<OwnerKind>(presetDestKind);
  const [destOwnerId, setDestOwnerId] = useState(presetDestId);
  const [location, setLocation] = useState(
    preset?.locationType && preset.locationId ? placeKey(preset.locationType, preset.locationId) : "",
  );
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<ReservationDraftLine[]>([
    emptyReservationLine({
      fromOwnerType: preset?.fromOwnerType,
      fromOwnerId: preset?.fromOwnerId,
      productId: preset?.productId,
    }),
  ]);

  const selectedPlace = location ? parsePlaceKey(location) : null;
  const locationType = selectedPlace?.locationType ?? "";
  const locationId = selectedPlace?.locationId ?? "";
  const dest = destinationFromKind(destKind, destOwnerId);

  const placeItems = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ value: string; label: string }> = [];
    const addPlace = (locationType: ReservationLocationType, locationId: string, suffix: string) => {
      const key = placeKey(locationType, locationId);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      items.push({
        value: key,
        label: `${locationLabel(snapshot, locationType, locationId)} · ${suffix}`,
      });
    };
    for (const entry of balances) {
      if (
        entry.quantity <= 1e-9 ||
        (entry.locationType !== "warehouse" &&
          entry.locationType !== "production_order_line" &&
          entry.locationType !== "transfer")
      ) {
        continue;
      }
      if (destKind === "free") {
        if (entry.stockState === "reserved") {
          addPlace(entry.locationType, entry.locationId, `reserved ${formatQuantity(entry.quantity)}`);
        }
        continue;
      }
      if (entry.stockState === "free") {
        addPlace(entry.locationType, entry.locationId, `free ${formatQuantity(entry.quantity)}`);
        continue;
      }
      if (
        entry.stockState === "reserved" &&
        !ownersEqual(entry.ownerType, entry.ownerId, dest.toOwnerType, dest.toOwnerId)
      ) {
        addPlace(entry.locationType, entry.locationId, `reserved ${formatQuantity(entry.quantity)}`);
      }
    }
    return items;
  }, [balances, dest, destKind, snapshot]);

  const derivedDirection = reservationDirection(
    dest,
    lines.map((line) => ownerFromKind(line.fromOwnerKind, line.fromOwnerId)),
  );

  const validLines = lines.filter((line) => {
    if (!line.productId || !locationType || !locationId) {
      return false;
    }
    if (line.fromOwnerKind !== "free" && !line.fromOwnerId) {
      return false;
    }
    const source = ownerFromKind(line.fromOwnerKind, line.fromOwnerId);
    if (ownersEqual(source.fromOwnerType, source.fromOwnerId, dest.toOwnerType, dest.toOwnerId)) {
      return false;
    }
    const orderLine =
      destKind === "order" && destOwnerId
        ? orderLineForProduct(snapshot.customerOrderLines, destOwnerId, line.productId)
        : undefined;
    const max = reservationCapForOwner(
      balances,
      line.productId,
      locationType,
      locationId,
      source.fromOwnerType,
      source.fromOwnerId,
      dest.toOwnerType,
      dest.toOwnerId,
      orderLine?.quantity,
    );
    return isAllowedQuantity(line.quantity, max);
  });
  const filled = lines.filter((line) => line.productId);
  const uniqueKeys = new Set(filled.map(lineIdentity));
  const linesReady = validLines.length > 0 && validLines.length === filled.length && uniqueKeys.size === filled.length;
  const destReady = destKind === "free" || Boolean(destOwnerId);

  const reset = () => {
    setDestKind(presetDestKind);
    setDestOwnerId(presetDestId);
    setLocation(preset?.locationType && preset.locationId ? placeKey(preset.locationType, preset.locationId) : "");
    setNote("");
    setLines([
      emptyReservationLine({
        fromOwnerType: preset?.fromOwnerType,
        fromOwnerId: preset?.fromOwnerId,
        productId: preset?.productId,
      }),
    ]);
  };

  const submit = async (post: boolean) => {
    if (!destReady || !locationType || !locationId || validLines.length === 0) {
      toast.error("Choose a destination, place, and at least one product line");
      return;
    }
    const payloadLines = [];
    for (const line of lines) {
      if (!line.productId) {
        continue;
      }
      const source = ownerFromKind(line.fromOwnerKind, line.fromOwnerId);
      if (ownersEqual(source.fromOwnerType, source.fromOwnerId, dest.toOwnerType, dest.toOwnerId)) {
        toast.error("Source and destination owners must be different");
        return;
      }
      const orderLine =
        destKind === "order" && destOwnerId
          ? orderLineForProduct(snapshot.customerOrderLines, destOwnerId, line.productId)
          : undefined;
      const max = reservationCapForOwner(
        balances,
        line.productId,
        locationType,
        locationId,
        source.fromOwnerType,
        source.fromOwnerId,
        dest.toOwnerType,
        dest.toOwnerId,
        orderLine?.quantity,
      );
      if (!isAllowedQuantity(line.quantity, max)) {
        toast.error("Each line needs a product and an allowed quantity");
        return;
      }
      const qty = Number(line.quantity);
      try {
        assertEnoughStock(max, qty, isFreeOwner(source.fromOwnerType, source.fromOwnerId) ? "free" : "reserved");
        if (orderLine && destKind === "order") {
          assertCustomerCapacity(orderLine, balances, qty);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Not enough stock");
        return;
      }
      payloadLines.push({
        productId: line.productId,
        quantity: qty,
        fromOwnerType: source.fromOwnerType,
        fromOwnerId: source.fromOwnerId,
      });
    }
    const payload = {
      locationType,
      locationId,
      toOwnerType: dest.toOwnerType,
      toOwnerId: dest.toOwnerId,
      note,
      lines: payloadLines,
    };
    const ok = await runLogisticsAction(
      () => (post ? createAndPostReservation(payload) : createReservationDraft(payload)),
      post ? `${RESERVATION_DIRECTION_LABELS[derivedDirection]} posted` : "Reservation draft created",
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
      description="Destination is on the header. Source is on each line. Direction is derived: Reserve, Release, or Reassign."
      className="sm:max-w-lg"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Direction: <span className="font-medium text-foreground">{RESERVATION_DIRECTION_LABELS[derivedDirection]}</span>
        </p>
        <FieldSelect
          label="Destination"
          value={destKind}
          items={OWNER_KIND_ITEMS}
          onChange={(value) => {
            setDestKind(value as OwnerKind);
            setDestOwnerId(value === destKind ? destOwnerId : "");
            setLocation("");
          }}
        />
        {destKind === "free" ? null : (
          <FieldSelect
            label={destKind === "order" ? "Order" : "Region"}
            value={destOwnerId}
            items={
              destKind === "order"
                ? snapshot.customerOrders
                    .filter((item) => item.status === "open")
                    .map((item) => ({ value: item.id, label: item.number }))
                : ownerSelectItems(snapshot, destKind)
            }
            onChange={(value) => {
              setDestOwnerId(value);
              setLocation("");
            }}
            placeholder={destKind === "order" ? "Select order" : "Select region"}
          />
        )}
        <FieldSelect
          label="Place"
          value={location}
          items={placeItems}
          onChange={setLocation}
          placeholder="Select place"
          emptyLabel="No matching stock at a place"
          disabled={destKind !== "free" && !destOwnerId}
        />
        {lines.map((_, index) => (
          <ReservationLineFields
            key={`rsv-line-${index}`}
            snapshot={snapshot}
            balances={balances}
            destKind={destKind}
            destOwnerId={destOwnerId}
            locationType={locationType}
            locationId={locationId}
            lines={lines}
            index={index}
            onChange={(next) => {
              setLines((current) => current.map((item, itemIndex) => (itemIndex === index ? next : item)));
            }}
          />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, emptyReservationLine()])}>
          Add line
        </Button>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Note</span>
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
        </label>
        <FormActions
          mode={mode}
          canSubmit={Boolean(destReady && location && linesReady)}
          onDraft={() => void submit(false)}
          onPost={() => void submit(true)}
          postLabel={RESERVATION_DIRECTION_LABELS[derivedDirection]}
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
  const regionRows = warehouseId
    ? balances
        .filter(
          (entry) =>
            entry.locationType === "warehouse" &&
            entry.locationId === warehouseId &&
            entry.stockState === "reserved" &&
            entry.ownerType === "region" &&
            entry.ownerId &&
            entry.quantity > 1e-9 &&
            orderLines.some((line) => line.productId === entry.productId),
        )
        .map((entry) => ({
          key: `${entry.productId}:${entry.ownerId}`,
          productId: entry.productId,
          ownerId: entry.ownerId as string,
          quantity: entry.quantity,
        }))
    : [];

  const reset = () => {
    setOrderId(preset?.customerOrderId ?? "");
    setWarehouseId(preset?.warehouseId ?? "");
    setQuantities({});
  };

  const submit = async (post: boolean) => {
    const payload = lines
      .map((item) => ({
        productId: item.line.productId,
        quantity: Number(quantities[item.line.id] ?? item.reserved),
      }))
      .filter((item) => item.quantity > 0);
    if (!selectedOrderId || !warehouseId || payload.length === 0) {
      toast.error("Выберите заказ клиента, склад с резервом и количества");
      return;
    }
    for (const item of payload) {
      const line = orderLines.find((entry) => entry.productId === item.productId);
      if (!line) {
        continue;
      }
      const max = remainingToShipForLine(line, balances, warehouseId);
      try {
        assertEnoughStock(max, item.quantity, "reserved");
        assertShipmentCapacity(line, balances, item.quantity);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Нельзя отгрузить больше доступного");
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
      post ? "Отгрузка проведена" : "Черновик отгрузки создан",
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
      title="Отгрузка"
      description="Один заказ клиента и один склад. Строки берутся из зарезервированного остатка на этом складе."
    >
      <div className="flex flex-col gap-3">
        {preset?.customerOrderId ? null : (
          <FieldSelect
            label="Заказ клиента"
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
          label="Склад"
          value={warehouseId}
          items={warehouses.map((item) => ({
            value: item.warehouseId,
            label: `${warehouseCode(snapshot, item.warehouseId)} · зарезервировано ${formatQuantity(item.quantity)}`,
          }))}
          onChange={(value) => {
            setWarehouseId(value);
            const nextLines = reservedLinesAtWarehouse(balances, value, orderLines);
            setQuantities(Object.fromEntries(nextLines.map((item) => [item.line.id, String(item.reserved)])));
          }}
          placeholder="Выберите склад"
          emptyLabel="Нет резерва на складах"
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
        {regionRows.map((item) => (
          <div key={item.key} className="space-y-1 rounded-md border border-dashed p-3 opacity-70">
            <ProductIdentity snapshot={snapshot} productId={item.productId} nameAs="text" />
            <p className="text-sm text-muted-foreground">
              {ownerLabel(snapshot, "region", item.ownerId)} · {formatQuantity(item.quantity)} · Reassign to this
              order first
            </p>
          </div>
        ))}
        <FormActions
          mode={mode}
          canSubmit={canSubmit}
          onDraft={() => void submit(false)}
          onPost={() => void submit(true)}
          postLabel="Отгрузить"
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
      toast.error("Укажите количество возврата");
      return;
    }
    const ok = await runLogisticsAction(
      () =>
        createAndPostReturn({
          shipmentId: selectedShipmentId,
          lines: payload,
          post,
        }),
      post ? "Возврат проведён" : "Черновик возврата создан",
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
      title="Возврат"
      description="Возвращайте не больше ещё не возвращённого отгруженного количества. Остаток становится свободным на складе исходной отгрузки."
    >
      <div className="flex flex-col gap-3">
        {preset?.shipmentId ? null : (
          <FieldSelect
            label="Отгрузка"
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
          postLabel="Вернуть"
        />
      </div>
    </LogisticsDialog>
  );
};
