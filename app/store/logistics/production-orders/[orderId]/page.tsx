import type { Metadata } from "next";
import { ProductionOrderDetailPage } from "@/features/logistics/production-orders-page";

export const metadata: Metadata = {
  title: "Production order | Store Logistics | Oryx BMS",
  description: "Production order",
};

const Page = () => <ProductionOrderDetailPage />;

export default Page;
