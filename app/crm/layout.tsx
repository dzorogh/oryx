import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { CRM_SUBNAV_ITEMS } from "@/features/crm/crm-nav";

type CrmLayoutProps = {
  children: ReactNode;
};

const CrmLayout = ({ children }: CrmLayoutProps) => (
  <ModuleShell
    moduleTitle="CRM"
    asideLabel="CRM"
    subnavItems={CRM_SUBNAV_ITEMS}
    subnavAriaLabel="CRM sections"
  >
    {children}
  </ModuleShell>
);

export default CrmLayout;
