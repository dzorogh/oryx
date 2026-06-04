"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ColumnHeaderLabelProps = {
  label: string;
  description?: string;
};

/**
 * Pricelist column header. The visible label truncates inside the fixed-width
 * column, while the tooltip always repeats the full column name (plus an
 * optional description) so it stays readable when the header is clipped. Wrap
 * the table in a `TooltipProvider` with `delay={0}` so it appears immediately on
 * hover.
 */
export const ColumnHeaderLabel = ({ label, description }: ColumnHeaderLabelProps) => (
  <Tooltip>
    <TooltipTrigger render={<span className="block w-full cursor-default truncate" />}>{label}</TooltipTrigger>
    <TooltipContent side="bottom" align="start" className="flex max-w-xs flex-col items-start gap-0.5 text-left">
      <span className="font-semibold">{label}</span>
      {description ? <span className="text-background/80">{description}</span> : null}
    </TooltipContent>
  </Tooltip>
);
