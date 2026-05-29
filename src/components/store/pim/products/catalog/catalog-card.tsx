import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getProductDetailHref } from "../detail/product-detail-demo-data";
import type { StoreCatalogItem } from "../store-catalog-demo-data";
import { CatalogBuyTooltip } from "./catalog-buy-tooltip";
import {
  SKELETON_CARD_COUNT,
  formatCatalogPrice,
  formatPrice,
  getDisplayProductName,
  getPurchaseBlockReason,
  statusBadgeClassMap,
  type CatalogListingMode,
} from "./catalog-helpers";

const CARD_GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

const CatalogProductCardSkeleton = ({ showBuyButton }: { showBuyButton: boolean }) => (
  <article className="flex flex-col overflow-hidden rounded-xl border border-[var(--corportal-border-grey)] bg-card">
    <Skeleton className="aspect-[4/3] w-full rounded-none" />
    <div className="flex flex-1 flex-col gap-2 p-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-4 w-4/5" />
      </div>
      {showBuyButton ? (
        <Skeleton className="mt-auto h-8 w-full rounded-md" />
      ) : (
        <Skeleton className="mt-auto h-5 w-24" />
      )}
    </div>
  </article>
);

const CatalogProductCard = ({
  item,
  showBuyButton,
  priceFromPrefix,
}: {
  item: StoreCatalogItem;
  showBuyButton: boolean;
  priceFromPrefix: boolean;
}) => {
  const displayName = getDisplayProductName(item.name);
  const hasDealerPrice = item.dealerPrice !== null;
  const blockReason = getPurchaseBlockReason(item);
  const canBuy = blockReason === null;
  const buyLabel = canBuy
    ? `Add "${displayName}" to cart for ${formatPrice(item.dealerPrice as number)}`
    : `"${displayName}" is unavailable for purchase: ${blockReason}`;
  const productHref = getProductDetailHref(item.id);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-[var(--corportal-border-grey)] bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={productHref}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={`Open product ${displayName}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <Image
            src={item.imageSrc}
            alt={item.imageAlt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 20vw, 16vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span
            className={cn(
              "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur-sm",
              statusBadgeClassMap[item.dealerStatus],
            )}
          >
            {item.dealerStatus}
          </span>
        </div>

        <div className="space-y-1 p-3 pb-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Sharmax
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{item.sku}</span>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{displayName}</h3>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3 pt-2">
        {showBuyButton ? (
          <CatalogBuyTooltip reason={blockReason} className="mt-auto w-full">
            <Button
              type="button"
              size="sm"
              className={cn("w-full font-semibold", !canBuy && "pointer-events-none")}
              disabled={!canBuy}
              aria-label={buyLabel}
              onClick={(event) => event.stopPropagation()}
            >
              <ShoppingCart aria-hidden className="size-4" />
              {hasDealerPrice ? formatPrice(item.dealerPrice as number) : "Price on request"}
            </Button>
          </CatalogBuyTooltip>
        ) : (
          <Link href={productHref} className="mt-auto block">
            <p
              className={cn(
                "text-sm font-semibold",
                item.dealerPrice === null ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {formatCatalogPrice(item.dealerPrice, { from: priceFromPrefix })}
            </p>
          </Link>
        )}
      </div>
    </article>
  );
};

export const CatalogCardGrid = ({
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
      <div className="px-3 pb-3">
        {isLoading ? (
          <div className={CARD_GRID_CLASS}>
            {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
              <CatalogProductCardSkeleton key={`skeleton-${index}`} showBuyButton={showBuyButton} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--corportal-border-grey)] px-3 py-10 text-center text-sm text-muted-foreground">
            No products match the selected filters.
          </div>
        ) : (
          <div className={CARD_GRID_CLASS}>
            {items.map((item) => (
              <CatalogProductCard
                key={item.id}
                item={item}
                showBuyButton={showBuyButton}
                priceFromPrefix={priceFromPrefix}
              />
            ))}
          </div>
        )}
      </div>
      {footer}
    </Card>
  );
};
