// english-ui:ignore-file
import type { Metadata } from "next";
import { OutputDetailPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Выпуск | Логистика магазина | Oryx BMS",
  description: "Выпуск заказа на производство",
};

const Page = () => <OutputDetailPage />;

export default Page;
