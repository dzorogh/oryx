import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { PULSE_SUBNAV_ITEMS } from "@/features/pulse/pulse-nav";
import { PulseHomeAsideContent } from "@/features/pulse/pulse-home-aside-content";

type PulseLayoutProps = {
  children: ReactNode;
};

const PulseLayout = ({ children }: PulseLayoutProps) => (
  <ModuleShell
    moduleTitle="Pulse"
    asideLabel="Pulse"
    subnavItems={PULSE_SUBNAV_ITEMS}
    subnavAriaLabel="Pulse sections"
    asideContent={<PulseHomeAsideContent />}
  >
    {children}
  </ModuleShell>
);

export default PulseLayout;
