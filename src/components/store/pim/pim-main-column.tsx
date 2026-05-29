import type { ReactNode } from "react";
import { PIM_MAIN_OFFSET_CLASS } from "@/components/layout/module-layout-tokens";

type PimMainColumnProps = {
  children: ReactNode;
};

export const PimMainColumn = ({ children }: PimMainColumnProps) => (
  <div
    data-module-main
    className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ${PIM_MAIN_OFFSET_CLASS}`}
  >
    {children}
  </div>
);
