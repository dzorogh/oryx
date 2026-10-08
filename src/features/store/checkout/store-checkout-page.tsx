"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCatalogPrice } from "@/features/store/catalog-presentation";
import { VariantStockSummary } from "@/features/store/variant-stock-summary";
import { RegionSwitcher } from "@/features/store/region-switcher";
import type { MixedPackItem } from "@/domain/packing/mixed-containers";
import type { OrderRates } from "@/features/logistics/order-money";
import { FloatRatesNote, useFloatRatesOnOpen } from "@/features/logistics/ui/float-rates-status";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import { pluralRu } from "@/features/logistics/order-plan/order-plan-model";
import { useCart } from "@/features/store/cart/cart-context";
import { CartQuantityControl } from "@/features/store/cart/cart-quantity-control";
import { loadContainerTypes, type StoreContainerTypeRow } from "@/features/store/cart/cart-catalog";
import { ContainerLoadCalculator } from "@/features/store/packing/container-load-calculator";
import { checkoutCustomerOrder } from "@/features/store/cart/checkout-api";
import {
  blockHasSubmittableLines,
  buildCheckoutLayout,
  buildCheckoutOrderLines,
  submitCheckoutBlocks,
  sumCheckoutTotals,
  type CheckoutBlock,
  type CheckoutCartItem,
  type CheckoutFulfillmentMode,
} from "@/features/store/cart/checkout-model";
import { useSelectedRegion } from "@/features/store/region-context";
import {
  computeVariantRegionStock,
  loadVariantStockFacts,
  type VariantStockFact,
} from "@/features/store/variant-stock";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/features/store/domain/currency";

type BlockResult =
  | { blockId: string; blockLabel: string; status: "created"; orderId: string; orderNumber: string }
  | { blockId: string; blockLabel: string; status: "error"; message: string };

const blockLabel = (block: CheckoutBlock) =>
  `${block.mode === "hub" ? "Склад региона" : "Производственная площадка"} ${block.sourceCode}`;

const formatQty = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);

const loadSnapshotRates = async (): Promise<OrderRates | null> => {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client.from("store_currency").select("code,rate").is("deleted_at", null);
  if (error || !data) return null;
  const rates: OrderRates = { USD: 1 };
  for (const row of data as Array<{ code: string; rate: number | string | null }>) {
    const n = Number(row.rate);
    if (row.code && Number.isFinite(n) && n > 0) rates[row.code.toUpperCase()] = n;
  }
  return Object.keys(rates).length > 1 ? rates : null;
};

