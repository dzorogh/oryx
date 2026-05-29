import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";

type ApprovalsLayoutProps = {
  children: ReactNode;
};

// По таблице Oryx Modules у Approvals нет видимых пунктов aside (Is Aside Visible = no).
const ApprovalsLayout = ({ children }: ApprovalsLayoutProps) => (
  <ModuleShell
    moduleTitle="Approvals"
    asideLabel="Approvals"
    subnavItems={[]}
    subnavAriaLabel="Approvals sections"
  >
    {children}
  </ModuleShell>
);

export default ApprovalsLayout;
