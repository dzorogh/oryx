// english-ui:ignore-file
import type { Metadata } from "next";
import { WarehouseDetailPage } from "@/features/store/directories/catalog-pages";

export const metadata: Metadata = {
  title: "Склад | Магазин | Oryx BMS",
  description: "Карточка склада",
};

const Page = () => <WarehouseDetailPage />;

export default Page;
