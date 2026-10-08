// english-ui:ignore-file
"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, ShoppingCart } from "lucide-react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SelectRegionStub } from "@/features/store/region-switcher";
import { VariantStockSummary } from "@/features/store/variant-stock-summary";
import { cn } from "@/lib/utils";
import { ProductPhoto } from "@/features/store/product-photo";
import { getCategoryNodeLabel } from "@/features/store/category-tree";
import { pluralTovar } from "@/features/logistics/category-tree";
import { useSelectedRegion } from "@/features/store/region-context";
import {
  computeVariantRegionStock,
  type VariantStockFact,
} from "@/features/store/variant-stock";
import { getCatalogItemDetailHref } from "./catalog-helpers";
import type { DealerStatus, RetailStatus } from "@/features/store/domain/statuses";
import type { StoreCatalogItem } from "@/features/store/domain/catalog-item";
import { CatalogBuyTooltip } from "@/features/store/catalog-buy-tooltip";
import { type CatalogColumnId, getCatalogColumnDefinition } from "./catalog-columns";
import { SKELETON_ROW_COUNT, formatCatalogUpdatedAt, getDisplayProductName, type CatalogListingMode } from "./catalog-helpers";
import {
  formatCatalogPrice,
  formatCatalogStatus,
  formatPrice,
  getPurchaseBlockReason,
  statusBadgeClassMap,
} from "@/features/store/catalog-presentation";
import {
  activeCatalogSiteLabel,
  buildCatalogVirtualElements,
  catalogTableSection,
  type CatalogSiteGroup,
  type CatalogVirtualElement,
} from "./catalog-site-groups";
import { CartQuantityControl } from "@/features/store/cart/cart-quantity-control";
import { useCart } from "@/features/store/cart/cart-context";
import type { StoreRegionOption } from "@/features/store/region-context";
import type { VariantStockRegion } from "@/features/store/variant-stock";

/** Высота шапки таблицы (`TableHead` h-9) — для sticky полоски площадки. */
const CATALOG_TABLE_HEAD_OFFSET = "2.25rem";
const CATALOG_SCROLL_CLASS = "max-h-[calc(100vh-220px)] overflow-auto";
const ESTIMATED_ROW_HEIGHT = 52;
const ESTIMATED_HEADER_HEIGHT = 40;
const LOAD_MORE_THRESHOLD = 8;

const COLUMN_BORDER = "border-l border-[var(--corportal-border-grey)]";

const borderedColumnIds = new Set<CatalogColumnId>(["dealer", "retail"]);

/** Варианты: статус, цена и счётчик корзины вплотную, колонка не раздувается на всю ширину таблицы. */
const DEALER_BUY_COLUMN_PX = 330;

const dealerBuyColumnStyle = (columnId: CatalogColumnId, showBuyButton: boolean) =>
  columnId === "dealer" && showBuyButton
    ? { width: DEALER_BUY_COLUMN_PX, maxWidth: DEALER_BUY_COLUMN_PX }
    : undefined;

const getColumnCellClassName = (columnId: CatalogColumnId) =>
  cn(
    "max-w-0 min-w-0 overflow-hidden px-3 py-2",
    borderedColumnIds.has(columnId) && COLUMN_BORDER,
  );

const getColumnHeadClassName = (columnId: CatalogColumnId) =>
  cn("h-9 min-w-0 overflow-hidden px-3 text-xs", borderedColumnIds.has(columnId) && COLUMN_BORDER);

const ProductThumbnailPreview = ({
  item,
  productHref,
  displayName,
}: {
  item: StoreCatalogItem;
  productHref: string;
  displayName: string;
}) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger
      render={
        <Link
          href={productHref}
          aria-label={`Открыть товар ${displayName}`}
          className="pointer-events-auto relative z-20 block size-9 shrink-0 overflow-hidden rounded-lg border border-[var(--corportal-border-grey)] bg-white outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      }
    >
      <ProductPhoto
        src={item.imageSrc}
        alt={item.imageAlt}
        sizes="36px"
        className="size-full rounded-none border-0"
      />
    </TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side="left" sideOffset={12} className="isolate z-50">
        <TooltipPrimitive.Popup className="origin-(--transform-origin) overflow-hidden rounded-xl border border-[var(--corportal-border-grey)] bg-white p-1.5 shadow-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <ProductPhoto
            src={item.imageSrc}
            alt={item.imageAlt}
            sizes="240px"
            className="size-60 rounded-lg bg-slate-50"
            imageClassName="object-contain"
          />
          <p className="mt-1.5 max-w-60 truncate px-0.5 text-xs font-medium text-foreground">
            {getDisplayProductName(item.name)}
          </p>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
);

