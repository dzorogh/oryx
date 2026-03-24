import Image from "next/image";
import { cn } from "@/lib/utils";

type HomeAvatarRingProps = {
  src: string;
  alt: string;
  size?: string;
  className?: string;
  imageClassName?: string;
};

export const HomeAvatarRing = ({
  src,
  alt,
  size = "28px",
  className,
  imageClassName,
}: HomeAvatarRingProps) => (
  <div className={cn("relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-border", className)}>
    <Image src={src} alt={alt} fill className={cn("object-cover", imageClassName)} sizes={size} />
  </div>
);
