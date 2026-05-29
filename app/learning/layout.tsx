import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { LEARNING_SUBNAV_ITEMS } from "@/features/learning/learning-nav";

type LearningLayoutProps = {
  children: ReactNode;
};

const LearningLayout = ({ children }: LearningLayoutProps) => (
  <ModuleShell
    moduleTitle="Learning"
    asideLabel="Learning"
    subnavItems={LEARNING_SUBNAV_ITEMS}
    subnavAriaLabel="Learning sections"
  >
    {children}
  </ModuleShell>
);

export default LearningLayout;
