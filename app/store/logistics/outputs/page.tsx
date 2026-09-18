// english-ui:ignore-file
import type { Metadata } from "next";
import { OutputsPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Выпуски | Логистика магазина | Oryx BMS",
  description: "Выпуски заказов на производство",
};

const Page = () => <OutputsPage />;

export default Page;
