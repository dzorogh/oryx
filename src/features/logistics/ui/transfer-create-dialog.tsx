"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { pluralTovar } from "@/features/logistics/category-tree";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { customerOrderById, warehouseCode, warehouseSelectItems } from "@/features/logistics/logistics-lookups";
import type { CustomerOrderLine, LogisticsSnapshot, OwnerType, StockBalance } from "@/features/logistics/logistics-types";
import {
  enteredQuantityKeys,
  firstErrorKey,
  formatLimitNumber,
  parseDecimalQuantity,
  TRANSFER_SOURCE_PLACEHOLDER,
  SHOW_ALL_STOCK_LABEL,
} from "@/features/logistics/ui/catalog-quantity-model";
import { CatalogGoodsPanel } from "@/features/logistics/ui/catalog-goods-panel";
import {
  CatalogQuantityTable,
  focusQuantityInput,
  useCatalogCollapse,
} from "@/features/logistics/ui/catalog-quantity-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { catalogProductsFromPlace, catalogSourceWarehouseIds, parseOwnerQuantityKey, placeOwnersByProduct } from "@/features/logistics/ui/place-catalog";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

export type TransferCreateSubmitValue = {
  fromWarehouseId: string;
  toWarehouseId: string;
  expectedEndOn: string | null;
  lines: Array<{
    productId: string;
    quantity: number;
    ownerType: OwnerType | null;
    ownerId: string | null;
  }>;
};

export type TransferCreateContext =
  | { kind: "free" }
  | { kind: "order"; customerOrderId: string; orderLines: CustomerOrderLine[] };

export type TransferCreatePreset = {
  fromWarehouseId?: string;
  toWarehouseId?: string;
  lines?: Array<{
    productId: string;
    quantity: number;
    ownerType?: OwnerType | null;
    ownerId?: string | null;
  }>;
};

const presetQuantities = (preset?: TransferCreatePreset): Record<string, string> => {
  const quantities: Record<string, string> = {};
  for (const line of preset?.lines ?? []) {
    const ownerType = line.ownerType ?? "free";
    const ownerId = line.ownerId ?? "";
    quantities[`${line.productId}:${ownerType}:${ownerId}`] = formatLimitNumber(line.quantity);
  }
  return quantities;
};

