import type { Metadata } from "next";
import { ShipmentsPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Shipments | Store Logistics | Oryx BMS",
  description: "Shipments",
};

const Page = () => <ShipmentsPage />;

export default Page;
