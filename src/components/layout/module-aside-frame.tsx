"use client";

import type { ReactNode } from "react";
import { ChevronsLeft } from "lucide-react";
import { LeftDockShell } from "@/components/layout/left-dock-shell";
import { MODULE_ASIDE_DOCK_CLASS } from "@/components/layout/module-layout-tokens";
import { useSidebarAside } from "@/components/layout/sidebar-aside-context";
import { cn } from "@/lib/utils";

type ModuleAsideFrameProps = {
  title: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};

export const ModuleAsideFrame = ({ title, ariaLabel, className, children }: ModuleAsideFrameProps) => {
  const { setCollapsed } = useSidebarAside();

  return (
    <LeftDockShell
      data-module-aside
      className={cn(MODULE_ASIDE_DOCK_CLASS, className, "hidden sm:flex")}
      ariaLabel={ariaLabel}
    >
      <div className="flex min-h-0 flex-1 flex-col p-2">
        <div className="flex shrink-0 items-center gap-1 pr-7">
          <span className="min-w-0 truncate text-sm font-bold leading-[1.66] text-foreground">{title}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">{children}</div>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed(true)}
        aria-label="Collapse menu"
        className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-md border border-[var(--corportal-border-grey)] bg-[var(--corportal-surface-white)] text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronsLeft aria-hidden className="size-4" strokeWidth={2} />
      </button>
    </LeftDockShell>
  );
};
