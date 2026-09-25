"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pluralTovar } from "@/features/logistics/category-tree";
import { useRouter } from "next/navigation";
import { addCustomerOrderLines, createCustomerOrder } from "@/features/logistics/logistics-api";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { plantCode, regionCode, warehouseCode } from "@/features/logistics/logistics-lookups";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import type { CustomerOrder, LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import {
  enteredQuantityKeys,
  formatLimitNumber,
  parseDecimalQuantity,
  priceIssue,
  productsNotMadeByPlant,
  sourceDropBanner,
} from "@/features/logistics/ui/catalog-quantity-model";
import { CatalogGoodsPanel } from "@/features/logistics/ui/catalog-goods-panel";
import {
  CatalogQuantityTable,
  formatCatalogMoney,
  useCatalogCollapse,
  type CatalogProductRow,
} from "@/features/logistics/ui/catalog-quantity-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { Input } from "@/components/ui/input";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";
import { Button } from "@/components/ui/button";

const sumAtWarehouse = (balances: StockBalance[], productId: string, warehouseId: string) =>
  balances
    .filter((entry) => entry.productId === productId && entry.locationType === "warehouse" && entry.locationId === warehouseId)
    .reduce((sum, entry) => sum + entry.quantity, 0);

const worldOf = (balances: StockBalance[], productId: string) =>
  balances.filter((entry) => entry.productId === productId && entry.locationType === "warehouse").reduce((sum, entry) => sum + entry.quantity, 0);

const reservedOf = (balances: StockBalance[], productId: string) =>
  balances
    .filter((entry) => entry.productId === productId && entry.stockState === "reserved")
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
    .reduce((sum, output) => {
      const qty = snapshot.outputLines
        .filter((line) => line.outputId === output.id && line.productId === productId)
        .reduce((inner, line) => inner + line.quantity, 0);
      return sum + qty;
    }, 0);
  return Math.max(0, plan - done);
};

