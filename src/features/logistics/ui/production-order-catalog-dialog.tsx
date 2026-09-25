"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pluralTovar } from "@/features/logistics/category-tree";
import { useRouter } from "next/navigation";
import { createProductionOrder, setOrderLineQuantity } from "@/features/logistics/logistics-api";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import type { LogisticsSnapshot, ProductionOrder, StockBalance } from "@/features/logistics/logistics-types";
import { enteredQuantityKeys, parseDecimalQuantity } from "@/features/logistics/ui/catalog-quantity-model";
import { CatalogGoodsPanel } from "@/features/logistics/ui/catalog-goods-panel";
import { CatalogQuantityTable, useCatalogCollapse, type CatalogProductRow } from "@/features/logistics/ui/catalog-quantity-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

const stockAt = (balances: StockBalance[], productId: string, warehouseId: string) =>
  balances
    .filter((entry) => entry.productId === productId && entry.locationType === "warehouse" && entry.locationId === warehouseId)
    .reduce((sum, entry) => sum + entry.quantity, 0);

const producingOf = (snapshot: LogisticsSnapshot, plantId: string, productId: string) => {
  const orders = snapshot.productionOrders.filter(
    (order) =>
      order.plantId === plantId && order.status !== "closed" && order.status !== "done" && order.status !== "cancelled",
  );
  const orderIds = new Set(orders.map((order) => order.id));
  const plan = snapshot.productionOrderLines
    .filter((line) => orderIds.has(line.orderId) && line.productId === productId)
    .reduce((sum, line) => sum + line.quantity, 0);
  const done = snapshot.outputs
    .filter((output) => orderIds.has(output.productionOrderId) && output.status === "done")
    .reduce(
      (sum, output) =>
        sum +
        snapshot.outputLines
          .filter((line) => line.outputId === output.id && line.productId === productId)
          .reduce((inner, line) => inner + line.quantity, 0),
      0,
    );
  return Math.max(0, plan - done);
};

export const ProductionOrderCatalogDialog = ({
  open,
  onOpenChange,
  snapshot,
  balances,
  order,
  presetProductId,
  onAdded,
  loading,
  loadError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  order?: ProductionOrder;
  presetProductId?: string;
  onAdded?: () => Promise<void>;
  loading?: boolean;
  loadError?: string | null;
}) => {
  const router = useRouter();
  const [plantId, setPlantId] = useState(order?.plantId ?? "");
  const [expectedEndOn, setExpectedEndOn] = useState("");
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
    setPlantId(order?.plantId ?? snapshot.products.find((product) => product.id === presetProductId)?.plantId ?? "");
    setExpectedEndOn("");
    setQuantities(presetProductId ? { [`${presetProductId}:free:`]: "" } : {});
    setSearch("");
    setOnlySelected(false);
    setSubmitting(false);
    setServerError(null);
  }, [open, order, presetProductId, snapshot.products]);

  const plant = snapshot.plants.find((item) => item.id === plantId);
  const products = useMemo(() => {
    if (!plant) return [];
    return snapshot.products
      .filter((product) => product.plantId === plant.id)
      .map((product): CatalogProductRow => {
        const hints = [stockAt(balances, product.id, plant.warehouseId), producingOf(snapshot, plant.id, product.id)];
        return {
          id: product.id,
          name: product.name,
          code: product.code,
          unit: product.unit,
          categoryIds: product.categoryIds,
          hints,
          owners: [{ key: `${product.id}:free:`, label: "Количество", limit: null, hints }],
        };
      });
  }, [balances, plant, snapshot]);

  const collapse = useCatalogCollapse(snapshot.categories, products, quantities, search);
  const lines = products.flatMap((product) => {
    const quantity = parseDecimalQuantity(quantities[`${product.id}:free:`] ?? "");
    if (quantity == null || quantity <= 0) return [];
    return [{ productId: product.id, quantity }];
  });

  const submit = async () => {
    if (submitting || !plantId || lines.length === 0) return;
    setSubmitting(true);
    setServerError(null);
    try {
      if (order) {
        for (const line of lines) {
          const existing = snapshot.productionOrderLines.find(
            (item) => item.orderId === order.id && item.productId === line.productId,
          );
          await setOrderLineQuantity({
            documentId: order.id,
            productId: line.productId,
            quantity: (existing?.quantity ?? 0) + line.quantity,
          });
        }
        await onAdded?.();
        onOpenChange(false);
        return;
      }
      const created = await createProductionOrder({
        plantId,
        expectedEndOn: expectedEndOn || null,
        lines,
      });
      onOpenChange(false);
      router.push(logisticsPath("production-orders", created.sequenceNumber ?? created.id));
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
      kicker={order ? order.number : "Производство"}
      title={order ? "Добавить товары" : "Новый заказ на производство"}
      loading={loading}
      error={loadError}
      header={
        <div className="flex flex-wrap items-end gap-2">
          <FieldSelect
            label="Завод"
            value={plantId}
            items={snapshot.plants.map((item) => ({ value: item.id, label: item.code }))}
            onChange={setPlantId}
            placeholder="Выберите завод"
            disabled={Boolean(order)}
          />
          {order ? null : <ExpectedEndField optional value={expectedEndOn} onChange={setExpectedEndOn} />}
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
      submitLabel={order ? "Добавить" : "Создать PO"}
      onSubmit={() => void submit()}
      submitDisabled={!plantId || lines.length === 0}
      disabledReason={!plantId ? "Выберите завод" : "Введите количество"}
      submitting={submitting}
      serverError={serverError}
      dirty={enteredQuantityKeys(quantities).length > 0}
    >
      {!plantId ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Выберите завод, чтобы увидеть товары</div>
      ) : (
        <CatalogQuantityTable
          categories={snapshot.categories}
          products={products}
          columns={[
            { id: "stock", header: "На складе завода" },
            { id: "producing", header: "Уже производится" },
          ]}
          quantities={quantities}
          onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
          limitMode="none"
          search={search}
          collapsed={collapse.collapsed}
          onToggleGroup={collapse.toggle}
          onlySelected={onlySelected}
          flat
        />
      )}
    </DialogShell>
  );
};
