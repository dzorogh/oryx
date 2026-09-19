import type { Metadata } from "next";
import { RegionDetailPage } from "@/features/logistics/regions-page";

export const metadata: Metadata = {
  title: "Region | Store logistics | Oryx BMS",
  description: "Region reserved stock",
};

const Page = () => <RegionDetailPage />;

export default Page;
