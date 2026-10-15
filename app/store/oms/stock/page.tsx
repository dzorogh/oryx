// english-ui:ignore-file
import type { Metadata } from "next";
import { StockPage } from "@/features/oms/stock-page";

export const metadata: Metadata = {
  title: "Остатки | OMS | Oryx BMS",
  description: "Наличие по месту и закреплению",
};

const Page = () => <StockPage />;

export default Page;
