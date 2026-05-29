"use client";

import { ModuleSubnav } from "@/components/layout/module-subnav";
import { Separator } from "@/components/ui/separator";
import { STORE_CATALOG_NAV_ITEMS, STORE_GENERAL_NAV_ITEMS } from "@/features/store/store-nav";
import { CatalogScopeSwitcher } from "./catalog-scope-switcher";

type StoreAsideContentProps = {
  onItemClick?: () => void;
};

export const StoreAsideContent = ({ onItemClick }: StoreAsideContentProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-2">
    <CatalogScopeSwitcher />

    <ModuleSubnav
      items={STORE_CATALOG_NAV_ITEMS}
      navAriaLabel="Catalog"
      onItemClick={onItemClick}
      className="flex-none"
    />

    <Separator />

    <ModuleSubnav items={STORE_GENERAL_NAV_ITEMS} navAriaLabel="Store sections" onItemClick={onItemClick} />
  </div>
);
