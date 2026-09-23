// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

/**
 * Section body inside a document tab. Title is visually hidden (tabs already label the section);
 * optional tools row sits above the body.
 */
export const DocumentSection = ({
  title,
  tools,
  children,
  footer,
  className,
}: {
  title: string;
  tools?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) => (
  <Card
    size="sm"
    className={cn(
      logisticsCardClass,
      "gap-0 overflow-hidden py-0 shadow-sm data-[size=sm]:gap-0 data-[size=sm]:py-0",
      className,
    )}
  >
    <h2 className="sr-only">{title}</h2>
    {tools ? (
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="ml-auto flex flex-wrap items-center gap-2">{tools}</div>
      </div>
    ) : null}
    <div className="min-w-0">{children}</div>
    {footer ? (
      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2.5 text-sm text-muted-foreground">
        {footer}
      </div>
    ) : null}
  </Card>
);
