import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { SETTINGS_SUBNAV_ITEMS } from "@/features/settings/settings-nav";

type SettingsLayoutProps = {
  children: ReactNode;
};

const SettingsLayout = ({ children }: SettingsLayoutProps) => (
  <ModuleShell
    moduleTitle="Settings"
    asideLabel="Settings"
    subnavItems={SETTINGS_SUBNAV_ITEMS}
    subnavAriaLabel="Settings sections"
  >
    {children}
  </ModuleShell>
);

export default SettingsLayout;
