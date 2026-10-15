// english-ui:ignore-file
import type { Metadata } from "next";
import { ProductionOrderDetailPage } from "@/features/oms/production-orders-page";

export const metadata: Metadata = {
  title: "Заказ на производство | OMS | Oryx BMS",
  description: "Заказ на производство",
};

const Page = () => <ProductionOrderDetailPage />;

export default Page;
