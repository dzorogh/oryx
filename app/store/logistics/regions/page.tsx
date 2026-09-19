import type { Metadata } from "next";
import { RegionsPage } from "@/features/logistics/regions-page";

export const metadata: Metadata = {
  title: "Regions | Store logistics | Oryx BMS",
  description: "Sales regions that can own reserved stock",
};

const Page = () => <RegionsPage />;

export default Page;
