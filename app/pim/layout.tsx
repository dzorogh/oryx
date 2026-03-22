import type { ReactNode } from "react";
import { PimAside } from "@/components/pim/pim-aside";
import { PimMainColumn } from "@/components/pim/pim-main-column";

type PimLayoutProps = {
  children: ReactNode;
};

const PimLayout = ({ children }: PimLayoutProps) => (
  <div className="corportal-shell-bg relative min-h-screen">
    <PimAside />
    <PimMainColumn>{children}</PimMainColumn>
  </div>
);

export default PimLayout;
