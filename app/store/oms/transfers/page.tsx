// english-ui:ignore-file
import type { Metadata } from "next";
import { TransfersPage } from "@/features/oms/transfers-page";

export const metadata: Metadata = {
  title: "Перемещения | OMS | Oryx BMS",
  description: "Перемещения между складами",
};

const Page = () => <TransfersPage />;

export default Page;
