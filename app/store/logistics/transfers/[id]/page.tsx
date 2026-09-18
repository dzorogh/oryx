// english-ui:ignore-file
import type { Metadata } from "next";
import { TransferDetailPage } from "@/features/logistics/transfers-page";

export const metadata: Metadata = {
  title: "Перемещение | Логистика магазина | Oryx BMS",
  description: "Перемещение между складами",
};

const Page = () => <TransferDetailPage />;

export default Page;