export const TransferCreateDialog = ({
  open,
  onOpenChange,
  snapshot,
  balances,
  context,
  onSubmit,
  preset,
  loading = false,
  loadError = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  context: TransferCreateContext;
  onSubmit: (value: TransferCreateSubmitValue) => Promise<boolean>;
  preset?: TransferCreatePreset;
  loading?: boolean;
  loadError?: string | null;
}) => {
  const [fromId, setFromId] = useState(preset?.fromWarehouseId ?? "");
  const [toId, setToId] = useState(preset?.toWarehouseId ?? "");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const orderId = context.kind === "order" ? context.customerOrderId : null;
  const orderNumber = orderId ? (customerOrderById(snapshot, orderId)?.number ?? orderId) : "";
  const wasOpen = useRef(false);

  useEffect(() => {
    const becameOpen = open && !wasOpen.current;
    wasOpen.current = open;
    if (!becameOpen) return;
    setFromId(preset?.fromWarehouseId ?? "");
    setToId(preset?.toWarehouseId ?? "");
    setExpectedEndOn("");
    setQuantities(presetQuantities(preset));
    setSearch("");
    setOnlySelected(false);
    setShowAll(false);
    setSubmitting(false);
    setServerError(null);
  }, [open, preset]);

  const sourceIds = useMemo(
    () =>
      catalogSourceWarehouseIds(snapshot, balances, {
        orderOwnerId: orderId,
        orderProductIds: context.kind === "order" ? context.orderLines.map((line) => line.productId) : null,
        showAll: showAll || !orderId,
        keepId: preset?.fromWarehouseId,
      }),
    [balances, context, orderId, preset?.fromWarehouseId, showAll, snapshot],
  );
  const sourceItems = useMemo(
    () => warehouseSelectItems(snapshot).filter((item) => sourceIds.includes(item.value)),
    [snapshot, sourceIds],
  );

  useEffect(() => {
    if (fromId && !sourceIds.includes(fromId)) setFromId(preset?.fromWarehouseId && sourceIds.includes(preset.fromWarehouseId) ? preset.fromWarehouseId : "");
  }, [fromId, preset?.fromWarehouseId, sourceIds]);

  const placeOwners = useMemo(
    () => (fromId ? placeOwnersByProduct(balances, "warehouse", fromId) : new Map()),
    [balances, fromId],
  );
  const allProducts = useMemo(() => {
    if (!fromId) return [];
    return catalogProductsFromPlace(snapshot, placeOwners, { orderOwnerId: orderId, showAll: true });
  }, [fromId, orderId, placeOwners, snapshot]);
  const products = useMemo(() => {
    if (!fromId) return [];
    return catalogProductsFromPlace(snapshot, placeOwners, {
      orderOwnerId: orderId,
      showAll: showAll || !orderId,
    });
  }, [fromId, orderId, placeOwners, showAll, snapshot]);

  const collapse = useCatalogCollapse(snapshot.categories, products, quantities, search);

  const lines = allProducts.flatMap((product) =>
    product.owners.flatMap((owner) => {
      const parsed = parseOwnerQuantityKey(owner.key);
      const quantity = parseDecimalQuantity(quantities[owner.key] ?? "");
      if (!parsed || quantity == null || quantity <= 0) return [];
      return [{ ...parsed, quantity, limit: owner.limit, key: owner.key }];
    }),
  );
  const errorKey = firstErrorKey(
    allProducts.flatMap((product) =>
      product.owners.map((owner) => ({
        key: owner.key,
        raw: quantities[owner.key] ?? "",
        limit: owner.limit,
        mode: "hard" as const,
      })),
    ),
  );
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const productCount = new Set(lines.map((line) => line.productId)).size;
  const fromCode = fromId ? warehouseCode(snapshot, fromId) : "";
  const toCode = toId ? warehouseCode(snapshot, toId) : "";

  const submit = async () => {
    if (submitting) return;
    if (!fromId) return;
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    if (!toId || fromId === toId || lines.length === 0) {
      setServerError(!toId || fromId === toId ? "Выберите другой склад назначения" : null);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const ok = await onSubmit({
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        expectedEndOn: expectedEndOn || null,
        lines: lines.map(({ productId, quantity, ownerType, ownerId: lineOwner }) => ({
          productId,
          quantity,
          ownerType,
          ownerId: lineOwner,
        })),
      });
      if (!ok) {
        setServerError("Не удалось выполнить действие");
        return;
      }
      onOpenChange(false);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  const dirty =
    Boolean(fromId || toId || expectedEndOn || search) || enteredQuantityKeys(quantities).length > 0;

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      size="catalog"
      kicker={orderNumber ? `Заказ ${orderNumber}` : "Документы"}
      title="Новое перемещение"
      header={
        <div className="flex flex-wrap items-end gap-2">
          <FieldSelect
            label="Со склада"
            value={fromId}
            items={sourceItems.filter((item) => item.value !== toId)}
            onChange={setFromId}
            placeholder="Выберите склад"
            emptyLabel={orderId ? "Нет склада с товарами этого заказа" : "Нет склада с остатком"}
          />
          <span className="mb-2 text-muted-foreground">→</span>
          <FieldSelect
            label="На склад"
            value={toId}
            items={warehouseSelectItems(snapshot, fromId)}
            onChange={setToId}
            placeholder="Выберите склад"
          />
          <ExpectedEndField optional value={expectedEndOn} onChange={setExpectedEndOn} />
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
          extra={
            orderId ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="border-0"
                aria-pressed={showAll}
                onClick={() => setShowAll((value) => !value)}
              >
                {SHOW_ALL_STOCK_LABEL}
              </Button>
            ) : null
          }
        />
      }
      footerSummary={
        lines.length
          ? `${pluralTovar(productCount)} · ${formatQuantity(units, "шт")} · ${fromCode} → ${toCode}`
          : "Нет строк"
      }
      submitLabel="Переместить"
      onSubmit={() => void submit()}
      submitDisabled={lines.length === 0 || !fromId}
      disabledReason={!fromId ? "Выберите склад-источник" : "Введите количество"}
      submitting={submitting}
      serverError={serverError}
      dirty={dirty && !submitting}
      loading={loading}
      error={loadError}
    >
      {!fromId ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {TRANSFER_SOURCE_PLACEHOLDER}
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
        />
      )}
    </DialogShell>
  );
};
