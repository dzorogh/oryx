"use client";

import type { ReactNode } from "react";
import { ModuleAsideFrame } from "@/components/layout/module-aside-frame";
import { ModuleSubnav, type ModuleSubnavItem } from "@/components/layout/module-subnav";
import { MODULE_MAIN_OFFSET_CLASS } from "@/components/layout/module-layout-tokens";
import { cn } from "@/lib/utils";

type ModuleShellProps = {
  moduleTitle: string;
  asideLabel: string;
  subnavItems: ModuleSubnavItem[];
  subnavAriaLabel: string;
  children: ReactNode;
  mainClassName?: string;
  asideContent?: ReactNode;
};

export const ModuleShell = ({
  moduleTitle,
  asideLabel,
  subnavItems,
  subnavAriaLabel,
  children,
  mainClassName,
  asideContent,
}: ModuleShellProps) => (
  <div className="relative min-h-screen">
    <ModuleAsideFrame title={moduleTitle} ariaLabel={asideLabel}>
      {asideContent ?? <ModuleSubnav items={subnavItems} navAriaLabel={subnavAriaLabel} />}
    </ModuleAsideFrame>
    <div className={cn("flex min-h-screen min-w-0 flex-col", MODULE_MAIN_OFFSET_CLASS, mainClassName)}>
      <main className="min-h-0 min-w-0 flex-1">{children}</main>
    </div>
  </div>
);
