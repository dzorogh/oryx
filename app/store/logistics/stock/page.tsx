// english-ui:ignore-file
import type { Metadata } from "next";
import { StockPage } from "@/features/logistics/stock-page";

export const metadata: Metadata = {
  title: "Остатки | Логистика магазина | Oryx BMS",
  description: "Наличие по месту и закреплению",
};

const Page = () => <StockPage />;

export default Page;
