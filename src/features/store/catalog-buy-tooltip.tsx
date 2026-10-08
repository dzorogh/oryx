import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type CatalogBuyTooltipProps = {
  reason: string | null;
  className?: string;
  children: ReactNode;
};

// Оборачивает кнопку «в корзину»: при наличии причины блокировки показывает подсказку.
export const CatalogBuyTooltip = ({ reason, className, children }: CatalogBuyTooltipProps) => {
  if (!reason) {
    return <span className={className}>{children}</span>;
  }

  return (
    <TooltipProvider delay={0} closeDelay={0}>
      <Tooltip>
        <TooltipTrigger render={<span tabIndex={0} className={cn("cursor-not-allowed", className)} />}>
          {children}
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
