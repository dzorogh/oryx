// english-ui:ignore-file
import type { Metadata } from "next";
import { TransferDetailPage } from "@/features/oms/transfers-page";

export const metadata: Metadata = {
  title: "Перемещение | OMS | Oryx BMS",
  description: "Перемещение между складами",
};

const Page = () => <TransferDetailPage />;

export default Page;
