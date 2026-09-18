// english-ui:ignore-file
import type { Metadata } from "next";
import { ReturnsPage } from "@/features/logistics/flow-documents-pages";

export const metadata: Metadata = {
  title: "Возвраты | Логистика магазина | Oryx BMS",
  description: "Возвраты отгрузок",
};

const Page = () => <ReturnsPage />;

export default Page;
