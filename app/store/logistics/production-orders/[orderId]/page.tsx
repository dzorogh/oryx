// english-ui:ignore-file
import type { Metadata } from "next";
import { ProductionOrderDetailPage } from "@/features/logistics/production-orders-page";

export const metadata: Metadata = {
  title: "Заказ на производство | Логистика магазина | Oryx BMS",
  description: "Заказ на производство",
};

const Page = () => <ProductionOrderDetailPage />;

export default Page;
