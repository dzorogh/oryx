import type { Metadata } from "next";
import { ShipmentDetailPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Shipment | Store Logistics | Oryx BMS",
  description: "Shipment",
};

const Page = () => <ShipmentDetailPage />;

export default Page;
