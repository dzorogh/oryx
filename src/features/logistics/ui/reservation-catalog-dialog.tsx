"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pluralTovar } from "@/features/logistics/category-tree";
import { useRouter } from "next/navigation";
import { createAndPostReservation } from "@/features/logistics/logistics-api";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import {
  customerOrderById,
  locationLabel,
  ownerLabel,
  regionCode,
} from "@/features/logistics/logistics-lookups";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import {
  isFreeOwner,
  ownersEqual,
  type LogisticsSnapshot,
  type OwnerType,
  type ReservationDirection,
  type ReservationLocationType,
  type StockBalance,
  isOpenCustomerOrderStatus,
} from "@/features/logistics/logistics-types";
import {
  enteredQuantityKeys,
  firstErrorKey,
  parseDecimalQuantity,
} from "@/features/logistics/ui/catalog-quantity-model";
import { CatalogGoodsPanel } from "@/features/logistics/ui/catalog-goods-panel";
import {
  CatalogQuantityTable,
  focusQuantityInput,
  useCatalogCollapse,
  type CatalogProductRow,
} from "@/features/logistics/ui/catalog-quantity-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { catalogProductsFromPlace, parseOwnerQuantityKey, placeOwnersByProduct } from "@/features/logistics/ui/place-catalog";
import {
  finishCreatedDocuments,
  reportPartialCreate,
  type CreatedDocLink,
  type CreateIntent,
} from "@/features/logistics/ui/open-created-documents";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

export type ReservationCatalogPreset = {
  locationType?: ReservationLocationType;
  locationId?: string;
  toOwnerType?: OwnerType | null;
  toOwnerId?: string | null;
  fromOwnerType?: OwnerType | null;
  fromOwnerId?: string | null;
  productId?: string;
  direction?: ReservationDirection;
};

const TITLES: Record<ReservationDirection, string> = {
  reserve: "Зарезервировать из свободного",
  release: "Снять резерв",
  reassign: "Передать между владельцами",
};

const VERBS: Record<ReservationDirection, string> = {
  reserve: "Зарезервировать",
  release: "Снять",
  reassign: "Передать",
};

const DONE_MESSAGES: Record<ReservationDirection, string> = {
  reserve: "Резерв проведён",
  release: "Резерв снят",
  reassign: "Резерв передан",
};

export const inferReservationDirection = (preset?: ReservationCatalogPreset): ReservationDirection => {
  if (preset?.direction) return preset.direction;
  if (preset && "toOwnerType" in preset && isFreeOwner(preset.toOwnerType, preset.toOwnerId)) return "release";
  if (preset?.fromOwnerType && !isFreeOwner(preset.fromOwnerType, preset.fromOwnerId)) return "reassign";
  return "reserve";
};

const ALL_PLACES = "all";

const placeKey = (type: string, id: string) => `${type}:${id}`;

/** Ключ количества: `тип:место|товар:владелец:id` — одна подстрока на место и владельца. */
const placeQuantityKey = (place: string, ownerKey: string) => `${place}|${ownerKey}`;

const parsePlaceQuantityKey = (key: string) => {
  const separator = key.indexOf("|");
  if (separator < 0) return null;
  const [locationType, locationId] = key.slice(0, separator).split(":");
  const owner = parseOwnerQuantityKey(key.slice(separator + 1));
  if (!owner || (locationType !== "warehouse" && locationType !== "transfer") || !locationId) return null;
  return { ...owner, locationType: locationType as ReservationLocationType, locationId };
};

const matchesSourceOwner = (
  sourceType: OwnerType | null,
  sourceId: string | null,
  ownerType: OwnerType | null,
  ownerId: string | null,
) => !sourceType || ownersEqual(ownerType, ownerId, sourceType, sourceId);

type OwnerFilter = {
  direction: ReservationDirection;
  takeover: boolean;
  sourceType: OwnerType | null;
  sourceId: string | null;
  destType: OwnerType | null;
  destId: string | null;
};

const isPickableOwner = (filter: OwnerFilter, ownerType: OwnerType | null, ownerId: string | null) => {
  const free = isFreeOwner(ownerType, ownerId);
  if (filter.direction === "reserve") {
    return free || (filter.takeover && !ownersEqual(ownerType, ownerId, filter.destType, filter.destId));
  }
  if (free || !matchesSourceOwner(filter.sourceType, filter.sourceId, ownerType, ownerId)) return false;
  return filter.direction === "release" || !ownersEqual(ownerType, ownerId, filter.destType, filter.destId);
};

