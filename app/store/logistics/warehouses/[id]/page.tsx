import type { Metadata } from "next";
import { WarehouseDetailPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Warehouse | Store Logistics | Oryx BMS",
  description: "Warehouse card",
};

const Page = () => <WarehouseDetailPage />;

export default Page;
