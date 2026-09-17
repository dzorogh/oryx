import type { Metadata } from "next";
import { TransfersPage } from "@/features/logistics/transfers-page";

export const metadata: Metadata = {
  title: "Transfers | Store Logistics | Oryx BMS",
  description: "Warehouse transfers",
};

const Page = () => <TransfersPage />;

export default Page;
