import Image from "next/image";
import { publicAssetPath } from "@/lib/public-asset-path";
import { cn } from "@/lib/utils";

type LanguageFlagProps = {
  src: string;
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
    <Image src={publicAssetPath(src)} alt={alt} fill sizes="20px" className="object-cover" />
  </span>
);
