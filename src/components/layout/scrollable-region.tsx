import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ScrollableRegionProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "aria-label">;

export const ScrollableRegion = ({
  children,
  className,
  ariaLabel,
  ...rest
}: ScrollableRegionProps) => (
  <div className={cn("overflow-y-auto", className)} aria-label={ariaLabel} {...rest}>
    {children}
  </div>
);
