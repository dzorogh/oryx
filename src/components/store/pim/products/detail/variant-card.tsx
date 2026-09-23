// english-ui:ignore-file
"use client";

import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CatalogBuyTooltip } from "../catalog/catalog-buy-tooltip";
import {
  formatCatalogPrice,
  formatCatalogStatus,
  formatPrice,
  getPurchaseBlockReason,
  statusBadgeClassMap,
} from "../catalog/catalog-helpers";
import type { DealerStatus, RetailStatus } from "../store-catalog-demo-data";
import type { ProductVariant } from "./product-detail-demo-data";
import { VariantAttributes } from "./variant-attributes";

type VariantCardProps = {
  variant: ProductVariant;
};

const StatusPill = ({ label, status }: { label: string; status: DealerStatus | RetailStatus }) => (
  <div className="flex items-center gap-2">
    <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold",
        statusBadgeClassMap[status],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-80" />
      {formatCatalogStatus(status)}
    </span>
  </div>
);

const MetaItem = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-0.5">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground">{value}</p>
  </div>
);

export const VariantCard = ({ variant }: VariantCardProps) => {
  const blockReason = getPurchaseBlockReason(variant);
  const canBuy = blockReason === null;
  const buyLabel = canBuy
    ? `Добавить «${variant.name}» в корзину за ${formatPrice(variant.dealerPrice as number)}`
    : `«${variant.name}» недоступен для заказа: ${blockReason}`;

  return (
    <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0 !py-0">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4 p-4">
          <div className="flex gap-4">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-xl border border-[var(--corportal-border-grey)] bg-white">
              {variant.isDefault ? (
                <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  Основной
                </span>
              ) : null}
              <Image src={variant.imageSrc} alt={variant.imageAlt} fill sizes="128px" className="object-cover" />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-foreground">{variant.name}</h3>
                <p className="text-xs text-muted-foreground">ID: {variant.id}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <StatusPill label="Дилер" status={variant.dealerStatus} />
                <StatusPill label="Розница" status={variant.retailStatus} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--corportal-border-grey)] pt-3">
            <MetaItem label="Код" value={variant.code ?? "—"} />
            <MetaItem label="Площадка" value={variant.productionSite} />
            <MetaItem label="Количество в упаковке" value={`${variant.unitQuantity} шт`} />
          </div>

          <div className="border-t border-[var(--corportal-border-grey)] pt-3">
            <VariantAttributes attributeGroups={variant.attributeGroups} logistics={variant.logistics} />
          </div>
        </div>

        <aside className="flex flex-col gap-4 border-t border-[var(--corportal-border-grey)] bg-muted/20 p-4 lg:border-t-0 lg:border-l">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Дилерская цена</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCatalogPrice(variant.dealerPrice)}
            </p>
          </div>

          <CatalogBuyTooltip reason={blockReason} className="w-full">
            <Button
              type="button"
              className={cn("w-full font-semibold", !canBuy && "pointer-events-none")}
              disabled={!canBuy}
              aria-label={buyLabel}
              onClick={(event) => event.stopPropagation()}
            >
              <ShoppingCart aria-hidden className="size-4" />
              В корзину
            </Button>
          </CatalogBuyTooltip>

          <div className="border-t border-[var(--corportal-border-grey)] pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Розничная цена</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatCatalogPrice(variant.retailPrice)}
            </p>
          </div>

          <div className="border-t border-[var(--corportal-border-grey)] pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">На складе</p>
            <p className="text-sm font-medium text-foreground">{variant.stock} шт</p>
          </div>
        </aside>
      </div>
    </Card>
  );
};
