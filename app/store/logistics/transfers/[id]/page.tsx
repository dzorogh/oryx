import type { Metadata } from "next";
import { TransferDetailPage } from "@/features/logistics/transfers-page";

export const metadata: Metadata = {
  title: "Transfer | Store Logistics | Oryx BMS",
  description: "Warehouse transfer",
};

const Page = () => <TransferDetailPage />;

export default Page;
