// english-ui:ignore-file
import type { Metadata } from "next";
import { AdjustmentDetailPage } from "@/features/oms/flow-documents-pages";

export const metadata: Metadata = {
  title: "Корректировка | OMS | Oryx BMS",
  description: "Карточка корректировки остатков",
};

const Page = () => <AdjustmentDetailPage />;

export default Page;