type PlaceOption = { key: string; locationType: ReservationLocationType; locationId: string; label: string };

export const ReservationCatalogDialog = ({
  open,
  onOpenChange,
  snapshot,
  balances,
  preset,
  direction: directionProp,
  lockDestination,
  lockSource,
  allowTakeover,
  loading,
  loadError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  preset?: ReservationCatalogPreset;
  direction?: ReservationDirection;
  /** Назначение берётся из `preset.toOwner*` и не меняется в форме. */
  lockDestination?: boolean;
  /** Списываются только резервы владельца `preset.fromOwner*`. */
  lockSource?: boolean;
  /** При резервировании можно забрать и чужой резерв: такие строки уходят отдельным документом передачи. */
  allowTakeover?: boolean;
  loading?: boolean;
  loadError?: string | null;
}) => {
  const router = useRouter();
  const direction = directionProp ?? inferReservationDirection(preset);
  const [place, setPlace] = useState(ALL_PLACES);
  const [destKind, setDestKind] = useState<"order" | "region" | "free">("order");
  const [destId, setDestId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const becameOpen = open && !wasOpen.current;
    wasOpen.current = open;
    if (!becameOpen) return;
    const nextPlace = preset?.locationType && preset.locationId ? placeKey(preset.locationType, preset.locationId) : "";
    setPlace(nextPlace || ALL_PLACES);
    if (direction === "release") {
      setDestKind("free");
      setDestId("");
    } else if (preset?.toOwnerType === "region") {
      setDestKind("region");
      setDestId(preset.toOwnerId ?? "");
    } else {
      setDestKind("order");
      setDestId(preset?.toOwnerId ?? "");
    }
    const seeded: Record<string, string> = {};
    if (preset?.productId && nextPlace) {
      const ownerType = preset.fromOwnerType ?? (direction === "reserve" ? null : preset.fromOwnerType);
      const ownerId = isFreeOwner(ownerType, preset.fromOwnerId) ? "" : (preset.fromOwnerId ?? "");
      const keyOwner = isFreeOwner(ownerType, preset.fromOwnerId) ? "free" : ownerType;
      if (keyOwner) seeded[placeQuantityKey(nextPlace, `${preset.productId}:${keyOwner}:${ownerId}`)] = "";
    }
    setQuantities(seeded);
    setSearch("");
    setOnlySelected(false);
    setSubmitting(false);
    setServerError(null);
  }, [open, preset, direction]);

  const showAllPlaces = place === ALL_PLACES;
  const sourceOwnerType = lockSource && direction !== "reserve" ? (preset?.fromOwnerType ?? null) : null;
  const sourceOwnerId = sourceOwnerType ? (preset?.fromOwnerId ?? null) : null;
  const destOwnerType: OwnerType | null = destKind === "free" ? null : destKind;
  const destOwnerId = destKind === "free" ? null : destId || null;
  const takeover = Boolean(allowTakeover) && direction === "reserve";
  const ownerFilter = useMemo<OwnerFilter>(
    () => ({
      direction,
      takeover,
      sourceType: sourceOwnerType,
      sourceId: sourceOwnerId,
      destType: destOwnerType,
      destId: destOwnerId,
    }),
    [destOwnerId, destOwnerType, direction, sourceOwnerId, sourceOwnerType, takeover],
  );

  const places = useMemo(() => {
    const seen = new Set<string>();
    const items: PlaceOption[] = [];
    const presetKey = preset?.locationType && preset.locationId ? placeKey(preset.locationType, preset.locationId) : "";
    const add = (locationType: string, locationId: string) => {
      if (locationType !== "warehouse" && locationType !== "transfer") return;
      const key = placeKey(locationType, locationId);
      if (seen.has(key)) return;
      const owners = placeOwnersByProduct(balances, locationType, locationId);
      const relevant = [...owners.values()].some((list) =>
        list.some((owner) => isPickableOwner(ownerFilter, owner.ownerType, owner.ownerId)),
      );
      if (!relevant && key !== presetKey) return;
      seen.add(key);
      items.push({ key, locationType, locationId, label: locationLabel(snapshot, locationType, locationId) });
    };
    for (const entry of balances) add(entry.locationType, entry.locationId);
    if (preset?.locationType && preset.locationId) add(preset.locationType, preset.locationId);
    return items;
  }, [balances, ownerFilter, preset?.locationId, preset?.locationType, snapshot]);

  const placeItems = useMemo(
    () =>
      places.length > 0
        ? [{ value: ALL_PLACES, label: "Все" }, ...places.map((entry) => ({ value: entry.key, label: entry.label }))]
        : [],
    [places],
  );

  const products = useMemo(() => {
    const sources = showAllPlaces ? places : places.filter((entry) => entry.key === place);
    const byProduct = new Map<string, CatalogProductRow>();
    for (const source of sources) {
      const owners = placeOwnersByProduct(balances, source.locationType, source.locationId);
      for (const [productId, list] of owners) {
        owners.set(
          productId,
          list
            .filter((owner) => isPickableOwner(ownerFilter, owner.ownerType, owner.ownerId))
            .sort(
              (a, b) =>
                Number(!isFreeOwner(a.ownerType, a.ownerId)) - Number(!isFreeOwner(b.ownerType, b.ownerId)),
            ),
        );
      }
      for (const row of catalogProductsFromPlace(snapshot, owners)) {
        const merged = byProduct.get(row.id) ?? { ...row, owners: [] };
        merged.owners.push(
          ...row.owners.map((owner) => ({
            ...owner,
            key: placeQuantityKey(source.key, owner.key),
            hints: showAllPlaces ? [source.label, ...owner.hints] : owner.hints,
          })),
        );
        byProduct.set(row.id, merged);
      }
    }
    return snapshot.products.flatMap((product) => byProduct.get(product.id) ?? []);
  }, [balances, ownerFilter, place, places, showAllPlaces, snapshot]);

  const collapse = useCatalogCollapse(snapshot.categories, products, quantities, search);
  const lines = products.flatMap((product) =>
    product.owners.flatMap((owner) => {
      const parsed = parsePlaceQuantityKey(owner.key);
      const quantity = parseDecimalQuantity(quantities[owner.key] ?? "");
      if (!parsed || quantity == null || quantity <= 0) return [];
      return [{ ...parsed, quantity, limit: owner.limit, key: owner.key }];
    }),
  );
  const errorKey = firstErrorKey(
    products.flatMap((product) =>
      product.owners.map((owner) => ({
        key: owner.key,
        raw: quantities[owner.key] ?? "",
        limit: owner.limit,
        mode: "hard" as const,
      })),
    ),
  );

  const submit = async (intent: CreateIntent) => {
    if (submitting) return;
    if (direction !== "release" && !destOwnerId) {
      setServerError(direction === "reserve" ? "Выберите, под кого резервировать" : "Выберите владельца назначения");
      return;
    }
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    if (lines.length === 0) return;
    setSubmitting(true);
    setServerError(null);
    const lineKind = (line: (typeof lines)[number]) =>
      takeover && !isFreeOwner(line.ownerType, line.ownerId) ? "reassign" : direction;
    const groups = new Map<string, typeof lines>();
    for (const line of lines) {
      const key = `${placeKey(line.locationType, line.locationId)}|${lineKind(line)}`;
      groups.set(key, [...(groups.get(key) ?? []), line]);
    }
    const placeCount = new Set(lines.map((line) => placeKey(line.locationType, line.locationId))).size;
    const created: CreatedDocLink[] = [];
    try {
      for (const group of groups.values()) {
        const { locationType, locationId } = group[0];
        const kindLabel = lineKind(group[0]) === "reassign" ? "Передача резерва" : "Резерв";
        const id = await createAndPostReservation({
          locationType,
          locationId,
          toOwnerType: destOwnerType,
          toOwnerId: destOwnerId,
          lines: group.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            fromOwnerType: line.ownerType,
            fromOwnerId: line.ownerId,
          })),
        });
        created.push({
          href: logisticsPath("reservations", id),
          label: placeCount > 1 ? `${kindLabel} · ${locationLabel(snapshot, locationType, locationId)}` : kindLabel,
        });
      }
      onOpenChange(false);
      const [main, ...rest] = created;
      if (main) {
        await finishCreatedDocuments({
          intent,
          navigate: (href) => router.push(href),
          main,
          rest,
          message: DONE_MESSAGES[direction],
        });
      }
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      if (created.length > 0) {
        onOpenChange(false);
        await reportPartialCreate((href) => router.push(href), created, translateLogisticsError(raw), undefined, intent);
        return;
      }
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  const destReady = direction === "release" || Boolean(destId);
  const orderItems = snapshot.customerOrders
    .filter((order) => isOpenCustomerOrderStatus(order.status))
    .map((order) => ({ value: order.id, label: order.number }));
  const regionItems = snapshot.regions.map((region) => ({ value: region.id, label: region.code || regionCode(snapshot, region.id) }));
  const lockedDestinationLabel =
    destKind === "region"
      ? `Регион: ${regionCode(snapshot, destId)}`
      : `Заказ: ${customerOrderById(snapshot, destId)?.number ?? "—"}`;

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      size="catalog"
      kicker="Резервы"
      title={takeover ? "Зарезервировать" : TITLES[direction]}
      loading={loading}
      error={loadError}
      header={
        <div className="flex flex-wrap items-end gap-2">
          <FieldSelect
            label="Место"
            value={place}
            items={placeItems}
            onChange={(value) => setPlace(value || ALL_PLACES)}
            emptyLabel="Нет места с остатком"
          />
          {direction === "release" ? (
            <p className="mb-1.5 text-sm text-muted-foreground">
              {sourceOwnerType && sourceOwnerId
                ? `${sourceOwnerType === "region" ? "Регион" : "Заказ"}: ${ownerLabel(snapshot, sourceOwnerType, sourceOwnerId)} → Свободно`
                : "Назначение: Свободно"}
            </p>
          ) : lockDestination ? (
            <p className="mb-1.5 text-sm text-muted-foreground">{lockedDestinationLabel}</p>
          ) : (
            <>
              <FieldSelect
                label="Назначение"
                value={destKind}
                items={[
                  { value: "order", label: "Заказ клиента" },
                  { value: "region", label: "Регион" },
                ]}
                onChange={(value) => {
                  setDestKind(value === "region" ? "region" : "order");
                  setDestId("");
                }}
              />
              <FieldSelect
                label={destKind === "region" ? "Регион" : "Заказ"}
                value={destId}
                items={destKind === "region" ? regionItems : orderItems}
                onChange={setDestId}
                placeholder="Выберите"
              />
            </>
          )}
        </div>
      }
      panel={
        <CatalogGoodsPanel
          search={search}
          onSearch={setSearch}
          allCollapsed={collapse.allCollapsed}
          onToggleAll={() => (collapse.allCollapsed ? collapse.expandAll() : collapse.collapseAll())}
          onlySelected={onlySelected}
          onToggleSelected={() => setOnlySelected((value) => !value)}
        />
      }
      footerSummary={
        lines.length
          ? `${pluralTovar(new Set(lines.map((line) => line.productId)).size)} · ${formatQuantity(lines.reduce((sum, line) => sum + line.quantity, 0), "шт")}`
          : "Нет строк"
      }
      submitLabel={VERBS[direction]}
      createIntents
      onSubmit={(intent) => void submit(intent)}
      submitDisabled={!destReady || lines.length === 0}
      disabledReason={!destReady ? "Выберите назначение" : "Введите количество"}
      submitting={submitting}
      serverError={serverError}
      dirty={Boolean(destId || enteredQuantityKeys(quantities).length)}
    >
      <CatalogQuantityTable
        categories={snapshot.categories}
        products={products}
        columns={
          showAllPlaces
            ? [
                { id: "place", header: "Место", align: "left" },
                { id: "stock", header: "Остаток" },
              ]
            : [{ id: "stock", header: "Остаток" }]
        }
        quantities={quantities}
        onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
        limitMode="hard"
        search={search}
        collapsed={collapse.collapsed}
        onToggleGroup={collapse.toggle}
        onlySelected={onlySelected}
        empty={customerOrderById(snapshot, destId) ? "Нет остатка кроме назначения" : "Нет остатка"}
      />
    </DialogShell>
  );
};
