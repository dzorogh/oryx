"use client";

import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

export type ProductPhotoSrc = StaticImageData | string | null | undefined;

export const hasProductPhoto = (src: ProductPhotoSrc): src is StaticImageData | string => {
  if (typeof src === "string") {
    return src.trim().length > 0;
  }
  return Boolean(src);
};

export const ProductPhoto = ({
  src,
  alt,
  sizes,
  className,
  imageClassName,
}: {
  src: ProductPhotoSrc;
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
}) => (
  <span
    className={cn(
      "relative block shrink-0 overflow-hidden rounded-xl border border-[var(--corportal-border-grey)] bg-muted",
      className,
    )}
  >
    {hasProductPhoto(src) ? (
      <Image src={src} alt={alt} fill sizes={sizes} className={cn("object-cover", imageClassName)} />
    ) : (
      <span className="absolute inset-0 bg-muted" aria-hidden />
    )}
  </span>
);
