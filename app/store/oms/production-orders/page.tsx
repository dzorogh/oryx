// english-ui:ignore-file
import type { Metadata } from "next";
import { ProductionOrdersPage } from "@/features/oms/production-orders-page";

export const metadata: Metadata = {
  title: "Заказы на производство | OMS | Oryx BMS",
  description: "Заказы на производство",
};

const Page = () => <ProductionOrdersPage />;

export default Page;
