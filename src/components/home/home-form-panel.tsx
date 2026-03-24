import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HomeFormPanelProps = {
  children: ReactNode;
  title?: ReactNode;
  className?: string;
};

export const HomeFormPanel = ({ children, title, className }: HomeFormPanelProps) => (
  <div className={cn("rounded-lg border border-[var(--corportal-border-grey)] bg-card p-4", className)}>
    {title ? <p className="text-sm font-semibold text-foreground">{title}</p> : null}
    {children}
  </div>
);
