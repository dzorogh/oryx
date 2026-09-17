import type { Metadata } from "next";
import { CustomerOrderDetailPage } from "@/features/logistics/customer-orders-page";

export const metadata: Metadata = {
  title: "Customer order | Store Logistics | Oryx BMS",
  description: "Order fulfillment",
};

const Page = () => <CustomerOrderDetailPage />;

export default Page;
