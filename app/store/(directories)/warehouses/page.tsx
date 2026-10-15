// english-ui:ignore-file
import type { Metadata } from "next";
import { WarehousesPage } from "@/features/store/directories/catalog-pages";

export const metadata: Metadata = {
  title: "Склады | Магазин | Oryx BMS",
  description: "Склады",
};

const Page = () => <WarehousesPage />;

export default Page;
