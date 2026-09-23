// english-ui:ignore-file
"use client";

import { ModuleSubnav } from "@/components/layout/module-subnav";
import { STORE_NAV_GROUPS } from "@/features/store/store-nav";

type StoreAsideContentProps = {
  onItemClick?: () => void;
};

export const StoreAsideContent = ({ onItemClick }: StoreAsideContentProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
    <ModuleSubnav
      groups={STORE_NAV_GROUPS}
      navAriaLabel="Разделы магазина"
      onItemClick={onItemClick}
      className="flex-none"
    />
  </div>
);
