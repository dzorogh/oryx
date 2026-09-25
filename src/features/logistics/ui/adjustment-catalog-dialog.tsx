"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pluralTovar } from "@/features/logistics/category-tree";
import { useRouter } from "next/navigation";
import { createAndPostAdjustment } from "@/features/logistics/logistics-api";
import { freeWarehouseQuantity, type AdjustmentSourceDocumentType } from "@/features/logistics/logistics-adjustments";
import type { AdjustmentOperation } from "@/features/logistics/logistics-types";
import { warehouseSelectItems } from "@/features/logistics/logistics-lookups";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import {
  formatLimitNumber,
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
import { catalogProductsFromPlace, placeOwnersByProduct } from "@/features/logistics/ui/place-catalog";
import { reportPartialCreate } from "@/features/logistics/ui/open-created-documents";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";
import { Input } from "@/components/ui/input";

export type AdjustmentCatalogIntent = "inventory" | "signed";

export type AdjustmentCatalogPreset = {
  operation?: AdjustmentOperation;
  warehouseId?: string;
  explanation?: string;
  sourceDocumentType?: AdjustmentSourceDocumentType | "";
  sourceDocumentId?: string;
  productId?: string;
  intent?: AdjustmentCatalogIntent;
};

export const adjustmentIntentFromPreset = (preset?: AdjustmentCatalogPreset): AdjustmentCatalogIntent =>
  preset?.intent ?? "signed";

export const AdjustmentCatalogDialog = ({
  open,
  onOpenChange,
  snapshot,
  balances,
  preset,
  intent: intentProp,
  loading,
  loadError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  preset?: AdjustmentCatalogPreset;
  intent?: AdjustmentCatalogIntent;
  loading?: boolean;
  loadError?: string | null;
}) => {
  const router = useRouter();
  const intent = intentProp ?? adjustmentIntentFromPreset(preset);
  const [warehouseId, setWarehouseId] = useState("");
  const [explanation, setExplanation] = useState("");
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
    setWarehouseId(preset?.warehouseId ?? "");
    setExplanation(preset?.explanation ?? "");
    const seeded: Record<string, string> = {};
    if (preset?.productId) seeded[`${preset.productId}:free:`] = "";
    setQuantities(seeded);
    setSearch("");
    setOnlySelected(false);
    setSubmitting(false);
    setServerError(null);
  }, [open, preset]);

  const warehouseItems = useMemo(() => {
    const all = warehouseSelectItems(snapshot);
    if (intent === "inventory") return all;
    return all.filter((item) => {
      if (item.value === preset?.warehouseId) return true;
      const owners = placeOwnersByProduct(balances, "warehouse", item.value);
      const freeOnly = new Map(
        [...owners.entries()].map(([productId, list]) => [productId, list.filter((owner) => owner.ownerType == null)]),
      );
      return catalogProductsFromPlace(snapshot, freeOnly).length > 0;
    });
  }, [balances, intent, preset?.warehouseId, snapshot]);

  useEffect(() => {
    if (warehouseId && !warehouseItems.some((item) => item.value === warehouseId)) setWarehouseId("");
  }, [warehouseId, warehouseItems]);

  const bookOf = useCallback(
    (productId: string) => (warehouseId ? freeWarehouseQuantity(balances, productId, warehouseId) : 0),
    [balances, warehouseId],
  );

  const products = useMemo(() => {
    if (!warehouseId) return [];
    const owners = placeOwnersByProduct(balances, "warehouse", warehouseId);
    const freeOnly = new Map(
      [...owners.entries()].map(([productId, list]) => [
        productId,
        list.filter((owner) => owner.ownerType == null),
      ]),
    );
    const base = catalogProductsFromPlace(snapshot, freeOnly);
    if (intent !== "inventory") {
      return base.map((product) => ({
        ...product,
        owners: product.owners.map((owner) => ({ ...owner, hints: [bookOf(product.id)] })),
      }));
    }
    return base.map((product) => {
      const book = bookOf(product.id);
      const raw = quantities[`${product.id}:free:`] ?? "";
      const fact = parseDecimalQuantity(raw);
      const delta = fact == null ? null : fact - book;
      return {
        ...product,
        owners: product.owners.map((owner) => ({
          ...owner,
          limit: null,
          hints: [book, delta == null ? "—" : formatLimitNumber(delta)],
        })),
      };
    });
  }, [balances, bookOf, intent, quantities, snapshot, warehouseId]);

  const collapse = useCatalogCollapse(snapshot.categories, products, quantities, search);

  const post = async (operation: AdjustmentOperation, lines: Array<{ productId: string; quantity: number }>) =>
    createAndPostAdjustment(
      {
        operation,
        warehouseId,
        explanation,
        sourceDocumentType: preset?.sourceDocumentType || null,
        sourceDocumentId: preset?.sourceDocumentId || null,
        lines,
      },
      balances,
    );

  const submit = async () => {
    if (submitting || !warehouseId) return;
    if (!explanation.trim()) {
      setServerError("Укажите объяснение корректировки");
      return;
    }
    setSubmitting(true);
    setServerError(null);
    const created: Array<{ href: string; label: string }> = [];
    try {
      if (intent === "inventory") {
        const increases: Array<{ productId: string; quantity: number }> = [];
        const decreases: Array<{ productId: string; quantity: number }> = [];
        for (const product of products) {
          for (const owner of product.owners) {
            const fact = parseDecimalQuantity(quantities[owner.key] ?? "");
            if (fact == null) continue;
            const delta = fact - bookOf(product.id);
            if (Math.abs(delta) <= 1e-9) continue;
            if (delta > 0) increases.push({ productId: product.id, quantity: delta });
            else decreases.push({ productId: product.id, quantity: Math.abs(delta) });
          }
        }
        if (increases.length + decreases.length === 0) {
          setServerError("Введите факт, отличный от учёта");
          return;
        }
        const first = increases.length
          ? await post("increase", increases)
          : await post("write_off", decreases);
        created.push({
          href: logisticsPath("adjustments", first.id),
          label: increases.length ? "Оприходование" : "Списание",
        });
        if (increases.length && decreases.length) {
          const second = await post("write_off", decreases);
          created.push({ href: logisticsPath("adjustments", second.id), label: "Списание" });
        }
        onOpenChange(false);
        router.push(created[0].href);
        return;
      }
      const plus: Array<{ productId: string; quantity: number }> = [];
      const minus: Array<{ productId: string; quantity: number }> = [];
      for (const product of products) {
        for (const owner of product.owners) {
          const value = parseDecimalQuantity(quantities[owner.key] ?? "", true);
          if (value == null || value === 0) continue;
          if (value < 0 && Math.abs(value) - bookOf(product.id) > 1e-9) {
            focusQuantityInput(owner.key);
            setServerError(`максимум ${formatLimitNumber(bookOf(product.id))}`);
            return;
          }
          if (value > 0) plus.push({ productId: product.id, quantity: value });
          else minus.push({ productId: product.id, quantity: Math.abs(value) });
        }
      }
      if (plus.length + minus.length === 0) return;
      const first = plus.length ? await post("increase", plus) : await post("write_off", minus);
      created.push({
        href: logisticsPath("adjustments", first.id),
        label: plus.length ? "Оприходование" : "Списание",
      });
      if (plus.length && minus.length) {
        const second = await post("write_off", minus);
        created.push({ href: logisticsPath("adjustments", second.id), label: "Списание" });
      }
      onOpenChange(false);
      router.push(created[0].href);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      if (created.length > 0 && created.length < 2) {
        onOpenChange(false);
        await reportPartialCreate((href) => router.push(href), created, translateLogisticsError(raw));
        return;
      }
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  const filled = Object.values(quantities).filter((raw) => {
    const value = parseDecimalQuantity(raw, intent !== "inventory");
    return value != null && value !== 0;
  }).length;
  const columns =
    intent === "inventory"
      ? [
          { id: "book", header: "Учёт" },
          { id: "delta", header: "Разница" },
        ]
      : [{ id: "now", header: "На складе сейчас" }];

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      size="catalog"
      kicker="Корректировки"
      title={intent === "inventory" ? "Инвентаризация" : "Списание / оприходование"}
      loading={loading}
      error={loadError}
      header={
        <div className="flex flex-wrap items-end gap-2">
          <FieldSelect
            label="Склад"
            value={warehouseId}
            items={warehouseItems}
            onChange={setWarehouseId}
            placeholder="Выберите склад"
            emptyLabel="Нет склада с остатком"
          />
          <label className="flex min-w-64 flex-col gap-1 text-sm">
            <span className="font-medium">Объяснение</span>
            <Input value={explanation} onChange={(event) => setExplanation(event.target.value)} />
          </label>
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
      footerSummary={filled ? pluralTovar(filled) : "Нет строк"}
      submitLabel="Провести"
      onSubmit={() => void submit()}
      submitDisabled={!warehouseId || filled === 0}
      disabledReason={!warehouseId ? "Выберите склад" : "Введите количество"}
      submitting={submitting}
      serverError={serverError}
      dirty={Boolean(warehouseId || explanation || filled)}
    >
      {!warehouseId ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Выберите склад, чтобы увидеть остаток
        </div>
      ) : (
        <CatalogQuantityTable
          categories={snapshot.categories}
          products={products as CatalogProductRow[]}
          columns={columns}
          quantities={quantities}
          onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
          limitMode="none"
          quantityHeader={intent === "inventory" ? "Факт" : "±"}
          search={search}
          collapsed={collapse.collapsed}
          onToggleGroup={collapse.toggle}
          onlySelected={onlySelected}
        />
      )}
    </DialogShell>
  );
};
