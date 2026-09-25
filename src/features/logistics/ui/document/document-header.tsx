// english-ui:ignore-file
"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { DocumentMetaField } from "@/features/logistics/ui/document/document-meta-field";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

export type DocumentMetaItem = {
  label: string;
  value: ReactNode;
  wide?: boolean;
  className?: string;
};

export const DocumentHeader = ({
  kind,
  icon: Icon,
  number,
  status,
  description,
  actions,
  meta,
  className,
}: {
  kind: string;
  icon?: LucideIcon;
  number: string;
  status?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta: DocumentMetaItem[];
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
    <header className="px-5 pt-4.5">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
            <span>{kind}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl leading-[1.15] font-semibold tracking-[-0.02em]">{number}</h1>
            {status}
          </div>
          {description ? (
            <div className="mt-1 text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
    <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] border-t border-border/50">
      {meta.map((item) => (
        <DocumentMetaField
          key={item.label}
          label={item.label}
          wide={item.wide}
          className={item.className}
        >
          {item.value}
        </DocumentMetaField>
      ))}
    </dl>
  </Card>
);
