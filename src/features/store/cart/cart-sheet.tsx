"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CartQuantityControl } from "@/features/store/cart/cart-quantity-control";
import { useCart } from "@/features/store/cart/cart-context";
import { useSelectedRegion } from "@/features/store/region-context";
import { formatEntityCode } from "@/lib/entity-codes";
import { formatCatalogPrice } from "@/components/store/pim/products/catalog/catalog-helpers";
import { getPurchaseBlockReason } from "@/components/store/pim/products/catalog/catalog-helpers";

export const CartSheet = () => {
  const { lines, catalogById, catalogError, sheetOpen, setSheetOpen, setQuantity, removeVariants } = useCart();
  const { selectedRegion } = useSelectedRegion();
  const regionCode = selectedRegion?.code ?? null;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b pb-3">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart aria-hidden className="size-5" />
            Корзина
          </SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3">
          {lines.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">Корзина пуста.</p>
          ) : (
            lines.map((line) => {
              const item = catalogById.get(line.variantId);
              const region = regionCode ? item?.byRegion.get(regionCode) : null;
              const blockReason = !item
                ? catalogError
                  ? "Не удалось загрузить товар"
                  : null
                : !regionCode
                  ? "Выберите регион"
                  : region
                    ? getPurchaseBlockReason({
                        dealerStatus: region.dealerStatus,
                        dealerPrice: region.dealerPrice,
                      })
                    : "Для товара не задана дилерская цена.";
              const priceLabel =
                region?.dealerPrice != null && region.dealerCurrency
                  ? formatCatalogPrice(region.dealerPrice, { currency: region.dealerCurrency })
                  : "—";

              return (
                <div
                  key={line.variantId}
                  className="flex gap-3 rounded-lg border bg-background p-2"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-[var(--corportal-border-grey)] bg-white">
                    {item?.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="56px"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item?.name ?? formatEntityCode("product", line.variantId)}
                        </p>
                        <p className="text-xs text-muted-foreground">{priceLabel}</p>
                        {blockReason ? (
                          <p className="text-xs text-amber-700">{blockReason}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Удалить"
                        onClick={() => removeVariants([line.variantId])}
                      >
                        <Trash2 aria-hidden className="size-3.5" />
                      </Button>
                    </div>
                    <CartQuantityControl
                      itemName={item?.name}
                      quantity={line.quantity}
                      quantityPerUnit={item?.quantityPerUnit ?? 1}
                      onChange={(next) =>
                        setQuantity(line.variantId, next, item?.quantityPerUnit ?? 1)
                      }
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t pt-3">
          {lines.length === 0 ? (
            <Button type="button" className="w-full" disabled>
              Оформить
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full"
              nativeButton={false}
              render={<Link href="/store/checkout" onClick={() => setSheetOpen(false)} />}
            >
              Оформить
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
