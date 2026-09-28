"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Plus, Search } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectRegionStub, RegionSwitcher } from "@/components/store/region/region-switcher";
import { VariantStockSummary } from "@/components/store/stock/variant-stock-summary";
import {
  formatCatalogPrice,
  formatCatalogStatus,
  statusBadgeClassMap,
} from "@/components/store/pim/products/catalog/catalog-helpers";
import type { DealerStatus, RetailStatus } from "@/components/store/pim/products/store-catalog-demo-data";
import type { CurrencyCode } from "@/components/store/pim/pricelists/pricelists-helpers";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { pluralRu } from "@/features/logistics/order-plan/order-plan-model";
import { createProductVariant } from "@/features/logistics/logistics-api";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { ProductActivityCard } from "@/features/logistics/ui/product-activity-card";
import { ProductBalancesTable } from "@/features/logistics/ui/product-balances-table";
import { ProductionOrderCatalogDialog } from "@/features/logistics/ui/production-order-catalog-dialog";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { useSelectedRegion } from "@/features/store/region-context";
import { ProductPhoto } from "@/features/store/product-photo";
import { resolveSelectedVariant } from "@/features/store/product-card/variant-selection";
import { loadRegionPricing } from "@/features/store/store-catalog-from-logistics";
import {
  computeVariantRegionStock,
  loadVariantStockFacts,
  type VariantStockFact,
} from "@/features/store/variant-stock";
import { preferKorportalMediaConversion } from "@/lib/korportal-media-url";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ProductCardVariant = {
  id: string;
  name: string;
  unit: string;
  plantId: string | null;
  imageUrl: string | null;
  deletedAt: string | null;
  regionPrices: Record<
    string,
    {
      dealer: { amount: number; currency: CurrencyCode } | null;
      retail: { amount: number; currency: CurrencyCode } | null;
    }
  >;
  regionStatuses: Record<string, { dealer: DealerStatus; retail: RetailStatus }>;
};

type ProductCardData = {
  id: string;
  name: string;
  brand: string | null;
  family: string | null;
  categories: string[];
  variants: ProductCardVariant[];
};

type VariantDbRow = {
  id: number | string;
  name: string;
  unit: string;
  plant_id: number | string | null;
  image_url: string | null;
  deleted_at: string | null;
};

type ProductDbRow = {
  id: number | string;
  name: string;
  brand: { name: string } | null;
  family: { name: string } | null;
};

const loadProductCard = async (productId: string): Promise<ProductCardData | null> => {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const [productResult, variantsResult, categoriesResult] = await Promise.all([
    client
      .from("store_product")
      .select("id,name,brand:store_brand(name),family:store_product_family(name)")
      .eq("id", productId)
      .is("deleted_at", null)
      .maybeSingle(),
    client
      .from("store_product_variant")
      .select("id,name,unit,plant_id,image_url,deleted_at")
      .eq("product_id", productId)
      .order("id", { ascending: true }),
    client.from("store_product_category").select("category:store_category(name)").eq("product_id", productId),
  ]);

  if (productResult.error) throw new Error(productResult.error.message);
  if (!productResult.data) return null;
  if (variantsResult.error) throw new Error(variantsResult.error.message);

  const variantRows = (variantsResult.data ?? []) as VariantDbRow[];
  const pricing = await loadRegionPricing(variantRows.map((row) => String(row.id)));
  const product = productResult.data as unknown as ProductDbRow;
  const categories = ((categoriesResult.data ?? []) as unknown as Array<{ category: { name: string } | null }>)
    .map((row) => row.category?.name)
    .filter((name): name is string => Boolean(name));

  return {
    id: String(product.id),
    name: product.name,
    brand: product.brand?.name ?? null,
    family: product.family?.name ?? null,
    categories,
    variants: variantRows.map((row) => ({
      id: String(row.id),
      name: row.name,
      unit: row.unit || "шт",
      plantId: row.plant_id == null ? null : String(row.plant_id),
      imageUrl: preferKorportalMediaConversion(row.image_url),
      deletedAt: row.deleted_at,
      regionPrices: pricing?.pricesByVariant.get(String(row.id)) ?? {},
      regionStatuses: pricing?.statusesByVariant.get(String(row.id)) ?? {},
    })),
  };
};

