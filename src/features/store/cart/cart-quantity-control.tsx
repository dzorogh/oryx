"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeCartQuantity } from "@/features/store/cart/cart-store";

type CartQuantityControlProps = {
  /** Added to accessible labels so rows of a list stay distinguishable. */
  itemName?: string;
  quantity: number;
  quantityPerUnit: number;
  disabled?: boolean;
  onChange: (nextQuantity: number) => void;
  className?: string;
  size?: "sm" | "default";
};

export const CartQuantityControl = ({
  itemName,
  quantity,
  quantityPerUnit,
  disabled,
  onChange,
  className,
  size = "sm",
}: CartQuantityControlProps) => {
  const step = Math.max(1, quantityPerUnit || 1);
  const suffix = itemName ? ` «${itemName}»` : "";
  const [draft, setDraft] = useState(String(quantity));

  useEffect(() => {
    setDraft(String(quantity));
  }, [quantity]);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace(",", "."));
    const next = normalizeCartQuantity(Number.isFinite(parsed) ? parsed : 0, step);
    onChange(next);
    setDraft(String(next > 0 ? next : 0));
  };

  const btnSize = size === "sm" ? "icon-sm" : "icon";

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      <Button
        type="button"
        variant="outline"
        size={btnSize}
        disabled={disabled}
        aria-label={`Уменьшить количество${suffix}`}
        onClick={() => onChange(normalizeCartQuantity(quantity - step, step))}
      >
        <Minus aria-hidden className="size-3.5" />
      </Button>
      <Input
        value={draft}
        disabled={disabled}
        inputMode="numeric"
        aria-label={`Количество${suffix}`}
        className={cn("h-8 w-12 px-1 text-center tabular-nums", size === "sm" && "h-7 w-10 text-sm")}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size={btnSize}
        disabled={disabled}
        aria-label={`Увеличить количество${suffix}`}
        onClick={() => onChange(normalizeCartQuantity(quantity + step, step))}
      >
        <Plus aria-hidden className="size-3.5" />
      </Button>
    </div>
  );
};
