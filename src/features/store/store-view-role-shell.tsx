"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isStorePathAllowedForRole, viewRolePageForPath } from "@/features/logistics/order-view-role";
import { LOGISTICS_PATHS, STORE_PRODUCTS_PATH } from "@/features/logistics/logistics-paths";
import { ViewRoleSwitcher } from "@/features/logistics/ui/view-role-switcher";
import { useViewRole } from "@/features/logistics/use-view-role";

const CustomerAccessDenied = () => (
  <main className="min-h-screen bg-muted/30">
    <section className="p-4">
      <Card
        size="sm"
        className="flex flex-col items-center justify-center gap-3 py-16 text-center ring-1 ring-[var(--corportal-border-grey)]"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShieldOff aria-hidden className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">Раздел недоступен заказчику</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Заказчику открыты только каталог и заказы своего региона.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button nativeButton={false} size="sm" render={<Link href={STORE_PRODUCTS_PATH} />}>
            Открыть каталог
          </Button>
          <Button nativeButton={false} size="sm" variant="outline" render={<Link href={LOGISTICS_PATHS.customerOrders} />}>
            Мои заказы
          </Button>
        </div>
      </Card>
    </section>
  </main>
);

/** Demo-only: role switcher on every store page and the customer's route guard. */
export const StoreViewRoleShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname() ?? "";
  const viewRole = useViewRole(viewRolePageForPath(pathname));

  return (
    <>
      {isStorePathAllowedForRole(viewRole.role, pathname) ? children : <CustomerAccessDenied />}
      <ViewRoleSwitcher state={viewRole} />
    </>
  );
};
