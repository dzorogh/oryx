// english-ui:ignore-file
import type { Metadata } from "next";
import { ShipmentDetailPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Отгрузка | Логистика магазина | Oryx BMS",
  description: "Отгрузка",
};

const Page = () => <ShipmentDetailPage />;

export default Page;
