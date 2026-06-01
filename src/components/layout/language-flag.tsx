import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

type LanguageFlagProps = {
  src: StaticImageData;
  alt: string;
  className?: string;
};

/** Square language flag icon for the menu switcher. */
export const LanguageFlag = ({ src, alt, className }: LanguageFlagProps) => (
  <span
    className={cn(
      "relative block size-5 shrink-0 overflow-hidden rounded-md border border-border/60",
      className,
    )}
  >
    <Image src={src} alt={alt} fill sizes="20px" className="object-cover" />
  </span>
);
