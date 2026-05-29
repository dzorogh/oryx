"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProductDetail } from "./product-detail-demo-data";

type ProductBasicInfoProps = {
  product: ProductDetail;
};

type FieldProps = {
  label: string;
  children: ReactNode;
};

const Field = ({ label, children }: FieldProps) => (
  <div className="min-w-0 space-y-0.5">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="truncate text-sm font-medium text-foreground">{children}</div>
  </div>
);

const DescriptionBlock = ({ label, text }: { label: string; text: string }) => (
  <div className="space-y-1">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="max-w-prose text-sm leading-relaxed text-foreground">{text}</p>
  </div>
);

export const ProductBasicInfo = ({ product }: ProductBasicInfoProps) => {
  const galleryImages = product.galleryImages.length > 0 ? product.galleryImages : [product.imageSrc];
  const [activeImage, setActiveImage] = useState(galleryImages[0]);

  return (
    <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--corportal-border-grey)] px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-foreground">{product.displayName}</h1>
          <p className="text-xs text-muted-foreground">ID: {product.id}</p>
        </div>
        <Button type="button" size="sm" variant="default" aria-label={`Edit ${product.displayName}`}>
          <Pencil aria-hidden className="size-4" />
          Edit
        </Button>
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="flex gap-3">
          <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--corportal-border-grey)] bg-white">
            <Image
              src={activeImage}
              alt={product.imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 360px"
              className="object-cover"
              priority
            />
          </div>
          <div className="relative w-16 shrink-0">
            <div className="absolute inset-0 flex flex-col gap-2 overflow-y-auto pr-0.5">
              {galleryImages.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(src)}
                  aria-label={`Show image ${index + 1}`}
                  aria-pressed={activeImage === src}
                  className={cn(
                    "relative aspect-square w-full shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    activeImage === src
                      ? "border-primary"
                      : "border-[var(--corportal-border-grey)] hover:border-primary/50",
                  )}
                >
                  <Image src={src} alt="" fill sizes="64px" className="object-cover" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Field label="Product name">{product.displayName}</Field>
            <Field label="SKU">{product.sku ?? "—"}</Field>
            <Field label="Brand">
              <Link href="/store/pim/products" className="text-primary hover:underline">
                {product.brand}
              </Link>
            </Field>
            <Field label="Family">{product.family}</Field>
            <Field label="Category">
              <Link
                href={`/store/pim/products?category=${product.categoryId}`}
                className="text-primary hover:underline"
              >
                {product.category}
              </Link>
            </Field>
            <Field label="Stock">{product.stock} pcs</Field>
          </div>

          <div className="space-y-4 border-t border-[var(--corportal-border-grey)] pt-4">
            <DescriptionBlock label="Description" text={product.description} />
            <DescriptionBlock label="Short description" text={product.shortDescription} />
          </div>
        </div>
      </div>
    </Card>
  );
};
