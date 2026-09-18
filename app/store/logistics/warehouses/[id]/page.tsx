// english-ui:ignore-file
import type { Metadata } from "next";
import { WarehouseDetailPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Склад | Логистика магазина | Oryx BMS",
  description: "Карточка склада",
};

const Page = () => <WarehouseDetailPage />;

export default Page;
