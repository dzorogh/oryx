// english-ui:ignore-file
import type { Metadata } from "next";
import { TransfersPage } from "@/features/logistics/transfers-page";

export const metadata: Metadata = {
  title: "Перемещения | Логистика магазина | Oryx BMS",
  description: "Перемещения между складами",
};

const Page = () => <TransfersPage />;

export default Page;
