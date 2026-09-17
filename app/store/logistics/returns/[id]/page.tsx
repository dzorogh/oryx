import type { Metadata } from "next";
import { ReturnDetailPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Return | Store Logistics | Oryx BMS",
  description: "Shipment return",
};

const Page = () => <ReturnDetailPage />;

export default Page;
