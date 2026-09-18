// english-ui:ignore-file
import type { Metadata } from "next";
import { WarehousesPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Склады | Логистика магазина | Oryx BMS",
  description: "Склады",
};

const Page = () => <WarehousesPage />;

export default Page;
