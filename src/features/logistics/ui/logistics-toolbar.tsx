// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";

type LogisticsToolbarProps = {
  title: string;
  description?: string;
  leading?: ReactNode;
  titleMeta?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
};

export const LogisticsToolbar = ({
  title,
  description,
  leading,
  titleMeta,
  actionLabel,
  onAction,
  actionDisabled,
  actions,
  children,
}: LogisticsToolbarProps) => (
  <Card size="sm" className={logisticsCardClass}>
    <CardHeader className="gap-0 space-y-3 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              {titleMeta}
            </div>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : actionLabel && onAction ? (
          <Button type="button" size="sm" onClick={onAction} disabled={actionDisabled} className="shrink-0">
            {actionLabel}
          </Button>
        ) : null}
      </div>
      {children ? (
        <>
          <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />
          <div className="flex flex-col gap-2">{children}</div>
        </>
      ) : null}
    </CardHeader>
  </Card>
);

export const LogisticsMetaField = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) => (
  <div className="flex h-8 items-center gap-2">
    <label htmlFor={htmlFor} className="whitespace-nowrap text-sm text-muted-foreground">
      {label}
    </label>
    {children}
  </div>
);
