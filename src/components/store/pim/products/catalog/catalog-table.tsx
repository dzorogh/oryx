import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getProductDetailHref } from "../detail/product-detail-demo-data";
import type { DealerStatus, RetailStatus, StoreCatalogItem } from "../store-catalog-demo-data";
import { CatalogBuyTooltip } from "./catalog-buy-tooltip";
import {
  SKELETON_ROW_COUNT,
  formatCatalogPrice,
  formatPrice,
  getDisplayProductName,
  getPurchaseBlockReason,
  statusBadgeClassMap,
  type CatalogListingMode,
} from "./catalog-helpers";

const COLUMN_BORDER = "border-l border-[var(--corportal-border-grey)]";

const TableSkeletonRow = ({ showBuyButton }: { showBuyButton: boolean }) => (
  <TableRow className="hover:bg-transparent">
    <TableCell className="px-3 py-2">
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </TableCell>
    <TableCell className="px-3 py-2">
      <Skeleton className="h-5 w-16 rounded-md" />
    </TableCell>
    <TableCell className="px-3 py-2">
      <Skeleton className="h-3.5 w-20" />
    </TableCell>
    <TableCell className="px-3 py-2">
      <Skeleton className="h-3.5 w-12" />
    </TableCell>
    <TableCell className={cn("px-3 py-2", COLUMN_BORDER)}>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          {showBuyButton ? <Skeleton className="size-7 shrink-0 rounded-md" /> : null}
        </div>
      </div>
    </TableCell>
    <TableCell className={cn("px-3 py-2", COLUMN_BORDER)}>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </TableCell>
  </TableRow>
);

const ProductNameCell = ({ item }: { item: StoreCatalogItem }) => {
  const displayName = getDisplayProductName(item.name);
  const productHref = getProductDetailHref(item.id);

  return (
    <Link
      href={productHref}
      className="flex min-w-0 items-center gap-2.5 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={`Open product ${displayName}`}
    >
      <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-[var(--corportal-border-grey)] bg-white">
        <Image src={item.imageSrc} alt={item.imageAlt} fill sizes="36px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
      </div>
    </Link>
  );
};

const StatusBadge = ({ status }: { status: DealerStatus | RetailStatus }) => (
  <Badge className={cn("shrink-0 rounded-full px-2 py-0 text-[10px] font-medium", statusBadgeClassMap[status])}>
    {status}
  </Badge>
);

const PriceLabel = ({ price, from = false }: { price: number | null; from?: boolean }) => (
  <span
    className={cn(
      "whitespace-nowrap text-sm font-semibold",
      price === null ? "text-muted-foreground" : "text-foreground",
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
  <div className="flex items-center justify-between gap-2">
    <StatusBadge status={status} />
    <PriceLabel price={price} from={from} />
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
    <div className="flex items-center justify-between gap-2">
      <StatusBadge status={item.dealerStatus} />
      <div className="flex items-center gap-2">
        <PriceLabel price={item.dealerPrice} from={priceFromPrefix} />
        {showBuyButton ? (
          <CatalogBuyTooltip reason={blockReason} className="inline-flex shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className={cn("shrink-0", !canBuy && "pointer-events-none")}
              disabled={!canBuy}
              aria-label={buyLabel}
              onClick={(event) => event.stopPropagation()}
            >
              <ShoppingCart aria-hidden className="size-4" />
            </Button>
          </CatalogBuyTooltip>
        ) : null}
      </div>
    </div>
  );
};

export const CatalogTable = ({
  items,
  isLoading,
  listingMode,
  footer,
}: {
  items: StoreCatalogItem[];
  isLoading: boolean;
  listingMode: CatalogListingMode;
  footer?: ReactNode;
}) => {
  const showBuyButton = listingMode === "variants";
  const priceFromPrefix = listingMode === "products";

  return (
    <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0">
      <div className="overflow-x-auto">
    <Table className="table-fixed">
      <colgroup>
        <col className="w-[240px]" />
        <col className="w-[110px]" />
        <col className="w-[130px]" />
        <col className="w-[110px]" />
        <col className="w-[290px]" />
        <col className="w-[230px]" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-9 px-3 text-xs">Name</TableHead>
          <TableHead className="h-9 px-3 text-xs">Brand</TableHead>
          <TableHead className="h-9 px-3 text-xs">Category</TableHead>
          <TableHead className="h-9 px-3 text-xs">Site</TableHead>
          <TableHead className={cn("h-9 px-3 text-xs", COLUMN_BORDER)}>Dealer</TableHead>
          <TableHead className={cn("h-9 px-3 text-xs", COLUMN_BORDER)}>Retail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <TableSkeletonRow key={`skeleton-${index}`} showBuyButton={showBuyButton} />
          ))
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
              No products match the selected filters.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="px-3 py-2">
                <ProductNameCell item={item} />
              </TableCell>
              <TableCell className="px-3 py-2">
                <Badge variant="outline">Sharmax</Badge>
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">{item.category}</TableCell>
              <TableCell className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                {item.productionSite}
              </TableCell>
              <TableCell className={cn("px-3 py-2", COLUMN_BORDER)}>
                <DealerCell item={item} showBuyButton={showBuyButton} priceFromPrefix={priceFromPrefix} />
              </TableCell>
              <TableCell className={cn("px-3 py-2", COLUMN_BORDER)}>
                <PriceStatusCell price={item.retailPrice} status={item.retailStatus} from={priceFromPrefix} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
      </div>
      {footer}
    </Card>
  );
};
