import type { Metadata } from "next";
import { ReturnsPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Returns | Store Logistics | Oryx BMS",
  description: "Shipment returns",
};

const Page = () => <ReturnsPage />;

export default Page;
