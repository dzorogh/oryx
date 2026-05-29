"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCatalogPrice } from "../catalog/catalog-helpers";
import type { ProductVariant } from "./product-detail-demo-data";
import { VariantCard } from "./variant-card";

type ProductVariantsProps = {
  variants: ProductVariant[];
};

type VariantMenuProps = {
  variants: ProductVariant[];
  activeVariantId: string;
  onSelect: (variantId: string) => void;
};

const VariantMenu = ({ variants, activeVariantId, onSelect }: VariantMenuProps) => (
  <div
    role="tablist"
    aria-label="Select variant"
    className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
  >
    {variants.map((variant) => {
      const isActive = variant.id === activeVariantId;

      return (
        <button
          key={variant.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onSelect(variant.id)}
          className={cn(
            "group flex min-w-[200px] items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors lg:min-w-0",
            isActive
              ? "border-primary bg-primary/5"
              : "border-[var(--corportal-border-grey)] hover:border-primary/40 hover:bg-muted/40",
          )}
        >
          <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-[var(--corportal-border-grey)] bg-white">
            <Image src={variant.imageSrc} alt="" fill sizes="44px" className="object-cover" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  isActive ? "text-primary" : "text-foreground",
                )}
              >
                {variant.name}
              </p>
              {variant.isDefault ? (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Default
                </span>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {(variant.sku ?? "—") + " · " + formatCatalogPrice(variant.dealerPrice)}
            </p>
          </div>
        </button>
      );
    })}
  </div>
);

export const ProductVariants = ({ variants }: ProductVariantsProps) => {
  const defaultVariantId = variants.find((variant) => variant.isDefault)?.id ?? variants[0]?.id ?? "";
  const [activeVariantId, setActiveVariantId] = useState(defaultVariantId);

  const activeVariant = variants.find((variant) => variant.id === activeVariantId) ?? variants[0];

  if (!activeVariant) {
    return null;
  }

  const hasMultipleVariants = variants.length > 1;

  return (
    <section className="space-y-3" aria-label="Product variants">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Variants</h2>
        <span className="text-xs text-muted-foreground">
          {variants.length} {variants.length === 1 ? "variant" : "variants"}
        </span>
      </div>

      <div className={cn("grid gap-4", hasMultipleVariants && "lg:grid-cols-[260px_minmax(0,1fr)]")}>
        {hasMultipleVariants ? (
          <VariantMenu variants={variants} activeVariantId={activeVariantId} onSelect={setActiveVariantId} />
        ) : null}
        <VariantCard variant={activeVariant} />
      </div>
    </section>
  );
};