const StatusIndicator = ({ status }: { status: DealerStatus }) => {
  const label = formatCatalogStatus(status);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground" title={label}>
      <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT_CLASS[status])} />
      <span className="sr-only">{label}</span>
    </span>
  );
};

const STATUS_DOT_CLASS: Record<DealerStatus, string> = {
  available: "bg-emerald-500",
  unavailable: "bg-rose-500",
};

const InfoField = ({ label, value }: { label: string; value: string | null }) => (
  <div className="space-y-0.5">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground">{value || "—"}</p>
  </div>
);

const StatusDot = ({ status }: { status: DealerStatus | RetailStatus }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold",
      statusBadgeClassMap[status],
    )}
  >
    <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" />
    {formatCatalogStatus(status)}
  </span>
);

const TabButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-md px-2.5 py-1.5 text-xs font-medium",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

export const StoreProductCardPage = ({ productId }: { productId: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedRegion, selectedRegionCode, setSwitcherOpen } = useSelectedRegion();
  const [data, setData] = useState<ProductCardData | null>(null);
  const [stockFacts, setStockFacts] = useState<VariantStockFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [productTab, setProductTab] = useState<"info" | "description" | "meta" | "docs">("info");
  const [variantTab, setVariantTab] = useState<"attributes" | "logistics" | "competitors" | "docs">(
    "logistics",
  );
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [productionOpen, setProductionOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [card, facts] = await Promise.all([
        loadProductCard(productId),
        loadVariantStockFacts().catch(() => null),
      ]);
      setData(card);
      setStockFacts(facts ?? []);
      if (!card) setError("Товар не найден.");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить товар.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectedVariantId = searchParams.get("variant");
  const selectedVariant = useMemo(
    () => resolveSelectedVariant(data?.variants ?? [], selectedVariantId),
    [data, selectedVariantId],
  );

  const activeVariantCount = data?.variants.filter((variant) => !variant.deletedAt).length ?? 0;
  const archivedVariantCount = (data?.variants.length ?? 0) - activeVariantCount;

  const listedVariants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.variants ?? []).filter((variant) => {
      if (variant.deletedAt && !showArchived && variant.id !== selectedVariant?.id) return false;
      if (!q) return true;
      return `${variant.name} ${formatLogisticsCode("product", variant.id)}`.toLowerCase().includes(q);
    });
  }, [data, query, selectedVariant?.id, showArchived]);

  const selectVariant = useCallback(
    (variantId: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set("variant", variantId);
      router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (selectedVariant && selectedVariantId !== selectedVariant.id) {
      selectVariant(selectedVariant.id);
    }
  }, [selectVariant, selectedVariant, selectedVariantId]);

  const logistics = useLogisticsStore({
    kind: "product",
    variantId: selectedVariant?.id ?? "",
  });

  const needsRegion = !selectedRegionCode;
  const regionPrices =
    selectedVariant && selectedRegionCode ? selectedVariant.regionPrices[selectedRegionCode] : undefined;
  const regionStatuses =
    selectedVariant && selectedRegionCode ? selectedVariant.regionStatuses[selectedRegionCode] : undefined;
  const stock =
    selectedVariant && selectedRegion
      ? computeVariantRegionStock(stockFacts, selectedVariant.id, selectedRegion)
      : null;

  const createVariant = async () => {
    if (submitting || !newName.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await createProductVariant({ name: newName.trim(), productId });
      await reload();
      setAddOpen(false);
      setNewName("");
      selectVariant(created.variantId);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 p-4">
        <LogisticsLoading />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-muted/30 p-4">
        <LogisticsError message={error ?? "Товар не найден."} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="flex w-full flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/store/pim/products" />}>Товары</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{data.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <RegionSwitcher className="w-full sm:w-auto" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card size="sm" className="space-y-3 p-4 ring-1 ring-[var(--corportal-border-grey)]">
              <div className="flex gap-3">
                <ProductPhoto src={selectedVariant?.imageUrl} alt={data.name} sizes="80px" className="size-20" />
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-foreground">{data.name}</h1>
                  <p className="text-xs text-muted-foreground">
                    {activeVariantCount} {pluralRu(activeVariantCount, "вариант", "варианта", "вариантов")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
                {(
                  [
                    ["info", "Инфо"],
                    ["description", "Описание"],
                    ["meta", "Мета"],
                    ["docs", "Документы"],
                  ] as const
                ).map(([id, label]) => (
                  <TabButton key={id} active={productTab === id} onClick={() => setProductTab(id)}>
                    {label}
                  </TabButton>
                ))}
              </div>
              {productTab === "info" ? (
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Бренд" value={data.brand} />
                  <InfoField label="Семейство" value={data.family} />
                  <div className="col-span-2">
                    <InfoField label="Категории" value={data.categories.join(", ")} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет данных</p>
              )}
            </Card>

            <Card size="sm" className="space-y-3 p-3 ring-1 ring-[var(--corportal-border-grey)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Варианты {activeVariantCount}</h2>
                <div className="flex items-center gap-1">
                  {archivedVariantCount > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={showArchived ? "default" : "outline"}
                      aria-pressed={showArchived}
                      onClick={() => setShowArchived((value) => !value)}
                    >
                      <Archive aria-hidden className="size-3.5" />
                      Показать архивные {archivedVariantCount}
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus aria-hidden className="size-3.5" />
                    Добавить
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск вариантов…"
                  aria-label="Поиск вариантов"
                  className="h-8 pl-7"
                />
              </div>
              {needsRegion ? <SelectRegionStub className="px-1" /> : null}
              <div className="max-h-[28rem] space-y-1 overflow-y-auto" role="list" aria-label="Варианты">
                {listedVariants.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-muted-foreground">Ничего не найдено</p>
                ) : null}
                {listedVariants.map((variant) => {
                  const selected = variant.id === selectedVariant?.id;
                  const prices = selectedRegionCode ? variant.regionPrices[selectedRegionCode] : undefined;
                  const status = selectedRegionCode ? variant.regionStatuses[selectedRegionCode] : undefined;
                  const rowStock = selectedRegion
                    ? computeVariantRegionStock(stockFacts, variant.id, selectedRegion)
                    : null;
                  return (
                    <div
                      key={variant.id}
                      role="listitem"
                      className={cn(
                        "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-lg border px-2.5 py-2",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-[var(--corportal-border-grey)] hover:bg-muted/40",
                        variant.deletedAt && "opacity-60",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectVariant(variant.id)}
                        aria-pressed={selected}
                        aria-label={`Выбрать вариант ${variant.name}`}
                        className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                      <span className="pointer-events-none truncate text-sm font-medium" title={variant.name}>
                        {variant.name}
                        {variant.deletedAt ? <span className="ml-1 text-xs text-muted-foreground">· в архиве</span> : null}
                      </span>
                      <span className="pointer-events-none justify-self-end text-sm font-semibold tabular-nums">
                        {needsRegion
                          ? "—"
                          : formatCatalogPrice(prices?.dealer?.amount ?? null, { currency: prices?.dealer?.currency })}
                      </span>
                      <span className="pointer-events-none">
                        {status ? <StatusIndicator status={status.dealer} /> : null}
                      </span>
                      <span className="relative z-10 justify-self-end">
                        {needsRegion ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <VariantStockSummary stock={rowStock} compact className="-mr-1.5" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card size="sm" className="space-y-4 p-4 ring-1 ring-[var(--corportal-border-grey)]">
            {!selectedVariant ? (
              <p className="text-sm text-muted-foreground">Нет вариантов</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  <ProductPhoto
                    src={selectedVariant.imageUrl}
                    alt={selectedVariant.name}
                    sizes="128px"
                    className="size-28"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <h2 className="text-xl font-semibold">{selectedVariant.name}</h2>
                    {regionStatuses ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Дилер
                          </span>
                          <StatusDot status={regionStatuses.dealer} />
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Розница
                          </span>
                          <StatusDot status={regionStatuses.retail} />
                        </span>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>
                        <span className="text-muted-foreground">Код: </span>
                        {formatLogisticsCode("product", selectedVariant.id)}
                      </span>
                      <span>
                        <span className="text-muted-foreground">Ед.: </span>
                        {selectedVariant.unit}
                      </span>
                    </div>
                  </div>
                  {needsRegion ? (
                    <div className="flex min-w-48 flex-col items-end justify-center gap-2 rounded-lg border border-dashed border-[var(--corportal-border-grey)] px-4 py-3 text-right">
                      <p className="text-sm text-muted-foreground">Цены и запасы зависят от региона</p>
                      <Button type="button" size="sm" onClick={() => setSwitcherOpen(true)}>
                        Выберите регион
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-right">
                      <div>
                        <p className="text-[11px] uppercase text-muted-foreground">Дилер</p>
                        <p className="text-xl font-bold tabular-nums">
                          {formatCatalogPrice(regionPrices?.dealer?.amount ?? null, {
                            currency: regionPrices?.dealer?.currency,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-muted-foreground">Розница</p>
                        <p className="text-lg font-semibold tabular-nums">
                          {formatCatalogPrice(regionPrices?.retail?.amount ?? null, {
                            currency: regionPrices?.retail?.currency,
                          })}
                        </p>
                      </div>
                      <VariantStockSummary stock={stock} className="-mr-1.5" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
                  {(
                    [
                      ["attributes", "Атрибуты"],
                      ["logistics", "Логистика"],
                      ["competitors", "Конкуренты"],
                      ["docs", "Документы"],
                    ] as const
                  ).map(([id, label]) => (
                    <TabButton key={id} active={variantTab === id} onClick={() => setVariantTab(id)}>
                      {label}
                    </TabButton>
                  ))}
                </div>

                {variantTab === "logistics" ? (
                  <div className="space-y-4">
                    {logistics.isLoading ? <LogisticsLoading /> : null}
                    {logistics.error ? <LogisticsError message={logistics.error} /> : null}
                    {!logistics.isLoading && !logistics.error ? (
                      <>
                        <ProductBalancesTable
                          snapshot={logistics.snapshot}
                          balances={logistics.balances}
                          productId={selectedVariant.id}
                          unit={selectedVariant.unit}
                        />
                        <ProductActivityCard
                          snapshot={logistics.snapshot}
                          productId={selectedVariant.id}
                          unit={selectedVariant.unit}
                          onCreateProduction={() => setProductionOpen(true)}
                        />
                        <DocumentLedger
                          snapshot={logistics.snapshot}
                          hide="product"
                          filter={(entry) => entry.productId === selectedVariant.id}
                        />
                        <ProductionOrderCatalogDialog
                          open={productionOpen}
                          onOpenChange={setProductionOpen}
                          snapshot={logistics.snapshot}
                          balances={logistics.balances}
                          presetProductId={selectedVariant.id}
                        />
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет данных</p>
                )}
              </>
            )}
          </Card>
        </div>
      </section>

      <DialogShell
        open={addOpen}
        onOpenChange={setAddOpen}
        size="sm"
        kicker="Варианты"
        title="Новый вариант"
        submitLabel="Добавить"
        onSubmit={() => void createVariant()}
        submitDisabled={!newName.trim()}
        disabledReason="Укажите название"
        submitting={submitting}
        serverError={serverError}
        dirty={newName.trim().length > 0}
      >
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Название</span>
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Красный · Touring"
          />
        </label>
      </DialogShell>
    </main>
  );
};
