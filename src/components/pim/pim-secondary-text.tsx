import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PimSecondaryTextComponent = ElementType<{
  className?: string;
  children?: ReactNode;
}>;

type PimSecondaryTextProps = {
  children: ReactNode;
  as?: PimSecondaryTextComponent;
  className?: string;
};

export const PimSecondaryText = ({
  children,
  as: Component = "span",
  className,
}: PimSecondaryTextProps) => (
  <Component className={cn("text-[12px] text-[#778297]", className)}>{children}</Component>
);
