"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { LeftDockShell } from "@/components/layout/left-dock-shell";
import { MODULE_ASIDE_DOCK_CLASS } from "@/components/layout/module-layout-tokens";
import { cn } from "@/lib/utils";

type ModuleAsideFrameProps = {
  title: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};

export const ModuleAsideFrame = ({ title, ariaLabel, className, children }: ModuleAsideFrameProps) => {
  const asideInner = useMemo(
    () => (
      <div className="flex min-h-0 flex-1 flex-col p-2">
        <div className="flex shrink-0 items-center gap-1">
          <span className="min-w-0 truncate text-sm font-bold leading-[1.66] text-foreground">{title}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">{children}</div>
      </div>
    ),
    [children, title],
  );

  return (
    <LeftDockShell
      className={cn(MODULE_ASIDE_DOCK_CLASS, className, "hidden sm:flex")}
      ariaLabel={ariaLabel}
    >
      {asideInner}
    </LeftDockShell>
  );
};
