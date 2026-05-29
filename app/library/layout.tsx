import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { LIBRARY_SUBNAV_ITEMS } from "@/features/library/library-nav";

type LibraryLayoutProps = {
  children: ReactNode;
};

const LibraryLayout = ({ children }: LibraryLayoutProps) => (
  <ModuleShell
    moduleTitle="Library"
    asideLabel="Library"
    subnavItems={LIBRARY_SUBNAV_ITEMS}
    subnavAriaLabel="Library sections"
  >
    {children}
  </ModuleShell>
);

export default LibraryLayout;
