// english-ui:ignore-file
"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import {
  createAndPostAdjustment,
  createAndPostReservation,
  createAndPostShipment,
  createReservationDraft,
} from "@/features/logistics/logistics-api";
import {
  assertUniqueReturnDestinations,
  reserveThenShipNextAction,
  shipmentIntentionAfterBack,
  shipmentsForAdjustmentSource,
} from "@/features/logistics/shipment-direct-post";
import {
  ADJUSTMENT_EXPLANATION_REQUIRED,
  ADJUSTMENT_LINES_REQUIRED,
  ADJUSTMENT_OPERATIONS,
  ADJUSTMENT_WAREHOUSE_REQUIRED,
  assertAdjustmentExplanation,
  buildAdjustmentFacts,
  freeWarehouseQuantity,
  type AdjustmentOperation,
  type AdjustmentSourceDocumentType,
} from "@/features/logistics/logistics-adjustments";
import {
  freePlacesForProduct,
  remainingToReturnForOrderProduct,
  remainingToShipForLine,
  reservationCapForOwner,
  reservedAtPlaceForOwner,
  reservedLinesAtWarehouse,
  warehousesWithReservedForOrder,
} from "@/features/logistics/logistics-availability";
import {
  ADJUSTMENT_OPERATION_LABELS,
  DOCUMENT_TYPE_LABELS,
  FREE_OWNER_LABEL,
  OWNER_TYPE_LABELS,
  RESERVATION_DIRECTION_LABELS,
  SHIPMENT_DIRECTION_LABELS,
  formatQuantity,
} from "@/features/logistics/logistics-labels";
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
  type ShipmentDirection,
  type OwnerType,
  type ReservationLocationType,
  type StockBalance,
} from "@/features/logistics/logistics-types";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { runLogisticsAction, translateLogisticsError } from "@/features/logistics/ui/run-action";

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
  draftLabel = "Сохранить черновик",
  postLabel = "Провести",
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
        label={`Источник ${index + 1}`}
        value={line.fromOwnerKind}
        items={OWNER_KIND_ITEMS}
        onChange={(value) => onChange({ ...line, fromOwnerKind: value as OwnerKind, fromOwnerId: "", productId: line.productId })}
      />
      {line.fromOwnerKind === "free" ? null : (
        <FieldSelect
          label={line.fromOwnerKind === "order" ? "Исходный заказ" : "Исходный регион"}
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
          placeholder="Выберите владельца"
          emptyLabel="Нет резерва у этого источника"
        />
      )}
      <FieldSelect
        label={`Товар ${index + 1}`}
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
        placeholder="Выберите товар"
        disabled={!locationType || !locationId}
      />
      {line.productId ? <AvailabilityPanel snapshot={snapshot} balances={balances} productId={line.productId} /> : null}
      <QuantityField
        label="Количество"
        emptyLabel="Нет доступного количества"
        availablePrefix="Доступно"
        afterActionPrefix="после этого действия"
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
          entry.locationType !== "production_order" &&
          entry.locationType !== "transfer")
      ) {
        continue;
      }
      if (destKind === "free") {
        if (entry.stockState === "reserved") {
          addPlace(entry.locationType, entry.locationId, `резерв ${formatQuantity(entry.quantity)}`);
        }
        continue;
      }
      if (entry.stockState === "free") {
        addPlace(entry.locationType, entry.locationId, `свободно ${formatQuantity(entry.quantity)}`);
        continue;
      }
      if (
        entry.stockState === "reserved" &&
        !ownersEqual(entry.ownerType, entry.ownerId, dest.toOwnerType, dest.toOwnerId)
      ) {
        addPlace(entry.locationType, entry.locationId, `резерв ${formatQuantity(entry.quantity)}`);
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
      toast.error("Выберите назначение, место и хотя бы одну строку товара");
      return;
    }
    const payloadLines = [];
    for (const line of lines) {
      if (!line.productId) {
        continue;
      }
      const source = ownerFromKind(line.fromOwnerKind, line.fromOwnerId);
      if (ownersEqual(source.fromOwnerType, source.fromOwnerId, dest.toOwnerType, dest.toOwnerId)) {
        toast.error("Источник и назначение должны отличаться");
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
        toast.error("В каждой строке нужны товар и допустимое количество");
        return;
      }
      const qty = Number(line.quantity);
      try {
        assertEnoughStock(max, qty, isFreeOwner(source.fromOwnerType, source.fromOwnerId) ? "free" : "reserved");
        if (orderLine && destKind === "order") {
          assertCustomerCapacity(orderLine, balances, qty);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Недостаточно остатка");
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
      post ? `${RESERVATION_DIRECTION_LABELS[derivedDirection]} проведён` : "Черновик резерва создан",
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
      title="Резерв"
      className="sm:max-w-lg"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Направление: <span className="font-medium text-foreground">{RESERVATION_DIRECTION_LABELS[derivedDirection]}</span>
        </p>
        <FieldSelect
          label="Назначение"
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
            label={destKind === "order" ? "Заказ" : "Регион"}
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
            placeholder={destKind === "order" ? "Выберите заказ" : "Выберите регион"}
          />
        )}
        <FieldSelect
          label="Место"
          value={location}
          items={placeItems}
          onChange={setLocation}
          placeholder="Выберите место"
          emptyLabel="Нет подходящего остатка в месте"
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
          Добавить строку
        </Button>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Комментарий</span>
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Необязательно" />
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

type ReturnDraftLine = {
  key: string;
  productId: string;
  quantity: string;
  destKind: OwnerKind;
  destOwnerId: string;
};

type ReserveSourceDraft = {
  key: string;
  productId: string;
  fromOwnerKind: "free" | "region";
  fromOwnerId: string;
  quantity: string;
};

const emptyReturnLine = (productId = ""): ReturnDraftLine => ({
  key: `return-${productId || "new"}-${Math.random().toString(16).slice(2)}`,
  productId,
  quantity: "1",
  destKind: "free",
  destOwnerId: "",
});

export type ShipmentFormPreset = {
  intention?: ShipmentDirection;
  customerOrderId?: string;
  warehouseId?: string;
};

export const ShipmentForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  preset,
}: SharedFormProps & {
  preset?: ShipmentFormPreset;
}) => {
  const [intention, setIntention] = useState<ShipmentDirection | null>(preset?.intention ?? null);
  const [orderId, setOrderId] = useState(preset?.customerOrderId ?? "");
  const [warehouseId, setWarehouseId] = useState(preset?.warehouseId ?? "");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [returnLines, setReturnLines] = useState<ReturnDraftLine[]>([emptyReturnLine()]);
  const [reserveThenShip, setReserveThenShip] = useState(false);
  const [reserveSources, setReserveSources] = useState<ReserveSourceDraft[]>([]);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [shipmentError, setShipmentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const selectedOrderId = preset?.customerOrderId ?? orderId;
  const orderLines = snapshot.customerOrderLines.filter((line) => line.orderId === selectedOrderId);
  const reservedWarehouses = warehousesWithReservedForOrder(balances, orderLines);
  const reservedShipLines = warehouseId ? reservedLinesAtWarehouse(balances, warehouseId, orderLines) : [];
  const shippedLines = orderLines.filter(
    (line) => remainingToReturnForOrderProduct(balances, line.orderId, line.productId) > 0,
  );
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
  const freeRows = warehouseId
    ? balances.filter(
        (entry) =>
          entry.locationType === "warehouse" &&
          entry.locationId === warehouseId &&
          entry.stockState === "free" &&
          entry.quantity > 1e-9 &&
          orderLines.some((line) => line.productId === entry.productId),
      )
    : [];

  const resetDetails = () => {
    setWarehouseId(preset?.warehouseId ?? "");
    setQuantities({});
    setReturnLines([emptyReturnLine(shippedLines[0]?.productId ?? "")]);
    setReserveThenShip(false);
    setReserveSources([]);
    setReservationId(null);
    setShipmentError(null);
    setSubmitting(false);
  };

  const reset = () => {
    setIntention(preset?.intention ?? null);
    setOrderId(preset?.customerOrderId ?? "");
    resetDetails();
  };

  const goBack = () => {
    const cleared = shipmentIntentionAfterBack(preset?.customerOrderId ?? "");
    setIntention(cleared.intention);
    setOrderId(cleared.orderId);
    resetDetails();
  };

  const chooseIntention = (next: ShipmentDirection) => {
    resetDetails();
    setIntention(next);
    if (next === "return") {
      setReturnLines([emptyReturnLine()]);
    }
  };

  const reservePayload = reserveSources
    .map((line) => ({
      productId: line.productId,
      quantity: Number(line.quantity),
      fromOwnerType: line.fromOwnerKind === "free" ? null : ("region" as const),
      fromOwnerId: line.fromOwnerKind === "free" ? null : line.fromOwnerId,
    }))
    .filter((item) => item.productId && item.quantity > 0);

  const extraShipLines =
    reserveThenShip || reservationId
      ? orderLines
          .filter((line) => !reservedShipLines.some((item) => item.line.id === line.id))
          .filter((line) => reservePayload.some((item) => item.productId === line.productId))
          .map((line) => ({
            line,
            reserved: reservePayload
              .filter((item) => item.productId === line.productId)
              .reduce((sum, item) => sum + item.quantity, 0),
          }))
      : [];
  const shipLines = [...reservedShipLines, ...extraShipLines];

  const shipPayload = shipLines
    .map((item) => ({
      productId: item.line.productId,
      quantity: Number(quantities[item.line.id] ?? item.reserved),
      toOwnerType: "order" as const,
      toOwnerId: selectedOrderId,
    }))
    .filter((item) => item.quantity > 0);

  const returnPayload = returnLines
    .map((line) => {
      const dest = destinationFromKind(line.destKind, line.destOwnerId);
      return {
        productId: line.productId,
        quantity: Number(line.quantity),
        toOwnerType: dest.toOwnerType,
        toOwnerId: dest.toOwnerId,
      };
    })
    .filter((item) => item.productId && item.quantity > 0);

  const submitShipment = async () => {
    if (submittingRef.current || submitting) {
      return;
    }
    if (!selectedOrderId || !warehouseId || shipPayload.length === 0) {
      toast.error("Выберите заказ клиента, склад с резервом и количества");
      return;
    }
    for (const item of shipPayload) {
      const line = orderLines.find((entry) => entry.productId === item.productId);
      if (!line) {
        continue;
      }
      const reserved = remainingToShipForLine(line, balances, warehouseId);
      const extra = Math.max(0, item.quantity - reserved);
      if (extra > 0 && !(reserveThenShip && reservePayload.length > 0) && !reservationId) {
        toast.error("Нельзя отгрузить свободный или региональный остаток без резерва");
        return;
      }
      try {
        if (!reserveThenShip && !reservationId) {
          assertEnoughStock(reserved, item.quantity, "reserved");
        }
        assertShipmentCapacity(line, balances, item.quantity);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Нельзя отгрузить больше доступного");
        return;
      }
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (reserveThenShip && reservePayload.length > 0 && !reservationId) {
        try {
          await createAndPostReservation({
            locationType: "warehouse",
            locationId: warehouseId,
            toOwnerType: "order",
            toOwnerId: selectedOrderId,
            lines: reservePayload,
          });
          setReservationId("done");
          toast.success("Резерв проведён");
          try {
            await reload();
          } catch {
            // Резерв уже проведён; повтор должен идти только в отгрузку.
          }
        } catch (error) {
          toast.error("Не удалось выполнить действие", {
            description: translateLogisticsError(error instanceof Error ? error.message : "Попробуйте ещё раз."),
          });
          return;
        }
      }

      const shipped = await runLogisticsAction(
        () =>
          createAndPostShipment({
            customerOrderId: selectedOrderId,
            fromLocationType: "warehouse",
            fromLocationId: warehouseId,
            toLocationType: "customer_order",
            toLocationId: selectedOrderId,
            lines: shipPayload,
          }),
        "Отгрузка проведена",
        reload,
      );
      if (shipped) {
        onOpenChange(false);
        reset();
        return;
      }
      if (reservationId || (reserveThenShip && reservePayload.length > 0)) {
        setReservationId((current) => current ?? "done");
        setShipmentError("Отгрузка не прошла. Резерв сохранён — можно повторить только отгрузку.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const submitReturn = async () => {
    if (submittingRef.current || submitting) {
      return;
    }
    if (!selectedOrderId || !warehouseId || returnPayload.length === 0) {
      toast.error("Выберите заказ клиента, склад и количества возврата");
      return;
    }
    const totals = new Map<string, number>();
    for (const item of returnPayload) {
      if ((item.toOwnerType == null) !== (item.toOwnerId == null)) {
        toast.error("Назначение остатка должно быть полным");
        return;
      }
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
    }
    try {
      assertUniqueReturnDestinations(returnPayload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Одинаковый товар и назначение можно указать только один раз");
      return;
    }
    for (const [productId, quantity] of totals) {
      const remaining = remainingToReturnForOrderProduct(balances, selectedOrderId, productId);
      if (quantity - remaining > 1e-9) {
        toast.error("Недостаточно отгруженного количества по заказу");
        return;
      }
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const ok = await runLogisticsAction(
        () =>
          createAndPostShipment({
            customerOrderId: selectedOrderId,
            fromLocationType: "customer_order",
            fromLocationId: selectedOrderId,
            toLocationType: "warehouse",
            toLocationId: warehouseId,
            lines: returnPayload,
          }),
        "Возврат проведён",
        reload,
      );
      if (ok) {
        onOpenChange(false);
        reset();
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const canShip = shipLines.some((item) =>
    isAllowedQuantity(quantities[item.line.id] ?? String(item.reserved), Number.POSITIVE_INFINITY),
  );
  const canReturn = returnPayload.length > 0 && warehouseId.length > 0;

  const fillReserveSources = (nextWarehouseId: string) => {
    const sources: ReserveSourceDraft[] = [];
    for (const line of orderLines) {
      const free = balances.find(
        (entry) =>
          entry.productId === line.productId &&
          entry.locationType === "warehouse" &&
          entry.locationId === nextWarehouseId &&
          entry.stockState === "free" &&
          entry.quantity > 1e-9,
      );
      if (free) {
        sources.push({
          key: `free:${line.productId}`,
          productId: line.productId,
          fromOwnerKind: "free",
          fromOwnerId: "",
          quantity: String(free.quantity),
        });
      }
      for (const region of balances.filter(
        (entry) =>
          entry.productId === line.productId &&
          entry.locationType === "warehouse" &&
          entry.locationId === nextWarehouseId &&
          entry.stockState === "reserved" &&
          entry.ownerType === "region" &&
          entry.ownerId &&
          entry.quantity > 1e-9,
      )) {
        sources.push({
          key: `region:${line.productId}:${region.ownerId}`,
          productId: line.productId,
          fromOwnerKind: "region",
          fromOwnerId: region.ownerId as string,
          quantity: String(region.quantity),
        });
      }
    }
    setReserveSources(sources);
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
      title={intention ? SHIPMENT_DIRECTION_LABELS[intention] : "Новый документ"}
      description={
        intention
          ? `Маршрут: ${intention === "shipment" ? "склад → заказ клиента" : "заказ клиента → склад"}`
          : "Выберите намерение. Его можно сменить только возвратом на этот шаг."
      }
      className={intention ? undefined : "sm:max-w-xl"}
    >
      <div className="flex flex-col gap-3">
        {intention ? (
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
            <p className="text-sm font-medium">{SHIPMENT_DIRECTION_LABELS[intention]}</p>
            <Button type="button" size="sm" variant="ghost" onClick={goBack}>
              Назад
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-lg border p-4 text-left transition hover:border-foreground"
              onClick={() => chooseIntention("shipment")}
            >
              <p className="text-base font-semibold">Отгрузить</p>
              <p className="mt-1 text-xs text-muted-foreground">Склад → заказ клиента из резерва заказа</p>
            </button>
            <button
              type="button"
              className="rounded-lg border p-4 text-left transition hover:border-foreground"
              onClick={() => chooseIntention("return")}
            >
              <p className="text-base font-semibold">Принять возврат</p>
              <p className="mt-1 text-xs text-muted-foreground">Заказ клиента → любой склад с выбором назначения</p>
            </button>
          </div>
        )}

        {intention && !preset?.customerOrderId ? (
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
              setReturnLines([emptyReturnLine()]);
              setReserveSources([]);
            }}
          />
        ) : null}

        {intention === "shipment" ? (
          <>
            <div className="grid gap-1 text-sm">
              <p>
                <span className="text-muted-foreground">Откуда:</span> склад
              </p>
              <p>
                <span className="text-muted-foreground">Куда:</span> заказ клиента
              </p>
            </div>
            <FieldSelect
              label="Склад"
              value={warehouseId}
              items={[
                ...reservedWarehouses.map((item) => ({
                  value: item.warehouseId,
                  label: `${warehouseCode(snapshot, item.warehouseId)} · резерв ${formatQuantity(item.quantity)}`,
                })),
                ...snapshot.warehouses
                  .filter((warehouse) => !reservedWarehouses.some((item) => item.warehouseId === warehouse.id))
                  .map((warehouse) => ({
                    value: warehouse.id,
                    label: warehouse.code,
                  })),
              ]}
              onChange={(value) => {
                setWarehouseId(value);
                const nextLines = reservedLinesAtWarehouse(balances, value, orderLines);
                setQuantities(Object.fromEntries(nextLines.map((item) => [item.line.id, String(item.reserved)])));
                fillReserveSources(value);
                setReservationId(null);
                setShipmentError(null);
              }}
              placeholder="Выберите склад"
              emptyLabel="Нет складов"
            />
            {shipLines.map((item) => {
              const product = productById(snapshot, item.line.productId);
              return (
                <div key={item.line.id} className="space-y-2">
                  <ProductIdentity snapshot={snapshot} productId={item.line.productId} nameAs="text" />
                  <AvailabilityPanel snapshot={snapshot} balances={balances} productId={item.line.productId} />
                  <QuantityField
                    value={quantities[item.line.id] ?? String(item.reserved)}
                    onChange={(value) => setQuantities((current) => ({ ...current, [item.line.id]: value }))}
                    max={reserveThenShip ? undefined : item.reserved}
                    unit={product?.unit}
                  />
                </div>
              );
            })}
            {regionRows.length > 0 || freeRows.length > 0 ? (
              <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={reserveThenShip}
                  disabled={Boolean(reservationId)}
                  onChange={(event) => {
                    setReserveThenShip(event.target.checked);
                    if (event.target.checked && warehouseId) {
                      fillReserveSources(warehouseId);
                    }
                  }}
                />
                <span>
                  Сначала зарезервировать свободный и региональный остаток, затем отгрузить. Резерв останется, если
                  отгрузка не пройдёт.
                </span>
              </label>
            ) : null}
            {reserveThenShip ? (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Превью резерва</p>
                {reserveSources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет свободного или регионального остатка на складе</p>
                ) : (
                  reserveSources.map((source) => (
                    <div key={source.key} className="space-y-1">
                      <p className="text-sm">
                        {productIdentityLabel(productById(snapshot, source.productId), source.productId)} ·{" "}
                        {source.fromOwnerKind === "free"
                          ? FREE_OWNER_LABEL
                          : ownerLabel(snapshot, "region", source.fromOwnerId)}
                      </p>
                      <QuantityField
                        value={source.quantity}
                        onChange={(value) =>
                          setReserveSources((current) =>
                            current.map((item) => (item.key === source.key ? { ...item, quantity: value } : item)),
                          )
                        }
                        min={0}
                      />
                    </div>
                  ))
                )}
              </div>
            ) : (
              regionRows.map((item) => (
                <div key={item.key} className="space-y-1 rounded-md border border-dashed p-3 opacity-70">
                  <ProductIdentity snapshot={snapshot} productId={item.productId} nameAs="text" />
                  <p className="text-sm text-muted-foreground">
                    {ownerLabel(snapshot, "region", item.ownerId)} · {formatQuantity(item.quantity)} · сначала
                    переназначьте на этот заказ
                  </p>
                </div>
              ))
            )}
            {reservationId && shipmentError ? (
              <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-sm font-medium">Резерв проведён</p>
                <p className="text-sm text-destructive">{shipmentError}</p>
              </div>
            ) : null}
            <Button
              type="button"
              disabled={!canShip || submitting}
              onClick={() => void submitShipment()}
            >
              {reserveThenShipNextAction(Boolean(reservationId)) === "retry-shipment"
                ? "Повторить отгрузку"
                : reserveThenShip
                  ? "Зарезервировать и отгрузить"
                  : "Отгрузить"}
            </Button>
          </>
        ) : null}

        {intention === "return" ? (
          <>
            <div className="grid gap-1 text-sm">
              <p>
                <span className="text-muted-foreground">Откуда:</span> заказ клиента
              </p>
              <p>
                <span className="text-muted-foreground">Куда:</span> склад
              </p>
            </div>
            <FieldSelect
              label="Склад"
              value={warehouseId}
              items={snapshot.warehouses.map((item) => ({ value: item.id, label: item.code }))}
              onChange={(value) => {
                setWarehouseId(value);
              }}
              placeholder="Выберите склад"
            />
            {returnLines.map((line, index) => {
              const remaining = line.productId
                ? remainingToReturnForOrderProduct(balances, selectedOrderId, line.productId)
                : 0;
              const product = productById(snapshot, line.productId);
              return (
                <div key={line.key} className="space-y-2 rounded-md border p-3">
                  <FieldSelect
                    label="Товар"
                    value={line.productId}
                    items={shippedLines.map((item) => ({
                      value: item.productId,
                      label: `${productIdentityLabel(productById(snapshot, item.productId), item.productId)} · отгружено ${formatQuantity(remainingToReturnForOrderProduct(balances, item.orderId, item.productId))}`,
                    }))}
                    onChange={(value) =>
                      setReturnLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, productId: value } : item,
                        ),
                      )
                    }
                    emptyLabel="Нет отгруженного товара"
                  />
                  <FieldSelect
                    label="Назначение остатка"
                    value={line.destKind}
                    items={OWNER_KIND_ITEMS.filter((item) => item.value !== "order" || Boolean(selectedOrderId)).map(
                      (item) => ({
                        value: item.value,
                        label: item.value === "order" ? "Текущий заказ" : item.label,
                      }),
                    )}
                    onChange={(value) =>
                      setReturnLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                destKind: value as OwnerKind,
                                destOwnerId: value === "order" ? selectedOrderId : "",
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  {line.destKind === "region" ? (
                    <FieldSelect
                      label="Регион"
                      value={line.destOwnerId}
                      items={snapshot.regions.map((item) => ({ value: item.id, label: item.code }))}
                      onChange={(value) =>
                        setReturnLines((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, destOwnerId: value } : item,
                          ),
                        )
                      }
                    />
                  ) : null}
                  {line.productId ? (
                    <AvailabilityPanel snapshot={snapshot} balances={balances} productId={line.productId} />
                  ) : null}
                  <QuantityField
                    value={line.quantity}
                    onChange={(value) =>
                      setReturnLines((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity: value } : item)),
                      )
                    }
                    max={remaining}
                    unit={product?.unit}
                  />
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReturnLines((current) => [...current, emptyReturnLine(shippedLines[0]?.productId ?? "")])}
            >
              Добавить строку
            </Button>
            <Button type="button" disabled={!canReturn || submitting} onClick={() => void submitReturn()}>
              Принять возврат
            </Button>
          </>
        ) : null}
      </div>
    </LogisticsDialog>
  );
};

type AdjustmentDraftLine = {
  productId: string;
  quantity: string;
};

const emptyAdjustmentLine = (productId = ""): AdjustmentDraftLine => ({
  productId,
  quantity: "1",
});

const ADJUSTMENT_SOURCE_ITEMS: Array<{ value: AdjustmentSourceDocumentType; label: string }> = [
  { value: "output", label: DOCUMENT_TYPE_LABELS.output },
  { value: "transfer", label: DOCUMENT_TYPE_LABELS.transfer },
  { value: "reservation", label: DOCUMENT_TYPE_LABELS.reservation },
  { value: "shipment", label: DOCUMENT_TYPE_LABELS.shipment },
  { value: "return", label: DOCUMENT_TYPE_LABELS.return },
  { value: "production_order", label: DOCUMENT_TYPE_LABELS.production_order },
];

export const AdjustmentForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  preset,
}: SharedFormProps & {
  preset?: {
    operation?: AdjustmentOperation;
    warehouseId?: string;
    explanation?: string;
    sourceDocumentType?: AdjustmentSourceDocumentType | "";
    sourceDocumentId?: string;
    productId?: string;
  };
}) => {
  const [operation, setOperation] = useState<AdjustmentOperation>(preset?.operation ?? "write_off");
  const [warehouseId, setWarehouseId] = useState(preset?.warehouseId ?? "");
  const [explanation, setExplanation] = useState(preset?.explanation ?? "");
  const [sourceType, setSourceType] = useState<"" | AdjustmentSourceDocumentType>(preset?.sourceDocumentType ?? "");
  const [sourceId, setSourceId] = useState(preset?.sourceDocumentId ?? "");
  const [lines, setLines] = useState<AdjustmentDraftLine[]>([emptyAdjustmentLine(preset?.productId ?? "")]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const sourceDocuments = useMemo(() => {
    if (sourceType === "output") {
      return snapshot.outputs.map((item) => ({ value: item.id, label: item.number }));
    }
    if (sourceType === "transfer") {
      return snapshot.transfers.map((item) => ({ value: item.id, label: item.number }));
    }
    if (sourceType === "reservation") {
      return snapshot.reservations.map((item) => ({ value: item.id, label: item.number }));
    }
    if (sourceType === "shipment") {
      return shipmentsForAdjustmentSource(snapshot.shipments, "shipment");
    }
    if (sourceType === "return") {
      return shipmentsForAdjustmentSource(snapshot.shipments, "return");
    }
    if (sourceType === "production_order") {
      return snapshot.productionOrders.map((item) => ({ value: item.id, label: item.number }));
    }
    return [];
  }, [snapshot, sourceType]);

  const usedProducts = new Set(lines.map((line) => line.productId).filter(Boolean));
  const decreases = operation !== "increase";

  const reset = () => {
    setOperation(preset?.operation ?? "write_off");
    setWarehouseId(preset?.warehouseId ?? "");
    setExplanation(preset?.explanation ?? "");
    setSourceType(preset?.sourceDocumentType ?? "");
    setSourceId(preset?.sourceDocumentId ?? "");
    setLines([emptyAdjustmentLine(preset?.productId ?? "")]);
  };

  const validLines = lines.filter((line) => {
    if (!line.productId || !warehouseId) {
      return false;
    }
    const max = decreases ? freeWarehouseQuantity(balances, line.productId, warehouseId) : undefined;
    return isAllowedQuantity(line.quantity, max);
  });
  const filled = lines.filter((line) => line.productId);
  const unique = new Set(filled.map((line) => line.productId));
  const linesReady = validLines.length > 0 && validLines.length === filled.length && unique.size === filled.length;
  const explanationReady = explanation.trim().length > 0;
  const canSubmit = Boolean(warehouseId && explanationReady && linesReady && !submitting);

  const submit = async () => {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (!warehouseId) {
        toast.error(ADJUSTMENT_WAREHOUSE_REQUIRED);
        return;
      }
      try {
        assertAdjustmentExplanation(explanation);
      } catch (caught: unknown) {
        toast.error(caught instanceof Error ? caught.message : ADJUSTMENT_EXPLANATION_REQUIRED);
        return;
      }
      if (validLines.length === 0) {
        toast.error(ADJUSTMENT_LINES_REQUIRED);
        return;
      }
      const draft = {
        operation,
        warehouseId,
        explanation,
        sourceDocumentType: sourceType || null,
        sourceDocumentId: sourceType && sourceId ? sourceId : null,
        lines: validLines.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
        })),
      };
      try {
        buildAdjustmentFacts(draft, balances);
      } catch (caught: unknown) {
        toast.error(caught instanceof Error ? caught.message : "Проверьте строки корректировки");
        return;
      }
      const ok = await runLogisticsAction(
        () => createAndPostAdjustment(draft, balances),
        "Корректировка проведена",
        reload,
      );
      if (ok) {
        onOpenChange(false);
        reset();
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
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
      title="Новая корректировка"
      description="Документ проводится сразу. Проведённую корректировку нельзя отменить."
    >
      <div className="flex flex-col gap-3">
        <FieldSelect
          label="Операция"
          value={operation}
          items={ADJUSTMENT_OPERATIONS.map((item) => ({
            value: item,
            label: ADJUSTMENT_OPERATION_LABELS[item],
          }))}
          onChange={(value) => setOperation(value as AdjustmentOperation)}
        />
        <FieldSelect
          label="Склад"
          value={warehouseId}
          items={snapshot.warehouses.map((item) => ({
            value: item.id,
            label: item.code,
          }))}
          onChange={setWarehouseId}
          placeholder="Выберите склад"
          emptyLabel="Нет складов"
        />
        {lines.map((line, index) => {
          const available = line.productId && warehouseId
            ? freeWarehouseQuantity(balances, line.productId, warehouseId)
            : 0;
          const productItems = snapshot.products
            .filter((product) => {
              if (usedProducts.has(product.id) && product.id !== line.productId) {
                return false;
              }
              if (!decreases || !warehouseId) {
                return true;
              }
              return freeWarehouseQuantity(balances, product.id, warehouseId) > 0 || product.id === line.productId;
            })
            .map((product) => ({
              value: product.id,
              label: productIdentityLabel(product, product.id),
            }));
          return (
            <div key={`adj-line-${index}`} className="space-y-2 rounded-md border p-3">
              <FieldSelect
                label={`Товар ${index + 1}`}
                value={line.productId}
                items={productItems}
                onChange={(value) => {
                  const nextMax = warehouseId ? freeWarehouseQuantity(balances, value, warehouseId) : 0;
                  setLines((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            productId: value,
                            quantity: String(decreases && nextMax > 0 ? nextMax : 1),
                          }
                        : item,
                    ),
                  );
                }}
                placeholder="Выберите товар"
                disabled={!warehouseId}
              />
              {line.productId ? <AvailabilityPanel snapshot={snapshot} balances={balances} productId={line.productId} /> : null}
              <QuantityField
                value={line.quantity}
                onChange={(value) =>
                  setLines((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity: value } : item)),
                  )
                }
                max={decreases && warehouseId && line.productId ? available : undefined}
                unit={line.productId ? productById(snapshot, line.productId)?.unit : undefined}
              />
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLines((current) => [...current, emptyAdjustmentLine()])}
        >
          Добавить строку
        </Button>
        <FieldSelect
          label="Исходный документ"
          value={sourceType || "none"}
          items={[{ value: "none", label: "Нет" }, ...ADJUSTMENT_SOURCE_ITEMS]}
          onChange={(value) => {
            setSourceType(value === "none" ? "" : (value as AdjustmentSourceDocumentType));
            setSourceId("");
          }}
        />
        {sourceType ? (
          <FieldSelect
            label="Документ"
            value={sourceId}
            items={sourceDocuments}
            onChange={setSourceId}
            placeholder="Выберите документ"
            emptyLabel="Нет документов этого типа"
          />
        ) : null}
        <label className="space-y-1 text-sm">
          <span className="font-medium">Объяснение</span>
          <textarea
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            placeholder="Почему меняется свободный остаток"
            required
            aria-required="true"
            aria-label="Объяснение"
            rows={3}
            className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <FormActions
          mode="hub"
          canSubmit={canSubmit}
          onPost={() => void submit()}
          postLabel="Провести"
        />
      </div>
    </LogisticsDialog>
  );
};
