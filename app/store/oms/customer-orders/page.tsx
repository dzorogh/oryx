// english-ui:ignore-file
import type { Metadata } from "next";
import { CustomerOrdersPage } from "@/features/oms/customer-orders-page";

export const metadata: Metadata = {
  title: "Заказы клиента | OMS | Oryx BMS",
  description: "Спрос и исполнение",
};

const Page = () => <CustomerOrdersPage />;

export default Page;
