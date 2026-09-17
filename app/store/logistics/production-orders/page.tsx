import type { Metadata } from "next";
import { ProductionOrdersPage } from "@/features/logistics/production-orders-page";

export const metadata: Metadata = {
  title: "Production orders | Store Logistics | Oryx BMS",
  description: "Production orders",
};

const Page = () => <ProductionOrdersPage />;

export default Page;
