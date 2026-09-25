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
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

export type ShipmentCatalogPreset = {
  intention?: ShipmentDirection;
  customerOrderId?: string;
  warehouseId?: string;
};

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
  const [warehouseId, setWarehouseId] = useState(preset?.warehouseId ?? "");
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
    setWarehouseId(preset?.warehouseId ?? "");
    setQuantities({});
    setSearch("");
    setOnlySelected(false);
    setSubmitting(false);
    setServerError(null);
  }, [open, preset]);

  const warehouseItems = useMemo(() => {
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

  useEffect(() => {
    if (warehouseId && !warehouseItems.some((item) => item.value === warehouseId)) setWarehouseId("");
  }, [warehouseId, warehouseItems]);

  const products = useMemo(() => {
    if (!orderId || !warehouseId) return [];
    const lines = snapshot.customerOrderLines.filter((line) => line.orderId === orderId);
    const rows: CatalogProductRow[] = [];
    for (const line of lines) {
      const product = productById(snapshot, line.productId);
      const limit =
        intention === "shipment"
          ? remainingToShipForLine(line, balances, warehouseId)
          : remainingToReturnForOrderProduct(balances, orderId, line.productId);
      if (limit <= 1e-9) continue;
      const order = snapshot.customerOrders.find((item) => item.id === orderId);
      rows.push({
        id: line.productId,
        name: product?.name ?? line.productName,
        code: product?.code ?? "",
        unit: product?.unit ?? line.productUnit,
        categoryIds: product?.categoryIds ?? [],
        owners: [
          {
            key: `${line.id}:order:${orderId}`,
            kind: "order",
            label: order?.number ?? "Заказ",
            limit,
            hints: [limit],
          },
        ],
      });
    }
    return rows;
  }, [balances, intention, orderId, snapshot, warehouseId]);

  const collapse = useCatalogCollapse(snapshot.categories, products, quantities, search);
  const lines = products.flatMap((product) =>
    product.owners.flatMap((owner) => {
      const quantity = parseDecimalQuantity(quantities[owner.key] ?? "");
      if (quantity == null || quantity <= 0) return [];
      return [{ productId: product.id, quantity, key: owner.key, limit: owner.limit }];
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
    if (submitting || !orderId || !warehouseId) return;
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    if (lines.length === 0) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await createAndPostShipment(
        intention === "shipment"
          ? {
              customerOrderId: orderId,
              fromLocationType: "warehouse",
              fromLocationId: warehouseId,
              toLocationType: "customer_order",
              toLocationId: orderId,
              lines: lines.map((line) => ({
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
              toLocationId: warehouseId,
              lines: lines.map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
                toOwnerType: null,
                toOwnerId: null,
              })),
            },
      );
      onOpenChange(false);
      router.push(logisticsPath("shipments", created.id));
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
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
          ? `${pluralTovar(lines.length)} · ${formatQuantity(lines.reduce((sum, line) => sum + line.quantity, 0), "шт")}`
          : "Нет строк"
      }
      submitLabel={intention === "shipment" ? "Отгрузить" : "Оформить возврат"}
      onSubmit={() => void submit()}
      submitDisabled={!orderId || !warehouseId || lines.length === 0}
      disabledReason={!orderId || !warehouseId ? "Выберите заказ и склад" : "Введите количество"}
      submitting={submitting}
      serverError={serverError}
      dirty={Boolean(orderId || warehouseId || enteredQuantityKeys(quantities).length)}
    >
      {!orderId || !warehouseId ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Выберите заказ и склад, чтобы увидеть остаток
        </div>
      ) : (
        <CatalogQuantityTable
          categories={snapshot.categories}
          products={products}
          columns={[{ id: "limit", header: intention === "shipment" ? "В резерве" : "Отгружено" }]}
          quantities={quantities}
          onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
          limitMode="hard"
          search={search}
          collapsed={collapse.collapsed}
          onToggleGroup={collapse.toggle}
          onlySelected={onlySelected}
        />
      )}
    </DialogShell>
  );
};
