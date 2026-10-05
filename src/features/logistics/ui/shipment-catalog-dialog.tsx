"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pluralTovar } from "@/features/logistics/category-tree";
import { useRouter } from "next/navigation";
import { createAndPostShipment } from "@/features/logistics/logistics-api";
import {
  remainingToReturnForOrderProduct,
  remainingToShipForLine,
} from "@/features/logistics/logistics-availability";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { productById, warehouseSelectItems } from "@/features/logistics/logistics-lookups";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import { isOpenCustomerOrderStatus, type LogisticsSnapshot, type ShipmentDirection, type StockBalance } from "@/features/logistics/logistics-types";
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
import {
  finishCreatedDocuments,
  reportPartialCreate,
  type CreatedDocLink,
  type CreateIntent,
} from "@/features/logistics/ui/open-created-documents";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

export type ShipmentCatalogPreset = {
  intention?: ShipmentDirection;
  customerOrderId?: string;
  warehouseId?: string;
};

const ALL_WAREHOUSES = "all";

/** Ключ количества: `склад|строка заказа` — одна подстрока на склад. */
const shipmentQuantityKey = (warehouseId: string, lineId: string) => `${warehouseId}|${lineId}`;

const defaultWarehouse = (intention: ShipmentDirection, preset?: ShipmentCatalogPreset) =>
  preset?.warehouseId ?? (intention === "shipment" ? ALL_WAREHOUSES : "");

