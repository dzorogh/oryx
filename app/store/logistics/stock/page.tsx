import type { Metadata } from "next";
import { StockPage } from "@/features/logistics/stock-page";

export const metadata: Metadata = {
  title: "Stock | Store Logistics | Oryx BMS",
  description: "Stock by place and state from the immutable ledger",
};

const Page = () => <StockPage />;

export default Page;
