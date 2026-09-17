import type { Metadata } from "next";
import { ManufacturersPage } from "@/features/logistics/catalog-pages";

export const metadata: Metadata = {
  title: "Plants | Store Logistics | Oryx BMS",
  description: "Plants",
};

const Page = () => <ManufacturersPage />;

export default Page;
