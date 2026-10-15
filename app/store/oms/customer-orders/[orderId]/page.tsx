// english-ui:ignore-file
import type { Metadata } from "next";
import { CustomerOrderDetailPage } from "@/features/oms/customer-orders-page";

export const metadata: Metadata = {
  title: "Заказ клиента | OMS | Oryx BMS",
  description: "Исполнение заказа",
};

const Page = () => <CustomerOrderDetailPage />;

export default Page;