export const StoreCheckoutPage = () => {
  const { lines, catalogById, catalogLoading, catalogError, removeVariants, setQuantity } = useCart();
  const { selectedRegion, regionsLoading, setSwitcherOpen } = useSelectedRegion();
  const [mode, setMode] = useState<CheckoutFulfillmentMode>("hub");
  const hubMissing = Boolean(selectedRegion && !selectedRegion.hubWarehouseId);
  const effectiveMode: CheckoutFulfillmentMode = hubMissing ? "plant" : mode;
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [stockFacts, setStockFacts] = useState<VariantStockFact[]>([]);
  const [containerTypes, setContainerTypes] = useState<StoreContainerTypeRow[]>([]);
  const [submittingBlockId, setSubmittingBlockId] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [results, setResults] = useState<BlockResult[]>([]);
  const floatRates = useFloatRatesOnOpen(true);
  const [fallbackRates, setFallbackRates] = useState<OrderRates | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadVariantStockFacts()
      .then((facts) => {
        if (!cancelled) setStockFacts(facts ?? []);
      })
      .catch(() => {
        if (!cancelled) setStockFacts([]);
      });
    void loadContainerTypes()
      .then((rows) => {
        if (!cancelled) setContainerTypes(rows);
      })
      .catch(() => {
        if (!cancelled) setContainerTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadSnapshotRates().then((rates) => {
      if (!cancelled) setFallbackRates(rates);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rates: OrderRates | null =
    floatRates.status === "ok" ? floatRates.rates : fallbackRates;

  const regionForStock = useMemo(
    () =>
      selectedRegion
        ? {
            id: selectedRegion.id,
            code: selectedRegion.code,
            hubWarehouseId: selectedRegion.hubWarehouseId,
          }
        : null,
    [selectedRegion],
  );

  const checkoutItems: CheckoutCartItem[] = useMemo(() => {
    const regionCode = selectedRegion?.code ?? null;
    return lines.map((line) => {
      const item = catalogById.get(line.variantId);
      const region = regionCode && item ? item.byRegion.get(regionCode) : null;
      const stock = computeVariantRegionStock(stockFacts, line.variantId, regionForStock);
      return {
        variantId: line.variantId,
        name: item?.name ?? line.variantId,
        imageUrl: item?.imageUrl ?? null,
        plantId: item?.plantId ?? null,
        plantCode: item?.plantCode ?? null,
        quantity: line.quantity,
        quantityPerUnit: item?.quantityPerUnit ?? 1,
        dealerPrice: region?.dealerPrice ?? null,
        dealerCurrency: region?.dealerCurrency ?? null,
        dealerStatus: region?.dealerStatus ?? "unavailable",
        supplyCostPercent: region?.supplyCostPercent ?? null,
        hubReady: regionForStock ? stock.ready : null,
      };
    });
  }, [lines, catalogById, selectedRegion, stockFacts, regionForStock]);

  const includedVariantIds = useMemo(() => {
    const set = new Set(checkoutItems.map((item) => item.variantId));
    for (const id of excludedIds) set.delete(id);
    return set;
  }, [checkoutItems, excludedIds]);

  const layout = useMemo(
    () =>
      buildCheckoutLayout({
        mode: effectiveMode,
        items: checkoutItems,
        includedVariantIds,
        hasRegion: Boolean(selectedRegion),
        hubWarehouseId: selectedRegion?.hubWarehouseId ?? null,
        hubCode: selectedRegion?.hubCode ?? null,
      }),
    [effectiveMode, checkoutItems, includedVariantIds, selectedRegion],
  );

  const needsRegion = lines.length > 0 && !regionsLoading && !selectedRegion;
  const loading = lines.length > 0 && (regionsLoading || catalogLoading);
  const blocked = loading || needsRegion;
  const visibleBlocks = blocked ? [] : layout.blocks.filter((block) => block.lines.length > 0);

  const orderCurrency: CurrencyCode =
    selectedRegion?.orderCurrency ?? selectedRegion?.dealerCurrency ?? "USD";

  const totals = useMemo(
    () => sumCheckoutTotals(layout.blocks, orderCurrency, rates),
    [layout.blocks, orderCurrency, rates],
  );

  const packingItemsByBlock = useMemo(() => {
    const map = new Map<string, MixedPackItem[]>();
    for (const block of layout.blocks) {
      if (block.mode !== "plant") continue;
      const items: MixedPackItem[] = [];
      for (const line of block.lines) {
        const catalog = catalogById.get(line.variantId);
        const logistics = catalog?.logistics;
        if (!logistics) continue;
        items.push({
          id: Number(line.variantId),
          name: line.name,
          lengthMm: Math.round(logistics.lengthCm * 10),
          widthMm: Math.round(logistics.widthCm * 10),
          heightMm: Math.round(logistics.heightCm * 10),
          weightKg: logistics.weightKg,
          quantity: line.quantity,
          quantityPerUnit: catalog?.quantityPerUnit ?? 1,
          stacking: logistics.stacking,
          stackingLimit: logistics.stackingLimit,
          rotateLength: logistics.rotateLength,
          rotateWidth: logistics.rotateWidth,
          maxPerContainer: logistics.maxPerContainer,
        });
      }
      map.set(block.id, items);
    }
    return map;
  }, [layout.blocks, catalogById]);

  const toggleLine = (variantId: string, included: boolean) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (included) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const submitBlock = async (block: CheckoutBlock) => {
    if (!selectedRegion) throw new Error("Выберите регион");
    const linesPayload = buildCheckoutOrderLines(block);
    const created = await checkoutCustomerOrder({
      regionId: selectedRegion.id,
      sourceKind: block.mode === "hub" ? "hub" : "plant",
      sourceId: block.sourceId,
      lines: linesPayload,
      rates: floatRates.status === "ok" ? floatRates.rates : null,
      description: `Оформлено из корзины · ${blockLabel(block)}`,
    });
    const doneIds = linesPayload.map((line) => line.productVariantId);
    removeVariants(doneIds);
    setExcludedIds((prev) => {
      const next = new Set(prev);
      for (const id of doneIds) next.delete(id);
      return next;
    });
    return created;
  };

  const submitBlocks = async (blocks: CheckoutBlock[], busyId: string) => {
    setSubmittingBlockId(busyId);
    const outcomes = await submitCheckoutBlocks(blocks, submitBlock);
    const labelById = new Map(blocks.map((block) => [block.id, blockLabel(block)]));
    setResults(
      outcomes.map((outcome): BlockResult => {
        const label = labelById.get(outcome.blockId) ?? outcome.blockId;
        return outcome.ok
          ? {
              blockId: outcome.blockId,
              blockLabel: label,
              status: "created",
              orderId: outcome.value.id,
              orderNumber: outcome.value.number,
            }
          : { blockId: outcome.blockId, blockLabel: label, status: "error", message: outcome.message };
      }),
    );
    setResultsOpen(true);
    setSubmittingBlockId(null);
  };

  const handleSubmitBlock = (block: CheckoutBlock) => submitBlocks([block], block.id);
  const handleSubmitAll = () => submitBlocks(layout.blocks, "__all__");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-muted/30 p-4 sm:p-6">
      <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/store/pim/products" />}>Магазин</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Оформление</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
      </Breadcrumb>

      <Card size="sm" className="flex flex-row flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Оформление заказа</h1>
          <p className="text-sm text-muted-foreground">
            Выберите, как получить товары, — мы разложим корзину на заказы по месту получения.
          </p>
        </div>
        <RegionSwitcher />
      </Card>

      {catalogError ? (
        <p className="text-sm text-amber-700">
          Не удалось загрузить часть товаров корзины — обновите страницу.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("hub")}
          disabled={hubMissing}
          aria-pressed={effectiveMode === "hub"}
          className={cn(
            "rounded-xl border bg-background p-4 text-left transition",
            hubMissing
              ? "cursor-not-allowed opacity-60"
              : effectiveMode === "hub"
                ? "border-indigo-500 ring-2 ring-indigo-500/30"
                : "hover:border-foreground/20",
          )}
        >
          <p className="font-semibold">Склад региона</p>
          {hubMissing ? (
            <p className="mt-1 text-sm text-amber-700">У региона не задан хаб — способ недоступен</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Забираете товары, которые уже лежат на складе в вашем регионе
              {selectedRegion?.hubCode ? ` (${selectedRegion.hubCode})` : ""}, — всё одним заказом. Чего нет
              в наличии, привезём на этот склад позже в том же заказе. В цену уже входят доставка до склада,
              хранение и другие расходы.
            </p>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMode("plant")}
          aria-pressed={effectiveMode === "plant"}
          className={cn(
            "rounded-xl border bg-background p-4 text-left transition",
            effectiveMode === "plant"
              ? "border-indigo-500 ring-2 ring-indigo-500/30"
              : "hover:border-foreground/20",
          )}
        >
          <p className="font-semibold">Производственная площадка</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Забираете товар прямо с площадки, где его выпускают, и везёте сами — поэтому без доплаты
            за доставку. На каждую площадку оформляется отдельный заказ.
          </p>
        </button>
      </div>

      {lines.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Корзина пуста.{" "}
            <Link href="/store/pim/products" className="underline">
              Перейти в каталог
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Загружаем корзину…
          </CardContent>
        </Card>
      ) : null}

      {!loading && needsRegion ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            Цены, запасы и хаб зависят от региона.
            <Button type="button" size="sm" onClick={() => setSwitcherOpen(true)}>
              Выберите регион
            </Button>
          </CardContent>
        </Card>
      ) : null}


      {visibleBlocks.map((block) => (
        <Card key={block.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-lg">
                {block.mode === "hub" ? "Склад региона" : "Производственная площадка"}{" "}
                <span className="tabular-nums text-muted-foreground">{block.sourceCode}</span>
              </CardTitle>
              <CardDescription>
                {(() => {
                  const count = block.lines.filter((line) => line.included).length;
                  return `${count} ${pluralRu(count, "позиция", "позиции", "позиций")}`;
                })()}
              </CardDescription>
            </div>
            {block.mode === "plant" ? (
              <Button
                type="button"
                size="sm"
                disabled={
                  submittingBlockId != null ||
                  !blockHasSubmittableLines(block) ||
                  regionsLoading
                }
                onClick={() => void handleSubmitBlock(block)}
              >
                {submittingBlockId === block.id
                  ? "Оформляем…"
                  : visibleBlocks.length > 1
                    ? "Оформить подзаказ"
                    : "Оформить заказ"}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {block.lines.map((line) => {
              const stock = computeVariantRegionStock(stockFacts, line.variantId, regionForStock);
              return (
                <div
                  key={line.variantId}
                  className="flex flex-wrap items-start gap-3 rounded-lg border p-3"
                >
                  <Checkbox
                    checked={!excludedIds.has(line.variantId)}
                    onCheckedChange={(value) => toggleLine(line.variantId, Boolean(value))}
                    aria-label={`Включить ${line.name} в заказ`}
                  />
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-[var(--corportal-border-grey)] bg-white">
                    {line.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="48px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-medium">{line.name}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <CartQuantityControl
                        itemName={line.name}
                        quantity={line.quantity}
                        quantityPerUnit={catalogById.get(line.variantId)?.quantityPerUnit ?? 1}
                        onChange={(next) => setQuantity(line.variantId, next)}
                      />
                      <VariantStockSummary
                        stock={stock}
                        needsRegion={!selectedRegion}
                        onRequestRegion={() => setSwitcherOpen(true)}
                        compact
                      />
                    </div>
                    {line.pricing && line.pricing.fromStock != null && line.pricing.onOrder != null ? (
                      <p className="text-xs text-muted-foreground">
                        {line.pricing.onOrder > 0
                          ? `${formatQty(line.pricing.fromStock)} из наличия · ${formatQty(line.pricing.onOrder)} под заказ`
                          : "Всё из наличия"}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm">
                    {line.pricing ? (
                      <>
                        <p className="font-medium tabular-nums">
                          {formatCatalogPrice(line.pricing.unitPrice, {
                            currency: line.pricing.currency,
                          })}
                        </p>
                        {block.mode === "hub" && line.pricing.supplyCostPercent > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            в т.ч. Supply costs {line.pricing.supplyCostPercent}% ·{" "}
                            {formatCatalogPrice(line.pricing.supplyCostAmount, {
                              currency: line.pricing.currency,
                            })}
                          </p>
                        ) : null}
                        <p className="tabular-nums text-muted-foreground">
                          {formatCatalogPrice(line.pricing.lineTotal, {
                            currency: line.pricing.currency,
                          })}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              );
            })}

            {block.supplyCostTotals.length ? (
              <p className="text-right text-sm text-muted-foreground">
                Supply costs: итого{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {block.supplyCostTotals
                    .map((row) => formatCatalogPrice(row.total, { currency: row.currency }))
                    .join(" + ")}
                </span>
              </p>
            ) : null}
            {block.currencyTotals.length ? (
              <p className="text-right text-sm">
                Итого по заказу:{" "}
                <span className="font-semibold tabular-nums">
                  {block.currencyTotals
                    .map((row) => formatCatalogPrice(row.total, { currency: row.currency }))
                    .join(" + ")}
                </span>
              </p>
            ) : null}

            {block.mode === "plant" ? (
              <ContainerLoadCalculator
                containerTypes={containerTypes}
                items={packingItemsByBlock.get(block.id) ?? []}
                missingNames={block.lines
                  .filter(
                    (line) =>
                      !(packingItemsByBlock.get(block.id) ?? []).some((item) => String(item.id) === line.variantId),
                  )
                  .map((line) => line.name)}
              />
            ) : null}
          </CardContent>
        </Card>
      ))}

      {!blocked && layout.remainder.length ? (
        <details className="rounded-xl border bg-background p-4">
          <summary className="cursor-pointer font-medium">
            Остаются в корзине ({layout.remainder.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm">
            {layout.remainder.map((row) => (
              <li key={row.variantId} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  {row.excluded ? (
                    <Checkbox
                      checked={false}
                      onCheckedChange={(value) => toggleLine(row.variantId, Boolean(value))}
                      aria-label={`Вернуть ${row.name} в заказ`}
                    />
                  ) : null}
                  {row.name} · {formatQty(row.quantity)} шт.
                </span>
                <span className="text-muted-foreground">{row.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {visibleBlocks.length ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1 text-sm">
              {totals.byCurrency.map((row) => (
                <p key={row.currency} className="tabular-nums">
                  {formatCatalogPrice(row.total, { currency: row.currency })}
                </p>
              ))}
              {totals.orderCurrencyTotal != null ? (
                <p className="text-muted-foreground">
                  ≈{" "}
                  {formatCatalogPrice(totals.orderCurrencyTotal, {
                    currency: totals.orderCurrency,
                  })}{" "}
                  · примерный курс
                </p>
              ) : (
                <p className="text-muted-foreground">Нет курса для суммы в валюте заказов</p>
              )}
              <FloatRatesNote state={floatRates} />
            </div>
            <Button
              type="button"
              disabled={
                submittingBlockId != null ||
                !layout.blocks.some(blockHasSubmittableLines)
              }
              onClick={() => void handleSubmitAll()}
            >
              {submittingBlockId === "__all__" ? "Оформляем…" : "Оформить всё"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Результат оформления</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {results.map((result) => (
              <li key={result.blockId} className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{result.blockLabel}</span>
                {result.status === "created" ? (
                  <span>
                    Создан черновик{" "}
                    <Link
                      href={logisticsPath("customer-orders", result.orderId)}
                      className="font-medium underline"
                    >
                      {result.orderNumber}
                    </Link>
                  </span>
                ) : (
                  <span className="text-destructive">Ошибка: {result.message}</span>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
};