export const CustomerOrderCatalogDialog = ({
  open,
  onOpenChange,
  snapshot,
  balances,
  order,
  onAdded,
  loading,
  loadError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  /** Задан — добавление строк в существующий заказ. */
  order?: CustomerOrder;
  onAdded?: () => Promise<void>;
  loading?: boolean;
  loadError?: string | null;
}) => {
  const router = useRouter();
  const [sourceKind, setSourceKind] = useState<"plant" | "hub">(order?.sourceKind === "hub" ? "hub" : "plant");
  const [sourceId, setSourceId] = useState(order?.sourcePlantId ?? order?.sourceWarehouseId ?? "");
  const [pendingSource, setPendingSource] = useState<{ kind: "plant" | "hub"; id: string } | null>(null);
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pickedRegionId, setPickedRegionId] = useState("");
  const [regionError, setRegionError] = useState<string | null>(null);
  const regionId = order?.regionId ?? pickedRegionId;
  const wasOpen = useRef(false);
  const seededRegionId = useRef<string | null>(null);

  const dealerOf = (productId: string) =>
    snapshot.dealerPrices.find((price) => price.productId === productId && price.regionId === regionId) ?? null;

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      seededRegionId.current = null;
      return;
    }
    const becameOpen = !wasOpen.current;
    wasOpen.current = true;
    if (becameOpen) {
      const kind = order?.sourceKind === "hub" ? "hub" : "plant";
      const source = order?.sourcePlantId ?? order?.sourceWarehouseId ?? "";
      setSourceKind(order ? (order.sourceKind === "hub" ? "hub" : order.sourceKind === "plant" ? "plant" : "plant") : kind);
      setSourceId(order?.sourceKind ? source : order ? "" : source);
      setPendingSource(null);
      setExpectedEndOn("");
      setQuantities({});
      setPrices({});
      setSearch("");
      setOnlySelected(false);
      setSubmitting(false);
      setServerError(null);
      setPickedRegionId("");
      setRegionError(null);
      seededRegionId.current = null;
    }
  }, [open, order]);

  useEffect(() => {
    if (!open || loading || !regionId || snapshot.dealerPrices.length === 0) return;
    const previousRegionId = seededRegionId.current;
    if (previousRegionId === regionId) return;
    const dealerIn = (productId: string, inRegion: string | null) =>
      inRegion
        ? snapshot.dealerPrices.find((price) => price.productId === productId && price.regionId === inRegion) ?? null
        : null;
    setPrices((current) => {
      const next: Record<string, string> = {};
      for (const product of snapshot.products) {
        const previous = dealerIn(product.id, previousRegionId);
        const typed = current[product.id];
        const edited = typed != null && typed !== "" && (!previous || typed !== formatLimitNumber(previous.amount));
        if (edited) {
          next[product.id] = typed;
          continue;
        }
        const dealer = dealerIn(product.id, regionId);
        if (dealer) next[product.id] = formatLimitNumber(dealer.amount);
      }
      return next;
    });
    seededRegionId.current = regionId;
  }, [open, loading, regionId, snapshot.dealerPrices, snapshot.products]);

  const hubs = snapshot.warehouses.filter((warehouse) => warehouse.kind === "hub");
  const plant = sourceKind === "plant" ? snapshot.plants.find((item) => item.id === sourceId) : undefined;
  const hub = sourceKind === "hub" ? hubs.find((item) => item.id === sourceId) : undefined;

  const products = useMemo(() => {
    const sourceProducts =
      sourceKind === "plant" && sourceId
        ? snapshot.products.filter((product) => product.plantId === sourceId)
        : snapshot.products;
    return sourceProducts.map((product): CatalogProductRow => {
      const hubQty = hub ? sumAtWarehouse(balances, product.id, hub.id) : 0;
      const plantQty = plant ? sumAtWarehouse(balances, product.id, plant.warehouseId) : 0;
      const producing = plant ? producingOf(snapshot, plant.id, product.id) : 0;
      const hints =
        sourceKind === "hub"
          ? [hubQty, worldOf(balances, product.id), reservedOf(balances, product.id)]
          : [plantQty, producing];
      return {
        id: product.id,
        name: product.name,
        code: product.code,
        unit: product.unit,
        categoryIds: product.categoryIds,
        hints,
        owners: [
          {
            key: `${product.id}:free:`,
            label: "Количество",
            limit: sourceKind === "hub" ? hubQty : null,
            hints,
          },
        ],
      };
    });
  }, [balances, hub, plant, snapshot, sourceId, sourceKind]);

  const collapse = useCatalogCollapse(snapshot.categories, products, quantities, search);
  const lines = products.flatMap((product) => {
    const quantity = parseDecimalQuantity(quantities[`${product.id}:free:`] ?? "");
    if (quantity == null || quantity <= 0) return [];
    const priceRaw = prices[product.id] ?? "";
    const price = parseDecimalQuantity(priceRaw);
    return [{ productId: product.id, quantity, unitPrice: price, key: `${product.id}:free:`, priceRaw }];
  });
  const sum = lines.reduce((total, line) => total + line.quantity * (line.unitPrice ?? 0), 0);
  const sourceLabel =
    sourceKind === "plant" && sourceId
      ? plantCode(snapshot, sourceId)
      : sourceKind === "hub" && sourceId
        ? warehouseCode(snapshot, sourceId)
        : "";

  const applySource = (kind: "plant" | "hub", id: string) => {
    if (kind === "plant" && id) {
      const entered = lines.map((line) => line.productId);
      const plantByProduct = new Map(snapshot.products.map((product) => [product.id, product.plantId]));
      const dropped = productsNotMadeByPlant(entered, plantByProduct, id);
      if (dropped.length) {
        setPendingSource({ kind, id });
        return;
      }
    }
    setSourceKind(kind);
    setSourceId(id);
    setPendingSource(null);
  };

  const confirmDrop = () => {
    if (!pendingSource) return;
    const plantByProduct = new Map(snapshot.products.map((product) => [product.id, product.plantId]));
    const dropped = new Set(productsNotMadeByPlant(lines.map((line) => line.productId), plantByProduct, pendingSource.id));
    setQuantities((current) => {
      const next = { ...current };
      for (const productId of dropped) delete next[`${productId}:free:`];
      return next;
    });
    setSourceKind(pendingSource.kind);
    setSourceId(pendingSource.id);
    setPendingSource(null);
  };

  const needsSource = !order;
  const lockedSource = Boolean(order?.sourceKind);
  const priceErrorId = lines.find((line) => priceIssue(line.priceRaw))?.productId ?? null;

  const submit = async () => {
    if (submitting || lines.length === 0) return;
    if (needsSource && !sourceId) return;
    if (!order && !regionId) {
      setRegionError("Выберите регион");
      document.querySelector<HTMLElement>("[data-region-field] [role='combobox']")?.focus();
      return;
    }
    if (priceErrorId) {
      document.querySelector<HTMLInputElement>(`[data-price-key="${CSS.escape(priceErrorId)}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      if (order) {
        await addCustomerOrderLines({
          orderId: order.id,
          lines: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })),
        });
        await onAdded?.();
        onOpenChange(false);
        return;
      }
      const created = await createCustomerOrder({
        regionId,
        expectedEndOn: expectedEndOn || null,
        sourceKind,
        sourceId,
        lines: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice })),
      });
      onOpenChange(false);
      router.push(logisticsPath("customer-orders", created.id));
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  const columns =
    sourceKind === "hub"
      ? [
          { id: "hub", header: "На хабе", bold: true },
          { id: "world", header: "В мире", muted: true },
          { id: "reserved", header: "В резерве", muted: true },
        ]
      : [
          { id: "plant", header: "На складе завода" },
          { id: "producing", header: "Уже производится" },
        ];
  const priceList = Object.fromEntries(products.map((product) => [product.id, dealerOf(product.id)?.amount ?? null]));
  const moneyCode = lines.map((line) => dealerOf(line.productId)?.currencyCode).find((code) => code) ?? null;
  const moneySymbol = moneyCode === "USD" ? "$" : moneyCode === "EUR" ? "€" : moneyCode === "CNY" ? "¥" : moneyCode === "AED" ? "د.إ" : "₽";

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      size="catalog"
      kicker={order ? order.number : "Заказы клиента"}
      title={order ? "Добавить товары" : "Новый заказ клиента"}
      loading={loading}
      error={loadError}
      header={
        <div className="flex flex-wrap items-start gap-3">
          {order ? null : (
            <div className="space-y-1 text-sm">
              <span className="block font-medium">Источник</span>
              <div className="inline-flex h-8 items-center rounded-lg border bg-muted p-0.5 text-[13px]">
                <button
                  type="button"
                  className={sourceKind === "plant" ? "h-full rounded bg-foreground px-3.5 text-background" : "h-full rounded px-3.5 text-muted-foreground"}
                  onClick={() => applySource("plant", "")}
                >
                  Завод
                </button>
                <button
                  type="button"
                  className={sourceKind === "hub" ? "h-full rounded bg-foreground px-3.5 text-background" : "h-full rounded px-3.5 text-muted-foreground"}
                  onClick={() => applySource("hub", "")}
                >
                  Хаб
                </button>
              </div>
            </div>
          )}
          {order && !lockedSource ? null : (
          <FieldSelect
            label={sourceKind === "hub" ? "Хаб" : "Завод"}
            value={sourceId}
            items={
              sourceKind === "hub"
                ? hubs.map((item) => ({ value: item.id, label: item.code }))
                : snapshot.plants.map((item) => ({ value: item.id, label: item.code }))
            }
            onChange={(value) => applySource(sourceKind, value)}
            placeholder="Выберите"
            disabled={lockedSource}
            className="w-36"
          />
          )}
          {order ? null : (
            <div data-region-field>
              <FieldSelect
                label="Регион"
                value={pickedRegionId}
                items={snapshot.regions.map((item) => ({ value: item.id, label: regionCode(snapshot, item.id).toUpperCase() }))}
                onChange={(value) => {
                  setPickedRegionId(value);
                  setRegionError(null);
                }}
                placeholder="Выберите"
                className="w-36"
                invalid={Boolean(regionError)}
                error={regionError}
              />
            </div>
          )}
          {order ? null : (
            <label className="w-44 space-y-1 text-sm">
              <span className="block font-medium">Срок</span>
              <Input
                type="date"
                value={expectedEndOn}
                onChange={(event) => setExpectedEndOn(event.target.value)}
                className="h-8 w-full"
              />
            </label>
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
          ? `${pluralTovar(lines.length)} · ${formatQuantity(lines.reduce((total, line) => total + line.quantity, 0), "шт")} · ${formatCatalogMoney(sum, moneySymbol)}${sourceLabel ? ` · ${sourceLabel}` : ""}`
          : "Нет строк"
      }
      submitLabel={order ? "Добавить" : "Создать заказ"}
      onSubmit={() => void submit()}
      submitDisabled={(needsSource && !sourceId) || lines.length === 0}
      disabledReason={needsSource && !sourceId ? "Выберите источник" : "Введите количество"}
      submitting={submitting}
      serverError={serverError}
      dirty={enteredQuantityKeys(quantities).length > 0}
    >
      {pendingSource ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <span>
            {sourceDropBanner(
              productsNotMadeByPlant(
                lines.map((line) => line.productId),
                new Map(snapshot.products.map((product) => [product.id, product.plantId])),
                pendingSource.id,
              ).length,
              plantCode(snapshot, pendingSource.id),
            )}
          </span>
          <span className="flex gap-2">
            <Button type="button" size="xs" variant="ghost" onClick={() => setPendingSource(null)}>
              Отмена
            </Button>
            <Button type="button" size="xs" onClick={confirmDrop}>
              Убрать
            </Button>
          </span>
        </div>
      ) : null}
      {needsSource && !sourceId ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {sourceKind === "hub" ? "Выберите хаб, чтобы увидеть остаток" : "Выберите завод, чтобы увидеть товары"}
        </div>
      ) : (
        <CatalogQuantityTable
          categories={snapshot.categories}
          products={products}
          columns={columns}
          quantities={quantities}
          onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
          limitMode={sourceKind === "hub" ? "soft" : "none"}
          search={search}
          collapsed={collapse.collapsed}
          onToggleGroup={collapse.toggle}
          onlySelected={onlySelected}
          showPrice
          prices={prices}
          onPriceChange={(productId, raw) => setPrices((current) => ({ ...current, [productId]: raw }))}
          priceList={priceList}
          moneySymbol={moneySymbol}
          flat
        />
      )}
    </DialogShell>
  );
};
