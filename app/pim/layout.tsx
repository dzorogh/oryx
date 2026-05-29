import type { ReactNode } from "react";
import { PimAside } from "@/components/store/pim/pim-aside";
import { PimMainColumn } from "@/components/store/pim/pim-main-column";

type PimLayoutProps = {
  children: ReactNode;
};

const PimLayout = ({ children }: PimLayoutProps) => (
  <div className="relative min-h-screen">
    <PimAside />
    <PimMainColumn>{children}</PimMainColumn>
  </div>
);

export default PimLayout;
