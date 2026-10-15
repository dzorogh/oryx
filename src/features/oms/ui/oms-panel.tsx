// english-ui:ignore-file
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export const omsCardClass = "ring-1 ring-[var(--corportal-border-grey)]";

export const OmsPanel = ({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <Card size="sm" className={omsCardClass}>
    {title || action ? (
      <div className="flex items-center justify-between gap-2 px-3">
        {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
        {action}
      </div>
    ) : null}
    <CardContent>{children}</CardContent>
  </Card>
);
