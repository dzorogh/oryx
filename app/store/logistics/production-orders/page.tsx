// english-ui:ignore-file
import type { Metadata } from "next";
import { ProductionOrdersPage } from "@/features/logistics/production-orders-page";

export const metadata: Metadata = {
  title: "Заказы на производство | Логистика магазина | Oryx BMS",
  description: "Заказы на производство",
};

const Page = () => <ProductionOrdersPage />;

export default Page;
