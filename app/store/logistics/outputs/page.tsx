import type { Metadata } from "next";
import { OutputsPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Outputs | Store Logistics | Oryx BMS",
  description: "Production outputs",
};

const Page = () => <OutputsPage />;

export default Page;
