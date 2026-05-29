import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type LeftDockShellProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
} & ComponentPropsWithoutRef<"aside">;

export const LeftDockShell = ({ children, className, ariaLabel, ...rest }: LeftDockShellProps) => (
  <aside className={cn("fixed top-0 flex h-svh flex-col border-r", className)} aria-label={ariaLabel} {...rest}>
    {children}
  </aside>
);
