import type { ReactNode } from "react";
import { CorportalNavRail } from "@/components/layout/corportal-nav-rail";
import { OrderPageHeader } from "./order-header";
import { PimAside } from "./pim-aside";
import { PimMainColumn } from "./pim-main-column";

type OrderPackingAppChromeProps = {
  orderId: number;
  children: ReactNode;
};

/**
 * Та же композиция, что корневой layout + `app/pim/layout.tsx`, плюс заголовок страницы заказа.
 * Экспорт для unit-тестов без полного дерева Next.js.
 */
export const OrderPackingAppChrome = ({ orderId, children }: OrderPackingAppChromeProps) => (
  <div className="corportal-shell-bg relative min-h-screen">
    <CorportalNavRail />
    <PimAside activeOrderId={orderId} />
    <PimMainColumn>
      <OrderPageHeader orderId={orderId} />
      {children}
    </PimMainColumn>
  </div>
);
