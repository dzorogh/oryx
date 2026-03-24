import type { ReactNode } from "react";
import { PIM_MAIN_OFFSET_CLASS } from "./pim-layout-tokens";

type PimMainColumnProps = {
  children: ReactNode;
};

export const PimMainColumn = ({ children }: PimMainColumnProps) => (
  <div
    className={`flex min-h-screen min-w-0 flex-col bg-[var(--corportal-surface-muted)] ${PIM_MAIN_OFFSET_CLASS}`}
  >
    {children}
  </div>
);
