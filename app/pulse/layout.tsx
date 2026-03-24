"use client";

import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { PULSE_SUBNAV_ITEMS } from "@/features/pulse/pulse-nav";

type PulseLayoutProps = {
  children: ReactNode;
};

const PulseLayout = ({ children }: PulseLayoutProps) => (
  <ModuleShell
    moduleTitle="Пульс компании"
    asideLabel="Пульс компании"
    subnavItems={PULSE_SUBNAV_ITEMS}
    subnavAriaLabel="Подразделы Пульса компании"
  >
    {children}
  </ModuleShell>
);

export default PulseLayout;