const ProductNameCell = ({
  item,
  showCodeSubline,
  listingMode,
}: {
  item: StoreCatalogItem;
  showCodeSubline: boolean;
  listingMode: CatalogListingMode;
}) => {
  const displayName = getDisplayProductName(item.name);
  const productHref = getCatalogItemDetailHref(item, listingMode);

  return (
    <div className="flex w-full max-w-full min-w-0 items-center gap-2.5" title={displayName}>
      <ProductThumbnailPreview item={item} productHref={productHref} displayName={displayName} />
      <div className="min-w-0 flex-1 basis-0 overflow-hidden">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        {showCodeSubline ? (
          <p className="truncate text-xs text-muted-foreground" title={item.code}>
            {item.code}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const StatusBadge = ({ status, className }: { status: DealerStatus | RetailStatus; className?: string }) => (
  <Badge className={cn(statusBadgeClassMap[status], className)}>{formatCatalogStatus(status)}</Badge>
);

const PriceLabel = ({
  price,
  currency,
  from = false,
  className,
  needsRegion,
}: {
  price: number | null;
  currency?: string | null;
  from?: boolean;
  className?: string;
  needsRegion?: boolean;
}) => {
  if (needsRegion) {
    return (
      <span className={cn("pointer-events-auto relative z-20 shrink-0", className)}>
        <SelectRegionStub />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums",
        price === null ? "text-muted-foreground" : "text-foreground",
        className,
      )}
    >
      {formatCatalogPrice(price, { from, currency })}
    </span>
  );
};

const PriceStatusCell = ({
  price,
  currency,
  status,
  from = false,
  needsRegion,
}: {
  price: number | null;
  currency?: string | null;
  status: DealerStatus | RetailStatus;
  from?: boolean;
  needsRegion?: boolean;
}) => (
  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
    <div className="min-w-0 overflow-hidden">
      {needsRegion ? null : <StatusBadge status={status} />}
    </div>
    <PriceLabel price={price} currency={currency} from={from} needsRegion={needsRegion} className="text-right" />
  </div>
);

type DealerCellProps = {
  item: StoreCatalogItem;
  showBuyButton: boolean;
  priceFromPrefix: boolean;
  needsRegion: boolean;
};

const DealerCell = ({ item, showBuyButton, priceFromPrefix, needsRegion }: DealerCellProps) => {
  const displayName = getDisplayProductName(item.name);
  const blockReason = needsRegion ? "Выберите регион" : getPurchaseBlockReason(item);
  const canBuy = !needsRegion && blockReason === null;
  const cart = useCart();
  const quantity = cart.quantityOf(item.id);
  const inCart = quantity > 0;
  const buyLabel = canBuy
    ? `Добавить «${displayName}» в корзину за ${formatPrice(item.dealerPrice as number, item.dealerCurrency ?? "USD")}`
    : `«${displayName}» недоступен для заказа: ${blockReason}`;

  return (
    <div className="flex items-center justify-end gap-2">
      {needsRegion ? null : <StatusBadge status={item.dealerStatus} />}
      <div className="flex shrink-0 items-center justify-end gap-2">
        <PriceLabel
          price={item.dealerPrice}
          currency={item.dealerCurrency}
          from={priceFromPrefix}
          needsRegion={needsRegion}
          className="text-right"
        />
        {showBuyButton ? (
          <span className="relative z-20 inline-flex shrink-0 pointer-events-auto">
            {inCart ? (
              <CartQuantityControl
                itemName={displayName}
                quantity={quantity}
                quantityPerUnit={cart.catalogById.get(item.id)?.quantityPerUnit ?? 1}
                onChange={(next) => cart.setQuantity(item.id, next)}
              />
            ) : (
              <CatalogBuyTooltip reason={blockReason} className="inline-flex shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className={cn("shrink-0", !canBuy && "pointer-events-none")}
                  disabled={!canBuy}
                  aria-label={buyLabel}
                  onClick={() => cart.addPack(item.id)}
                >
                  <ShoppingCart aria-hidden className="size-4" />
                </Button>
              </CatalogBuyTooltip>
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
};

type ColumnRenderContext = {
  item: StoreCatalogItem;
  showBuyButton: boolean;
  priceFromPrefix: boolean;
  showCodeSubline: boolean;
  listingMode: CatalogListingMode;
  needsRegion: boolean;
  stockFacts: VariantStockFact[];
  selectedRegion: StoreRegionOption | null;
  onRequestRegion: () => void;
};

const renderColumnCell = (columnId: CatalogColumnId, context: ColumnRenderContext) => {
  const { item, showBuyButton, priceFromPrefix, listingMode, needsRegion } = context;

  switch (columnId) {
    case "name":
      return (
        <ProductNameCell item={item} showCodeSubline={context.showCodeSubline} listingMode={listingMode} />
      );
    case "brand":
      return <Badge variant="outline">{item.brand}</Badge>;
    case "category":
      return (
        <span className="block truncate text-sm" title={getCategoryNodeLabel(item.categoryId) ?? item.category}>
          {getCategoryNodeLabel(item.categoryId) ?? item.category}
        </span>
      );
    case "site":
      return <span className="text-xs font-semibold text-muted-foreground">{item.productionSite}</span>;
    case "stock": {
      const region: VariantStockRegion | null = context.selectedRegion;
      const stock =
        needsRegion || !region ? null : computeVariantRegionStock(context.stockFacts, item.id, region);
      return (
        <span className="pointer-events-auto relative z-20">
          <VariantStockSummary
            stock={stock}
            needsRegion={needsRegion}
            onRequestRegion={context.onRequestRegion}
            compact
          />
        </span>
      );
    }
    case "updatedAt":
      return <span className="text-sm text-muted-foreground">{formatCatalogUpdatedAt(item.updatedAt)}</span>;
    case "dealer":
      return (
        <DealerCell
          item={item}
          showBuyButton={showBuyButton}
          priceFromPrefix={priceFromPrefix}
          needsRegion={needsRegion}
        />
      );
    case "retail":
      return (
        <PriceStatusCell
          price={item.retailPrice}
          currency={item.retailCurrency}
          status={item.retailStatus}
          from={priceFromPrefix}
          needsRegion={needsRegion}
        />
      );
    case "family":
      return <span className="text-sm">{item.family}</span>;
    default:
      return null;
  }
};

const renderColumnSkeleton = (columnId: CatalogColumnId, showBuyButton: boolean, showCodeSubline: boolean) => {
  switch (columnId) {
    case "name":
      return (
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            {showCodeSubline ? <Skeleton className="h-3 w-12" /> : null}
          </div>
        </div>
      );
    case "brand":
      return <Skeleton className="h-5 w-16 rounded-md" />;
    case "category":
      return <Skeleton className="h-3.5 w-20" />;
    case "site":
      return <Skeleton className="h-3.5 w-12" />;
    case "stock":
      return <Skeleton className="h-3.5 w-24" />;
    case "updatedAt":
      return <Skeleton className="h-3.5 w-24" />;
    case "dealer":
      return (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <Skeleton className="h-5 w-full max-w-24 rounded-full" />
          <div className="flex items-center justify-end gap-2">
            <Skeleton className="h-4 w-16" />
            {showBuyButton ? <Skeleton className="size-7 shrink-0 rounded-md" /> : null}
          </div>
        </div>
      );
    case "retail":
      return (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <Skeleton className="h-5 w-full max-w-24 rounded-full" />
          <Skeleton className="h-4 w-16 justify-self-end" />
        </div>
      );
    case "family":
      return <Skeleton className="h-3.5 w-16" />;
    default:
      return null;
  }
};

type CatalogTableRowProps = {
  item: StoreCatalogItem;
  listingMode: CatalogListingMode;
  visibleColumnIds: CatalogColumnId[];
  showBuyButton: boolean;
  priceFromPrefix: boolean;
  showCodeSubline: boolean;
  needsRegion: boolean;
  stockFacts: VariantStockFact[];
  selectedRegion: StoreRegionOption | null;
  onRequestRegion: () => void;
  measureRef?: (node: HTMLTableRowElement | null) => void;
  style?: CSSProperties;
};

const CatalogTableRow = ({
  item,
  listingMode,
  visibleColumnIds,
  showBuyButton,
  priceFromPrefix,
  showCodeSubline,
  needsRegion,
  stockFacts,
  selectedRegion,
  onRequestRegion,
  measureRef,
  style,
}: CatalogTableRowProps) => {
  const displayName = getDisplayProductName(item.name);
  const productHref = getCatalogItemDetailHref(item, listingMode);

  return (
    <TableRow ref={measureRef} className="relative z-0 hover:bg-muted/50" style={style}>
      {visibleColumnIds.map((columnId, columnIndex) => (
        <TableCell
          key={columnId}
          className={cn(getColumnCellClassName(columnId), "relative")}
          style={dealerBuyColumnStyle(columnId, showBuyButton)}
        >
          <Link
            href={productHref}
            className="absolute inset-0 z-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            aria-label={columnIndex === 0 ? `Открыть товар ${displayName}` : undefined}
            aria-hidden={columnIndex === 0 ? undefined : true}
            tabIndex={columnIndex === 0 ? undefined : -1}
          />
          <div className="relative z-10 pointer-events-none">
            {renderColumnCell(columnId, {
              item,
              showBuyButton,
              priceFromPrefix,
              showCodeSubline,
              listingMode,
              needsRegion,
              stockFacts,
              selectedRegion,
              onRequestRegion,
            })}
          </div>
        </TableCell>
      ))}
    </TableRow>
  );
};

const CatalogSiteHeaderRow = ({
  element,
  columnCount,
  rowsVisible,
  onToggle,
  measureRef,
  style,
}: {
  element: Extract<CatalogVirtualElement, { kind: "header" }>;
  columnCount: number;
  rowsVisible: boolean;
  onToggle: () => void;
  measureRef?: (node: HTMLTableRowElement | null) => void;
  style?: CSSProperties;
}) => (
  <TableRow ref={measureRef} className="bg-muted hover:bg-muted" style={style}>
    <TableCell colSpan={columnCount} className="bg-muted px-3 py-2 text-sm font-semibold">
      <button
        type="button"
        aria-expanded={rowsVisible}
        className="inline-flex w-full cursor-pointer items-center gap-2 text-left"
        onClick={onToggle}
      >
        <ChevronRight
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            rowsVisible && "rotate-90",
          )}
        />
        <span>{element.label}</span>
        <span className="text-xs font-normal text-muted-foreground">{pluralTovar(element.totalCount)}</span>
      </button>
    </TableCell>
  </TableRow>
);

export const CatalogTable = ({
  siteGroups,
  isLoading,
  isLoadingMore = false,
  loadMoreError = false,
  hasMore = false,
  onLoadMore,
  listingMode,
  visibleColumnIds,
  stockFacts,
  collapsedSiteKeys,
  onToggleSiteCollapsed,
}: {
  siteGroups: CatalogSiteGroup[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  loadMoreError?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  listingMode: CatalogListingMode;
  visibleColumnIds: CatalogColumnId[];
  stockFacts: VariantStockFact[];
  collapsedSiteKeys: ReadonlySet<string>;
  onToggleSiteCollapsed: (siteKey: string) => void;
}) => {
  const { selectedRegion, selectedRegionCode, setSwitcherOpen } = useSelectedRegion();
  const showBuyButton = listingMode === "variants";
  const priceFromPrefix = listingMode === "products";
  const columnCount = visibleColumnIds.length;
  const showCodeSubline = true;
  const needsRegion = !selectedRegionCode;
  const tableSection = catalogTableSection(isLoading, siteGroups.length);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualElements = buildCatalogVirtualElements(siteGroups, collapsedSiteKeys);

  useEffect(() => {
    if (isLoading) {
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [isLoading]);

  const virtualizer = useVirtualizer({
    count: tableSection === "groups" ? virtualElements.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      virtualElements[index]?.kind === "header" ? ESTIMATED_HEADER_HEIGHT : ESTIMATED_ROW_HEIGHT,
    overscan: 10,
    measureElement:
      typeof window !== "undefined" && !navigator.userAgent.includes("Firefox")
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;
  const scrollOffset = virtualizer.scrollOffset ?? 0;
  const firstVisible = virtualItems.find((item) => item.end > scrollOffset) ?? virtualItems[0];
  const firstVisibleElement = firstVisible ? virtualElements[firstVisible.index] : undefined;
  const stickySiteLabel = activeCatalogSiteLabel(virtualElements, firstVisible?.index ?? -1);
  const showStickySite = stickySiteLabel != null && firstVisibleElement?.kind === "row";

  useEffect(() => {
    if (loadMoreError || !onLoadMore || !hasMore || isLoadingMore || tableSection !== "groups") {
      return;
    }
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) {
      return;
    }
    if (lastItem.index >= virtualElements.length - LOAD_MORE_THRESHOLD) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, loadMoreError, onLoadMore, tableSection, virtualElements.length, virtualItems]);

  return (
    <TooltipProvider delay={200}>
      <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0">
        {/* Сырой table без ui/Table-обёртки: sticky работает только у общего overflow-auto. */}
        <div ref={scrollRef} className={CATALOG_SCROLL_CLASS}>
          <table
            aria-busy={isLoading || isLoadingMore}
            aria-label="Каталог товаров"
            className="w-full caption-bottom table-fixed border-separate border-spacing-0 text-sm"
          >
            <colgroup>
              {visibleColumnIds.map((columnId) => {
                const columnDefinition = getCatalogColumnDefinition(columnId);
                const flexibleName = columnId === "name";
                const widthClass = flexibleName
                  ? "min-w-[220px]"
                  : columnId === "dealer" && showBuyButton
                    ? "w-[330px]"
                    : columnDefinition?.widthClass;
                return (
                  <col
                    key={columnId}
                    className={widthClass}
                    style={
                      flexibleName
                        ? { width: "auto", minWidth: 220 }
                        : dealerBuyColumnStyle(columnId, showBuyButton)
                    }
                  />
                );
              })}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {visibleColumnIds.map((columnId) => {
                  const columnDefinition = getCatalogColumnDefinition(columnId);
                  return (
                    <TableHead
                      key={columnId}
                      className={cn(getColumnHeadClassName(columnId), "sticky top-0 z-40 bg-card")}
                      style={dealerBuyColumnStyle(columnId, showBuyButton)}
                    >
                      {columnDefinition?.label}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableSection === "skeletons" ? (
                Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                  <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                    {visibleColumnIds.map((columnId) => (
                      <TableCell
                        key={columnId}
                        className={getColumnCellClassName(columnId)}
                        style={dealerBuyColumnStyle(columnId, showBuyButton)}
                      >
                        {renderColumnSkeleton(columnId, showBuyButton, showCodeSubline)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tableSection === "empty" ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Нет товаров, подходящих под выбранные фильтры.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {showStickySite ? (
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableCell
                        colSpan={columnCount}
                        className="sticky z-30 bg-muted px-3 py-2 text-sm font-semibold"
                        style={{
                          top: CATALOG_TABLE_HEAD_OFFSET,
                          backgroundColor: "var(--muted)",
                          boxShadow: "0 1px 0 var(--muted), 0 -1px 0 var(--muted)",
                        }}
                      >
                        {stickySiteLabel}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {paddingTop > 0 ? (
                    <TableRow aria-hidden className="hover:bg-transparent">
                      <TableCell colSpan={columnCount} className="border-0 p-0" style={{ height: paddingTop }} />
                    </TableRow>
                  ) : null}
                  {virtualItems.map((virtualRow) => {
                    const element = virtualElements[virtualRow.index];
                    if (!element) {
                      return null;
                    }
                    const measureRef = virtualizer.measureElement;
                    if (element.kind === "header") {
                      return (
                        <CatalogSiteHeaderRow
                          key={`header-${element.siteKey}-${virtualRow.index}`}
                          element={element}
                          columnCount={columnCount}
                          rowsVisible={!collapsedSiteKeys.has(element.siteKey)}
                          onToggle={() => onToggleSiteCollapsed(element.siteKey)}
                          measureRef={(node) => {
                            if (node) {
                              node.dataset.index = String(virtualRow.index);
                              measureRef(node);
                            }
                          }}
                        />
                      );
                    }
                    return (
                      <CatalogTableRow
                        key={`row-${element.item.id}`}
                        item={element.item}
                        listingMode={listingMode}
                        visibleColumnIds={visibleColumnIds}
                        showBuyButton={showBuyButton}
                        priceFromPrefix={priceFromPrefix}
                        showCodeSubline={showCodeSubline}
                        needsRegion={needsRegion}
                        stockFacts={stockFacts}
                        selectedRegion={selectedRegion}
                        onRequestRegion={() => setSwitcherOpen(true)}
                        measureRef={(node) => {
                          if (node) {
                            node.dataset.index = String(virtualRow.index);
                            measureRef(node);
                          }
                        }}
                      />
                    );
                  })}
                  {paddingBottom > 0 ? (
                    <TableRow aria-hidden className="hover:bg-transparent">
                      <TableCell
                        colSpan={columnCount}
                        className="border-0 p-0"
                        style={{ height: paddingBottom }}
                      />
                    </TableRow>
                  ) : null}
                  {isLoadingMore ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={columnCount}
                        className="px-3 py-3 text-center text-xs text-muted-foreground"
                      >
                        Загрузка…
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {loadMoreError ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={columnCount}
                        className="px-3 py-3 text-center text-xs text-muted-foreground"
                      >
                        Не удалось загрузить ещё. Прокрутите список снова.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </>
              )}
            </TableBody>
          </table>
        </div>
      </Card>
    </TooltipProvider>
  );
};
