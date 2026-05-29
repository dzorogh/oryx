import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { ANALYTICS_SUBNAV_ITEMS } from "@/features/analytics/analytics-nav";

type AnalyticsLayoutProps = {
  children: ReactNode;
};

const AnalyticsLayout = ({ children }: AnalyticsLayoutProps) => (
  <ModuleShell
    moduleTitle="Analytics"
    asideLabel="Analytics"
    subnavItems={ANALYTICS_SUBNAV_ITEMS}
    subnavAriaLabel="Analytics sections"
  >
    {children}
  </ModuleShell>
);

export default AnalyticsLayout;
