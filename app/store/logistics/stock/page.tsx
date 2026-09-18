// english-ui:ignore-file
import type { Metadata } from "next";
import { StockPage } from "@/features/logistics/stock-page";

export const metadata: Metadata = {
  title: "Остатки | Логистика магазина | Oryx BMS",
  description: "Остатки по местам и состояниям из журнала",
};

const Page = () => <StockPage />;

export default Page;
