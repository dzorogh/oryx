import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

type TenantLogoProps = {
  src: StaticImageData;
  alt: string;
  className?: string;
};

/** Square tenant icon (logo only, no wordmark). */
export const TenantLogo = ({ src, alt, className }: TenantLogoProps) => (
  <span
    className={cn(
      "relative block size-5 shrink-0 overflow-hidden rounded-md border border-border/60 bg-card",
      className,
    )}
  >
    <Image src={src} alt={alt} fill sizes="20px" className="object-cover" />
  </span>
);
