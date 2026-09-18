// english-ui:ignore-file
import type { Metadata } from "next";
import { ReturnDetailPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Возврат | Логистика магазина | Oryx BMS",
  description: "Возврат отгрузки",
};

const Page = () => <ReturnDetailPage />;

export default Page;