export const ShipmentCatalogDialog = ({
  open,
  onOpenChange,
  snapshot,
  balances,
  preset,
  loading,
  loadError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  preset?: ShipmentCatalogPreset;
  loading?: boolean;
  loadError?: string | null;
}) => {
  const router = useRouter();
  const intention: ShipmentDirection = preset?.intention ?? "shipment";
  const [orderId, setOrderId] = useState(preset?.customerOrderId ?? "");
  const [warehouseId, setWarehouseId] = useState(() => defaultWarehouse(intention, preset));
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
    setOrderId(preset?.customerOrderId ?? "");
    setWarehouseId(defaultWarehouse(intention, preset));
    setQuantities({});
    setSearch("");
    setOnlySelected(false);
    setSubmitting(false);
    setServerError(null);
  }, [intention, open, preset]);

  const showAllWarehouses = warehouseId === ALL_WAREHOUSES;

  const warehouseOptions = useMemo(() => {
    const all = warehouseSelectItems(snapshot);
    if (intention !== "shipment" || !orderId) return all;
    const lines = snapshot.customerOrderLines.filter((line) => line.orderId === orderId);
    const ids = new Set(
      all
        .filter((item) => lines.some((line) => remainingToShipForLine(line, balances, item.value) > 1e-9))
        .map((item) => item.value),
    );
    if (preset?.warehouseId) ids.add(preset.warehouseId);
    return all.filter((item) => ids.has(item.value));
  }, [balances, intention, orderId, preset?.warehouseId, snapshot]);

  const warehouseItems = useMemo(
    () =>
      intention === "shipment" && warehouseOptions.length > 0
        ? [{ value: ALL_WAREHOUSES, label: "Все" }, ...warehouseOptions]
        : warehouseOptions,
    [intention, warehouseOptions],
  );

  useEffect(() => {
    if (warehouseId && !warehouseItems.some((item) => item.value === warehouseId)) {
      setWarehouseId(intention === "shipment" ? ALL_WAREHOUSES : "");
    }
  }, [intention, warehouseId, warehouseItems]);

  const products = useMemo(() => {
    if (!orderId || !warehouseId) return [];
    const order = snapshot.customerOrders.find((item) => item.id === orderId);
    const sources = showAllWarehouses ? warehouseOptions : warehouseOptions.filter((item) => item.value === warehouseId);
    const enteredQty = (key: string) => parseDecimalQuantity(quantities[key] ?? "") ?? 0;
    const rows: CatalogProductRow[] = [];
    for (const line of snapshot.customerOrderLines.filter((item) => item.orderId === orderId)) {
      const product = productById(snapshot, line.productId);
      const candidates = sources.flatMap((source) => {
        const available =
          intention === "shipment"
            ? remainingToShipForLine(line, balances, source.value)
            : remainingToReturnForOrderProduct(balances, orderId, line.productId);
        if (available <= 1e-9) return [];
        return [{ key: shipmentQuantityKey(source.value, line.id), label: source.label, available }];
      });
      if (candidates.length === 0) continue;
      const lineCap =
        intention === "shipment" ? remainingToShipForLine(line, balances) : Math.max(...candidates.map((item) => item.available));
      rows.push({
        id: line.productId,
        name: product?.name ?? line.productName,
        code: product?.code ?? "",
        unit: product?.unit ?? line.productUnit,
        categoryIds: product?.categoryIds ?? [],
        owners: candidates.map((candidate) => {
          const siblings = candidates
            .filter((item) => item.key !== candidate.key)
            .reduce((sum, item) => sum + enteredQty(item.key), 0);
          return {
            key: candidate.key,
            kind: "order",
            label: order?.number ?? "Заказ",
            limit: Math.min(candidate.available, Math.max(0, lineCap - siblings)),
            hints: showAllWarehouses ? [candidate.label, candidate.available] : [candidate.available],
          };
        }),
      });
    }
    return rows;
  }, [balances, intention, orderId, quantities, showAllWarehouses, snapshot, warehouseId, warehouseOptions]);

  const collapse = useCatalogCollapse(snapshot.categories, products, quantities, search);
  const lines = products.flatMap((product) =>
    product.owners.flatMap((owner) => {
      const quantity = parseDecimalQuantity(quantities[owner.key] ?? "");
      if (quantity == null || quantity <= 0) return [];
      const [sourceId] = owner.key.split("|");
      return [{ productId: product.id, warehouseId: sourceId, quantity, key: owner.key, limit: owner.limit }];
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
    if (submitting || !orderId || !warehouseId) return;
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    if (lines.length === 0) return;
    setSubmitting(true);
    setServerError(null);
    const byWarehouse = new Map<string, typeof lines>();
    for (const line of lines) byWarehouse.set(line.warehouseId, [...(byWarehouse.get(line.warehouseId) ?? []), line]);
    const docLabel = intention === "shipment" ? "Отгрузка" : "Возврат";
    const created: CreatedDocLink[] = [];
    try {
      for (const [sourceId, group] of byWarehouse) {
        const result = await createAndPostShipment(
          intention === "shipment"
            ? {
                customerOrderId: orderId,
                fromLocationType: "warehouse",
                fromLocationId: sourceId,
                toLocationType: "customer_order",
                toLocationId: orderId,
                lines: group.map((line) => ({
                  productId: line.productId,
                  quantity: line.quantity,
                  toOwnerType: "order" as const,
                  toOwnerId: orderId,
                })),
              }
            : {
                customerOrderId: orderId,
                fromLocationType: "customer_order",
                fromLocationId: orderId,
                toLocationType: "warehouse",
                toLocationId: sourceId,
                lines: group.map((line) => ({
                  productId: line.productId,
                  quantity: line.quantity,
                  toOwnerType: null,
                  toOwnerId: null,
                })),
              },
        );
        const warehouseCode = warehouseOptions.find((item) => item.value === sourceId)?.label;
        created.push({
          href: logisticsPath("shipments", result.id),
          label: byWarehouse.size > 1 && warehouseCode ? `${docLabel} · ${warehouseCode}` : docLabel,
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
          message: intention === "shipment" ? "Отгрузка проведена" : "Возврат оформлен",
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

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      size="catalog"
      kicker="Отгрузки и возвраты"
      title={intention === "shipment" ? "Отгрузить" : "Оформить возврат"}
      loading={loading}
      error={loadError}
      header={
        <div className="flex flex-wrap items-end gap-2">
          <FieldSelect
            label="Заказ клиента"
            value={orderId}
            items={snapshot.customerOrders
              .filter((order) => isOpenCustomerOrderStatus(order.status))
              .map((order) => ({ value: order.id, label: order.number }))}
            onChange={setOrderId}
            placeholder="Выберите заказ"
          />
          <FieldSelect
            label={intention === "shipment" ? "Со склада" : "На склад"}
            value={warehouseId}
            items={warehouseItems}
            onChange={setWarehouseId}
            placeholder="Выберите склад"
            emptyLabel={intention === "shipment" ? "Нет склада с товарами этого заказа" : "Нет склада с остатком"}
          />
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
      submitLabel={intention === "shipment" ? "Отгрузить" : "Оформить"}
      createIntents
      onSubmit={(intent) => void submit(intent)}
      submitDisabled={!orderId || !warehouseId || lines.length === 0}
      disabledReason={!orderId || !warehouseId ? "Выберите заказ и склад" : "Введите количество"}
      submitting={submitting}
      serverError={serverError}
      dirty={Boolean(orderId || enteredQuantityKeys(quantities).length)}
    >
      {!orderId || !warehouseId ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {orderId ? "Выберите склад, чтобы увидеть остаток" : "Выберите заказ, чтобы увидеть остаток"}
        </div>
      ) : (
        <CatalogQuantityTable
          categories={snapshot.categories}
          products={products}
          columns={[
            ...(showAllWarehouses ? [{ id: "place", header: "Склад", align: "left" as const }] : []),
            { id: "limit", header: intention === "shipment" ? "В резерве" : "Отгружено" },
          ]}
          quantities={quantities}
          onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
          limitMode="hard"
          search={search}
          collapsed={collapse.collapsed}
          onToggleGroup={collapse.toggle}
          onlySelected={onlySelected}
          empty={intention === "shipment" ? "Нет резерва этого заказа на складе" : "Нечего возвращать"}
        />
      )}
    </DialogShell>
  );
};
