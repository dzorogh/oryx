// english-ui:ignore-file
import type { Metadata } from "next";
import { AdjustmentDetailPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Корректировка | Логистика магазина | Oryx BMS",
  description: "Карточка корректировки остатков",
};

const Page = () => <AdjustmentDetailPage />;

export default Page;
