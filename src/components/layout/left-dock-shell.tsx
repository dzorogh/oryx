import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LeftDockShellProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export const LeftDockShell = ({ children, className, ariaLabel }: LeftDockShellProps) => (
  <aside className={cn("fixed top-0 flex h-svh flex-col border-r", className)} aria-label={ariaLabel}>
    {children}
  </aside>
);
