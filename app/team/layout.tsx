import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { TEAM_SUBNAV_ITEMS } from "@/features/team/team-nav";

type TeamLayoutProps = {
  children: ReactNode;
};

const TeamLayout = ({ children }: TeamLayoutProps) => (
  <ModuleShell
    moduleTitle="Команда"
    asideLabel="Команда"
    subnavItems={TEAM_SUBNAV_ITEMS}
    subnavAriaLabel="Разделы модуля Команда"
  >
    {children}
  </ModuleShell>
);

export default TeamLayout;
