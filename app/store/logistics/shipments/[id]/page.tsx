// english-ui:ignore-file
import type { Metadata } from "next";
import { ShipmentDetailPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Отгрузки и возвраты | Логистика магазина | Oryx BMS",
  description: "Карточка проведённого документа отгрузки или возврата",
};

const Page = () => <ShipmentDetailPage />;

export default Page;
