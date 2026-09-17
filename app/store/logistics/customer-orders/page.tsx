import type { Metadata } from "next";
import { CustomerOrdersPage } from "@/features/logistics/customer-orders-page";

export const metadata: Metadata = {
  title: "Customer orders | Store Logistics | Oryx BMS",
  description: "Demand and fulfillment",
};

const Page = () => <CustomerOrdersPage />;

export default Page;
