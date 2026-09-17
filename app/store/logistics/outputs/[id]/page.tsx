import type { Metadata } from "next";
import { OutputDetailPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Output | Store Logistics | Oryx BMS",
  description: "Production output",
};

const Page = () => <OutputDetailPage />;

export default Page;
