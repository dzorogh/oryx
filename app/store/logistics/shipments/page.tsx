// english-ui:ignore-file
import type { Metadata } from "next";
import { ShipmentsPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Отгрузки | Логистика магазина | Oryx BMS",
  description: "Отгрузки",
};

const Page = () => <ShipmentsPage />;

export default Page;
