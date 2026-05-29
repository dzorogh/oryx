import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { TRACKER_SUBNAV_ITEMS } from "@/features/tracker/tracker-nav";

type TrackerLayoutProps = {
  children: ReactNode;
};

const TrackerLayout = ({ children }: TrackerLayoutProps) => (
  <ModuleShell
    moduleTitle="Tracker"
    asideLabel="Tracker"
    subnavItems={TRACKER_SUBNAV_ITEMS}
    subnavAriaLabel="Tracker sections"
  >
    {children}
  </ModuleShell>
);

export default TrackerLayout;
