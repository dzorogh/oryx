import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { StoreAsideContent } from "@/components/store/store-aside-content";
import { STORE_SUBNAV_ITEMS } from "@/features/store/store-nav";

type StoreLayoutProps = {
  children: ReactNode;
};

const StoreLayout = ({ children }: StoreLayoutProps) => (
  <ModuleShell
    moduleTitle="Store"
    asideLabel="Store"
    subnavItems={STORE_SUBNAV_ITEMS}
    subnavAriaLabel="Store sections"
    asideContent={<StoreAsideContent />}
  >
    {children}
  </ModuleShell>
);

export default StoreLayout;
