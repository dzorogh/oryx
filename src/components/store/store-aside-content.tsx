"use client";

import { ModuleSubnav } from "@/components/layout/module-subnav";
import { Separator } from "@/components/ui/separator";
import {
  LOGISTICS_LEDGER_NAV_ITEMS,
  LOGISTICS_REST_NAV_ITEMS,
  LOGISTICS_TOP_NAV_ITEMS,
} from "@/features/logistics/logistics-nav";
import { STORE_CATALOG_NAV_ITEMS, STORE_GENERAL_NAV_ITEMS } from "@/features/store/store-nav";

type StoreAsideContentProps = {
  onItemClick?: () => void;
};

const LOGISTICS_MENU_ITEMS = [...LOGISTICS_TOP_NAV_ITEMS, ...LOGISTICS_REST_NAV_ITEMS];

export const StoreAsideContent = ({ onItemClick }: StoreAsideContentProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
    <ModuleSubnav
      items={LOGISTICS_MENU_ITEMS}
      navAriaLabel="Logistics"
      onItemClick={onItemClick}
      className="flex-none"
    />

    <Separator />

    <ModuleSubnav
      items={STORE_CATALOG_NAV_ITEMS}
      navAriaLabel="Catalog"
      onItemClick={onItemClick}
      className="flex-none"
    />

    <Separator />

    <ModuleSubnav items={STORE_GENERAL_NAV_ITEMS} navAriaLabel="Store sections" onItemClick={onItemClick} />

    <Separator />

    <ModuleSubnav
      items={LOGISTICS_LEDGER_NAV_ITEMS}
      navAriaLabel="Ledger"
      onItemClick={onItemClick}
      className="flex-none"
    />
  </div>
);
