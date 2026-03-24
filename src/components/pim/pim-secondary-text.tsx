import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PimSecondaryTextProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
};

export const PimSecondaryText = ({
  children,
  as: Component = "span",
  className,
}: PimSecondaryTextProps) => (
  <Component className={cn("text-[12px] text-[#778297]", className)}>{children}</Component>
);
