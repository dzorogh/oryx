import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getCatalogItemDetailHref } from "./catalog-helpers";
import type { DealerStatus, RetailStatus, StoreCatalogItem } from "../store-catalog-demo-data";
import { CatalogBuyTooltip } from "./catalog-buy-tooltip";
import { type CatalogColumnId, getCatalogColumnDefinition } from "./catalog-columns";
import {
  SKELETON_ROW_COUNT,
  formatCatalogPrice,
  formatCatalogUpdatedAt,
  formatPrice,
  getDisplayProductName,
  getPurchaseBlockReason,
  statusBadgeClassMap,
  type CatalogListingMode,
} from "./catalog-helpers";

const COLUMN_BORDER = "border-l border-[var(--corportal-border-grey)]";

const borderedColumnIds = new Set<CatalogColumnId>(["dealer", "retail"]);

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
          aria-label={`Open product ${displayName}`}
          className="pointer-events-auto relative z-20 block size-9 shrink-0 overflow-hidden rounded-lg border border-[var(--corportal-border-grey)] bg-white outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      }
    >
      <Image src={item.imageSrc} alt={item.imageAlt} fill sizes="36px" className="object-cover" />
    </TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side="left" sideOffset={12} className="isolate z-50">
        <TooltipPrimitive.Popup className="origin-(--transform-origin) overflow-hidden rounded-xl border border-[var(--corportal-border-grey)] bg-white p-1.5 shadow-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <div className="relative size-60 overflow-hidden rounded-lg bg-slate-50">
            <Image src={item.imageSrc} alt={item.imageAlt} fill sizes="240px" className="object-contain" />
          </div>
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
  showSkuSubline,
  listingMode,
}: {
  item: StoreCatalogItem;
  showSkuSubline: boolean;
  listingMode: CatalogListingMode;
}) => {
  const displayName = getDisplayProductName(item.name);
  const productHref = getCatalogItemDetailHref(item.id, listingMode);

  return (
    <div className="flex w-full max-w-full min-w-0 items-center gap-2.5" title={displayName}>
      <ProductThumbnailPreview item={item} productHref={productHref} displayName={displayName} />
      <div className="min-w-0 flex-1 basis-0 overflow-hidden">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        {showSkuSubline ? (
          <p className="truncate text-xs text-muted-foreground" title={item.sku}>
            {item.sku}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const StatusBadge = ({ status, className }: { status: DealerStatus | RetailStatus; className?: string }) => (
  <Badge
    className={cn(
      statusBadgeClassMap[status],
      className,
    )}
  >
    {status}
  </Badge>
);

const PriceLabel = ({
  price,
  from = false,
  className,
}: {
  price: number | null;
  from?: boolean;
  className?: string;
}) => (
  <span
    className={cn(
      "shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums",
      price === null ? "text-muted-foreground" : "text-foreground",
      className,
    )}
  >
    {formatCatalogPrice(price, { from })}
  </span>
);

const PriceStatusCell = ({
  price,
  status,
  from = false,
}: {
  price: number | null;
  status: DealerStatus | RetailStatus;
  from?: boolean;
}) => (
  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
    <div className="min-w-0 overflow-hidden">
      <StatusBadge status={status} />
    </div>
    <PriceLabel price={price} from={from} className="text-right" />
  </div>
);

type DealerCellProps = {
  item: StoreCatalogItem;
  showBuyButton: boolean;
  priceFromPrefix: boolean;
};

const DealerCell = ({ item, showBuyButton, priceFromPrefix }: DealerCellProps) => {
  const displayName = getDisplayProductName(item.name);
  const blockReason = getPurchaseBlockReason(item);
  const canBuy = blockReason === null;
  const buyLabel = canBuy
    ? `Add "${displayName}" to cart for ${formatPrice(item.dealerPrice as number)}`
    : `"${displayName}" is unavailable for purchase: ${blockReason}`;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <div className="min-w-0 overflow-hidden">
        <StatusBadge status={item.dealerStatus} />
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <PriceLabel price={item.dealerPrice} from={priceFromPrefix} className="text-right" />
        {showBuyButton ? (
          <span className="relative z-20 inline-flex shrink-0 pointer-events-auto">
            <CatalogBuyTooltip reason={blockReason} className="inline-flex shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className={cn("shrink-0", !canBuy && "pointer-events-none")}
                disabled={!canBuy}
                aria-label={buyLabel}
              >
                <ShoppingCart aria-hidden className="size-4" />
              </Button>
            </CatalogBuyTooltip>
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
  showSkuSubline: boolean;
  listingMode: CatalogListingMode;
};

const renderColumnCell = (columnId: CatalogColumnId, context: ColumnRenderContext) => {
  const { item, showBuyButton, priceFromPrefix, listingMode } = context;

  switch (columnId) {
    case "name":
      return (
        <ProductNameCell item={item} showSkuSubline={context.showSkuSubline} listingMode={listingMode} />
      );
    case "sku":
      return <span className="text-sm font-medium">{item.sku}</span>;
    case "brand":
      return <Badge variant="outline">{item.brand}</Badge>;
    case "category":
      return (
        <span className="block truncate text-sm" title={item.category}>
          {item.category}
        </span>
      );
    case "site":
      return <span className="text-xs font-semibold text-muted-foreground">{item.productionSite}</span>;
    case "stock":
      return <span className="text-sm">{item.stock} pcs</span>;
    case "updatedAt":
      return <span className="text-sm text-muted-foreground">{formatCatalogUpdatedAt(item.updatedAt)}</span>;
    case "dealer":
      return <DealerCell item={item} showBuyButton={showBuyButton} priceFromPrefix={priceFromPrefix} />;
    case "retail":
      return <PriceStatusCell price={item.retailPrice} status={item.retailStatus} from={priceFromPrefix} />;
    case "family":
      return <span className="text-sm">{item.family}</span>;
    default:
      return null;
  }
};

const renderColumnSkeleton = (columnId: CatalogColumnId, showBuyButton: boolean, showSkuSubline: boolean) => {
  switch (columnId) {
    case "name":
      return (
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            {showSkuSubline ? <Skeleton className="h-3 w-12" /> : null}
          </div>
        </div>
      );
    case "sku":
      return <Skeleton className="h-3.5 w-14" />;
    case "brand":
      return <Skeleton className="h-5 w-16 rounded-md" />;
    case "category":
      return <Skeleton className="h-3.5 w-20" />;
    case "site":
      return <Skeleton className="h-3.5 w-12" />;
    case "stock":
      return <Skeleton className="h-3.5 w-12" />;
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
  showSkuSubline: boolean;
};

const CatalogTableRow = ({
  item,
  listingMode,
  visibleColumnIds,
  showBuyButton,
  priceFromPrefix,
  showSkuSubline,
}: CatalogTableRowProps) => {
  const displayName = getDisplayProductName(item.name);
  const productHref = getCatalogItemDetailHref(item.id, listingMode);

  return (
    <TableRow className="relative hover:bg-muted/50">
      {visibleColumnIds.map((columnId, columnIndex) => (
        <TableCell key={columnId} className={cn(getColumnCellClassName(columnId), "relative")}>
          <Link
            href={productHref}
            className="absolute inset-0 z-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            aria-label={columnIndex === 0 ? `Open product ${displayName}` : undefined}
            aria-hidden={columnIndex === 0 ? undefined : true}
            tabIndex={columnIndex === 0 ? undefined : -1}
          />
          <div className="relative z-10 pointer-events-none">
            {renderColumnCell(columnId, {
              item,
              showBuyButton,
              priceFromPrefix,
              showSkuSubline,
              listingMode,
            })}
          </div>
        </TableCell>
      ))}
    </TableRow>
  );
};

export const CatalogTable = ({
  items,
  isLoading,
  listingMode,
  visibleColumnIds,
  footer,
}: {
  items: StoreCatalogItem[];
  isLoading: boolean;
  listingMode: CatalogListingMode;
  visibleColumnIds: CatalogColumnId[];
  footer?: ReactNode;
}) => {
  const showBuyButton = listingMode === "variants";
  const priceFromPrefix = listingMode === "products";
  const columnCount = visibleColumnIds.length;
  const showSkuSubline = !visibleColumnIds.includes("sku");

  return (
    <TooltipProvider delay={200}>
      <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0">
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <colgroup>
              {visibleColumnIds.map((columnId) => {
                const columnDefinition = getCatalogColumnDefinition(columnId);
                return <col key={columnId} className={columnDefinition?.widthClass} />;
              })}
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {visibleColumnIds.map((columnId) => {
                  const columnDefinition = getCatalogColumnDefinition(columnId);
                  return (
                    <TableHead key={columnId} className={getColumnHeadClassName(columnId)}>
                      {columnDefinition?.label}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                  <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                    {visibleColumnIds.map((columnId) => (
                      <TableCell key={columnId} className={getColumnCellClassName(columnId)}>
                        {renderColumnSkeleton(columnId, showBuyButton, showSkuSubline)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No products match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <CatalogTableRow
                    key={item.id}
                    item={item}
                    listingMode={listingMode}
                    visibleColumnIds={visibleColumnIds}
                    showBuyButton={showBuyButton}
                    priceFromPrefix={priceFromPrefix}
                    showSkuSubline={showSkuSubline}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {footer}
      </Card>
    </TooltipProvider>
  );
};
