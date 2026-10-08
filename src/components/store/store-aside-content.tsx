// english-ui:ignore-file
"use client";

import { useMemo } from "react";
import { ModuleSubnav } from "@/components/layout/module-subnav";
import { isStorePathAllowedForRole } from "@/features/logistics/order-view-role";
import { useCurrentViewRole } from "@/features/logistics/use-view-role";
import { STORE_NAV_GROUPS } from "@/features/store/store-nav";

type StoreAsideContentProps = {
  onItemClick?: () => void;
};

export const StoreAsideContent = ({ onItemClick }: StoreAsideContentProps) => {
  const role = useCurrentViewRole();
  const groups = useMemo(
    () =>
      STORE_NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => isStorePathAllowedForRole(role, item.href)),
      })).filter((group) => group.items.length > 0),
    [role],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <ModuleSubnav groups={groups} navAriaLabel="Разделы магазина" onItemClick={onItemClick} className="flex-none" />
    </div>
  );
};
