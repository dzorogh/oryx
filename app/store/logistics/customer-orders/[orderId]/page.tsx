// english-ui:ignore-file
import type { Metadata } from "next";
import { CustomerOrderDetailPage } from "@/features/logistics/customer-orders-page";

export const metadata: Metadata = {
  title: "Заказ клиента | Логистика магазина | Oryx BMS",
  description: "Исполнение заказа",
};

const Page = () => <CustomerOrderDetailPage />;

export default Page;
