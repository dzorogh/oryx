"use client";

import { ShoppingCart } from "lucide-react";
import { useOptionalCart } from "@/features/store/cart/cart-context";
import { cn } from "@/lib/utils";

const railButtonBaseClass =
  "relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[color:var(--corportal-rail-foreground)] transition-colors hover:bg-[color:var(--corportal-rail-hover)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[color:var(--corportal-rail-focus-ring)]";

export const CartRailButton = () => {
  const cart = useOptionalCart();
  if (!cart) return null;

  const count = cart.lineCount;

  return (
    <button
      type="button"
      className={railButtonBaseClass}
      aria-label={count > 0 ? `Корзина, ${count}` : "Корзина"}
      onClick={() => cart.setSheetOpen(true)}
    >
      <ShoppingCart aria-hidden className="size-5" strokeWidth={2} />
      {count > 0 ? (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold leading-none text-white",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
};
