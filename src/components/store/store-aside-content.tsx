// english-ui:ignore-file
"use client";

import { ModuleSubnav } from "@/components/layout/module-subnav";
import { Separator } from "@/components/ui/separator";
import {
  STORE_FLOW_NAV_ITEMS,
  STORE_MORE_NAV_ITEMS,
  STORE_PRIMARY_NAV_ITEMS,
} from "@/features/store/store-nav";

type StoreAsideContentProps = {
  onItemClick?: () => void;
};

export const StoreAsideContent = ({ onItemClick }: StoreAsideContentProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
    <ModuleSubnav
      items={STORE_PRIMARY_NAV_ITEMS}
      navAriaLabel="Обзор магазина"
      onItemClick={onItemClick}
      className="flex-none"
    />

    <Separator />

    <ModuleSubnav
      items={STORE_FLOW_NAV_ITEMS}
      navAriaLabel="Движения магазина"
      onItemClick={onItemClick}
      className="flex-none"
    />

    <Separator />

    <ModuleSubnav
      items={STORE_MORE_NAV_ITEMS}
      navAriaLabel="Разделы магазина"
      onItemClick={onItemClick}
      className="flex-none"
    />
  </div>
);
