import type { Metadata } from "next";
import { ManufacturerDetailPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Plant | Store Logistics | Oryx BMS",
  description: "Plant card",
};

const Page = () => <ManufacturerDetailPage />;

export default Page;
