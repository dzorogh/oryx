// english-ui:ignore-file
import type { Metadata } from "next";
import { ShipmentDetailPage } from "@/features/oms/flow-documents-pages";

export const metadata: Metadata = {
  title: "Отгрузки и возвраты | OMS | Oryx BMS",
  description: "Карточка проведённого документа отгрузки или возврата",
};

const Page = () => <ShipmentDetailPage />;

export default Page;
