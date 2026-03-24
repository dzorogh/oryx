import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type HomeDateMetaTextComponent = ElementType<{
  className?: string;
  children?: ReactNode;
}>;

type HomeDateMetaTextProps = {
  children: ReactNode;
  as?: HomeDateMetaTextComponent;
  className?: string;
};

export const HomeDateMetaText = ({
  children,
  as: Component = "span",
  className,
}: HomeDateMetaTextProps) => (
  <Component className={cn("shrink-0 text-right text-xs text-muted-foreground", className)}>
    {children}
  </Component>
);
