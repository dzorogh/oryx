import type { Metadata } from "next";
import { WarehousesPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Warehouses | Store Logistics | Oryx BMS",
  description: "Warehouses",
};

const Page = () => <WarehousesPage />;

export default Page;
