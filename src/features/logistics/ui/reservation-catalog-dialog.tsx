"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pluralTovar } from "@/features/logistics/category-tree";
import { useRouter } from "next/navigation";
import { createAndPostReservation } from "@/features/logistics/logistics-api";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import {
  customerOrderById,
  locationLabel,
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
} from "@/features/logistics/ui/catalog-quantity-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { catalogProductsFromPlace, parseOwnerQuantityKey, placeOwnersByProduct } from "@/features/logistics/ui/place-catalog";
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

export const inferReservationDirection = (preset?: ReservationCatalogPreset): ReservationDirection => {
  if (preset?.direction) return preset.direction;
  if (preset && "toOwnerType" in preset && isFreeOwner(preset.toOwnerType, preset.toOwnerId)) return "release";
  if (preset?.fromOwnerType && !isFreeOwner(preset.fromOwnerType, preset.fromOwnerId)) return "reassign";
  return "reserve";
};

const placeKey = (type: string, id: string) => `${type}:${id}`;

export const ReservationCatalogDialog = ({
  open,
  onOpenChange,
  snapshot,
  balances,
  preset,
  direction: directionProp,
  loading,
  loadError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  preset?: ReservationCatalogPreset;
  direction?: ReservationDirection;
  loading?: boolean;
  loadError?: string | null;
}) => {
  const router = useRouter();
  const direction = directionProp ?? inferReservationDirection(preset);
  const [place, setPlace] = useState("");
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
    setPlace(nextPlace);
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
      if (keyOwner) seeded[`${preset.productId}:${keyOwner}:${ownerId}`] = "";
    }
    setQuantities(seeded);
    setSearch("");
    setOnlySelected(false);
    setSubmitting(false);
    setServerError(null);
  }, [open, preset, direction]);

  const [locationType, locationId] = place.split(":") as [ReservationLocationType | "", string];
  const destOwnerType: OwnerType | null = destKind === "free" ? null : destKind;
  const destOwnerId = destKind === "free" ? null : destId || null;

  const placeItems = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ value: string; label: string }> = [];
    const presetKey = preset?.locationType && preset.locationId ? placeKey(preset.locationType, preset.locationId) : "";
    const add = (locationType: string, locationId: string) => {
      if (locationType !== "warehouse" && locationType !== "transfer") return;
      const key = placeKey(locationType, locationId);
      if (seen.has(key)) return;
      const owners = placeOwnersByProduct(balances, locationType, locationId);
      const relevant = [...owners.values()].some((list) =>
        list.some((owner) => {
          const free = isFreeOwner(owner.ownerType, owner.ownerId);
          return direction === "reserve" ? free : !free;
        }),
      );
      if (!relevant && key !== presetKey) return;
      seen.add(key);
      items.push({ value: key, label: locationLabel(snapshot, locationType, locationId) });
    };
    for (const entry of balances) add(entry.locationType, entry.locationId);
    if (preset?.locationType && preset.locationId) add(preset.locationType, preset.locationId);
    return items;
  }, [balances, direction, preset?.locationId, preset?.locationType, snapshot]);

  const products = useMemo(() => {
    if (!locationType || !locationId) return [];
    const owners = placeOwnersByProduct(balances, locationType, locationId);
    for (const [productId, list] of owners) {
      owners.set(
        productId,
        list.filter((owner) => {
          const free = isFreeOwner(owner.ownerType, owner.ownerId);
          if (direction === "reserve") return free;
          if (direction === "release") return !free;
          return !free && !ownersEqual(owner.ownerType, owner.ownerId, destOwnerType, destOwnerId);
        }),
      );
    }
    return catalogProductsFromPlace(snapshot, owners);
  }, [balances, destOwnerId, destOwnerType, direction, locationId, locationType, snapshot]);

  const collapse = useCatalogCollapse(snapshot.categories, products, quantities, search);
  const lines = products.flatMap((product) =>
    product.owners.flatMap((owner) => {
      const parsed = parseOwnerQuantityKey(owner.key);
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

  const submit = async () => {
    if (submitting) return;
    if (!locationType || !locationId) return;
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
    try {
      const id = await createAndPostReservation({
        locationType,
        locationId,
        toOwnerType: destOwnerType,
        toOwnerId: destOwnerId,
        lines: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          fromOwnerType: line.ownerType,
          fromOwnerId: line.ownerId,
        })),
      });
      onOpenChange(false);
      router.push(logisticsPath("reservations", id));
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
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

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      size="catalog"
      kicker="Резервы"
      title={TITLES[direction]}
      loading={loading}
      error={loadError}
      header={
        <div className="flex flex-wrap items-end gap-2">
          <FieldSelect
            label="Место"
            value={place}
            items={placeItems}
            onChange={setPlace}
            placeholder="Выберите место"
            emptyLabel="Нет места с остатком"
          />
          {direction === "release" ? (
            <p className="mb-2 text-sm text-muted-foreground">Назначение: Свободно</p>
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
      onSubmit={() => void submit()}
      submitDisabled={!place || !destReady || lines.length === 0}
      disabledReason={!place ? "Выберите место" : !destReady ? "Выберите назначение" : "Введите количество"}
      submitting={submitting}
      serverError={serverError}
      dirty={Boolean(place || destId || enteredQuantityKeys(quantities).length)}
    >
      {!place ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Выберите место, чтобы увидеть остаток
        </div>
      ) : (
        <CatalogQuantityTable
          categories={snapshot.categories}
          products={products}
          columns={[{ id: "stock", header: "Остаток" }]}
          quantities={quantities}
          onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
          limitMode="hard"
          search={search}
          collapsed={collapse.collapsed}
          onToggleGroup={collapse.toggle}
          onlySelected={onlySelected}
          empty={customerOrderById(snapshot, destId) ? "Нет остатка кроме назначения" : "Нет остатка"}
        />
      )}
    </DialogShell>
  );
};
