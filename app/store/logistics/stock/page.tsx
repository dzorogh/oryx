import type { Metadata } from "next";
import { StockPage } from "@/features/logistics/stock-page";

export const metadata: Metadata = {
  title: "Stock | Store Logistics | Oryx BMS",
  description: "On-hand stock by owner and location",
};

const Page = () => <StockPage />;

export default Page;
